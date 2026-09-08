"""
Deterministic validation for vision extraction output.

This module makes NO model calls. It is pure Python validating a dict
already shaped like the EXTRACTION_JSON_SCHEMA contract
(app/ai/providers/vision/prompts.py). Its job is exactly what the task
brief calls out: "Do NOT blindly trust model-generated confidence" - the
model may hand back a confidence number, but this layer independently
checks schema shape, evidence presence, confidence-status consistency,
critical-field support, and a handful of cheap hallucination heuristics,
then computes an application-level "extraction_confidence" from multiple
signals rather than trusting the model's number verbatim.

`extraction_confidence` here is an ENGINEERING score for routing
decisions (does this need a retry? does it need REQUIRES_REVIEW?) - it
is explicitly not, and must never be presented as, clinical certainty.
"""

from typing import Any

from app.core.config import settings
from app.schemas.vision import VisionFieldIssue, VisionValidationResult
from app.utils.json_path import get_path

# ---------------------------------------------------------------------------
# Critical field policy (task requirement: "Create a configurable set of
# critical fields"). Each entry in CRITICAL_LIST_FIELDS names the
# sub-fields, on every item of that list, whose weak support should
# influence needs_review/retry - independently per sub-field, so (for
# example) a confidently-read medication strength never props up a
# poorly-read medication name.
# ---------------------------------------------------------------------------
CRITICAL_SCALAR_FIELDS: tuple[str, ...] = (
    "patient.name",
    "document_date",
)

CRITICAL_LIST_FIELDS: dict[str, tuple[str, ...]] = {
    "diagnoses": ("name",),
    "medications": ("name", "strength", "dose", "frequency"),
    "lab_results": ("test_name", "value"),
}

_ALLOWED_EVIDENCE_SUPPORT = {
    "explicit",
    "ambiguous",
    "ocr_uncertain",
    "illegible_handwriting",
    "contradictory",
}
_ALLOWED_VERIFICATION_STATUS = {
    "not_independently_verified",
    "needs_review",
}
_NON_EXPLICIT_EVIDENCE_SUPPORT = _ALLOWED_EVIDENCE_SUPPORT - {"explicit"}

_ENTITY_COLLECTIONS: tuple[str, ...] = (
    "symptoms",
    "past_medical_history",
    "allergies",
    "vitals",
    "lab_results",
    "investigation_findings",
    "imaging_findings",
    "clinical_findings",
    "diagnoses",
    "procedures",
    "medications",
)

# Generic identifying key(s) checked per collection, mirroring
# ExtractionMapper's own `_resolve_identifier` calls - kept in sync
# deliberately, since a validator that disagrees with the mapper about
# what counts as an entity's identity would be worse than no validator.
_IDENTITY_KEYS: dict[str, tuple[str, ...]] = {
    "symptoms": ("name",),
    "past_medical_history": ("condition", "name"),
    "allergies": ("substance", "name"),
    "vitals": ("name", "type"),
    "lab_results": ("test_name",),
    "investigation_findings": ("study_name", "name"),
    "imaging_findings": ("finding", "name", "findings"),
    "clinical_findings": ("finding", "name"),
    "diagnoses": ("name",),
    "procedures": ("name",),
    "medications": ("name",),
}

# Evidence strings that look like a placeholder rather than a genuine
# source excerpt - a cheap but useful hallucination tripwire (task
# requirement #13, "suspicious hallucination patterns"). Not exhaustive
# by design: this catches the lazy/generic case, not every possible
# fabrication.
_SUSPICIOUS_GENERIC_EVIDENCE = {
    "medicine prescribed",
    "prescribed medication",
    "medication prescribed",
    "handwriting",
    "illegible",
    "not clear",
    "unclear",
    "n/a",
    "unknown",
}

# Named, documented weights for the multi-signal confidence score
# (task requirement: "If you introduce weights, make them configuration
# constants and explain them"). These are engineering choices, not a
# calibrated statistical model:
#   - model's own confidence carries the most weight, but is capped by
#     evidence support so a model that says "0.95, ambiguous" cannot
#     look as trustworthy as "0.95, explicit"
#   - deterministic validation errors subtract directly, since a schema
#     or consistency problem is evidence the extraction itself is
#     unreliable, independent of what the model claims
_WEIGHT_MODEL_CONFIDENCE = 0.55
_WEIGHT_EVIDENCE_SUPPORT = 0.30
_WEIGHT_COMPLETENESS = 0.15
_EVIDENCE_SUPPORT_SCORE = {
    "explicit": 1.0,
    "ocr_uncertain": 0.5,
    "ambiguous": 0.35,
    "illegible_handwriting": 0.2,
    "contradictory": 0.1,
}
_ERROR_PENALTY_PER_ISSUE = 0.05
_MAX_ERROR_PENALTY = 0.4


