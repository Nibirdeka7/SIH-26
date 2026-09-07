from io import BytesIO

import pymupdf
import pytesseract
from PIL import Image
from pytesseract import Output

from app.core.config import settings
from app.schemas.document import SupportedFileType
from app.schemas.ocr import (
    OCRExtractionMethod,
    OCRPageResult,
    OCRResult,
    OCRWord,
)
from app.services.preprocessing import (
    DocumentPreprocessor,
    PreprocessingError,
)


class OCRProcessingError(Exception):
    """Raised when OCR processing fails."""


class OCRService:
    """
    Unified OCR service for supported medical documents.

    Supports:
    - JPEG/JPG
    - PNG
    - WEBP
    - text-based PDFs
    - scanned/image PDFs
    - multi-page PDFs
    """

    def __init__(self) -> None:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

        self.preprocessor = DocumentPreprocessor()

    def process(
        self,
        file_data: bytes,
        file_type: SupportedFileType,
    ) -> OCRResult:
        """
        Process a supported document and return structured OCR results.
        """

        if not file_data:
            raise OCRProcessingError(
                "Cannot perform OCR on an empty file."
            )

        try:
            if file_type == SupportedFileType.PDF:
                return self._process_pdf(file_data)

            if file_type in {
                SupportedFileType.JPEG,
                SupportedFileType.PNG,
                SupportedFileType.WEBP,
            }:
                return self._process_image(file_data)

            raise OCRProcessingError(
                f"Unsupported file type: {file_type}"
            )

        except OCRProcessingError:
            raise

        except Exception as exc:
            raise OCRProcessingError(
                "Failed to process document with OCR."
            ) from exc

    def _process_image(
        self,
        file_data: bytes,
    ) -> OCRResult:
        """
        Preprocess an image and perform OCR.
        """

        try:
            processed_data = self.preprocessor.preprocess(
                file_data
            )
        except PreprocessingError as exc:
            raise OCRProcessingError(
                "Image preprocessing failed."
            ) from exc

        page_result = self._ocr_image(
            processed_data,
            page_number=1,
        )

        return OCRResult(
            text=page_result.text,
            ocr_confidence=page_result.ocr_confidence,
            pages=[page_result],
        )

    def _process_pdf(
        self,
        file_data: bytes,
    ) -> OCRResult:
        """
        Process every page of a PDF independently.

        Pages with usable text layers are extracted directly.
        Pages without usable text are rendered and OCR'd.
        """

        try:
            document = pymupdf.open(
                stream=file_data,
                filetype="pdf",
            )
        except Exception as exc:
            raise OCRProcessingError(
                "Unable to open PDF document."
            ) from exc

        if document.page_count == 0:
            document.close()

            raise OCRProcessingError(
                "PDF contains no pages."
            )

        pages: list[OCRPageResult] = []

        try:
            for page_index in range(
                document.page_count
            ):
                page = document.load_page(
                    page_index
                )

                page_result = self._process_pdf_page(
                    page,
                    page_number=page_index + 1,
                )

                pages.append(page_result)

        finally:
            document.close()

        return self._build_document_result(
            pages
        )

    def _process_pdf_page(
        self,
        page: pymupdf.Page,
        page_number: int,
    ) -> OCRPageResult:
        """
        Decide whether to use the PDF text layer
        or OCR the rendered page.
        """

        text = page.get_text("text").strip()

        if self._is_usable_text(text):
            return OCRPageResult(
                page_number=page_number,
                text=text,
                ocr_confidence=None,
                words=[],
                extraction_method=OCRExtractionMethod.PDF_TEXT,
                used_ocr=False,
            )

        image_data = self._render_pdf_page(
            page
        )

        try:
            processed_data = self.preprocessor.preprocess(
                image_data
            )
        except PreprocessingError as exc:
            raise OCRProcessingError(
                f"Preprocessing failed on PDF page "
                f"{page_number}."
            ) from exc

        return self._ocr_image(
            processed_data,
            page_number=page_number,
        )

    @staticmethod
    def _is_usable_text(
        text: str,
    ) -> bool:
        """
        Determine whether extracted PDF text is useful enough
        to avoid OCR.

        Very short text is treated as unusable because scanned
        PDFs can contain tiny or meaningless text layers.
        """

        if not text:
            return False

        meaningful_characters = sum(
            character.isalnum()
            for character in text
        )

        return meaningful_characters >= 20

    @staticmethod
    def _render_pdf_page(
        page: pymupdf.Page,
    ) -> bytes:
        """
        Render a PDF page into a high-resolution PNG image.
        """

        matrix = pymupdf.Matrix(
            2.0,
            2.0,
        )

        pixmap = page.get_pixmap(
            matrix=matrix,
            alpha=False,
        )

        return pixmap.tobytes(
            "png"
        )

    @staticmethod
    def _ocr_image(
        file_data: bytes,
        page_number: int,
    ) -> OCRPageResult:
        """
        Run Tesseract OCR on a single image.
        """

        try:
            image = Image.open(
                BytesIO(file_data)
            ).convert("RGB")

            text = pytesseract.image_to_string(
                image,
                config="--psm 6",
            )

            data = pytesseract.image_to_data(
                image,
                output_type=Output.DICT,
                config="--psm 6",
            )

        except Exception as exc:
            raise OCRProcessingError(
                f"Tesseract OCR failed on page "
                f"{page_number}."
            ) from exc

        words = OCRService._extract_words(
            data
        )

        confidence = OCRService._calculate_confidence(
            words
        )

        return OCRPageResult(
            page_number=page_number,
            text=text.strip(),
            ocr_confidence=confidence,
            words=words,
            extraction_method=OCRExtractionMethod.OCR,
            used_ocr=True,
        )

    @staticmethod
    def _extract_words(
        data: dict,
    ) -> list[OCRWord]:
        """
        Extract recognized words and their metadata.
        """

        words: list[OCRWord] = []

        total_items = len(
            data.get("text", [])
        )

        for index in range(total_items):
            text = data["text"][index].strip()

            if not text:
                continue

            try:
                raw_confidence = float(
                    data["conf"][index]
                )
            except (
                ValueError,
                TypeError,
            ):
                continue

            if raw_confidence < 0:
                continue

            words.append(
                OCRWord(
                    text=text,
                    confidence=raw_confidence / 100.0,
                    left=int(
                        data["left"][index]
                    ),
                    top=int(
                        data["top"][index]
                    ),
                    width=int(
                        data["width"][index]
                    ),
                    height=int(
                        data["height"][index]
                    ),
                )
            )

        return words

    @staticmethod
    def _calculate_confidence(
        words: list[OCRWord],
    ) -> float:
        """
        Calculate the average confidence of recognized words.
        """

        if not words:
            return 0.0

        average = sum(
            word.confidence
            for word in words
        ) / len(words)

        return round(
            min(
                max(average, 0.0),
                1.0,
            ),
            4,
        )

    @staticmethod
    def _build_document_result(
        pages: list[OCRPageResult],
    ) -> OCRResult:
        """
        Combine page-level OCR results into a document-level result.
        """

        full_text = "\n\n".join(
            page.text
            for page in pages
            if page.text
        )

        confidence_values = [
            page.ocr_confidence
            for page in pages
            if page.used_ocr
            and page.ocr_confidence is not None
        ]

        if confidence_values:
            overall_confidence = (
                sum(confidence_values)
                / len(confidence_values)
            )
        else:
            overall_confidence = None

        return OCRResult(
            text=full_text,
            ocr_confidence=(
                round(
                    overall_confidence,
                    4,
                )
                if overall_confidence is not None
                else None
            ),
            pages=pages,
        )