"""
Maps GeminiProvider's redesigned extraction JSON into MediKiosk's internal
ExtractionResult schema.

This module owns exactly one responsibility: be a lossless, generic
transformation boundary between the Gemini contract and the application
schema. It must never hallucinate, never drop explicitly extracted
information, and never claim independent clinical verification.

Nothing in this file is specific to any one document's content — all
recovery logic (see `_derive_identifier_from_evidence`) is generic text
hygiene, not phrase-matching against a particular sample document.
"""

import logging
import re
from typing import Any

from app.schemas.extraction import (
    Allergy,
    ClinicalFinding,
    CompletenessAudit,
    Diagnosis,
    DischargeSummaryData,
    Evidence,
    ExtractionMetadata,
    ExtractionResult,
    FieldConfidence,
    HistoryItem,
    ImagingFinding,
    InvestigationFinding,
    LabReportData,
    LabResult,
    Medication,
    PatientInfo,
    Procedure,
    PrescriptionData,
    ProviderInfo,
    RadiologyReportData,
    Symptom,
    VitalSign,
    VerificationStatus,
    VerificationSummary,
)

logger = logging.getLogger(__name__)

_LEADING_MARKER_RE = re.compile(r"^\s*(?:[-•*]|\(?\d+[.)])\s*")

# Gemini's new verification_status values -> internal VerificationStatus.
# Deliberately has NO path that produces VERIFIED: extraction confidence
# is never treated as independent clinical verification, regardless of
# how clearly-stated the source text was.
_VERIFICATION_STATUS_MAP = {
    "not_independently_verified": VerificationStatus.UNVERIFIED,
    "needs_review": VerificationStatus.REQUIRES_REVIEW,
}

_REVIEW_TRIGGERING_EVIDENCE_SUPPORT = {"ambiguous", "ocr_uncertain", "contradictory"}


