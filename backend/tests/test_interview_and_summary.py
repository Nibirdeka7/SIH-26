import asyncio
import sys
import io
import os

# Set UTF-8 encoding for stdout on Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONV_DIR = os.path.join(BASE_DIR, "conversation-service")
SUMM_DIR = os.path.join(BASE_DIR, "summary-service")

async def run_verification_tests():
    print("==================================================")
    print("1. RUNNING CRITICAL TRIAGE & RED FLAG DETECTOR TEST")
    print("==================================================")
    
    # Import conversation service modules
    sys.path.insert(0, CONV_DIR)
    from app.schemas.session import StartSessionRequest, LanguageCode, IntakeMode
    from app.services.interview_manager import interview_manager
    from app.services.triage_engine import triage_engine
    
    # Test 1: Cardiac Red Flag in Hindi
    hindi_cardiac = "मेरे सीने में तेज़ दर्द हो रहा है और सांस फूल रही है"
    triage_res = triage_engine.analyze_utterance("Patient reports severe chest pain and shortness of breath", hindi_cardiac)
    print(f"[TEST 1] Hindi Cardiac Red Flag Result: Is Critical = {triage_res.is_critical}, Triage Level = {triage_res.triage_level}, Score = {triage_res.priority_score}")
    print(f"         Red Flags: {triage_res.red_flags}")
    print(f"         Emergency Alert: {triage_res.emergency_instructions}")
    assert triage_res.is_critical is True
    assert triage_res.triage_level == "CRITICAL_EMERGENCY"
    print("[SUCCESS] CRITICAL TRIAGE RED FLAG TEST PASSED!\n")

    print("==================================================")
    print("2. RUNNING MULTILINGUAL SOCRATES INTERVIEW LOOP TEST")
    print("==================================================")
    
    start_req = StartSessionRequest(
        patient_id="P-1001",
        patient_name="Anita Sharma",
        age=38,
        gender="Female",
        language=LanguageCode.HI,
        intake_mode=IntakeMode.HYBRID
    )
    sess_res = interview_manager.create_session(start_req)
    print(f"[TEST 2] Session Created: {sess_res.session_id}, Language: {sess_res.language}")
    print(f"         Greeting: {sess_res.greeting}")
    print(f"         Has TTS Audio Payload: {sess_res.greeting_audio_url is not None}")

    from app.schemas.session import DialogueTurnRequest

    # Turn 1: Chief Complaint
    turn1 = await interview_manager.process_turn(DialogueTurnRequest(session_id=sess_res.session_id, user_text="मुझे पिछले 2 दिन से बुखार और पेट में दर्द है", language=LanguageCode.HI))
    print(f"\n[Turn 1] Patient: मुझे पिछले 2 दिन से बुखार और पेट में दर्द है")
    print(f"         Translated English: {turn1.translated_text_english}")
    print(f"         AI Follow-up ({turn1.current_framework_step}): {turn1.ai_response_native}")
    
    # Turn 2: Critical Escalation test mid-session
    turn2 = await interview_manager.process_turn(DialogueTurnRequest(session_id=sess_res.session_id, user_text="अब मेरे सीने में बहुत तेज़ दर्द शुरू हो गया है", language=LanguageCode.HI))
    print(f"\n[Turn 2] Patient: अब मेरे सीने में बहुत तेज़ दर्द शुरू हो गया है")
    print(f"         Status: {turn2.status}")
    print(f"         Is Critical Emergency: {turn2.triage.is_critical}")
    print(f"         AI Emergency Alert ({turn2.current_framework_step}): {turn2.ai_response_native}")
    assert turn2.triage.is_critical is True
    print("[SUCCESS] MULTILINGUAL INTERVIEW & MID-SESSION ESCALATION PASSED!\n")

    # Clean sys.modules for summary-service
    for key in list(sys.modules.keys()):
        if key.startswith("app"):
            del sys.modules[key]
    if CONV_DIR in sys.path:
        sys.path.remove(CONV_DIR)

    print("==================================================")
    print("3. RUNNING SUMMARY SERVICE SYNTHESIS TEST")
    print("==================================================")
    
    sys.path.insert(0, SUMM_DIR)
    from app.services.summary_generator import summary_generator_service
    from app.schemas.summary import GenerateSummaryRequest, ConfirmSummaryRequest

    sum_req = GenerateSummaryRequest(session_id="sess_test_cardiac")
    summary = await summary_generator_service.generate_summary(sum_req)
    print(f"[TEST 3] Summary Generated ID: {summary.summary_id}")
    print(f"         Chief Complaint: {summary.chief_complaint}")
    print(f"         Triage Level: {summary.triage_assessment.triage_level}")
    print(f"         Suggested Specialty: {summary.suggested_specialty}")
    print(f"         SOCRATES Site: {summary.hpi_socrates.site}, Severity: {summary.hpi_socrates.severity}/10")
    print(f"         Bilingual Audio Recap: {summary.bilingual_recap_native}")

    # Doctor Confirmation
    conf_req = ConfirmSummaryRequest(
        session_id="sess_test_cardiac",
        physician_id="DOC-505",
        physician_name="Dr. Mehta",
        physician_notes="Patient referred immediately to Cardiology Emergency Bay."
    )
    conf_summary = summary_generator_service.confirm_summary(conf_req)
    print(f"\n[Doctor Action] Summary Confirmed by Dr. Mehta!")
    print(f"                Is Confirmed: {conf_summary.is_confirmed_by_doctor}")
    print(f"                Physician Notes: {conf_summary.physician_notes}")
    assert conf_summary.is_confirmed_by_doctor is True
    print("[SUCCESS] SUMMARY SERVICE SYNTHESIS & DOCTOR CONFIRMATION PASSED!\n")

    print("==================================================")
    print("4. RUNNING PINECONE SEEDING SCRIPT TEST")
    print("==================================================")
    
    sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))
    import seed_pinecone
    seed_pinecone.seed_pinecone()
    print("[SUCCESS] PINECONE VECTOR RAG SEEDING TEST PASSED!\n")

    print("==================================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_verification_tests())
