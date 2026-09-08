"""
Standalone PDF page rendering for the vision path.

Deliberately independent of app.services.ocr_service: the OCR service's
own page rendering feeds Tesseract after preprocessing (deskew, contrast,
denoise), which is exactly the aggressive transformation the vision model
should NOT receive - it needs the ORIGINAL page (see the "IMAGE QUALITY"
requirement: never permanently replace the source image with a
thresholded one before vision inference). Keeping this separate means
neither file has to compromise for the other's needs.
"""

import pymupdf


class PdfRenderingError(Exception):
    """Raised when a PDF cannot be opened or a page cannot be rendered."""


def pdf_page_count(file_data: bytes) -> int:
    try:
        document = pymupdf.open(stream=file_data, filetype="pdf")
    except Exception as exc:
        raise PdfRenderingError("Unable to open PDF document.") from exc

    try:
        return document.page_count
    finally:
        document.close()


def render_pdf_page_to_png(
    file_data: bytes,
    page_number: int = 1,
    scale: float = 2.0,
) -> bytes:
    """
    Render a single 1-indexed PDF page to a PNG image at `scale`x the
    page's native resolution, with no thresholding/denoising/deskewing -
    the original visual content (ink, layout, colour) reaches the model
    unmodified.
    """
    try:
        document = pymupdf.open(stream=file_data, filetype="pdf")
    except Exception as exc:
        raise PdfRenderingError("Unable to open PDF document.") from exc

    try:
        if document.page_count == 0:
            raise PdfRenderingError("PDF contains no pages.")

        if page_number < 1 or page_number > document.page_count:
            raise PdfRenderingError(
                f"Page {page_number} is out of range "
                f"(document has {document.page_count} page(s))."
            )

        page = document.load_page(page_number - 1)
        matrix = pymupdf.Matrix(scale, scale)
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)

        return pixmap.tobytes("png")

    except PdfRenderingError:
        raise
    except Exception as exc:
        raise PdfRenderingError(
            f"Unable to render PDF page {page_number}."
        ) from exc
    finally:
        document.close()
