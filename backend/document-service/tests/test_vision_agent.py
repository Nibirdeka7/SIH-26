import pytest

from app.ai.agents.vision_extraction_agent import (
    VisionAgentError,
    VisionExtractionAgent,
    should_escalate_for_handwriting,
)
from app.ai.agents.vision_verifier import VisionExtractionValidator
from app.ai.providers.vision.base import VisionProvider
from app.schemas.document import DocumentType
from app.schemas.ocr import OCRExtractionMethod, OCRPageResult, OCRResult, OCRWord


def _confidence(score=0.9, support="explicit", status="not_independently_verified"):
    return {
        "extraction_confidence": score,
        "evidence_support": support,
        "verification_status": status,
    }


def _base_extraction(**overrides):
    doc = {
        "patient": {"name": "John Doe"},
        "provider": {},
        "document_date": "2024-01-01",
        "medications": [],
        "diagnoses": [],
        "symptoms": [],
        "allergies": [],
        "vitals": [],
        "lab_results": [],
        "investigation_findings": [],
        "imaging_findings": [],
        "clinical_findings": [],
        "past_medical_history": [],
        "procedures": [],
        "additional_notes": [],
        "completeness_audit": {
            "sections_detected_in_source": ["medications"],
            "sections_represented_in_output": ["medications"],
            "sections_detected_but_not_represented": [],
            "unmapped_content": [],
        },
        "extraction_summary": {"needs_review": False, "review_reasons": [], "note": None},
    }
    doc.update(overrides)
    return doc


class _ScriptedVisionProvider(VisionProvider):
    """
    Deterministic fake provider driven entirely by pre-scripted responses,
    so agent orchestration (retry/merge/finalize) can be tested without
    any real model call - per the task's testing requirement to use
    mocked responses and never depend on a live API.
    """

    def __init__(self, inspection, extract_responses, reextract_response=None, raise_on_extract=False):
        self._inspection = inspection
        self._extract_responses = list(extract_responses)
        self._reextract_response = reextract_response
        self._raise_on_extract = raise_on_extract
        self.reextract_calls = []

    async def inspect(self, *, image_data, mime_type, document_type_hint=None):
        return self._inspection

    async def extract(self, *, image_data, mime_type, document_type, inspection):
        if self._raise_on_extract:
            raise RuntimeError("simulated extraction failure")
        return self._extract_responses.pop(0)

    async def targeted_reextract(
        self, *, image_data, mime_type, document_type, review_issues, previous_data
    ):
        self.reextract_calls.append(review_issues)
        return self._reextract_response


@pytest.mark.asyncio
async def test_non_medical_document_is_rejected_without_extraction():
    provider = _ScriptedVisionProvider(
        inspection={"is_medical_document": False, "notes": "Looks like a grocery receipt."},
        extract_responses=[],
    )
    agent = VisionExtractionAgent(provider=provider, validator=VisionExtractionValidator())

    result = await agent.analyze(image_data=b"fake", mime_type="image/png")

    assert result.is_medical_document is False
    assert "grocery receipt" in result.rejection_reason
    assert result.attempts == 0


@pytest.mark.asyncio
async def test_well_supported_first_pass_finalizes_without_retry():
    inspection = {
        "is_medical_document": True,
        "likely_document_type": "PRESCRIPTION",
        "document_form": "PRINTED",
        "image_quality_sufficient": True,
        "ambiguous_regions": [],
        "type_contradiction": None,
    }
    extraction = _base_extraction(
        medications=[
            {
                "name": "Metformin",
                "strength": "500 mg",
                "dose": "1 tablet",
                "frequency": "twice daily",
                "evidence": "Metformin 500 mg 1 tab BD",
                "confidence": _confidence(0.95),
            }
        ]
    )
    provider = _ScriptedVisionProvider(inspection=inspection, extract_responses=[extraction])
    agent = VisionExtractionAgent(provider=provider, validator=VisionExtractionValidator())

    result = await agent.analyze(image_data=b"fake", mime_type="image/png")

    assert result.is_medical_document is True
    assert result.document_type == DocumentType.PRESCRIPTION.value
    assert result.attempts == 1
    assert not provider.reextract_calls
    assert result.needs_review is False
    assert result.data["medications"][0]["name"] == "Metformin"


