import shutil
from io import BytesIO

import pytest
import pymupdf
from PIL import Image, ImageDraw

from app.schemas.document import SupportedFileType
from app.services.ocr_service import OCRService

TESSERACT_AVAILABLE = shutil.which("tesseract") is not None


def create_test_image() -> bytes:
    image = Image.new("RGB", (1200, 800), "white")
    draw = ImageDraw.Draw(image)

    draw.text(
        (100, 100),
        "Patient Name: John Doe",
        fill="black",
    )
    draw.text(
        (100, 160),
        "Hemoglobin: 13.5 g/dL",
        fill="black",
    )
    draw.text(
        (100, 220),
        "Glucose: 95 mg/dL",
        fill="black",
    )

    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def create_test_pdf() -> bytes:
    document = pymupdf.open()

    page = document.new_page()
    page.insert_text(
        (72, 72),
        "Patient Name: John Doe\n"
        "Hemoglobin: 13.5 g/dL\n"
        "Glucose: 95 mg/dL",
    )

    buffer = BytesIO()
    buffer.write(document.tobytes())
    document.close()

    return buffer.getvalue()


def create_scanned_pdf() -> bytes:
    image_data = create_test_image()

    image = Image.open(BytesIO(image_data)).convert("RGB")

    image_buffer = BytesIO()
    image.save(image_buffer, format="PNG")

    document = pymupdf.open()
    page = document.new_page(width=image.width, height=image.height)

    page.insert_image(
        pymupdf.Rect(
            0,
            0,
            image.width,
            image.height,
        ),
        stream=image_buffer.getvalue(),
    )

    pdf_data = document.tobytes()
    document.close()

    return pdf_data


def create_multi_page_pdf() -> bytes:
    document = pymupdf.open()

    page1 = document.new_page()
    page1.insert_text(
        (72, 72),
        "Patient Name: John Doe\n"
        "Hemoglobin: 13.5 g/dL",
    )

    page2 = document.new_page()
    page2.insert_text(
        (72, 72),
        "Glucose: 95 mg/dL\n"
        "Blood Pressure: 120/80",
    )

    buffer = document.tobytes()
    document.close()

    return buffer


@pytest.mark.skipif(not TESSERACT_AVAILABLE, reason="Tesseract OCR binary not installed on host")
def test_ocr_png():
    service = OCRService()

    result = service.process(
        create_test_image(),
        SupportedFileType.PNG,
    )

    assert result.text
    assert len(result.pages) == 1
    assert result.pages[0].used_ocr is True
    assert result.ocr_confidence is not None
    assert result.ocr_confidence > 0.0


def test_ocr_text_pdf():
    service = OCRService()

    result = service.process(
        create_test_pdf(),
        SupportedFileType.PDF,
    )

    assert result.text
    assert len(result.pages) == 1
    assert result.pages[0].used_ocr is False
    assert "John Doe" in result.text


@pytest.mark.skipif(not TESSERACT_AVAILABLE, reason="Tesseract OCR binary not installed on host")
def test_ocr_scanned_pdf():
    service = OCRService()

    result = service.process(
        create_scanned_pdf(),
        SupportedFileType.PDF,
    )

    assert result.text
    assert len(result.pages) == 1
    assert result.pages[0].used_ocr is True
    assert result.ocr_confidence is not None
    assert result.ocr_confidence > 0.0


def test_ocr_multi_page_pdf():
    service = OCRService()

    result = service.process(
        create_multi_page_pdf(),
        SupportedFileType.PDF,
    )

    assert len(result.pages) == 2
    assert result.pages[0].page_number == 1
    assert result.pages[1].page_number == 2

    assert "John Doe" in result.pages[0].text
    assert "Glucose" in result.pages[1].text

    assert result.text