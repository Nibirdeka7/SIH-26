import json
import logging
from dataclasses import dataclass
from uuid import uuid4

from app.ai.agents.vision_extraction_agent import (
    VisionAgentError,
    VisionExtractionAgent,
    should_escalate_for_handwriting,
)
from app.ai.factory import get_ai_provider
from app.schemas.document import DocumentType, SupportedFileType
from app.services.confidence_router import OCRConfidenceRouter, OCRRoutingDecision
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
from app.utils.pdf_rendering import PdfRenderingError, render_pdf_page_to_png

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

    Pipeline (text path, unchanged):

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

    Parallel vision path (new): when OCR confidence is too low, OCR found
    no usable text, or a handwriting heuristic trips even on an
    acceptable-looking OCR confidence, the ORIGINAL image/PDF page is
    routed to VisionExtractionAgent instead of the OCR text. The vision
    agent's output is a dict in the SAME shape GeminiProvider's text path
    already produces, so it converges on the identical ExtractionMapper
    step above - only the road to get there differs. This mirrors the
    "reliable OCR -> Groq/Gemini text" vs "low confidence -> Vision Agent"
    routing, with vision decided by OCRConfidenceRouter (plus the
    handwriting heuristic) rather than always running both paths.

    This layer only orchestrates the individual services.
    """

    _VISION_MIME_TYPES: dict[SupportedFileType, str] = {
        SupportedFileType.JPEG: "image/jpeg",
        SupportedFileType.PNG: "image/png",
        SupportedFileType.WEBP: "image/webp",
    }

    def __init__(self) -> None:
        self.ocr_service = OCRService()
        self.verification_service = DocumentVerificationService()
        self.mapper = ExtractionMapper()
        self.confidence_router = OCRConfidenceRouter()
        self._vision_agent: VisionExtractionAgent | None = None

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

        ocr_result = None
        raw_text = ""
        use_vision = False

        try:
            ocr_result = self.ocr_service.process(
                file_data=file_data,
                file_type=file_type,
            )
            raw_text = (ocr_result.text or "").strip()

            routing_decision = self.confidence_router.route(ocr_result)
            handwriting_override = should_escalate_for_handwriting(ocr_result)

            use_vision = (
                routing_decision
                in (OCRRoutingDecision.USE_VISION, OCRRoutingDecision.NO_TEXT)
                or handwriting_override
            )

        except OCRProcessingError as exc:
            logger.warning(
                "OCR failed or unavailable: document_id=%s error=%s. "
                "Escalating directly to vision extraction path.",
                document_id,
                exc,
            )
            use_vision = True

        # ==============================================================
        # 3b. ROUTE: reliable OCR text vs vision escalation
        # ==============================================================

        if use_vision:
            logger.info(
                "Routing to vision extraction path: document_id=%s",
                document_id,
            )

            return await self._process_with_vision(
                document_id=document_id,
                session_id=session_id,
                validated=validated,
                file_type=file_type,
                file_data=file_data,
                raw_text=raw_text,
                requested_document_type=requested_document_type,
            )

        # ==============================================================
        # TEXT PATH (unchanged below this point)
        # ==============================================================

        if not raw_text:
            logger.info(
                "No readable text extracted; escalating to vision extraction: document_id=%s",
                document_id,
            )
            return await self._process_with_vision(
                document_id=document_id,
                session_id=session_id,
                validated=validated,
                file_type=file_type,
                file_data=file_data,
                raw_text="",
                requested_document_type=requested_document_type,
            )

        # ==============================================================
        # 4. DOCUMENT VERIFICATION + CLASSIFICATION
        # ==============================================================

        verification = self.verification_service.verify_text(
            raw_text
        )

        if not verification.is_medical_document:
            logger.info(
                "Text verification could not confirm medical document: document_id=%s. "
                "Escalating to vision extraction path.",
                document_id,
            )
            try:
                return await self._process_with_vision(
                    document_id=document_id,
                    session_id=session_id,
                    validated=validated,
                    file_type=file_type,
                    file_data=file_data,
                    raw_text=raw_text,
                    requested_document_type=requested_document_type,
                )
            except DocumentPipelineError:
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
                "AI extraction failed: document_id=%s. Attempting vision extraction fallback.",
                document_id,
            )

            try:
                return await self._process_with_vision(
                    document_id=document_id,
                    session_id=session_id,
                    validated=validated,
                    file_type=file_type,
                    file_data=file_data,
                    raw_text=raw_text,
                    requested_document_type=requested_document_type,
                )
            except Exception:
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

        # If detected is UNKNOWN, trust client-supplied type.
        if detected_document_type == DocumentType.UNKNOWN:
            return requested_document_type

        # Client and classifier disagree.
        if requested_document_type != detected_document_type:
            logger.warning(
                "Document type mismatch: requested=%s detected=%s. Using detected type.",
                requested_document_type,
                detected_document_type,
            )
            return detected_document_type

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

    # ==================================================================
    # VISION PATH
    # ==================================================================

    def _get_vision_agent(self) -> VisionExtractionAgent:
        """
        Constructed lazily and cached: a deployment running with
        AI_PROVIDER=groq and no GEMINI_API_KEY configured must not fail
        at DocumentPipeline construction time just because the vision
        path exists - only when a document actually needs it.
        """
        if self._vision_agent is None:
            try:
                self._vision_agent = VisionExtractionAgent()
            except Exception as exc:
                raise DocumentPipelineError(
                    "Vision-based extraction is not available "
                    "(the vision provider is not configured)."
                ) from exc

        return self._vision_agent

    def _resolve_vision_image(
        self,
        *,
        file_data: bytes,
        file_type: SupportedFileType,
    ) -> tuple[bytes, str]:
        """
        Returns (image_bytes, mime_type) for the ORIGINAL document -
        never a preprocessed/thresholded version (see the vision path's
        "IMAGE QUALITY" requirement).

        NOTE - multi-page PDFs: only page 1 is currently sent to the
        vision model. The architecture (VisionExtractionAgent.analyze
        operates on a single image/mime_type pair) supports adding
        per-page iteration + result merging without a redesign, but that
        merge policy is intentionally not implemented yet - see the
        implementation notes for why this was scoped out of this pass.
        """
        if file_type == SupportedFileType.PDF:
            try:
                image_bytes = render_pdf_page_to_png(file_data, page_number=1)
            except PdfRenderingError as exc:
                raise DocumentPipelineError(
                    "Unable to render the PDF for vision analysis."
                ) from exc

            return image_bytes, "image/png"

        mime_type = self._VISION_MIME_TYPES.get(file_type)

        if mime_type is None:
            raise DocumentPipelineError(
                f"Unsupported file type for vision analysis: {file_type}"
            )

        return file_data, mime_type

    async def _process_with_vision(
        self,
        *,
        document_id: str,
        session_id: str,
        validated: ValidatedFile,
        file_type: SupportedFileType,
        file_data: bytes,
        raw_text: str,
        requested_document_type: DocumentType | None,
    ) -> PipelineResult:

        image_bytes, mime_type = self._resolve_vision_image(
            file_data=file_data,
            file_type=file_type,
        )

        vision_agent = self._get_vision_agent()

        hint = (
            requested_document_type.value
            if requested_document_type not in (None, DocumentType.UNKNOWN)
            else None
        )

        try:
            agent_result = await vision_agent.analyze(
                image_data=image_bytes,
                mime_type=mime_type,
                document_type_hint=hint,
            )

        except VisionAgentError as exc:
            logger.exception(
                "Vision extraction failed: document_id=%s",
                document_id,
            )

            raise DocumentPipelineError(
                "Medical information extraction failed."
            ) from exc

        if not agent_result.is_medical_document:
            raise DocumentPipelineError(
                agent_result.rejection_reason
                or "Document could not be identified as a supported "
                   "medical document."
            )

        try:
            detected_document_type = DocumentType(agent_result.document_type)
        except ValueError:
            detected_document_type = DocumentType.UNKNOWN

        document_type = self._resolve_document_type(
            requested_document_type=requested_document_type,
            detected_document_type=detected_document_type,
        )

        try:
            canonical_result = self.mapper.map(
                gemini_data=agent_result.data,
                document_id=document_id,
                session_id=session_id,
                document_type=document_type.value,
                raw_text=raw_text or None,
            )

        except Exception as exc:
            logger.exception(
                "Extraction mapping failed (vision path): document_id=%s",
                document_id,
            )

            raise DocumentPipelineError(
                "Extracted medical information could not be normalized."
            ) from exc

        logger.info(
            "Document pipeline completed via vision path: document_id=%s "
            "type=%s attempts=%s needs_review=%s",
            document_id,
            document_type.value,
            agent_result.attempts,
            agent_result.needs_review,
        )

        return PipelineResult(
            document_id=document_id,
            session_id=session_id,
            filename=validated.filename,
            file_type=file_type,
            content_type=validated.content_type,
            file_size=validated.size,
            document_type=document_type,
            # OCR confidence is not a meaningful signal for the vision
            # path - it was, after all, why this path was taken.
            ocr_confidence=None,
            extraction=canonical_result,
        )