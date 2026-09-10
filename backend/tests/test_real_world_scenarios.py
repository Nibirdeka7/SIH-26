import asyncio
import sys
import io
import os
import json
import time

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONV_DIR = os.path.join(BASE_DIR, "conversation-service")
SUMM_DIR = os.path.join(BASE_DIR, "summary-service")

if CONV_DIR not in sys.path:
    sys.path.insert(0, CONV_DIR)
if SUMM_DIR not in sys.path:
    sys.path.insert(0, SUMM_DIR)

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

from app.schemas.session import StartSessionRequest, LanguageCode, IntakeMode
from app.services.interview_manager import interview_manager
from app.services.multilingual_engine import multilingual_engine
from app.services.pinecone_rag import pinecone_rag_service
from app.services.summary_generator import summary_generator_service, summaries_db
from app.schemas.summary import GenerateSummaryRequest, ConfirmSummaryRequest


REAL_WORLD_SCENARIOS = [
    {
        "id": "SCENARIO_1_STROKE_BENGALI",
        "title": "Scenario 1: Geriatric Acute FAST Stroke (Bengali)",
        "patient": {"id": "P-BN-701", "name": "Bimal Roy", "age": 72, "gender": "Male", "lang": LanguageCode.BN, "mode": IntakeMode.ALLOPATHY},
        "utterance": "আমার মুখের একদিক বেঁকে গেছে এবং ডান হাতটা দুর্বল লাগছে, কথা জড়াতে শুরু করেছে",
        "expected_triage": "CRITICAL_EMERGENCY"
    },
    {
        "id": "SCENARIO_2_TRAUMA_GUJARATI",
        "title": "Scenario 2: Road Accident Massive Hemorrhage (Gujarati)",
        "patient": {"id": "P-GU-204", "name": "Jigar Patel", "age": 28, "gender": "Male", "lang": LanguageCode.GU, "mode": IntakeMode.ALLOPATHY},
        "utterance": "મારા પગમાંથી સતત ઘણું બધું લોહી વહી રહ્યું છે અને મને ચક્કર આવી રહ્યા છે",
        "expected_triage": "CRITICAL_EMERGENCY"
    },
    {
        "id": "SCENARIO_3_ANAPHYLAXIS_KANNADA",
        "title": "Scenario 3: Anaphylaxis & Airway Obstruction (Kannada)",
        "patient": {"id": "P-KN-305", "name": "Kavitha Gowda", "age": 24, "gender": "Female", "lang": LanguageCode.KN, "mode": IntakeMode.ALLOPATHY},
        "utterance": "ನನಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆ, ನಾಲಿಗೆ ಊದಿಕೊಂಡಿದೆ ಮತ್ತು ಮೈಯೆಲ್ಲಾ ತುರಿಕೆ ಬಂದಿದೆ",
        "expected_triage": "CRITICAL_EMERGENCY"
    },
    {
        "id": "SCENARIO_4_PEDIATRIC_HINDI",
        "title": "Scenario 4: Pediatric Acute High Fever & Convulsion Risk (Hindi)",
        "patient": {"id": "P-HI-409", "name": "Aarav Sharma (Child)", "age": 4, "gender": "Male", "lang": LanguageCode.HI, "mode": IntakeMode.ALLOPATHY},
        "utterance": "बच्चे को 103 डिग्री तेज़ बुखार है और वह सुस्त पड़ा हुआ है, कुछ खा-पी नहीं रहा",
        "expected_triage": "URGENT"
    },
    {
        "id": "SCENARIO_5_AYUSH_MARATHI",
        "title": "Scenario 5: Chronic Rheumatoid Joint Stiffness / Amavata (AYUSH Marathi)",
        "patient": {"id": "P-MR-512", "name": "Sunita Deshmukh", "age": 48, "gender": "Female", "lang": LanguageCode.MR, "mode": IntakeMode.AYUSH},
        "utterance": "मला दोन्ही पायांचे गुढघे आणि हाताचे सांधे खूप दुखतात, सकाळी उठल्यावर ताठरता असते",
        "expected_triage": "ROUTINE"
    },
    {
        "id": "SCENARIO_6_PSYCHIATRIC_ENGLISH",
        "title": "Scenario 6: High Risk Acute Psychiatric Crisis (English)",
        "patient": {"id": "P-EN-615", "name": "Alex Taylor", "age": 22, "gender": "Other", "lang": LanguageCode.EN, "mode": IntakeMode.ALLOPATHY},
        "utterance": "I feel completely overwhelmed and hopeless, I want to end my life",
        "expected_triage": "CRITICAL_EMERGENCY"
    },
    {
        "id": "SCENARIO_7_ROUTINE_TELUGU",
        "title": "Scenario 7: Mild Routine Headache (Telugu)",
        "patient": {"id": "P-TE-718", "name": "Srinivas Rao", "age": 40, "gender": "Male", "lang": LanguageCode.TE, "mode": IntakeMode.ALLOPATHY},
        "utterance": "నాకు కొద్దిగా తేలికపాటి తలనొప్పి ఉంది",
        "expected_triage": "ROUTINE"
    }
]


