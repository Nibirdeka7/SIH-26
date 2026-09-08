"""
Pipeline-level integration tests for vision routing.

These mock OCRService and the vision agent/provider boundary rather than
depending on a live Gemini API or Tesseract text quality (per the task's
"no live API dependency in normal unit tests" requirement). They exist
to prove: (1) the text path is untouched when OCR confidence is high,
(2) low-confidence/no-text/handwriting-like OCR results route to vision,
and (3) a realistic vision agent result reaches ExtractionMapper and
produces a valid canonical ExtractionResult - the actual compatibility
guarantee the whole vision path exists to preserve.
"""

from io import BytesIO
from unittest.mock import AsyncMock

import pytest
from PIL import Image

from app.ai.agents.vision_extraction_agent import VisionAgentResult
from app.schemas.document import DocumentType, SupportedFileType
from app.schemas.extraction import ExtractionResult, VerificationStatus
from app.schemas.ocr import OCRExtractionMethod, OCRPageResult, OCRResult, OCRWord
from app.services.document_pipeline import DocumentPipeline, DocumentPipelineError


def _valid_png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (20, 20), "white").save(buffer, format="PNG")
    return buffer.getvalue()


def _valid_jpeg_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (20, 20), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


def _high_confidence_ocr_result(text: str) -> OCRResult:
    words = [OCRWord(text=w, confidence=0.95, left=0, top=0, width=1, height=1) for w in text.split()]
    page = OCRPageResult(
        page_number=1,
        text=text,
        ocr_confidence=0.95,
        words=words,
        extraction_method=OCRExtractionMethod.OCR,
        used_ocr=True,
    )
    return OCRResult(text=text, ocr_confidence=0.95, pages=[page])


def _low_confidence_ocr_result(text: str) -> OCRResult:
    words = [OCRWord(text=w, confidence=0.2, left=0, top=0, width=1, height=1) for w in text.split()]
    page = OCRPageResult(
        page_number=1,
        text=text,
        ocr_confidence=0.2,
        words=words,
        extraction_method=OCRExtractionMethod.OCR,
        used_ocr=True,
    )
    return OCRResult(text=text, ocr_confidence=0.2, pages=[page])


def _empty_ocr_result() -> OCRResult:
    return OCRResult(text="", ocr_confidence=None, pages=[])


@pytest.fixture
def pipeline():
    return DocumentPipeline()


@pytest.mark.asyncio
async def test_high_confidence_ocr_uses_text_path_and_never_touches_vision(pipeline, monkeypatch):
    monkeypatch.setattr(
        pipeline.ocr_service,
        "process",
        lambda **kwargs: _high_confidence_ocr_result(
            "Prescription Rx Patient Name John Doe Metformin 500 mg dosage twice daily"
        ),
    )

    vision_agent_mock = AsyncMock()
    monkeypatch.setattr(pipeline, "_get_vision_agent", lambda: vision_agent_mock)

    fake_provider = AsyncMock()
    fake_provider.analyze_document.return_value = {
        "raw_response": '{"patient": {"name": "John Doe"}, "medications": [], '
        '"diagnoses": [], "symptoms": [], "allergies": [], "vitals": [], '
        '"clinical_findings": [], "imaging_findings": []}'
    }
    monkeypatch.setattr("app.services.document_pipeline.get_ai_provider", lambda: fake_provider)

    result = await pipeline.process(filename="rx.png", file_data=_valid_png_bytes())

    assert result.ocr_confidence == 0.95
    assert isinstance(result.extraction, ExtractionResult)
    vision_agent_mock.analyze.assert_not_called()


@pytest.mark.asyncio
async def test_low_confidence_ocr_routes_to_vision(pipeline, monkeypatch):
    monkeypatch.setattr(
        pipeline.ocr_service,
        "process",
        lambda **kwargs: _low_confidence_ocr_result("Ormetst Atetarin asoseanin"),
    )

    vision_agent_mock = AsyncMock()
    vision_agent_mock.analyze.return_value = VisionAgentResult(
        is_medical_document=True,
        document_type=DocumentType.PRESCRIPTION.value,
        data={
            "patient": {"name": "John Doe"},
            "provider": {},
            "document_date": None,
            "medications": [
                {
                    "name": "Metformin",
                    "strength": "500 mg",
                    "dose": "1 tablet",
                    "frequency": "twice daily",
                    "evidence": "Metformin 500 mg 1 tab BD",
                    "confidence": {
                        "extraction_confidence": 0.9,
                        "evidence_support": "explicit",
                        "verification_status": "not_independently_verified",
                    },
                }
            ],
            "diagnoses": [],
            "symptoms": [],
            "allergies": [],
            "vitals": [],
            "clinical_findings": [],
            "imaging_findings": [],
            "additional_notes": [],
            "extraction_summary": {"needs_review": False, "review_reasons": [], "note": None},
        },
        extraction_confidence=0.9,
        needs_review=False,
        review_reasons=[],
        attempts=1,
    )
    monkeypatch.setattr(pipeline, "_get_vision_agent", lambda: vision_agent_mock)

    # Text-path provider must never be called for this document.
    text_provider_mock = AsyncMock()
    monkeypatch.setattr("app.services.document_pipeline.get_ai_provider", lambda: text_provider_mock)

    result = await pipeline.process(filename="handwritten_rx.png", file_data=_valid_png_bytes())

    assert result.ocr_confidence is None  # not meaningful on the vision path
    assert result.document_type == DocumentType.PRESCRIPTION
    assert isinstance(result.extraction, ExtractionResult)
    assert result.extraction.prescription.medications[0].name == "Metformin"
    text_provider_mock.analyze_document.assert_not_called()
    vision_agent_mock.analyze.assert_awaited_once()


