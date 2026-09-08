"""
Internal contracts for the vision extraction path.

These are NOT the canonical MediKiosk extraction schema - that remains
app.schemas.extraction.ExtractionResult, produced by ExtractionMapper
exactly as it is today. These types exist purely as the typed boundary
between:

  GeminiVisionProvider  (app/ai/providers/vision/gemini_vision.py)
      = raw API I/O only
          |
          v
  VisionExtractionAgent (app/ai/agents/vision_extraction_agent.py)
      = orchestration/reasoning/verification/retry
          |
          v
  a plain dict shaped like GeminiProvider's own extraction JSON contract
      |
      v
  ExtractionMapper.map(gemini_data=..., ...)   <-- UNCHANGED

The agent's final output is deliberately just a dict in the same shape
GeminiProvider's text path already produces, so ExtractionMapper needs
zero changes to consume it.
"""

from enum import Enum

from pydantic import BaseModel, Field


class DocumentForm(str, Enum):
    PRINTED = "PRINTED"
    HANDWRITTEN = "HANDWRITTEN"
    MIXED = "MIXED"
    UNKNOWN = "UNKNOWN"


class VisionDocumentInspection(BaseModel):
    """Result of STEP 1 - document inspection (see prompts.build_inspection_prompt)."""

    is_medical_document: bool = False
    likely_document_type: str = "UNKNOWN"
    document_form: DocumentForm = DocumentForm.UNKNOWN
    image_quality_sufficient: bool = True
    has_tables_or_forms: bool = False
    ambiguous_regions: list[str] = Field(default_factory=list)

    # Populated only when a caller-supplied document_type hint disagreed
    # with what the model actually sees. Never silently discarded.
    type_contradiction: str | None = None

    notes: str | None = None


class VisionFieldIssue(BaseModel):
    """
    One entry in the deterministic validator's critical-field review
    list. Not part of the output contract - used internally to decide
    whether a targeted retry is needed, to build the retry prompt, and
    to explain the final REQUIRES_REVIEW reasons that get folded into
    `extraction_summary.review_reasons`.
    """

    field_path: str
    reason: str


class VisionValidationResult(BaseModel):
    """Output of the deterministic validation layer (vision_verifier.py)."""

    is_valid_schema: bool = True
    schema_errors: list[str] = Field(default_factory=list)

    critical_field_issues: list[VisionFieldIssue] = Field(default_factory=list)

    # Engineering confidence score - see vision_verifier.py module
    # docstring for exactly how this is computed and why. NOT a
    # clinical-certainty score.
    extraction_confidence: float = Field(ge=0.0, le=1.0, default=0.0)

    needs_retry: bool = False


class VisionExtractionCandidate(BaseModel):
    """
    One full extraction attempt (first pass or a targeted retry), paired
    with its deterministic validation outcome, so the agent can compare
    candidates before finalizing (see VisionExtractionAgent._select_better_candidate).
    """

    data: dict
    validation: VisionValidationResult
    attempt: int