@pytest.mark.asyncio
async def test_illegible_medication_triggers_targeted_retry_and_improves():
    inspection = {
        "is_medical_document": True,
        "likely_document_type": "PRESCRIPTION",
        "document_form": "HANDWRITTEN",
        "image_quality_sufficient": True,
        "ambiguous_regions": ["first medication line"],
        "type_contradiction": None,
    }
    first_pass = _base_extraction(
        medications=[
            {
                "name": "Metformin",
                "strength": "500 mg",
                "dose": None,
                "frequency": None,
                "evidence": "Metf... 500 mg",
                "confidence": _confidence(0.4, support="illegible_handwriting", status="needs_review"),
            }
        ]
    )
    retry_pass = _base_extraction(
        medications=[
            {
                "name": "Metformin",
                "strength": "500 mg",
                "dose": "1 tablet",
                "frequency": "twice daily",
                "evidence": "Metformin 500 mg 1 tab BD, on closer inspection",
                "confidence": _confidence(0.9, support="explicit", status="not_independently_verified"),
            }
        ]
    )
    provider = _ScriptedVisionProvider(
        inspection=inspection,
        extract_responses=[first_pass],
        reextract_response=retry_pass,
    )
    agent = VisionExtractionAgent(
        provider=provider,
        validator=VisionExtractionValidator(critical_field_threshold=0.75),
        max_retries=1,
    )

    result = await agent.analyze(image_data=b"fake", mime_type="image/png")

    assert result.attempts == 2
    assert len(provider.reextract_calls) == 1
    assert provider.reextract_calls[0][0]["field_path"] == "medications[0].name"
    # The retry had stronger evidence, so it should win the field-level merge.
    assert result.data["medications"][0]["name"] == "Metformin"
    assert result.data["medications"][0]["confidence"]["evidence_support"] == "explicit"
    assert result.needs_review is False


@pytest.mark.asyncio
async def test_unresolved_illegible_field_stays_null_and_flagged_not_guessed():
    inspection = {
        "is_medical_document": True,
        "likely_document_type": "PRESCRIPTION",
        "document_form": "HANDWRITTEN",
        "image_quality_sufficient": False,
        "ambiguous_regions": ["second medication line"],
        "type_contradiction": None,
    }
    first_pass = _base_extraction(
        medications=[
            {
                "name": None,
                "strength": None,
                "dose": None,
                "frequency": None,
                "evidence": "illegible scrawl",
                "confidence": _confidence(0.15, support="illegible_handwriting", status="needs_review"),
            }
        ]
    )
    # Retry still cannot read it - the model honestly returns null again.
    retry_pass = _base_extraction(
        medications=[
            {
                "name": None,
                "strength": None,
                "dose": None,
                "frequency": None,
                "evidence": "illegible scrawl",
                "confidence": _confidence(0.1, support="illegible_handwriting", status="needs_review"),
            }
        ]
    )
    provider = _ScriptedVisionProvider(
        inspection=inspection,
        extract_responses=[first_pass],
        reextract_response=retry_pass,
    )
    agent = VisionExtractionAgent(
        provider=provider,
        validator=VisionExtractionValidator(critical_field_threshold=0.75),
        max_retries=1,
    )

    result = await agent.analyze(image_data=b"fake", mime_type="image/png")

    # Since medications[0].name was null on both attempts, there was
    # nothing for the merge to prefer - the field-level issue for a null
    # field never even gets raised (nothing populated to flag), but the
    # deterministic validator's *other* checks and low overall confidence
    # must still drive the document to REQUIRES_REVIEW rather than a
    # silently "clean" result.
    assert result.data["medications"][0]["name"] is None
    assert result.needs_review is True


@pytest.mark.asyncio
async def test_provider_failure_raises_vision_agent_error():
    provider = _ScriptedVisionProvider(
        inspection={"is_medical_document": True, "likely_document_type": "PRESCRIPTION"},
        extract_responses=[],
        raise_on_extract=True,
    )
    agent = VisionExtractionAgent(provider=provider, validator=VisionExtractionValidator())

    with pytest.raises(VisionAgentError):
        await agent.analyze(image_data=b"fake", mime_type="image/png")


