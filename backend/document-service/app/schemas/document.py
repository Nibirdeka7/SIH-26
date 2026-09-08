from enum import Enum

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    PRESCRIPTION = "PRESCRIPTION"
    LAB_REPORT = "LAB_REPORT"
    DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY"
    RADIOLOGY_REPORT = "RADIOLOGY_REPORT"
    UNKNOWN = "UNKNOWN"


class DocumentStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    FAILED = "FAILED"


class SupportedFileType(str, Enum):
    PDF = "PDF"
    JPEG = "JPEG"
    PNG = "PNG"
    WEBP = "WEBP"


class DocumentMetadata(BaseModel):
    title: str | None = None
    document_date: str | None = None
    issuing_facility: str | None = None
    physician_name: str | None = None
    department: str | None = None


class DocumentResponse(BaseModel):
    document_id: str
    session_id: str

    filename: str
    content_type: str
    file_type: SupportedFileType

    file_size: int | None = Field(
        default=None,
        description="File size in bytes.",
    )

    document_type: DocumentType = DocumentType.UNKNOWN

    status: DocumentStatus = DocumentStatus.UPLOADED

    metadata: DocumentMetadata | None = None

    created_at: str | None = None
    updated_at: str | None = None