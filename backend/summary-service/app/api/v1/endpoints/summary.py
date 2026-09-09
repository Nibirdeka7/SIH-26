import logging
from fastapi import APIRouter, HTTPException
from app.schemas.summary import (
    ClinicalSummaryResponse,
    ConfirmSummaryRequest,
    GenerateSummaryRequest,
)
from app.services.summary_generator import summary_generator_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Clinical Summary Engine"])


@router.post("/generate", response_model=ClinicalSummaryResponse)
async def generate_summary(req: GenerateSummaryRequest) -> ClinicalSummaryResponse:
    """Generates structured FHIR-ready clinical summary from conversation history & RAG context."""
    try:
        return await summary_generator_service.generate_summary(req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=ClinicalSummaryResponse)
async def get_summary(session_id: str) -> ClinicalSummaryResponse:
    """Retrieves generated clinical summary draft for physician queue review."""
    try:
        return summary_generator_service.get_summary(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/{session_id}/confirm", response_model=ClinicalSummaryResponse)
async def confirm_summary(session_id: str, req: ConfirmSummaryRequest) -> ClinicalSummaryResponse:
    """Physician confirms or edits clinical summary and updates status for HIS/ABDM sync."""
    try:
        if req.session_id != session_id:
            req.session_id = session_id
        return summary_generator_service.confirm_summary(req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error confirming summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