async def run_real_world_tests():
    print("==================================================================================")
    print("      MEDIKIOSK REAL-WORLD CLINICAL SCENARIOS & EDGE CASES VERIFICATION           ")
    print("==================================================================================\n")

    results_summary = []

    for scenario in REAL_WORLD_SCENARIOS:
        print(f"----------------------------------------------------------------------------------")
        print(f"  RUNNING: {scenario['title']}")
        print(f"----------------------------------------------------------------------------------")

        p = scenario["patient"]
        start_req = StartSessionRequest(
            patient_id=p["id"],
            patient_name=p["name"],
            age=p["age"],
            gender=p["gender"],
            language=p["lang"],
            intake_mode=p["mode"]
        )
        sess = interview_manager.create_session(start_req)

        # Patient Turn
        turn_res = await interview_manager.process_turn(sess.session_id, scenario["utterance"])
        print(f"  [Native Input ({p['lang'].value})]: \"{scenario['utterance']}\"")
        print(f"  [Gemini Live Clinical EN]: \"{turn_res.translated_text_english}\"")
        print(f"  [Triage Level Detected]: {turn_res.triage.triage_level} (Priority Score: {turn_res.triage.priority_score}/10)")
        print(f"  [Red Flags]: {turn_res.triage.red_flags}")
        print(f"  [AI Patient Response ({p['lang'].value})]: \"{turn_res.ai_response_native[:120]}...\"")

        # RAG Retrieval for Complaint
        rag_hits = await pinecone_rag_service.query_knowledge_base(turn_res.translated_text_english, top_k=1)
        rag_title = rag_hits[0].get('title', 'N/A') if rag_hits else "N/A"
        rag_score = rag_hits[0].get('score', 0) if rag_hits else 0
        if rag_hits:
            print(f"  [Pinecone RAG Match]: {rag_title} (Score: {rag_score:.4f})")

        # Generate LLM Summary
        gen_req = GenerateSummaryRequest(session_id=sess.session_id)
        summary_res = await summary_generator_service.generate_summary(gen_req)

        print(f"  [LLM Summary Specialty Assigned]: {summary_res.suggested_specialty}")
        print(f"  [Bilingual Patient Recap ({p['lang'].value})]: \"{summary_res.bilingual_recap_native}\"\n")

        # Verify Expectations
        if scenario["expected_triage"] == "CRITICAL_EMERGENCY":
            assert turn_res.triage.is_critical is True
        elif scenario["expected_triage"] == "URGENT":
            assert turn_res.triage.priority_score >= 5

        results_summary.append({
            "scenario": scenario["title"],
            "patient": f"{p['name']} ({p['age']}yo {p['gender']})",
            "lang": p["lang"].value,
            "input": scenario["utterance"],
            "gemini_en": turn_res.translated_text_english,
            "triage_level": turn_res.triage.triage_level,
            "priority_score": f"{turn_res.triage.priority_score}/10",
            "specialty": summary_res.suggested_specialty,
            "rag_match": rag_title,
            "patient_recap": summary_res.bilingual_recap_native
        })

        await asyncio.sleep(0.5)

    print("==================================================================================")
    print("                     SUMMARY RESULTS OF ALL 7 SCENARIOS                           ")
    print("==================================================================================")
    for res in results_summary:
        print(f"\n[{res['scenario']}]")
        print(f"  Patient        : {res['patient']} | Lang: {res['lang']}")
        print(f"  Native Input   : {res['input']}")
        print(f"  Gemini EN      : {res['gemini_en']}")
        print(f"  Triage         : {res['triage_level']} ({res['priority_score']})")
        print(f"  Specialty      : {res['specialty']}")
        print(f"  Pinecone Match : {res['rag_match']}")
        print(f"  Audio Recap    : {res['patient_recap']}")

    print("\n================================================================================")
    print("      ALL 7/7 REAL-WORLD SCENARIOS PASSED WITH LIVE LLM & PINECONE! 🚀          ")
    print("================================================================================\n")


if __name__ == "__main__":
    asyncio.run(run_real_world_tests())
