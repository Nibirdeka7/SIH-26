import json
import logging
from dataclasses import dataclass
from uuid import uuid4

from app.ai.factory import get_ai_provider
from app.schemas.document import DocumentType, SupportedFileType
from app.services.document_verification import (
    DocumentVerificationService,
)
from app.services.extraction_mapper import ExtractionMapper
from app.services.ocr_service import (
    OCRProcessingError,
    OCRService,
)
from app.utils.file_validation import (
    FileValidationError,
    ValidatedFile,
    validate_file,
)

logger = logging.getLogger(__name__)


class DocumentPipelineError(Exception):
    """Raised when document processing fails."""


@dataclass(frozen=True)
class PipelineResult:
    document_id: str
    session_id: str
    filename: str
    file_type: SupportedFileType
    content_type: str
    file_size: int
    document_type: DocumentType
    ocr_confidence: float | None
    extraction: object


class DocumentPipeline:
    """
    Synchronous document-processing pipeline.

    Pipeline:

        File
          ↓
        Validation
          ↓
        OCR
          ↓
        Document Verification
          ↓
        AI Extraction
          ↓
        Extraction Mapper
          ↓
        Canonical ExtractionResult

    This layer only orchestrates the individual services.
    """

    def __init__(self) -> None:
        self.ocr_service = OCRService()
        self.verification_service = DocumentVerificationService()
        self.mapper = ExtractionMapper()

    async def process(
        self,
        *,
        filename: str,
        file_data: bytes,
        document_id: str | None = None,
        session_id: str | None = None,
        requested_document_type: DocumentType | None = None,
    ) -> PipelineResult:

        document_id = document_id or str(uuid4())
        session_id = session_id or str(uuid4())

        logger.info(
            "Starting document pipeline: document_id=%s filename=%s",
            document_id,
            filename,
        )

        # ==============================================================
        # 1. TECHNICAL FILE VALIDATION
        # ==============================================================

        try:
            validated: ValidatedFile = validate_file(
                filename=filename,
                file_data=file_data,
            )

        except FileValidationError as exc:
            logger.warning(
                "File validation failed: document_id=%s error=%s",
                document_id,
                exc,
            )

            raise DocumentPipelineError(
                str(exc)
            ) from exc

        # ==============================================================
        # 2. RESOLVE INTERNAL FILE TYPE
        # ==============================================================

        file_type = self._file_type_from_extension(
            validated.extension
        )

        # ==============================================================
        # 3. OCR / TEXT EXTRACTION
        # ==============================================================

        try:
            ocr_result = self.ocr_service.process(
                file_data=file_data,
                file_type=file_type,
            )

        except OCRProcessingError as exc:
            logger.warning(
                "OCR failed: document_id=%s error=%s",
                document_id,
                exc,
            )

            raise DocumentPipelineError(
                "Document text extraction failed."
            ) from exc

        raw_text = (ocr_result.text or "").strip()

        if not raw_text:
            raise DocumentPipelineError(
                "No readable text could be extracted from the document."
            )

        # ==============================================================
        # 4. DOCUMENT VERIFICATION + CLASSIFICATION
        # ==============================================================

        verification = self.verification_service.verify_text(
            raw_text
        )

        if not verification.is_medical_document:
            raise DocumentPipelineError(
                verification.reason
                or "Document could not be identified as a supported "
                   "medical document."
            )

        detected_document_type = verification.document_type

        # ==============================================================
        # 5. RESOLVE DOCUMENT TYPE
        # ==============================================================

        document_type = self._resolve_document_type(
            requested_document_type=requested_document_type,
            detected_document_type=detected_document_type,
        )

        # ==============================================================
        # 6. AI STRUCTURED EXTRACTION
        # ==============================================================

        try:
            provider = get_ai_provider()

            ai_result = await provider.analyze_document(
                text=raw_text,
                document_type=document_type.value,
            )

        except Exception as exc:
            logger.exception(
                "AI extraction failed: document_id=%s",
                document_id,
            )

            raise DocumentPipelineError(
                "Medical information extraction failed."
            ) from exc

        # ==============================================================
        # 7. PARSE AI JSON
        # ==============================================================

        extraction_json = self._parse_ai_result(
            ai_result
        )

        # ==============================================================
        # 8. MAP INTO CANONICAL MEDIKIOSK SCHEMA
        # ==============================================================

        try:
            canonical_result = self.mapper.map(
                gemini_data=extraction_json,
                document_id=document_id,
                session_id=session_id,
                document_type=document_type.value,
                raw_text=raw_text,
            )

        except Exception as exc:
            logger.exception(
                "Extraction mapping failed: document_id=%s",
                document_id,
            )

            raise DocumentPipelineError(
                "Extracted medical information could not be normalized."
            ) from exc

        logger.info(
            "Document pipeline completed: document_id=%s type=%s",
            document_id,
            document_type.value,
        )

        return PipelineResult(
            document_id=document_id,
            session_id=session_id,
            filename=validated.filename,
            file_type=file_type,
            content_type=validated.content_type,
            file_size=validated.size,
            document_type=document_type,
            ocr_confidence=ocr_result.ocr_confidence,
            extraction=canonical_result,
        )

    # ==================================================================
    # HELPERS
    # ==================================================================

    @staticmethod
    def _file_type_from_extension(
        extension: str,
    ) -> SupportedFileType:

        mapping = {
            ".pdf": SupportedFileType.PDF,
            ".jpg": SupportedFileType.JPEG,
            ".jpeg": SupportedFileType.JPEG,
            ".png": SupportedFileType.PNG,
            ".webp": SupportedFileType.WEBP,
        }

        try:
            return mapping[extension.lower()]

        except KeyError as exc:
            raise DocumentPipelineError(
                f"Unsupported file extension: {extension}"
            ) from exc

    @staticmethod
    def _resolve_document_type(
        *,
        requested_document_type: DocumentType | None,
        detected_document_type: DocumentType,
    ) -> DocumentType:

        # No client-supplied type:
        # trust the deterministic document classifier.
        if requested_document_type is None:
            return detected_document_type

        # UNKNOWN means we still use the detected type.
        if requested_document_type == DocumentType.UNKNOWN:
            return detected_document_type

        # Client and classifier disagree.
        if requested_document_type != detected_document_type:
            raise DocumentPipelineError(
                "The supplied document type does not match the "
                "detected document type."
            )

        return requested_document_type

    @staticmethod
    def _parse_ai_result(
        ai_result: dict,
    ) -> dict:

        response_text = (
            ai_result.get("raw_response")
            or ai_result.get("text")
        )

        if not isinstance(response_text, str):
            raise DocumentPipelineError(
                "AI provider returned an invalid extraction response."
            )

        try:
            parsed = json.loads(response_text)

        except json.JSONDecodeError as exc:
            raise DocumentPipelineError(
                "AI provider returned invalid JSON."
            ) from exc

        if not isinstance(parsed, dict):
            raise DocumentPipelineError(
                "AI provider returned an invalid JSON object."
            )

        return parsed