import logging
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.document import DocumentStatus, DocumentType
from app.services.document_pipeline import (
    DocumentPipeline,
    DocumentPipelineError,
)
import sys
import os
try:
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../.."))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from shared_db.json_db_manager import json_db_manager
except Exception as e:
    logger.warning("Failed to import json_db_manager: %s", e)
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

            extraction_dict = (
                result.extraction.model_dump()
                if hasattr(result.extraction, "model_dump")
                else (
                    result.extraction.dict()
                    if hasattr(result.extraction, "dict")
                    else result.extraction
                )
            )

            doc_entry = {
                "document_id": result.document_id,
                "session_id": result.session_id,
                "filename": result.filename,
                "content_type": result.content_type,
                "file_type": str(result.file_type.value if hasattr(result.file_type, "value") else result.file_type),
                "file_size": result.file_size,
                "document_type": str(result.document_type.value if hasattr(result.document_type, "value") else result.document_type),
                "status": str(status.value if hasattr(status, "value") else status),
                "ocr_confidence": result.ocr_confidence,
                "extraction": extraction_dict,
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


@router.get("")
async def get_documents(session_id: str | None = None):
    """
    Retrieve documents, optionally filtered by session_id.
    Used by Doctor Frontend and Patient review.
    """
    if not json_db_manager:
        return {
            "session_id": session_id,
            "total_documents": 0,
            "documents": [],
        }

    if session_id:
        docs = json_db_manager.get_documents_by_session(session_id)
    else:
        from shared_db.json_db_manager import load_shared_db
        db_data = load_shared_db()
        docs = db_data.get("documents", [])

    return {
        "session_id": session_id,
        "total_documents": len(docs),
        "documents": docs,
    }


@router.get("/{document_id}")
async def get_document_by_id(document_id: str):
    """
    Retrieve a single document by its document_id.
    """
    if not json_db_manager:
        raise HTTPException(status_code=404, detail="Database unavailable")

    from shared_db.json_db_manager import load_shared_db
    db_data = load_shared_db()
    docs = db_data.get("documents", [])
    for d in docs:
        if d.get("document_id") == document_id:
            return d

    raise HTTPException(status_code=404, detail="Document not found")