from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image
from pypdf import PdfReader


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

SUPPORTED_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class FileValidationError(Exception):
    """Raised when an uploaded file fails technical validation."""


@dataclass(frozen=True)
class ValidatedFile:
    filename: str
    extension: str
    content_type: str
    size: int


def validate_filename(filename: str) -> str:
    """
    Validate the supplied filename and return its normalized extension.
    """

    if not filename:
        raise FileValidationError("Filename is required.")

    filename = filename.strip()

    if not filename:
        raise FileValidationError("Filename cannot be empty.")

    extension = Path(filename).suffix.lower()

    if not extension:
        raise FileValidationError(
            "File must have a supported extension."
        )

    if extension not in SUPPORTED_EXTENSIONS:
        raise FileValidationError(
            f"Unsupported file format: {extension}"
        )

    return extension


def validate_file_size(file_data: bytes) -> int:
    """
    Validate file size and return the size in bytes.
    """

    if not file_data:
        raise FileValidationError("Uploaded file is empty.")

    size = len(file_data)

    if size > MAX_FILE_SIZE:
        raise FileValidationError(
            f"File exceeds the maximum allowed size of "
            f"{MAX_FILE_SIZE // (1024 * 1024)} MB."
        )

    return size


def detect_file_type(file_data: bytes) -> str:
    """
    Detect file type using magic bytes.

    This prevents us from trusting the filename extension alone.
    """

    if not file_data:
        raise FileValidationError("Cannot detect type of an empty file.")

    # PDF
    if file_data.startswith(b"%PDF-"):
        return "application/pdf"

    # JPEG
    if file_data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    # PNG
    if file_data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    # WEBP
    if (
        len(file_data) >= 12
        and file_data[0:4] == b"RIFF"
        and file_data[8:12] == b"WEBP"
    ):
        return "image/webp"

    raise FileValidationError(
        "Unsupported or unrecognized file content."
    )


def validate_content_type(
    extension: str,
    detected_content_type: str,
) -> str:
    """
    Ensure the detected content matches the filename extension.
    """

    expected_content_type = SUPPORTED_MIME_TYPES.get(extension)

    if expected_content_type is None:
        raise FileValidationError(
            f"Unsupported file extension: {extension}"
        )

    if detected_content_type != expected_content_type:
        raise FileValidationError(
            "File extension does not match the actual file content."
        )

    return detected_content_type


def validate_pdf(file_data: bytes) -> None:
    """
    Verify that a PDF can actually be parsed.
    """

    try:
        reader = PdfReader(BytesIO(file_data))

        if reader.is_encrypted:
            raise FileValidationError(
                "Encrypted PDFs are not supported."
            )

        if len(reader.pages) == 0:
            raise FileValidationError(
                "PDF contains no pages."
            )

    except FileValidationError:
        raise

    except Exception as exc:
        raise FileValidationError(
            "PDF file is corrupted or cannot be read."
        ) from exc


def validate_image(file_data: bytes) -> None:
    """
    Verify that an image can actually be decoded.
    """

    try:
        with Image.open(BytesIO(file_data)) as image:
            image.verify()

    except Exception as exc:
        raise FileValidationError(
            "Image file is corrupted or cannot be decoded."
        ) from exc


def validate_file(
    filename: str,
    file_data: bytes,
) -> ValidatedFile:
    """
    Perform complete technical validation of an uploaded file.

    Validation order:

    1. Filename
    2. File size
    3. Magic-byte content detection
    4. Extension/content consistency
    5. PDF/image integrity
    """

    extension = validate_filename(filename)

    size = validate_file_size(file_data)

    detected_content_type = detect_file_type(file_data)

    content_type = validate_content_type(
        extension,
        detected_content_type,
    )

    if content_type == "application/pdf":
        validate_pdf(file_data)

    elif content_type.startswith("image/"):
        validate_image(file_data)

    return ValidatedFile(
        filename=filename,
        extension=extension,
        content_type=content_type,
        size=size,
    )