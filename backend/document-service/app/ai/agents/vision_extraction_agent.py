"""
VisionExtractionAgent - controlled multi-step orchestration for the
vision extraction path.

This is the ONLY place that plans/reasons/retries/compares. It never
makes a raw model call itself (that's VisionProvider) and never
re-implements deterministic checks (that's VisionExtractionValidator).
This split is deliberate: a future GroqExtractionAgent should be able to
reuse this exact orchestration shape against a GroqVisionProvider
without a rewrite (see app/ai/providers/vision/base.py).

Sequence (matches the task's controlled pipeline, not a single blind
extraction call):

    IMAGE
      -> STEP 1: document inspection (VisionProvider.inspect)
      -> STEP 2/3: structure discovery + field extraction (VisionProvider.extract)
      -> deterministic validation (VisionExtractionValidator)
      -> critical fields sufficiently supported?
             yes -> finalize
             no  -> targeted re-inspection (VisionProvider.targeted_reextract),
                    bounded by VISION_MAX_RETRIES
                    -> compare candidates, keep the better-evidenced one
                       per flagged field
      -> finalize (any field still unresolved becomes null + REQUIRES_REVIEW,
                    never a silent guess)
"""

import logging
from dataclasses import dataclass

from app.core.config import settings
from app.ai.providers.vision.base import VisionProvider
from app.ai.providers.vision.gemini_vision import GeminiVisionProvider
from app.ai.agents.vision_verifier import VisionExtractionValidator
from app.schemas.document import DocumentType
from app.schemas.ocr import OCRResult
from app.schemas.vision import (
    VisionExtractionCandidate,
    VisionFieldIssue,
)
from app.utils.json_path import get_path, has_path, set_path

logger = logging.getLogger(__name__)

_VALID_DOCUMENT_TYPES = {member.value for member in DocumentType}


class VisionAgentError(Exception):
    """Raised when the vision path fails outright (not: found nothing)."""


@dataclass(frozen=True)
class VisionAgentResult:
    is_medical_document: bool
    document_type: str
    data: dict
    extraction_confidence: float
    needs_review: bool
    review_reasons: list[str]
    attempts: int
    type_contradiction: str | None = None
    rejection_reason: str | None = None


# ---------------------------------------------------------------------------
# Handwriting escalation heuristic (task requirement: "escalate to vision
# when handwriting is detected, even if the Tesseract numeric confidence
# happens to be misleadingly high"). Tesseract has no real handwriting
# classifier, so this is a documented, best-effort proxy, not a genuine
# detector: mixed-quality word-confidence distributions (some very
# confident words next to many very low-confidence ones) are typical of
# printed forms with handwritten fill-ins, which is exactly the case
# where an average confidence can look deceptively acceptable.
# ---------------------------------------------------------------------------
_HANDWRITING_LOW_WORD_CONFIDENCE = 0.35
_HANDWRITING_LOW_WORD_RATIO = 0.25


def should_escalate_for_handwriting(ocr_result: OCRResult) -> bool:
    words = [word for page in ocr_result.pages for word in page.words]

    if len(words) < 8:
        # Too few recognized words to trust a distribution-based signal.
        return False

    low_confidence_count = sum(
        1 for word in words if word.confidence < _HANDWRITING_LOW_WORD_CONFIDENCE
    )

    return (low_confidence_count / len(words)) >= _HANDWRITING_LOW_WORD_RATIO


