from enum import Enum

from app.core.config import settings
from app.schemas.ocr import OCRResult


class OCRRoutingDecision(str, Enum):
    USE_OCR = "USE_OCR"
    USE_VISION = "USE_VISION"
    NO_TEXT = "NO_TEXT"


class OCRConfidenceRouter:
    """
    Decide whether OCR output is reliable enough to continue
    with normal text-based extraction or should be escalated
    to a vision-capable AI model.
    """

    def __init__(
        self,
        threshold: float | None = None,
    ) -> None:
        self.threshold = (
            threshold
            if threshold is not None
            else settings.OCR_CONFIDENCE_THRESHOLD
        )

    def route(
        self,
        ocr_result: OCRResult,
    ) -> OCRRoutingDecision:
        """
        Determine the next processing path for an OCR result.
        """

        if not ocr_result.text.strip():
            return OCRRoutingDecision.NO_TEXT

        if ocr_result.ocr_confidence is None:
            return OCRRoutingDecision.USE_OCR

        if ocr_result.ocr_confidence >= self.threshold:
            return OCRRoutingDecision.USE_OCR

        return OCRRoutingDecision.USE_VISION