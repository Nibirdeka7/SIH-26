from enum import Enum

from pydantic import BaseModel, Field


class OCRExtractionMethod(str, Enum):
    OCR = "OCR"
    PDF_TEXT = "PDF_TEXT"


class OCRWord(BaseModel):
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    left: int = Field(ge=0)
    top: int = Field(ge=0)
    width: int = Field(ge=0)
    height: int = Field(ge=0)


class OCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    text: str = ""

    # Actual OCR confidence.
    # None when the page came from a native PDF text layer.
    ocr_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    words: list[OCRWord] = Field(default_factory=list)

    extraction_method: OCRExtractionMethod
    used_ocr: bool = False


class OCRResult(BaseModel):
    text: str = ""

    # Overall OCR confidence.
    # None when no OCR was performed.
    ocr_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    pages: list[OCRPageResult] = Field(default_factory=list)