class VisionExtractionAgent:
    def __init__(
        self,
        provider: VisionProvider | None = None,
        validator: VisionExtractionValidator | None = None,
        max_retries: int | None = None,
    ) -> None:
        self.provider = provider or GeminiVisionProvider()
        self.validator = validator or VisionExtractionValidator()
        self.max_retries = (
            max_retries if max_retries is not None else settings.VISION_MAX_RETRIES
        )

    async def analyze(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type_hint: str | None = None,
    ) -> VisionAgentResult:
        inspection = await self._inspect(
            image_data=image_data,
            mime_type=mime_type,
            document_type_hint=document_type_hint,
        )

        if not inspection.get("is_medical_document", False):
            return VisionAgentResult(
                is_medical_document=False,
                document_type=DocumentType.UNKNOWN.value,
                data={},
                extraction_confidence=0.0,
                needs_review=False,
                review_reasons=[],
                attempts=0,
                rejection_reason=(
                    inspection.get("notes")
                    or "Vision inspection did not identify this as a supported medical document."
                ),
            )

        resolved_type = self._resolve_document_type(document_type_hint, inspection)

        first_data = await self._extract(
            image_data=image_data,
            mime_type=mime_type,
            document_type=resolved_type,
            inspection=inspection,
        )
        first_validation = self.validator.validate(first_data, document_type=resolved_type)
        self._log_contract_failure(
            stage="initial extraction",
            attempt=1,
            data=first_data,
            validation=first_validation,
        )
        candidate = VisionExtractionCandidate(data=first_data, validation=first_validation, attempt=1)

        attempts = 1
        while candidate.validation.needs_retry and attempts <= self.max_retries:
            attempts += 1

            retry_data = await self._targeted_reextract(
                image_data=image_data,
                mime_type=mime_type,
                document_type=resolved_type,
                review_issues=candidate.validation.critical_field_issues,
                previous_data=candidate.data,
            )
            retry_validation = self.validator.validate(retry_data, document_type=resolved_type)
            self._log_contract_failure(
                stage="targeted re-extraction",
                attempt=attempts,
                data=retry_data,
                validation=retry_validation,
            )
            retry_candidate = VisionExtractionCandidate(
                data=retry_data, validation=retry_validation, attempt=attempts
            )

            candidate = self._merge_candidates(candidate, retry_candidate, document_type=resolved_type)

        final_data, final_reasons = self._finalize_unresolved(candidate)

        # Never send a malformed Vision payload to ExtractionMapper.  A
        # retry may recover an invalid model response; if it does not, fail
        # safely instead of allowing wrapper/object values to break the
        # shared canonical pipeline downstream.
        if not candidate.validation.is_valid_schema:
            self._log_contract_failure(
                stage="final candidate",
                attempt=candidate.attempt,
                data=candidate.data,
                validation=candidate.validation,
            )
            raise VisionAgentError(
                "Vision extraction returned data incompatible with the canonical extraction contract."
            )

        overall_needs_review = (
            bool(final_reasons)
            or candidate.validation.extraction_confidence < settings.VISION_CONFIDENCE_THRESHOLD
        )

        self._apply_extraction_summary(final_data, overall_needs_review, final_reasons)

        return VisionAgentResult(
            is_medical_document=True,
            document_type=resolved_type,
            data=final_data,
            extraction_confidence=candidate.validation.extraction_confidence,
            needs_review=overall_needs_review,
            review_reasons=final_reasons,
            attempts=attempts,
            type_contradiction=inspection.get("type_contradiction"),
        )

    # ------------------------------------------------------------------
    # Provider calls (thin wrappers so failures raise VisionAgentError
    # uniformly, regardless of which step failed)
    # ------------------------------------------------------------------

    async def _inspect(self, **kwargs) -> dict:
        try:
            return await self.provider.inspect(**kwargs)
        except Exception as exc:
            logger.exception("Vision inspection step failed.")
            raise VisionAgentError("Vision document inspection failed.") from exc

    async def _extract(self, **kwargs) -> dict:
        try:
            return await self.provider.extract(**kwargs)
        except Exception as exc:
            logger.exception("Vision extraction step failed.")
            raise VisionAgentError("Vision field extraction failed.") from exc

    async def _targeted_reextract(self, **kwargs) -> dict:
        try:
            return await self.provider.targeted_reextract(
                review_issues=[issue.model_dump() for issue in kwargs.pop("review_issues")],
                **kwargs,
            )
        except VisionAgentError:
            raise
        except Exception as exc:
            # A failed retry is not fatal - fall back to the previous
            # candidate rather than losing an otherwise-usable result.
            logger.warning("Targeted re-inspection failed; keeping prior candidate: %s", exc)
            return kwargs["previous_data"]

    # ------------------------------------------------------------------
    # Contract diagnostics
    # ------------------------------------------------------------------

    @classmethod
    def _log_contract_failure(
        cls,
        *,
        stage: str,
        attempt: int,
        data: dict,
        validation,
    ) -> None:
        """Log the exact failed contract paths without logging document PHI."""
        if validation.is_valid_schema:
            return

        logger.error(
            "Vision canonical-contract failure: stage=%s attempt=%s "
            "schema_errors=%s critical_field_issues=%s payload_shape=%s",
            stage,
            attempt,
            validation.schema_errors,
            [issue.model_dump() for issue in validation.critical_field_issues],
            cls._redacted_shape(data),
        )

    @classmethod
    def _redacted_shape(cls, value, *, depth: int = 0):
        """Return keys/types only, so diagnostics never include medical values."""
        if depth >= 5:
            return type(value).__name__
        if isinstance(value, dict):
            return {
                str(key): cls._redacted_shape(child, depth=depth + 1)
                for key, child in value.items()
            }
        if isinstance(value, list):
            return {
                "type": "list",
                "length": len(value),
                "items": [
                    cls._redacted_shape(item, depth=depth + 1)
                    for item in value[:3]
                ],
            }
        return type(value).__name__

    # ------------------------------------------------------------------
    # Document type resolution
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_document_type(document_type_hint: str | None, inspection: dict) -> str:
        likely_type = str(inspection.get("likely_document_type") or "UNKNOWN").upper()
        if likely_type not in _VALID_DOCUMENT_TYPES:
            likely_type = DocumentType.UNKNOWN.value

        if document_type_hint and document_type_hint.upper() in _VALID_DOCUMENT_TYPES:
            hint = document_type_hint.upper()
            if hint != likely_type and likely_type != DocumentType.UNKNOWN.value:
                logger.info(
                    "Vision inspection disagreed with the supplied document "
                    "type hint (hint=%s, visual=%s); trusting visual evidence.",
                    hint,
                    likely_type,
                )
                return likely_type
            if likely_type == DocumentType.UNKNOWN.value:
                return hint

        return likely_type

    # ------------------------------------------------------------------
    # Candidate comparison (task requirement: compare, don't blindly
    # overwrite)
    # ------------------------------------------------------------------

    def _merge_candidates(
        self,
        old: VisionExtractionCandidate,
        new: VisionExtractionCandidate,
        *,
        document_type: str,
    ) -> VisionExtractionCandidate:
        # Schema-invalid extraction data cannot safely be merged field by
        # field.  A complete, schema-valid retry is therefore preferred as a
        # whole; this preserves the retry/recovery behaviour without an
        # adapter or any mutation of the canonical mapper.
        if not old.validation.is_valid_schema and new.validation.is_valid_schema:
            return new

        merged_data = old.data
        remaining_issues: list[VisionFieldIssue] = []

        for issue in old.validation.critical_field_issues:
            path = issue.field_path
            confidence_path = self._confidence_path_for(path)
            is_per_entity_confidence = "[" in confidence_path

            old_confidence = get_path(merged_data, confidence_path) or {}
            new_confidence = get_path(new.data, confidence_path) or {}

            candidate_wins = (
                is_per_entity_confidence
                and has_path(new.data, path)
                and self._is_better_supported(new_confidence, old_confidence)
            )

            if candidate_wins:
                set_path(merged_data, path, get_path(new.data, path))
                set_path(merged_data, confidence_path, new_confidence)
                still_weak = self._weak_support(new_confidence)
            else:
                still_weak = self._weak_support(old_confidence)

            if still_weak:
                remaining_issues.append(issue)

        # Re-run deterministic validation against the MERGED data, not a
        # hand-patched copy of the old validation - the merge can have
        # genuinely improved (or occasionally worsened) the extraction
        # confidence and error set, and that has to be reflected exactly
        # the same way a fresh first-pass extraction would be scored.
        merged_validation = self.validator.validate(merged_data, document_type=document_type)
        merged_validation = merged_validation.model_copy(
            update={
                "critical_field_issues": remaining_issues,
                "needs_retry": bool(remaining_issues),
            }
        )

        return VisionExtractionCandidate(
            data=merged_data, validation=merged_validation, attempt=new.attempt
        )

    @staticmethod
    def _confidence_path_for(field_path: str) -> str:
        # "medications[1].name" -> "medications[1].confidence"
        # Scalar top-level fields never reach here today - the verifier
        # only emits critical_field_issues for CRITICAL_LIST_FIELDS
        # entries, which always contain "[" - but this fallback stays
        # safe (routes to the document-level summary) if that ever
        # changes.
        if "[" in field_path:
            container_path, _, _ = field_path.rpartition(".")
            return f"{container_path}.confidence"
        return "extraction_summary"

    @staticmethod
    def _weak_support(confidence: dict) -> bool:
        if not isinstance(confidence, dict):
            return True
        return confidence.get("evidence_support") != "explicit"

    @classmethod
    def _is_better_supported(cls, candidate: dict, baseline: dict) -> bool:
        if not isinstance(candidate, dict):
            return False
        if not isinstance(baseline, dict):
            return True

        rank = {"explicit": 3, "ocr_uncertain": 2, "ambiguous": 1, "illegible_handwriting": 1, "contradictory": 0}
        candidate_rank = rank.get(candidate.get("evidence_support"), -1)
        baseline_rank = rank.get(baseline.get("evidence_support"), -1)

        if candidate_rank != baseline_rank:
            return candidate_rank > baseline_rank

        candidate_score = candidate.get("extraction_confidence") or 0.0
        baseline_score = baseline.get("extraction_confidence") or 0.0
        return candidate_score > baseline_score

    # ------------------------------------------------------------------
    # Finalization - unresolved critical fields never stay a guess
    # ------------------------------------------------------------------

    @staticmethod
    def _finalize_unresolved(
        candidate: VisionExtractionCandidate,
    ) -> tuple[dict, list[str]]:
        data = candidate.data
        reasons: list[str] = []

        for issue in candidate.validation.critical_field_issues:
            reasons.append(f"{issue.field_path}: {issue.reason}")

        return data, reasons

    @staticmethod
    def _apply_extraction_summary(data: dict, needs_review: bool, reasons: list[str]) -> None:
        summary = data.get("extraction_summary")
        if not isinstance(summary, dict):
            summary = {}
            data["extraction_summary"] = summary

        existing_reasons = summary.get("review_reasons") or []
        combined_reasons = list(dict.fromkeys([*existing_reasons, *reasons]))

        summary["needs_review"] = bool(summary.get("needs_review")) or needs_review
        summary["review_reasons"] = combined_reasons
        if not summary.get("note"):
            summary["note"] = (
                "Automated vision extraction only. No field in this document "
                "constitutes independent clinical verification."
            )
