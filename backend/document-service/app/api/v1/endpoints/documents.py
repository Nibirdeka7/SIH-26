import logging
from uuid import uuid4

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.document import DocumentStatus, DocumentType
from app.services.document_pipeline import (
    DocumentPipeline,
    DocumentPipelineError,
)
import sys
import os
try:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../..")))
    from shared_db.json_db_manager import json_db_manager
except Exception:
    json_db_manager = None

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)

pipeline = DocumentPipeline()


@router.post("")
async def upload_documents(
    files: list[UploadFile] = File(...),
    session_id: str | None = Form(default=None),
    document_type: DocumentType | None = Form(default=None),
):
    """
    Upload and process one or more medical documents.

    Each file is processed independently but all files belong
    to the same session.
    """

    if not files:
        return {
            "session_id": session_id,
            "total_documents": 0,
            "successful": 0,
            "failed": 0,
            "documents": [],
        }

    # One session groups all documents uploaded in this request.
    session_id = session_id or str(uuid4())

    results = []

    for file in files:
        document_id = str(uuid4())

        try:
            file_data = await file.read()

            if not file_data:
                raise DocumentPipelineError(
                    "Uploaded file is empty."
                )

            result = await pipeline.process(
                document_id=document_id,
                session_id=session_id,
                filename=file.filename or "unnamed",
                file_data=file_data,
                requested_document_type=document_type,
            )

            # Determine final status from canonical verification.
            status = DocumentStatus.COMPLETED

            if result.extraction.verification.needs_review:
                status = DocumentStatus.NEEDS_REVIEW

            doc_entry = {
                "document_id": result.document_id,
                "session_id": result.session_id,
                "filename": result.filename,
                "content_type": result.content_type,
                "file_type": str(result.file_type),
                "file_size": result.file_size,
                "document_type": str(result.document_type),
                "status": str(status),
                "ocr_confidence": result.ocr_confidence,
                "error": None,
            }
            results.append(
                {
                    "document_id": result.document_id,
                    "session_id": result.session_id,
                    "filename": result.filename,
                    "content_type": result.content_type,
                    "file_type": result.file_type,
                    "file_size": result.file_size,
                    "document_type": result.document_type,
                    "status": status,
                    "ocr_confidence": result.ocr_confidence,
                    "extraction": result.extraction,
                    "error": None,
                }
            )
            if json_db_manager:
                json_db_manager.add_document(doc_entry)

        except DocumentPipelineError as exc:
            logger.warning(
                "Document processing failed: document_id=%s filename=%s error=%s",
                document_id,
                file.filename,
                exc,
            )

            results.append(
                {
                    "document_id": document_id,
                    "session_id": session_id,
                    "filename": file.filename or "unnamed",
                    "content_type": file.content_type,
                    "file_type": None,
                    "file_size": None,
                    "document_type": DocumentType.UNKNOWN,
                    "status": DocumentStatus.FAILED,
                    "ocr_confidence": None,
                    "extraction": None,
                    "error": str(exc),
                }
            )

        except Exception:
            logger.exception(
                "Unexpected document processing failure: "
                "document_id=%s filename=%s",
                document_id,
                file.filename,
            )

            results.append(
                {
                    "document_id": document_id,
                    "session_id": session_id,
                    "filename": file.filename or "unnamed",
                    "content_type": file.content_type,
                    "file_type": None,
                    "file_size": None,
                    "document_type": DocumentType.UNKNOWN,
                    "status": DocumentStatus.FAILED,
                    "ocr_confidence": None,
                    "extraction": None,
                    "error": "Document processing failed.",
                }
            )

        finally:
            await file.close()

    successful = sum(
        1
        for result in results
        if result["status"]
        in {
            DocumentStatus.COMPLETED,
            DocumentStatus.NEEDS_REVIEW,
        }
    )

    failed = sum(
        1
        for result in results
        if result["status"] == DocumentStatus.FAILED
    )

    return {
        "session_id": session_id,
        "total_documents": len(results),
        "successful": successful,
        "failed": failed,
        "documents": results,
    }