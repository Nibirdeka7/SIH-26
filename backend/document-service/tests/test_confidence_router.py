from app.schemas.ocr import OCRResult
from app.services.confidence_router import (
    OCRConfidenceRouter,
    OCRRoutingDecision,
)


def test_high_confidence_ocr_uses_ocr():
    router = OCRConfidenceRouter(threshold=0.80)

    result = OCRResult(
        text="Hemoglobin: 13.5 g/dL",
        ocr_confidence=0.95,
        pages=[],
    )

    decision = router.route(result)

    assert decision == OCRRoutingDecision.USE_OCR


def test_low_confidence_ocr_uses_vision():
    router = OCRConfidenceRouter(threshold=0.80)

    result = OCRResult(
        text="HemogIobin: 13.5 g/dL",
        ocr_confidence=0.62,
        pages=[],
    )

    decision = router.route(result)

    assert decision == OCRRoutingDecision.USE_VISION


def test_confidence_at_threshold_uses_ocr():
    router = OCRConfidenceRouter(threshold=0.80)

    result = OCRResult(
        text="Hemoglobin: 13.5 g/dL",
        ocr_confidence=0.80,
        pages=[],
    )

    decision = router.route(result)

    assert decision == OCRRoutingDecision.USE_OCR


def test_no_text_returns_no_text():
    router = OCRConfidenceRouter(threshold=0.80)

    result = OCRResult(
        text="",
        ocr_confidence=0.0,
        pages=[],
    )

    decision = router.route(result)

    assert decision == OCRRoutingDecision.NO_TEXT


def test_pdf_text_without_ocr_confidence_uses_text():
    router = OCRConfidenceRouter(threshold=0.80)

    result = OCRResult(
        text="Patient Name: John Doe",
        ocr_confidence=None,
        pages=[],
    )

    decision = router.route(result)

    assert decision == OCRRoutingDecision.USE_OCR