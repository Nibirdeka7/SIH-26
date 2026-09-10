import json
import logging
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from app.schemas.session import (
    DialogueTurnRequest,
    DialogueTurnResponse,
    SessionStateResponse,
    StartSessionRequest,
    StartSessionResponse,
)
from app.services.interview_manager import interview_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["Clinical Intake Sessions"])


@router.post("/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest) -> StartSessionResponse:
    """Starts a new patient clinical interview session (Multilingual + Allopathy/AYUSH)."""
    try:
        return interview_manager.create_session(req)
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/turn", response_model=DialogueTurnResponse)
async def process_dialogue_turn(req: DialogueTurnRequest) -> DialogueTurnResponse:
    """Processes a patient turn (text/audio input), evaluates critical triage, and returns next question."""
    try:
        return await interview_manager.process_turn(req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing turn: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/queue")
async def get_opd_queue():
    """Returns active OPD patient queue for physician dashboard review."""
    try:
        return interview_manager.get_opd_queue()
    except Exception as e:
        logger.error(f"Error fetching queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=SessionStateResponse)
async def get_session_state(session_id: str) -> SessionStateResponse:
    """Returns full current state, SOCRATES entities, triage assessment, and turn history."""
    try:
        return interview_manager.get_session_state(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/{session_id}/pause", response_model=SessionStateResponse)
async def pause_session(session_id: str) -> SessionStateResponse:
    """Pauses an ongoing intake session."""
    try:
        return interview_manager.pause_session(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/{session_id}/resume", response_model=SessionStateResponse)
async def resume_session(session_id: str) -> SessionStateResponse:
    """Resumes a paused intake session."""
    try:
        return interview_manager.resume_session(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/{session_id}/complete", response_model=SessionStateResponse)
async def complete_session(session_id: str) -> SessionStateResponse:
    """Explicitly completes an intake session."""
    try:
        return interview_manager.complete_session(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))



@router.websocket("/{session_id}/ws")
async def websocket_intake_loop(websocket: WebSocket, session_id: str):
    """Real-time WebSocket connection for streaming dialogue turns and instant audio/text feedback."""
    await websocket.accept()
    logger.info(f"WebSocket client connected for session: {session_id}")
    try:
        while True:
            data_str = await websocket.receive_text()
            payload = json.loads(data_str)
            user_text = payload.get("user_text", "")
            
            req = DialogueTurnRequest(
                session_id=session_id,
                user_text=user_text,
                selected_option=payload.get("selected_option"),
            )
            response = await interview_manager.process_turn(req)

            
            await websocket.send_text(response.model_dump_json())
            
            if response.is_completed:
                logger.info(f"Session {session_id} completed or critical triage escalated via WS.")
                break
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error in session {session_id}: {e}")
        await websocket.close()