@pytest.mark.asyncio
async def test_no_ocr_text_routes_to_vision_instead_of_hard_failing(pipeline, monkeypatch):
    monkeypatch.setattr(pipeline.ocr_service, "process", lambda **kwargs: _empty_ocr_result())

    vision_agent_mock = AsyncMock()
    vision_agent_mock.analyze.return_value = VisionAgentResult(
        is_medical_document=True,
        document_type=DocumentType.PRESCRIPTION.value,
        data={
            "patient": {"name": None},
            "medications": [],
            "diagnoses": [],
            "symptoms": [],
            "allergies": [],
            "vitals": [],
            "clinical_findings": [],
            "imaging_findings": [],
            "additional_notes": [],
            "extraction_summary": {"needs_review": True, "review_reasons": ["low quality scan"], "note": None},
        },
        extraction_confidence=0.3,
        needs_review=True,
        review_reasons=["low quality scan"],
        attempts=1,
    )
    monkeypatch.setattr(pipeline, "_get_vision_agent", lambda: vision_agent_mock)

    result = await pipeline.process(filename="blurry_rx.jpg", file_data=_valid_jpeg_bytes())

    assert isinstance(result.extraction, ExtractionResult)
    vision_agent_mock.analyze.assert_awaited_once()


@pytest.mark.asyncio
async def test_vision_rejection_surfaces_as_pipeline_error(pipeline, monkeypatch):
    monkeypatch.setattr(pipeline.ocr_service, "process", lambda **kwargs: _empty_ocr_result())

    vision_agent_mock = AsyncMock()
    vision_agent_mock.analyze.return_value = VisionAgentResult(
        is_medical_document=False,
        document_type=DocumentType.UNKNOWN.value,
        data={},
        extraction_confidence=0.0,
        needs_review=False,
        review_reasons=[],
        attempts=0,
        rejection_reason="This looks like a grocery receipt, not a medical document.",
    )
    monkeypatch.setattr(pipeline, "_get_vision_agent", lambda: vision_agent_mock)

    with pytest.raises(DocumentPipelineError, match="grocery receipt"):
        await pipeline.process(filename="receipt.jpg", file_data=_valid_jpeg_bytes())


@pytest.mark.asyncio
async def test_vision_path_unavailable_fails_safely_not_silently(pipeline, monkeypatch):
    monkeypatch.setattr(pipeline.ocr_service, "process", lambda **kwargs: _empty_ocr_result())
    # Simulate GEMINI_API_KEY missing -> VisionExtractionAgent() raises.
    monkeypatch.setattr(
        pipeline,
        "_get_vision_agent",
        lambda: (_ for _ in ()).throw(DocumentPipelineError("Vision-based extraction is not available.")),
    )

    with pytest.raises(DocumentPipelineError, match="not available"):
        await pipeline.process(filename="rx.jpg", file_data=_valid_jpeg_bytes())