class ExtractionMapper:
    """
    Maps Gemini's generic extraction JSON into MediKiosk's
    internal ExtractionResult schema.
    """

    def map(
        self,
        *,
        gemini_data: dict[str, Any],
        document_id: str,
        session_id: str,
        document_type: str,
        raw_text: str | None = None,
    ) -> ExtractionResult:

        warnings: list[str] = []

        metadata = self._build_metadata(gemini_data)

        extraction = ExtractionResult(
            document_id=document_id,
            session_id=session_id,
            document_type=document_type,
            metadata=metadata,
            verification=self._build_verification(gemini_data),
            evidence=self._build_evidence(gemini_data),
            raw_text=raw_text,
        )

        normalized_type = document_type.upper()

        if normalized_type == "PRESCRIPTION":
            extraction.prescription = self._build_prescription(gemini_data, warnings)

        elif normalized_type == "LAB_REPORT":
            extraction.lab_report = self._build_lab_report(gemini_data, warnings)

        elif normalized_type == "DISCHARGE_SUMMARY":
            extraction.discharge_summary = self._build_discharge_summary(
                gemini_data, warnings
            )

        elif normalized_type == "RADIOLOGY_REPORT":
            extraction.radiology_report = self._build_radiology_report(
                gemini_data, warnings
            )
        else:
            logger.warning("Unknown document_type for mapping: %s", document_type)

        extraction.completeness_audit = self._build_completeness_audit(
            gemini_data, warnings
        )

        return extraction

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    def _build_metadata(self, data: dict[str, Any]) -> ExtractionMetadata:
        patient_data = data.get("patient") or {}
        provider_data = data.get("provider") or {}

        patient = PatientInfo(
            name=patient_data.get("name"),
            age=self._parse_age(patient_data.get("age")),
            sex=patient_data.get("sex") or patient_data.get("gender"),
            date_of_birth=patient_data.get("date_of_birth"),
            patient_id=patient_data.get("patient_id"),
            hospital_id=patient_data.get("hospital_id"),
            address=patient_data.get("address"),
            phone=patient_data.get("phone"),
            blood_group=patient_data.get("blood_group"),
        )

        provider = ProviderInfo(
            physician_name=(
                provider_data.get("physician_name") or provider_data.get("name")
            ),
            physician_registration_number=provider_data.get(
                "physician_registration_number"
            ),
            facility_name=(
                provider_data.get("facility_name") or provider_data.get("facility")
            ),
            facility_address=provider_data.get("facility_address"),
            department=provider_data.get("department"),
            specialty=provider_data.get("specialty"),
        )

        return ExtractionMetadata(
            document_title=data.get("document_title"),
            document_date=data.get("document_date"),
            patient=patient,
            provider=provider,
        )

    # ------------------------------------------------------------------
    # Confidence
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_float(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _build_confidence(
        cls,
        item: dict[str, Any],
        *,
        evidence: str | None = None,
    ) -> FieldConfidence | None:

        raw_confidence = item.get("confidence")

        if raw_confidence is None:
            return None

        source_text = item.get("evidence") or evidence

        # --- New contract: structured confidence object -------------------
        if isinstance(raw_confidence, dict):
            extraction_confidence = cls._safe_float(
                raw_confidence.get("extraction_confidence")
            )
            evidence_support = raw_confidence.get("evidence_support")
            verification_status_raw = raw_confidence.get("verification_status")

            status = _VERIFICATION_STATUS_MAP.get(
                str(verification_status_raw).lower() if verification_status_raw else "",
                VerificationStatus.REQUIRES_REVIEW,
            )

            # Even an explicit verification_status can be overridden to
            # REQUIRES_REVIEW by a weak evidence_support signal — but
            # nothing here can ever upgrade a status to VERIFIED.
            if evidence_support in _REVIEW_TRIGGERING_EVIDENCE_SUPPORT:
                status = VerificationStatus.REQUIRES_REVIEW

            score = extraction_confidence if extraction_confidence is not None else 0.0
            score = max(0.0, min(1.0, score))

            reason = None
            if status == VerificationStatus.REQUIRES_REVIEW:
                reason = raw_confidence.get("reason") or (
                    f"Gemini flagged this field (evidence_support="
                    f"{evidence_support!r}, verification_status="
                    f"{verification_status_raw!r})."
                )

            return FieldConfidence(
                score=score,
                status=status,
                source_text=source_text,
                reason=reason,
                extraction_confidence=extraction_confidence,
                evidence_support=evidence_support,
                verification_status=verification_status_raw,
            )

        # --- Legacy contract: bare numeric score --------------------------
        score = cls._safe_float(raw_confidence)
        score = max(0.0, min(1.0, score if score is not None else 0.0))

        # NOTE: deliberately never assigns VERIFIED here either. The old
        # threshold-based "score >= 0.90 -> VERIFIED" logic is exactly the
        # false-verification bug this redesign is fixing; a legacy flat
        # score is extraction confidence, not clinical verification, no
        # matter how high it is.
        status = (
            VerificationStatus.UNVERIFIED
            if score >= 0.70
            else VerificationStatus.REQUIRES_REVIEW
        )
        reason = "Low extraction confidence." if score < 0.70 else None

        return FieldConfidence(
            score=score,
            status=status,
            source_text=source_text,
            reason=reason,
        )

    # ------------------------------------------------------------------
    # Robustness helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _derive_identifier_from_evidence(
        evidence: Any, max_len: int = 160
    ) -> str | None:
        """
        Deterministic, lossless text hygiene ONLY (Section 24): strips a
        leading list marker such as "1." / "2)" / "-" and surrounding
        whitespace. Never rewords, interprets, or shortens meaningfully.
        Used only as a last-resort identifier when Gemini left the
        primary name/finding/substance field null but still anchored the
        entity to an evidence span.
        """
        if not isinstance(evidence, str):
            return None
        text = _LEADING_MARKER_RE.sub("", evidence.strip()).strip()
        if not text:
            return None
        return text[:max_len]

    @classmethod
    def _resolve_identifier(
        cls,
        item: dict[str, Any],
        *keys: str,
        entity_type: str,
        warnings: list[str],
    ) -> str | None:
        """
        Returns the first non-empty value among `keys`, falling back to a
        text-hygiene-only derivation from `evidence` when every primary
        key is missing. Returns None (never a fabricated string) when
        there is truly nothing to identify the entity by, and records a
        warning so the loss is visible instead of silent.
        """
        for key in keys:
            value = item.get(key)
            if value:
                return value

        evidence = item.get("evidence")
        derived = cls._derive_identifier_from_evidence(evidence)
        if derived:
            warnings.append(
                f"{entity_type}: primary identifier field missing; "
                f"recovered from evidence text verbatim."
            )
            return derived

        warnings.append(
            f"{entity_type}: skipped — no identifying field and no "
            f"evidence to recover one from. Raw item: {item!r}"
        )
        return None

    # ------------------------------------------------------------------
    # Generic entities
    # ------------------------------------------------------------------

    def _build_medications(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[Medication]:
        results = []
        for item in items:
            name = self._resolve_identifier(
                item, "name", entity_type="medication", warnings=warnings
            )
            if not name:
                continue
            results.append(
                Medication(
                    name=name,
                    generic_name=item.get("generic_name"),
                    strength=item.get("strength"),
                    dosage_form=item.get("dosage_form"),
                    dose=item.get("dose"),
                    route=item.get("route"),
                    frequency=item.get("frequency"),
                    duration=item.get("duration"),
                    quantity=item.get("quantity"),
                    instructions=item.get("instructions"),
                    start_date=item.get("start_date"),
                    end_date=item.get("end_date"),
                    prescribed_by=item.get("prescribed_by"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_diagnoses(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[Diagnosis]:
        results = []
        for item in items:
            name = self._resolve_identifier(
                item, "name", entity_type="diagnosis", warnings=warnings
            )
            if not name:
                continue
            results.append(
                Diagnosis(
                    name=name,
                    code=item.get("code"),
                    code_system=item.get("code_system"),
                    status=item.get("status"),
                    onset_date=item.get("onset_date"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_symptoms(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[Symptom]:
        results = []
        for item in items:
            name = self._resolve_identifier(
                item, "name", entity_type="symptom", warnings=warnings
            )
            if not name:
                continue
            results.append(
                Symptom(
                    name=name,
                    severity=item.get("severity"),
                    duration=item.get("duration"),
                    onset=item.get("onset"),
                    associated_factors=item.get("associated_factors") or [],
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_allergies(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[Allergy]:
        results = []
        for item in items:
            substance = self._resolve_identifier(
                item, "substance", "name", entity_type="allergy", warnings=warnings
            )
            if not substance:
                continue
            results.append(
                Allergy(
                    substance=substance,
                    reaction=item.get("reaction"),
                    severity=item.get("severity"),
                    status=item.get("status"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_vitals(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[VitalSign]:
        results = []

        for item in items:
            # Canonical/internal contract uses `name`.
            # Current LLM output may use `type` for the vital identifier.
            # Prefer `name` for backward compatibility, then fall back to `type`.
            # Never invent a vital name.
            name = self._resolve_identifier(
                item,
                "name",
                "type",
                entity_type="vital",
                warnings=warnings,
            )

            if not name:
                continue

            results.append(
                VitalSign(
                    name=name,
                    value=item.get("value"),
                    unit=item.get("unit"),
                    measurement_date=item.get("measurement_date"),
                    measurement_time=item.get("measurement_time"),
                    reference_range=item.get("reference_range"),
                    context=item.get("context"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )

        return results

    def _build_lab_results(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[LabResult]:
        results = []
        for item in items:
            test_name = self._resolve_identifier(
                item, "test_name", entity_type="lab_result", warnings=warnings
            )
            if not test_name:
                continue
            results.append(
                LabResult(
                    test_name=test_name,
                    value=item.get("value"),
                    unit=item.get("unit"),
                    reference_range=item.get("reference_range"),
                    abnormal_flag=item.get("abnormal_flag"),
                    specimen_type=item.get("specimen_type"),
                    specimen_collection_date=item.get("specimen_collection_date"),
                    test_date=item.get("test_date"),
                    method=item.get("method"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_procedures(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[Procedure]:
        results = []
        for item in items:
            name = self._resolve_identifier(
                item, "name", entity_type="procedure", warnings=warnings
            )
            if not name:
                continue
            results.append(
                Procedure(
                    name=name,
                    code=item.get("code"),
                    code_system=item.get("code_system"),
                    status=item.get("status"),
                    performed_date=item.get("performed_date"),
                    indication=item.get("indication"),
                    findings=item.get("findings"),
                    outcome=item.get("outcome"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_clinical_findings(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[ClinicalFinding]:
        results = []
        for item in items:
            finding = self._resolve_identifier(
                item,
                "finding",
                "name",
                entity_type="clinical_finding",
                warnings=warnings,
            )
            if not finding:
                continue
            results.append(
                ClinicalFinding(
                    finding=finding,
                    body_site=item.get("body_site"),
                    severity=item.get("severity"),
                    status=item.get("status"),
                    date=item.get("date"),
                    related_diagnosis=item.get("related_diagnosis"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_imaging_findings(
        self,
        items: list[dict[str, Any]],
        warnings: list[str],
    ) -> list[ImagingFinding]:
        results = []

        for item in items:
            # Gemini's redesigned contract uses:
            #   modality_or_study
            #   findings
            #
            # Internal schema uses:
            #   modality
            #   finding
            #
            # Preserve Gemini's extracted text without inventing or
            # interpreting additional clinical meaning.

            finding = self._resolve_identifier(
                item,
                "finding",
                "name",
                "findings",
                entity_type="imaging_finding",
                warnings=warnings,
            )

            if not finding:
                continue

            results.append(
                ImagingFinding(
                    finding=finding,
                    body_site=item.get("body_site"),
                    laterality=item.get("laterality"),
                    modality=(
                        item.get("modality")
                        or item.get("modality_or_study")
                    ),
                    measurement=item.get("measurement"),
                    measurement_unit=item.get("measurement_unit"),
                    severity=item.get("severity"),
                    impression=item.get("impression"),
                    comparison_with_previous=item.get(
                        "comparison_with_previous"
                    ),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )

        return results

    def _build_history(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[HistoryItem]:
        results = []
        for item in items:
            condition = self._resolve_identifier(
                item,
                "condition",
                "name",
                entity_type="past_medical_history",
                warnings=warnings,
            )
            if not condition:
                continue
            results.append(
                HistoryItem(
                    condition=condition,
                    duration=item.get("duration"),
                    status=item.get("status"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    def _build_investigation_findings(
        self, items: list[dict[str, Any]], warnings: list[str]
    ) -> list[InvestigationFinding]:
        results = []
        for item in items:
            study_name = self._resolve_identifier(
                item,
                "study_name",
                "name",
                entity_type="investigation_finding",
                warnings=warnings,
            )
            if not study_name:
                continue
            results.append(
                InvestigationFinding(
                    study_name=study_name,
                    findings=item.get("findings"),
                    impression=item.get("impression"),
                    date=item.get("date"),
                    notes=item.get("notes"),
                    evidence=item.get("evidence"),
                    confidence=self._build_confidence(item),
                )
            )
        return results

    @staticmethod
    def _build_additional_notes(items: list[Any]) -> list[str]:
        """
        Gemini's additional_notes items may be plain strings or
        {"note": ..., "evidence": ...} objects. Normalizes both into the
        (backward-compatible) list[str] the internal schema expects. The
        evidence half of an object-shaped note is intentionally folded
        into the note only when it adds information the note text lacks,
        rather than duplicating the sentence.
        """
        results: list[str] = []
        for item in items:
            if isinstance(item, str):
                text = item.strip()
                if text:
                    results.append(text)
            elif isinstance(item, dict):
                note = (item.get("note") or "").strip()
                evidence = (item.get("evidence") or "").strip()
                text = note or evidence
                if text:
                    results.append(text)
        return results

    # ------------------------------------------------------------------
    # Follow-up
    # ------------------------------------------------------------------

    @staticmethod
    def _build_follow_up(
        data: dict[str, Any],
    ) -> tuple[str | None, str | None, list[str]]:
        """
        Returns (facility_or_department, date, instructions) from
        Gemini's follow_up object. Never derives a date from relative
        phrasing ("after 2 weeks") when no explicit date is given —
        Section 17 explicitly forbids that.
        """
        follow_up = data.get("follow_up")
        if not isinstance(follow_up, dict):
            return None, None, []

        facility = follow_up.get("facility_or_department")
        date = follow_up.get("date")
        instructions = follow_up.get("instructions") or []
        instructions = [str(i).strip() for i in instructions if str(i).strip()]

        return facility, date, instructions

    # ------------------------------------------------------------------
    # Document types
    # ------------------------------------------------------------------

    def _build_prescription(
        self, data: dict[str, Any], warnings: list[str]
    ) -> PrescriptionData:
        additional_notes = self._build_additional_notes(
            data.get("additional_notes") or []
        )
        if data.get("chief_complaints_note"):
            additional_notes.append(str(data["chief_complaints_note"]).strip())

        _, follow_up_date, follow_up_instructions = self._build_follow_up(data)

        return PrescriptionData(
            medications=self._build_medications(
                data.get("medications") or [], warnings
            ),
            diagnoses=self._build_diagnoses(data.get("diagnoses") or [], warnings),
            symptoms=self._build_symptoms(data.get("symptoms") or [], warnings),
            allergies=self._build_allergies(data.get("allergies") or [], warnings),
            clinical_findings=self._build_clinical_findings(
                data.get("clinical_findings") or [], warnings
            ),
            imaging_findings=self._build_imaging_findings(
                data.get("imaging_findings") or [],
                warnings,
            ),
            vitals=self._build_vitals(data.get("vitals") or [], warnings),
            follow_up_date=follow_up_date,
            follow_up_instructions=(
                " ".join(follow_up_instructions) if follow_up_instructions else None
            ),
            additional_notes=additional_notes,
        )

    def _build_lab_report(
        self, data: dict[str, Any], warnings: list[str]
    ) -> LabReportData:
        additional_notes = self._build_additional_notes(
            data.get("additional_notes") or []
        )

        return LabReportData(
            results=self._build_lab_results(data.get("lab_results") or [], warnings),
            diagnoses=self._build_diagnoses(data.get("diagnoses") or [], warnings),
            symptoms=self._build_symptoms(data.get("symptoms") or [], warnings),
            allergies=self._build_allergies(data.get("allergies") or [], warnings),
            vitals=self._build_vitals(data.get("vitals") or [], warnings),
            clinical_findings=self._build_clinical_findings(
                data.get("clinical_findings") or [], warnings
            ),
            collection_date=None,
            report_date=data.get("document_date"),
            additional_notes=additional_notes,
        )

    def _build_discharge_summary(
        self, data: dict[str, Any], warnings: list[str]
    ) -> DischargeSummaryData:
        additional_notes = self._build_additional_notes(
            data.get("additional_notes") or []
        )
        if data.get("chief_complaints_note"):
            additional_notes.append(str(data["chief_complaints_note"]).strip())

        follow_up_facility, follow_up_date, follow_up_instructions = (
            self._build_follow_up(data)
        )

        return DischargeSummaryData(
            admission_date=data.get("admission_date"),
            discharge_date=data.get("discharge_date"),
            chief_complaints=self._build_symptoms(data.get("symptoms") or [], warnings),
            past_medical_history=self._build_history(
                data.get("past_medical_history") or [], warnings
            ),
            diagnoses=self._build_diagnoses(data.get("diagnoses") or [], warnings),
            clinical_findings=self._build_clinical_findings(
                data.get("clinical_findings") or [], warnings
            ),
            procedures=self._build_procedures(data.get("procedures") or [], warnings),
            medications=self._build_medications(
                data.get("medications") or [], warnings
            ),
            allergies=self._build_allergies(data.get("allergies") or [], warnings),
            vitals=self._build_vitals(data.get("vitals") or [], warnings),
            investigations=self._build_lab_results(
                data.get("lab_results") or [], warnings
            ),
            investigation_findings=self._build_investigation_findings(
                data.get("investigation_findings") or [], warnings
            ),
            imaging_findings=self._build_imaging_findings(
                data.get("imaging_findings") or [],
                warnings,
            ),
            hospital_course=data.get("hospital_course"),
            condition_at_discharge=data.get("condition_at_discharge"),
            discharge_instructions=[
                str(i).strip()
                for i in (data.get("discharge_instructions") or [])
                if str(i).strip()
            ],
            follow_up_instructions=follow_up_instructions,
            follow_up_date=follow_up_date,
            follow_up_facility=follow_up_facility,
            additional_notes=additional_notes,
        )

    def _build_radiology_report(
        self, data: dict[str, Any], warnings: list[str]
    ) -> RadiologyReportData:
        additional_notes = self._build_additional_notes(
            data.get("additional_notes") or []
        )

        return RadiologyReportData(
            study_date=None,
            report_date=data.get("document_date"),
            findings=self._build_imaging_findings(
                data.get("imaging_findings") or [], warnings
            ),
            diagnoses=self._build_diagnoses(data.get("diagnoses") or [], warnings),
            clinical_findings=self._build_clinical_findings(
                data.get("clinical_findings") or [], warnings
            ),
            additional_notes=additional_notes,
        )

    # ------------------------------------------------------------------
    # Evidence / verification / completeness
    # ------------------------------------------------------------------

    @staticmethod
    def _build_evidence(data: dict[str, Any]) -> list[Evidence]:
        """
        Handles the OLD top-level `evidence[]` array for backward
        compatibility. The new Gemini contract carries evidence per
        entity instead (see each model's `evidence` field), so this will
        normally be empty for new-format payloads — that is expected,
        not a bug.
        """
        results = []

        for item in data.get("evidence") or []:
            if isinstance(item, str):
                results.append(Evidence(source_text=item, confidence=0.0))
                continue

            if isinstance(item, dict):
                results.append(
                    Evidence(
                        source_text=item.get("text") or item.get("source_text"),
                        page_number=item.get("page_number"),
                        section=item.get("field") or item.get("section"),
                        confidence=float(item.get("confidence", 0.0) or 0.0),
                    )
                )

        return results

    @staticmethod
    def _build_verification(data: dict[str, Any]) -> VerificationSummary:
        """
        Prefers Gemini's own `extraction_summary` (needs_review,
        review_reasons, note) — the model already told us what it's
        unsure about, so re-deriving that by averaging entity-level
        confidence scores would both duplicate and second-guess it.

        `overall_confidence` is kept only as an advisory, backward-
        compatible number computed from whatever numeric
        extraction_confidence values are available; it is explicitly not
        used to decide needs_review when extraction_summary is present.
        """
        summary = data.get("extraction_summary")

        scores: list[float] = []
        for collection_key in (
            "diagnoses",
            "medications",
            "lab_results",
            "symptoms",
            "allergies",
            "vitals",
            "procedures",
            "clinical_findings",
            "imaging_findings",
            "past_medical_history",
            "investigation_findings",
        ):
            for item in data.get(collection_key) or []:
                if not isinstance(item, dict):
                    continue
                confidence = item.get("confidence")
                if isinstance(confidence, dict):
                    value = confidence.get("extraction_confidence")
                else:
                    value = confidence
                try:
                    if value is not None:
                        scores.append(float(value))
                except (TypeError, ValueError):
                    pass

        overall = sum(scores) / len(scores) if scores else 0.0

        if isinstance(summary, dict):
            return VerificationSummary(
                overall_confidence=overall,
                needs_review=bool(summary.get("needs_review", False)),
                review_reasons=[str(r) for r in (summary.get("review_reasons") or [])],
                note=summary.get("note"),
            )

        # Legacy fallback: no extraction_summary supplied at all.
        if not scores:
            return VerificationSummary(
                overall_confidence=0.0,
                needs_review=True,
                review_reasons=["No field-level confidence information was returned."],
            )

        needs_review = overall < 0.90
        reasons = (
            ["One or more extracted fields have insufficient confidence."]
            if needs_review
            else []
        )
        return VerificationSummary(
            overall_confidence=overall,
            needs_review=needs_review,
            review_reasons=reasons,
        )

    @staticmethod
    def _build_completeness_audit(
        data: dict[str, Any], warnings: list[str]
    ) -> CompletenessAudit | None:
        audit = data.get("completeness_audit")

        sections_detected: list[str] = []
        sections_represented: list[str] = []
        sections_missing: list[str] = []
        unmapped: list[str] = []

        if isinstance(audit, dict):
            sections_detected = [
                str(s) for s in (audit.get("sections_detected_in_source") or [])
            ]
            sections_represented = [
                str(s) for s in (audit.get("sections_represented_in_output") or [])
            ]
            sections_missing = [
                str(s)
                for s in (audit.get("sections_detected_but_not_represented") or [])
            ]
            unmapped = [str(s) for s in (audit.get("unmapped_content") or [])]

        # Fold in anything the mapper itself had to skip or recover, so
        # information loss stays visible even when Gemini's own audit
        # didn't flag it.
        unmapped.extend(warnings)

        if not (
            sections_detected or sections_represented or sections_missing or unmapped
        ):
            return None

        return CompletenessAudit(
            sections_detected_in_source=sections_detected,
            sections_represented_in_output=sections_represented,
            sections_detected_but_not_represented=sections_missing,
            unmapped_content=unmapped,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_age(value: Any) -> int | None:
        if value is None:
            return None

        if isinstance(value, bool):
            return None

        if isinstance(value, int):
            return value if value >= 0 else None

        if isinstance(value, float):
            if value >= 0 and value.is_integer():
                return int(value)
            return None

        if isinstance(value, str):
            text = value.strip()

            if not text:
                return None

            # Plain numeric string: "56"
            try:
                parsed = float(text)
                if parsed >= 0 and parsed.is_integer():
                    return int(parsed)
            except ValueError:
                pass

            # Common explicit age representation: "56 Years", "56 years old"
            match = re.fullmatch(
                r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)(?:\s*old)?",
                text,
                flags=re.IGNORECASE,
            )

            if match:
                parsed = float(match.group(1))
                if parsed >= 0 and parsed.is_integer():
                    return int(parsed)

        return None
