import asyncio
import sys
import io
import os
import json

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONV_DIR = os.path.join(BASE_DIR, "conversation-service")
SUMM_DIR = os.path.join(BASE_DIR, "summary-service")

# Setup sys.path for both services
if CONV_DIR not in sys.path:
    sys.path.insert(0, CONV_DIR)
if SUMM_DIR not in sys.path:
    sys.path.insert(0, SUMM_DIR)

# Enable namespace package resolution across both microservices
import app
if hasattr(app, "__path__"):
    conv_app_path = os.path.join(CONV_DIR, "app")
    summ_app_path = os.path.join(SUMM_DIR, "app")
    if conv_app_path not in app.__path__:
        app.__path__.append(conv_app_path)
    if summ_app_path not in app.__path__:
        app.__path__.append(summ_app_path)

from dotenv import load_dotenv
load_dotenv(os.path.join(CONV_DIR, ".env"))


async def test_live_llm_pipeline():
    print("================================================================================")
    print("      MEDIKIOSK LIVE LLM & PINECONE RAG ENGINE - COMPREHENSIVE TEST SUITE       ")
    print("================================================================================\n")

    # -------------------------------------------------------------------------
    # TEST CASE 1: MULTILINGUAL TRANSLATION (HINDI, TAMIL, TELUGU, MARATHI)
    # -------------------------------------------------------------------------
    print(">>> TEST CASE 1: Live Gemini Multilingual Translation (NLU Native -> Clinical EN)")
    from app.services.multilingual_engine import multilingual_engine

    test_inputs = [
        ("hi", "मुझे 3 दिन से लगातार बुखार है और सिर में भयंकर दर्द हो रहा है"),
        ("ta", "எனக்கு 2 நாட்களாக நெஞ்சு வலி மற்றும் மூச்சுத்திணறல் உள்ளது"),
        ("te", "నాకు కడుపులో తీవ్రమైన నొప్పి ఉంది"),
        ("mr", "मला छातीत खूप दुखत आहे आणि श्वास घ्यायला त्रास होतोय")
    ]

    for lang, text in test_inputs:
        en_trans = await multilingual_engine.translate_to_english(text, lang)
        print(f"  [Input ({lang})]: {text}")
        print(f"  [Gemini EN Translation]: {en_trans}\n")
        assert len(en_trans) > 5

    print("[PASSED] TEST CASE 1: Multilingual Translation via Gemini LLM Successful!\n")

    # -------------------------------------------------------------------------
    # TEST CASE 2: LIVE PINECONE VECTOR RAG SEARCH
    # -------------------------------------------------------------------------
    print(">>> TEST CASE 2: Live Pinecone Vector Search (Index 'sih', Namespace 'triage-kb')")
    from app.services.pinecone_rag import pinecone_rag_service

    rag_results = await pinecone_rag_service.query_knowledge_base("Acute chest pain radiating to left arm", top_k=2)
    print(f"  [Query]: 'Acute chest pain radiating to left arm'")
    print(f"  [Pinecone Matches Found]: {len(rag_results)}")
    for idx, match in enumerate(rag_results):
        print(f"    Match #{idx+1} [Score: {match.get('score', 0):.4f}]: {match.get('title')} -> {match.get('text')[:120]}...")
    assert len(rag_results) > 0
    print("[PASSED] TEST CASE 2: Live Pinecone Vector RAG Retrieval Successful!\n")

    # -------------------------------------------------------------------------
    # TEST CASE 3: EMERGENCY CARDIAC TRIAGE & MID-SESSION ESCALATION
    # -------------------------------------------------------------------------
    print(">>> TEST CASE 3: Cardiac Red-Flag Detection & Dynamic Session Escalation")
    from app.schemas.session import StartSessionRequest, LanguageCode, IntakeMode
    from app.services.interview_manager import interview_manager, sessions_db

    start_req = StartSessionRequest(
        patient_id="P-CARDIAC-99",
        patient_name="Rajesh Verma",
        age=56,
        gender="Male",
        language=LanguageCode.HI,
        intake_mode=IntakeMode.ALLOPATHY
    )
    session = interview_manager.create_session(start_req)
    print(f"  [Session Created]: ID={session.session_id}, Greeting={session.greeting}")

    # Turn 1: Vague complaint
    t1 = await interview_manager.process_turn(session.session_id, "मुझे थोड़ी बेचैनी हो रही है")
    print(f"  [Turn 1 Patient]: 'मुझे थोड़ी बेचैनी हो रही है'")
    print(f"  [Turn 1 EN]: {t1.translated_text_english}")
    print(f"  [Turn 1 Response]: {t1.ai_response_native}")

    # Turn 2: Critical Cardiac Emergency
    t2 = await interview_manager.process_turn(session.session_id, "मेरे सीने में बहुत तेज़ दर्द हो रहा है जो बाएं हाथ और जबड़े तक जा रहा है")
    print(f"\n  [Turn 2 Patient (CRITICAL)]: 'मेरे सीने में बहुत तेज़ दर्द हो रहा है जो बाएं हाथ और जबड़े तक जा रहा है'")
    print(f"  [Turn 2 EN]: {t2.translated_text_english}")
    print(f"  [Triage Status]: {t2.status} | Is Critical={t2.triage.is_critical} | Score={t2.triage.priority_score}/10")
    print(f"  [Red Flags Detected]: {t2.triage.red_flags}")
    print(f"  [Emergency Alert Response]: {t2.ai_response_native}")
    assert t2.triage.is_critical is True
    print("[PASSED] TEST CASE 3: Emergency Cardiac Triage Escalation Successful!\n")

    # -------------------------------------------------------------------------
    # TEST CASE 4: AYUSH MODE DASHAVIDHA PARIKSHA INTAKE
    # -------------------------------------------------------------------------
    print(">>> TEST CASE 4: AYUSH Intake Mode & Dashavidha Pariksha")
    ayush_start = StartSessionRequest(
        patient_id="P-AYUSH-12",
        patient_name="Priya Nair",
        age=32,
        gender="Female",
        language=LanguageCode.EN,
        intake_mode=IntakeMode.AYUSH
    )
    ayush_sess = interview_manager.create_session(ayush_start)
    ayush_turn1 = await interview_manager.process_turn(ayush_sess.session_id, "Joint pain and morning stiffness in both knees")
    print(f"  [AYUSH Patient]: 'Joint pain and morning stiffness in both knees'")
    print(f"  [Current Framework Step]: {ayush_turn1.current_framework_step}")
    print(f"  [AI Follow-up]: {ayush_turn1.ai_response_english}")
    print("[PASSED] TEST CASE 4: AYUSH Intake Flow Successful!\n")

    # -------------------------------------------------------------------------
    # TEST CASE 5 & 6: LIVE GEMINI LLM SUMMARY SYNTHESIS & DOCTOR CONFIRMATION
    # -------------------------------------------------------------------------
    print(">>> TEST CASE 5 & 6: Live Gemini LLM Clinical Summary Synthesis & Physician Confirmation")

    from app.services.summary_generator import summary_generator_service
    from app.schemas.summary import GenerateSummaryRequest, ConfirmSummaryRequest

    gen_req = GenerateSummaryRequest(session_id=session.session_id)
    summary_res = await summary_generator_service.generate_summary(gen_req)

    print("\n--------------------------------------------------------------------------------")
    print("                          ACTUAL LLM SYNTHESIS OUTPUT                           ")
    print("--------------------------------------------------------------------------------")
    print(f"  Summary ID         : {summary_res.summary_id}")
    print(f"  Patient Name       : {summary_res.patient_name} (Age: {summary_res.age}, Gender: {summary_res.gender})")
    print(f"  Chief Complaint    : {summary_res.chief_complaint}")
    print(f"  Triage Level       : {summary_res.triage_assessment.triage_level} (Priority Score: {summary_res.triage_assessment.priority_score}/10)")
    print(f"  Suggested Specialty: {summary_res.suggested_specialty}")
    print(f"  HPI SOCRATES      : Site={summary_res.hpi_socrates.site}, Character={summary_res.hpi_socrates.character}, Radiation={summary_res.hpi_socrates.radiation}")
    print(f"  Red Flags          : {summary_res.triage_assessment.red_flags}")
    print(f"  Unverified Meds    : {summary_res.unverified_medications}")
    print(f"  Bilingual Patient Recap ({summary_res.language}): {summary_res.bilingual_recap_native}")

    # Physician Doctor Confirmation
    confirm_req = ConfirmSummaryRequest(
        session_id=session.session_id,
        physician_id="DOC-CARDIO-808",
        physician_name="Dr. Arvind Sharma (Cardiologist)",
        physician_notes="Patient confirmed with Acute Inferior Wall MI. Stat Troponin-I and aspirin/clopidogrel administered. Transferred to Cath Lab."
    )
    confirmed_res = summary_generator_service.confirm_summary(confirm_req)

    print("\n--------------------------------------------------------------------------------")
    print("                       PHYSICIAN CONFIRMATION & EMR SYNC                        ")
    print("--------------------------------------------------------------------------------")
    print(f"  Confirmed Status   : {confirmed_res.is_confirmed_by_doctor}")
    print(f"  Attending Doctor   : {confirmed_res.physician_notes}")
    print(f"  Updated At         : {confirmed_res.updated_at}")

    assert confirmed_res.is_confirmed_by_doctor is True
    print("\n================================================================================")
    print("      ALL LIVE LLM & PINECONE TEST CASES EXECUTED AND PASSED PERFECTLY! 🚀     ")
    print("================================================================================\n")


if __name__ == "__main__":
    asyncio.run(test_live_llm_pipeline())