class VisionExtractionValidator:
    def __init__(self, critical_field_threshold: float | None = None) -> None:
        self.critical_field_threshold = (
            critical_field_threshold
            if critical_field_threshold is not None
            else settings.VISION_CRITICAL_FIELD_THRESHOLD
        )

    def validate(self, data: dict[str, Any], *, document_type: str) -> VisionValidationResult:
        schema_errors = self._check_schema(data)
        confidence_errors, confidence_samples = self._check_confidence_objects(data)
        consistency_errors = self._check_consistency(data)
        hallucination_errors = self._check_hallucination_patterns(data)

        all_errors = schema_errors + confidence_errors + consistency_errors + hallucination_errors

        critical_issues = self._check_critical_fields(data)

        completeness_ratio = self._completeness_ratio(data)
        extraction_confidence = self._score(
            confidence_samples=confidence_samples,
            completeness_ratio=completeness_ratio,
            error_count=len(all_errors),
        )

        needs_retry = bool(critical_issues) or bool(schema_errors)

        return VisionValidationResult(
            is_valid_schema=not schema_errors,
            schema_errors=all_errors,
            critical_field_issues=critical_issues,
            extraction_confidence=extraction_confidence,
            needs_retry=needs_retry,
        )

    # ------------------------------------------------------------------
    # 1. Schema correctness
    # ------------------------------------------------------------------

    @staticmethod
    def _check_schema(data: dict[str, Any]) -> list[str]:
        errors: list[str] = []

        if not isinstance(data, dict):
            return ["Top-level extraction result is not a JSON object."]

        for key in ("patient", "provider", "follow_up", "extraction_summary"):
            if key in data and data[key] is not None and not isinstance(data[key], dict):
                errors.append(f"'{key}' must be an object.")

        for key in _ENTITY_COLLECTIONS + ("additional_notes", "discharge_instructions"):
            value = data.get(key)
            if value is not None and not isinstance(value, list):
                errors.append(f"'{key}' must be a list.")
                continue
            for index, item in enumerate(value or []):
                # `additional_notes` and `discharge_instructions` are the
                # canonical contract's string collections.  All medical
                # entity collections above require object items.
                if key not in ("additional_notes", "discharge_instructions") and not isinstance(item, dict):
                    errors.append(f"'{key}[{index}]' must be an object, not a bare string/value.")

        # The canonical contract deliberately permits objects only at known
        # container boundaries (patient/provider/follow_up), and for an
        # entity's `confidence`.  A generated {"value": ..., "evidence":
        # ...} wrapper would otherwise reach ExtractionMapper as the value of
        # a primitive field and fail there.  Catch it at the Vision boundary
        # so the Vision path can never contaminate the established mapper
        # contract.
        for container in ("patient", "provider"):
            item = data.get(container)
            if not isinstance(item, dict):
                continue
            for field, value in item.items():
                if isinstance(value, (dict, list)):
                    errors.append(
                        f"'{container}.{field}' must be a primitive value or null, not an object/list."
                    )

        for collection in _ENTITY_COLLECTIONS:
            for index, item in enumerate(data.get(collection) or []):
                if not isinstance(item, dict):
                    continue
                for field, value in item.items():
                    if field == "confidence":
                        continue
                    if field == "associated_factors" and isinstance(value, list):
                        continue
                    if isinstance(value, (dict, list)):
                        errors.append(
                            f"'{collection}[{index}].{field}' must be a primitive value or null, "
                            "not an object/list."
                        )

        return errors

    # ------------------------------------------------------------------
    # 2-4. Evidence presence, confidence range, status consistency
    # ------------------------------------------------------------------

    def _check_confidence_objects(
        self, data: dict[str, Any]
    ) -> tuple[list[str], list[tuple[float, str]]]:
        errors: list[str] = []
        samples: list[tuple[float, str]] = []

        for collection in _ENTITY_COLLECTIONS:
            identity_keys = _IDENTITY_KEYS.get(collection, ("name",))

            for index, item in enumerate(data.get(collection) or []):
                if not isinstance(item, dict):
                    continue

                path_prefix = f"{collection}[{index}]"
                has_identity = any(item.get(key) for key in identity_keys)

                if not has_identity:
                    # Not itself an error - a populated entity with no
                    # identity is dropped by ExtractionMapper anyway - but
                    # only genuinely empty placeholder objects should
                    # reach this point at all.
                    continue

                if not item.get("evidence"):
                    errors.append(f"{path_prefix}: populated entity has no 'evidence'.")

                confidence = item.get("confidence")

                if confidence is None:
                    errors.append(f"{path_prefix}: populated entity has no 'confidence'.")
                    continue

                if not isinstance(confidence, dict):
                    errors.append(f"{path_prefix}.confidence must be an object.")
                    continue

                score = confidence.get("extraction_confidence")
                if not isinstance(score, (int, float)) or not (0.0 <= float(score) <= 1.0):
                    errors.append(
                        f"{path_prefix}.confidence.extraction_confidence must be in [0, 1]."
                    )
                    score = None

                evidence_support = confidence.get("evidence_support")
                if evidence_support not in _ALLOWED_EVIDENCE_SUPPORT:
                    errors.append(
                        f"{path_prefix}.confidence.evidence_support "
                        f"has an unexpected value: {evidence_support!r}."
                    )

                verification_status = confidence.get("verification_status")
                if verification_status not in _ALLOWED_VERIFICATION_STATUS:
                    errors.append(
                        f"{path_prefix}.confidence.verification_status "
                        f"has an unexpected value: {verification_status!r}."
                    )
                elif verification_status == "not_independently_verified" and (
                    evidence_support in _NON_EXPLICIT_EVIDENCE_SUPPORT
                ):
                    errors.append(
                        f"{path_prefix}: evidence_support={evidence_support!r} but "
                        f"verification_status was not escalated to 'needs_review'."
                    )

                if score is not None and isinstance(evidence_support, str):
                    samples.append((float(score), evidence_support))

        return errors, samples

    # ------------------------------------------------------------------
    # 7-11. Duplicates, impossible values, malformed numbers/dates
    # ------------------------------------------------------------------

    @staticmethod
    def _check_consistency(data: dict[str, Any]) -> list[str]:
        errors: list[str] = []

        # 7. duplicate entities (same identity value repeated verbatim
        # within the same collection - repeated MEASUREMENTS at
        # different contexts are legitimate and excluded from this
        # check by requiring an exact (name, context) collision only
        # where no per-entity context/date field exists).
        for collection, identity_keys in _IDENTITY_KEYS.items():
            seen: set[str] = set()
            for item in data.get(collection) or []:
                if not isinstance(item, dict):
                    continue
                identity = next(
                    (item.get(key) for key in identity_keys if item.get(key)), None
                )
                if not identity:
                    continue
                context = item.get("context") or item.get("measurement_date") or item.get("test_date")
                dedupe_key = f"{identity}|{context}"
                if dedupe_key in seen:
                    errors.append(
                        f"{collection}: duplicate entity for {identity!r} "
                        f"(same identity and context)."
                    )
                seen.add(dedupe_key)

        # 8. impossible patient age
        age = get_path(data, "patient.age")
        if isinstance(age, (int, float)) and not (0 <= age <= 130):
            errors.append(f"patient.age is out of a plausible range: {age!r}.")

        # 9. malformed medication strength/dose sanity (soft check: a
        # non-null strength/dose should contain at least one digit -
        # catches obvious garbage without policing formatting).
        for index, medication in enumerate(data.get("medications") or []):
            if not isinstance(medication, dict):
                continue
            for field in ("strength", "dose"):
                value = medication.get(field)
                if isinstance(value, str) and value.strip() and not any(c.isdigit() for c in value):
                    errors.append(
                        f"medications[{index}].{field}={value!r} contains no digits "
                        f"- verify this is not a misread label."
                    )

        return errors

    # ------------------------------------------------------------------
    # 13-14. Suspicious hallucination / unsupported-inference patterns
    # ------------------------------------------------------------------

    @staticmethod
    def _check_hallucination_patterns(data: dict[str, Any]) -> list[str]:
        errors: list[str] = []

        for collection in _ENTITY_COLLECTIONS:
            identity_keys = _IDENTITY_KEYS.get(collection, ("name",))

            for index, item in enumerate(data.get(collection) or []):
                if not isinstance(item, dict):
                    continue

                identity = next(
                    (item.get(key) for key in identity_keys if item.get(key)), None
                )
                if not identity:
                    continue

                evidence = (item.get("evidence") or "").strip().lower()
                confidence = item.get("confidence") or {}
                score = confidence.get("extraction_confidence") if isinstance(confidence, dict) else None

                if evidence in _SUSPICIOUS_GENERIC_EVIDENCE and isinstance(score, (int, float)) and score >= 0.6:
                    errors.append(
                        f"{collection}[{index}] ({identity!r}): high confidence "
                        f"({score}) but evidence looks like a generic placeholder "
                        f"('{evidence}'), not a real source excerpt."
                    )

        # Diagnoses inferred purely from lab/medication sections with no
        # own evidence text at all are exactly the forbidden inference
        # pattern (task rule: "never infer a diagnosis from medication
        # alone" / "...from an abnormal lab result").
        for index, diagnosis in enumerate(data.get("diagnoses") or []):
            if isinstance(diagnosis, dict) and diagnosis.get("name") and not diagnosis.get("evidence"):
                errors.append(
                    f"diagnoses[{index}] ({diagnosis.get('name')!r}) has no evidence "
                    f"- a diagnosis must never be inferred from other fields alone."
                )

        return errors

    # ------------------------------------------------------------------
    # Critical field policy
    # ------------------------------------------------------------------

    def _check_critical_fields(self, data: dict[str, Any]) -> list[VisionFieldIssue]:
        """
        NOTE on CRITICAL_SCALAR_FIELDS (patient.name, document_date): the
        EXTRACTION_JSON_SCHEMA contract has no per-field confidence object
        for top-level scalars (unlike every list-entity field, which
        carries its own `confidence`), so there is nothing to compare a
        retry candidate against for these two - a synthetic per-field
        check here would either always pass (no signal) or always fail
        (no signal to call "explicit"), neither of which is honest.
        These two therefore stay policy-documented but are assessed only
        through the model's own `extraction_summary.needs_review` self-
        report at the document level, not as individual retry targets.
        A follow-up could add a small `field_confidence` block to the
        contract if independent scalar-level confidence is needed later.
        """
        issues: list[VisionFieldIssue] = []

        for collection, sub_fields in CRITICAL_LIST_FIELDS.items():
            for index, item in enumerate(data.get(collection) or []):
                if not isinstance(item, dict):
                    continue
                for sub_field in sub_fields:
                    value = item.get(sub_field)
                    if value in (None, ""):
                        continue
                    issue = self._weak_support_issue(
                        data,
                        f"{collection}[{index}].{sub_field}",
                        f"{collection}[{index}].confidence",
                    )
                    if issue:
                        issues.append(issue)

        return issues

    def _weak_support_issue(
        self, data: dict[str, Any], field_path: str, confidence_path: str
    ) -> VisionFieldIssue | None:
        confidence = get_path(data, confidence_path)

        if not isinstance(confidence, dict):
            return VisionFieldIssue(
                field_path=field_path,
                reason="Critical field is populated but has no confidence object to support it.",
            )

        evidence_support = confidence.get("evidence_support")
        score = confidence.get("extraction_confidence")
        score = score if isinstance(score, (int, float)) else 0.0

        if evidence_support != "explicit" or score < self.critical_field_threshold:
            return VisionFieldIssue(
                field_path=field_path,
                reason=(
                    f"evidence_support={evidence_support!r}, "
                    f"extraction_confidence={score} is below the critical-field "
                    f"threshold ({self.critical_field_threshold})."
                ),
            )

        return None

    # ------------------------------------------------------------------
    # Multi-signal confidence score
    # ------------------------------------------------------------------

    @staticmethod
    def _completeness_ratio(data: dict[str, Any]) -> float:
        audit = data.get("completeness_audit")
        if not isinstance(audit, dict):
            return 1.0

        detected = audit.get("sections_detected_in_source") or []
        missing = audit.get("sections_detected_but_not_represented") or []

        if not detected:
            return 1.0

        return max(0.0, 1.0 - (len(missing) / len(detected)))

    @staticmethod
    def _score(
        *,
        confidence_samples: list[tuple[float, str]],
        completeness_ratio: float,
        error_count: int,
    ) -> float:
        if confidence_samples:
            model_component = sum(score for score, _ in confidence_samples) / len(confidence_samples)
            evidence_component = sum(
                _EVIDENCE_SUPPORT_SCORE.get(support, 0.3) for _, support in confidence_samples
            ) / len(confidence_samples)
        else:
            model_component = 0.0
            evidence_component = 0.0

        raw_score = (
            _WEIGHT_MODEL_CONFIDENCE * model_component
            + _WEIGHT_EVIDENCE_SUPPORT * evidence_component
            + _WEIGHT_COMPLETENESS * completeness_ratio
        )

        penalty = min(_MAX_ERROR_PENALTY, error_count * _ERROR_PENALTY_PER_ISSUE)

        return round(max(0.0, min(1.0, raw_score - penalty)), 4)