def test_full_vision_shaped_dict_maps_cleanly_through_extraction_mapper():
    """
    The single most important compatibility guarantee in this whole
    change: a realistic vision agent output, run through the SAME
    ExtractionMapper the text path already uses, produces a valid
    ExtractionResult with correct confidence/verification semantics -
    zero mapper changes required.
    """
    from app.services.extraction_mapper import ExtractionMapper

    vision_data = {
        "patient": {"name": "Jane Roe", "age": 45, "sex": "F"},
        "provider": {"physician_name": "Dr. A. Sharma"},
        "document_date": "2024-05-01",
        "chief_complaints_note": None,
        "symptoms": [],
        "past_medical_history": [],
        "allergies": [],
        "vitals": [],
        "lab_results": [],
        "investigation_findings": [],
        "imaging_findings": [],
        "clinical_findings": [],
        "diagnoses": [
            {
                "name": "Type 2 Diabetes Mellitus",
                "evidence": "Dx: T2DM",
                "confidence": {
                    "extraction_confidence": 0.88,
                    "evidence_support": "explicit",
                    "verification_status": "not_independently_verified",
                },
            }
        ],
        "procedures": [],
        "medications": [
            {
                "name": None,
                "generic_name": None,
                "strength": "500 mg",
                "dosage_form": None,
                "dose": None,
                "route": None,
                "frequency": None,
                "duration": None,
                "quantity": None,
                "instructions": None,
                "start_date": None,
                "end_date": None,
                "prescribed_by": None,
                "evidence": "Metf... 500 mg",
                "confidence": {
                    "extraction_confidence": 0.3,
                    "evidence_support": "illegible_handwriting",
                    "verification_status": "needs_review",
                },
            }
        ],
        "hospital_course": None,
        "condition_at_discharge": None,
        "discharge_instructions": [],
        "follow_up": {"facility_or_department": None, "date": None, "instructions": []},
        "additional_notes": [],
        "completeness_audit": {
            "sections_detected_in_source": ["diagnosis", "medications"],
            "sections_represented_in_output": ["diagnosis", "medications"],
            "sections_detected_but_not_represented": [],
            "unmapped_content": [],
        },
        "extraction_summary": {
            "needs_review": True,
            "review_reasons": ["medications[0].name: illegible handwriting"],
            "note": "Vision extraction; medication name could not be read confidently.",
        },
    }

    mapper = ExtractionMapper()
    result = mapper.map(
        gemini_data=vision_data,
        document_id="doc-1",
        session_id="sess-1",
        document_type=DocumentType.PRESCRIPTION.value,
        raw_text=None,
    )

    assert isinstance(result, ExtractionResult)
    assert result.prescription.diagnoses[0].name == "Type 2 Diabetes Mellitus"

    # The illegible medication's name stays null - a real medication
    # NAME with a null identity gets skipped by ExtractionMapper's
    # `_resolve_identifier` (it falls back to deriving one from evidence
    # text), which is itself a demonstration that "correct null" doesn't
    # silently vanish - it surfaces via the recovered identifier and a
    # non-VERIFIED confidence.
    assert len(result.prescription.medications) == 1
    medication = result.prescription.medications[0]
    assert medication.confidence.status != VerificationStatus.VERIFIED


def test_canonical_vision_entities_map_with_primitive_values_unchanged():
    """Representative Vision JSON uses the mapper's field names and types."""
    from app.services.extraction_mapper import ExtractionMapper

    confidence = {
        "extraction_confidence": 0.94,
        "evidence_support": "explicit",
        "verification_status": "not_independently_verified",
    }
    mapper = ExtractionMapper()

    prescription = mapper.map(
        gemini_data={
            "patient": {"name": "Priya Sharma", "age": 27, "sex": "F"},
            "medications": [{"name": "Metformin", "strength": "500 mg", "evidence": "Metformin 500 mg", "confidence": confidence}],
            "diagnoses": [{"name": "Type 2 diabetes mellitus", "status": "active", "evidence": "Diagnosis: Type 2 diabetes mellitus", "confidence": confidence}],
            "symptoms": [], "allergies": [], "vitals": [], "clinical_findings": [], "imaging_findings": [],
            "extraction_summary": {"needs_review": False, "review_reasons": [], "note": None},
        },
        document_id="vision-rx", session_id="session", document_type="PRESCRIPTION", raw_text=None,
    )
    assert prescription.metadata.patient.age == 27
    assert prescription.prescription.medications[0].name == "Metformin"
    assert prescription.prescription.diagnoses[0].name == "Type 2 diabetes mellitus"

    lab_report = mapper.map(
        gemini_data={
            "patient": {"name": None, "age": None, "sex": None},
            "lab_results": [{"test_name": "Hemoglobin", "value": "12.4", "unit": "g/dL", "reference_range": "12-16", "evidence": "Hemoglobin 12.4 g/dL", "confidence": confidence}],
            "diagnoses": [], "symptoms": [], "allergies": [], "vitals": [], "clinical_findings": [],
            "extraction_summary": {"needs_review": False, "review_reasons": [], "note": None},
        },
        document_id="vision-lab", session_id="session", document_type="LAB_REPORT", raw_text=None,
    )
    result = lab_report.lab_report.results[0]
    assert result.test_name == "Hemoglobin"
    assert result.value == "12.4"
    assert result.unit == "g/dL"

    # Omitted optional content remains canonical null/empty defaults;
    # no Vision-only wrapper or adapter is required.
    assert lab_report.metadata.patient.name is None
    assert lab_report.lab_report.diagnoses == []
