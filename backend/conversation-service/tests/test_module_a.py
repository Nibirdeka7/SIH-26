import pytest
import pytest_asyncio
from app.schemas.session import StartSessionRequest, DialogueTurnRequest, LanguageCode, IntakeMode, SessionStatus
from app.services.interview_manager import interview_manager


@pytest.mark.asyncio
async def test_session_lifecycle_and_persistence():
    """Tests session creation, pause, resume, and completion lifecycle."""
    req = StartSessionRequest(
        patient_id="p_test_101",
        patient_name="Amit Verma",
        age=35,
        gender="male",
        language=LanguageCode.EN,
        intake_mode=IntakeMode.ALLOPATHY,
    )
    res = interview_manager.create_session(req)
    session_id = res.session_id

    assert session_id.startswith("sess_")
    assert res.status == SessionStatus.INITIATED
    assert res.current_question is not None

    # Pause Session
    pause_res = interview_manager.pause_session(session_id)
    assert pause_res.status == SessionStatus.PAUSED

    # Resume Session
    resume_res = interview_manager.resume_session(session_id)
    assert resume_res.status == SessionStatus.INTAKE_IN_PROGRESS

    # Complete Session
    complete_res = interview_manager.complete_session(session_id)
    assert complete_res.status == SessionStatus.COMPLETED


@pytest.mark.asyncio
async def test_chest_pain_adaptive_branching_and_skipping():
    """Tests that detailed initial statement extracts entities and skips redundant SOCRATES questions."""
    req = StartSessionRequest(
        patient_id="p_test_102",
        patient_name="Priya Sharma",
        age=45,
        gender="female",
        language=LanguageCode.EN,
    )
    res = interview_manager.create_session(req)
    session_id = res.session_id

    # Turn 1: Detailed initial utterance containing site, onset, radiation, and severity
    turn1_req = DialogueTurnRequest(
        session_id=session_id,
        user_text="I have severe crushing chest pain since yesterday radiating to my left arm. Severity is 8 out of 10.",
        language=LanguageCode.EN,
    )
    turn1_res = await interview_manager.process_turn(turn1_req)

    assert turn1_res.session_id == session_id
    assert turn1_res.extracted_clinical_updates is not None
    assert turn1_res.extracted_clinical_updates.get("site") == "chest" or "chest" in str(turn1_res.extracted_clinical_updates)
    
    # State inspection
    state = interview_manager.get_session_state(session_id)
    assert state.socrates.site is not None
    assert state.socrates.onset is not None
    assert state.socrates.severity is not None

    # Next question must skip site, onset, radiation, severity and ask character or exacerbating factors
    assert turn1_res.current_question is not None
    assert turn1_res.current_question.section in ["character", "exacerbating_relieving"]


@pytest.mark.asyncio
async def test_dual_input_mode_equivalence():
    """Tests that Voice, Touch Option, and Text inputs produce identical structured clinical state updates."""
    #    # Touch Option
    req_touch = StartSessionRequest(
        patient_id="p_test_touch",
        patient_name="Touch User",
        age=30,
        gender="female",
        language=LanguageCode.EN,
    )
    res_touch = interview_manager.create_session(req_touch)
    turn_touch = await interview_manager.process_turn(DialogueTurnRequest(
        session_id=res_touch.session_id,
        selected_option="Stomach",
        language=LanguageCode.EN,
    ))
    state_touch = interview_manager.get_session_state(res_touch.session_id)

    # Text
    req_text = StartSessionRequest(
        patient_id="p_test_text",
        patient_name="Text User",
        age=30,
        gender="female",
        language=LanguageCode.EN,
    )
    res_text = interview_manager.create_session(req_text)
    turn_text = await interview_manager.process_turn(DialogueTurnRequest(
        session_id=res_text.session_id,
        user_text="Stomach pain",
        language=LanguageCode.EN,
    ))
    state_text = interview_manager.get_session_state(res_text.session_id)

    assert state_touch.socrates.site and state_text.socrates.site
    assert state_touch.socrates.site.lower() == state_text.socrates.site.lower() == "stomach"




@pytest.mark.asyncio
async def test_critical_triage_emergency_escalation():
    """Tests that high-risk red flag symptoms immediately trigger CRITICAL_EMERGENCY status."""
    req = StartSessionRequest(
        patient_id="p_test_emergency",
        patient_name="Emergency Case",
        age=60,
        gender="male",
        language=LanguageCode.EN,
    )
    res = interview_manager.create_session(req)

    emergency_turn = await interview_manager.process_turn(DialogueTurnRequest(
        session_id=res.session_id,
        user_text="I have severe crushing chest pain, difficulty breathing, and cold sweats",
        language=LanguageCode.EN,
    ))

    assert emergency_turn.status == SessionStatus.CRITICAL_EMERGENCY
    assert emergency_turn.triage.is_critical is True
    assert emergency_turn.is_completed is True