@pytest.mark.asyncio
async def test_schema_invalid_vision_data_never_reaches_the_shared_mapper(caplog):
    inspection = {
        "is_medical_document": True,
        "likely_document_type": "PRESCRIPTION",
        "document_form": "PRINTED",
        "image_quality_sufficient": True,
        "ambiguous_regions": [],
        "type_contradiction": None,
    }
    extraction = _base_extraction(
        patient={"name": {"value": "John Doe", "evidence": "John Doe"}}
    )
    provider = _ScriptedVisionProvider(inspection=inspection, extract_responses=[extraction])
    agent = VisionExtractionAgent(provider=provider, validator=VisionExtractionValidator(), max_retries=0)

    with pytest.raises(VisionAgentError, match="canonical extraction contract"):
        await agent.analyze(image_data=b"fake", mime_type="image/png")

    assert "patient.name" in caplog.text
    assert "payload_shape" in caplog.text


@pytest.mark.asyncio
async def test_document_type_hint_contradiction_is_recorded_not_silently_overridden():
    inspection = {
        "is_medical_document": True,
        "likely_document_type": "LAB_REPORT",
        "document_form": "PRINTED",
        "image_quality_sufficient": True,
        "ambiguous_regions": [],
        "type_contradiction": "Upstream classifier said PRESCRIPTION, but this looks like a lab report.",
    }
    extraction = _base_extraction()
    provider = _ScriptedVisionProvider(inspection=inspection, extract_responses=[extraction])
    agent = VisionExtractionAgent(provider=provider, validator=VisionExtractionValidator())

    result = await agent.analyze(
        image_data=b"fake", mime_type="image/png", document_type_hint="PRESCRIPTION"
    )

    assert result.document_type == DocumentType.LAB_REPORT.value
    assert result.type_contradiction is not None


def test_retry_budget_is_bounded_by_max_retries():
    class _AlwaysNeedsRetryValidator(VisionExtractionValidator):
        def validate(self, data, *, document_type):
            result = super().validate(data, document_type=document_type)
            return result.model_copy(update={"needs_retry": True})

    inspection = {
        "is_medical_document": True,
        "likely_document_type": "PRESCRIPTION",
        "document_form": "HANDWRITTEN",
        "image_quality_sufficient": True,
        "ambiguous_regions": [],
        "type_contradiction": None,
    }
    extraction = _base_extraction(
        medications=[
            {
                "name": "X",
                "strength": "1 mg",
                "dose": "1",
                "frequency": "OD",
                "evidence": "X 1 mg",
                "confidence": _confidence(0.2, support="ambiguous", status="needs_review"),
            }
        ]
    )
    provider = _ScriptedVisionProvider(
        inspection=inspection,
        extract_responses=[extraction],
        reextract_response=extraction,
    )
    agent = VisionExtractionAgent(
        provider=provider,
        validator=_AlwaysNeedsRetryValidator(critical_field_threshold=0.75),
        max_retries=2,
    )

    import asyncio

    result = asyncio.run(agent.analyze(image_data=b"fake", mime_type="image/png"))

    # attempts = 1 (first pass) + up to max_retries retries
    assert result.attempts <= 3
    assert len(provider.reextract_calls) <= 2


# ---------------------------------------------------------------------------
# Handwriting escalation heuristic
# ---------------------------------------------------------------------------


def _ocr_result_with_word_confidences(confidences: list[float]) -> OCRResult:
    words = [
        OCRWord(text=f"w{i}", confidence=c, left=0, top=0, width=1, height=1)
        for i, c in enumerate(confidences)
    ]
    page = OCRPageResult(
        page_number=1,
        text=" ".join(w.text for w in words),
        ocr_confidence=sum(confidences) / len(confidences) if confidences else None,
        words=words,
        extraction_method=OCRExtractionMethod.OCR,
        used_ocr=True,
    )
    return OCRResult(text=page.text, ocr_confidence=page.ocr_confidence, pages=[page])


def test_handwriting_heuristic_flags_bimodal_confidence_distribution():
    # 12 words: 6 confident (printed letterhead), 6 very low (handwritten
    # fill-ins) - average could look acceptable, but the mix is exactly
    # the deceptive case this heuristic exists for.
    confidences = [0.95] * 6 + [0.1] * 6
    ocr_result = _ocr_result_with_word_confidences(confidences)

    assert should_escalate_for_handwriting(ocr_result) is True


def test_handwriting_heuristic_does_not_flag_uniformly_confident_text():
    confidences = [0.9] * 12
    ocr_result = _ocr_result_with_word_confidences(confidences)

    assert should_escalate_for_handwriting(ocr_result) is False


def test_handwriting_heuristic_ignores_too_few_words():
    confidences = [0.1] * 5
    ocr_result = _ocr_result_with_word_confidences(confidences)

    assert should_escalate_for_handwriting(ocr_result) is False
