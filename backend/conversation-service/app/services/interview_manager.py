import datetime
import uuid
import logging
from typing import Dict, Optional, List

from app.schemas.session import (
    AYUSHParikshaData,
    DialogueTurnRequest,
    DialogueTurnResponse,
    IntakeMode,
    LanguageCode,
    QuestionModel,
    QuestionOption,
    QuestionProgress,
    SOCRATESData,
    SessionStateResponse,
    SessionStatus,
    StartSessionRequest,
    StartSessionResponse,
    TriageAssessment,
    TurnLog,
)
from app.services.multilingual_engine import multilingual_engine
from app.services.pinecone_rag import pinecone_rag_service
from app.services.triage_engine import triage_engine

logger = logging.getLogger(__name__)

import os
import json

# Persistent local JSON storage path
DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")
STORE_FILE = os.path.join(DATA_DIR, "sessions_store.json")
os.makedirs(DATA_DIR, exist_ok=True)

def _load_sessions_db() -> Dict[str, dict]:
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warn(f"Failed loading sessions store file: {e}")
    return {}

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../..")))

try:
    from shared_db.database import SessionLocal
    from shared_db.models import ClinicalSessionRecord
    from shared_db.json_db_manager import json_db_manager
except Exception as e:
    logger.warning(f"Could not import shared_db: {e}")
    SessionLocal = None
    ClinicalSessionRecord = None
    json_db_manager = None

def _sync_to_central_db(session_record: dict):
    if not SessionLocal or not ClinicalSessionRecord or not isinstance(session_record, dict):
        return
    db = SessionLocal()
    try:
        sid = session_record.get("session_id")
        if not sid:
            return
        rec = db.query(ClinicalSessionRecord).filter(ClinicalSessionRecord.id == sid).first()
        if not rec:
            rec = ClinicalSessionRecord(id=sid)
            db.add(rec)
        
        rec.patient_id = session_record.get("patient_id")
        rec.patient_name = session_record.get("patient_name")
        rec.age = session_record.get("age", 42)
        rec.gender = session_record.get("gender", "male")
        rec.language = _get_str_val(session_record.get("language"), "hi")
        rec.intake_mode = _get_str_val(session_record.get("intake_mode"), "allopathy")
        rec.status = _get_str_val(session_record.get("status"), "INITIATED")
        rec.chief_complaint = session_record.get("chief_complaint")
        rec.socrates_json = json.dumps(session_record.get("socrates", {}))
        rec.ayush_json = json.dumps(session_record.get("ayush", {}))
        rec.triage_json = json.dumps(session_record.get("triage", {}))
        rec.current_question_json = json.dumps(session_record.get("current_question", {}))
        rec.turns_json = json.dumps(session_record.get("turns", []))
        
        db.commit()
    except Exception as err:
        logger.warning(f"Central DB session sync notice: {err}")
        db.rollback()
    finally:
        db.close()

def _save_sessions_db(db: Dict[str, dict]):
    try:
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        if json_db_manager:
            for sid, sess in db.items():
                json_db_manager.save_session(sess)
        for _, sess in db.items():
            _sync_to_central_db(sess)
    except Exception as e:
        logger.warn(f"Failed saving sessions store file: {e}")

# In-memory Session Storage synced with persistent store
sessions_db: Dict[str, dict] = _load_sessions_db()
if json_db_manager:
    shared_sessions = json_db_manager.get_all_sessions()
    sessions_db.update(shared_sessions)

# Clinical Ontology Questions Registry with Rich Touch Option Presets
CLINICAL_QUESTIONS_REGISTRY = {
    "site": {
        "id": "socrates_site",
        "text_en": "Where on your body is the pain or discomfort located?",
        "section": "location",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "सीने में (Chest)", "label_english": "Chest", "value": "Chest"},
            {"label_native": "सिर में (Head)", "label_english": "Head", "value": "Head"},
            {"label_native": "पेट में (Stomach)", "label_english": "Stomach", "value": "Stomach"},
            {"label_native": "जोड़ों में (Joints)", "label_english": "Joints", "value": "Joints"},
        ]
    },
    "onset": {
        "id": "socrates_onset",
        "text_en": "When did this symptom start? Was it sudden or gradual?",
        "section": "onset",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "आज ही (Today)", "label_english": "Today", "value": "Today"},
            {"label_native": "कल से (Yesterday)", "label_english": "Yesterday", "value": "Yesterday"},
            {"label_native": "2-3 दिन पहले (2-3 days ago)", "label_english": "2-3 days ago", "value": "2-3 days ago"},
            {"label_native": "अचानक (Sudden)", "label_english": "Sudden", "value": "Sudden"},
        ]
    },
    "character": {
        "id": "socrates_character",
        "text_en": "How would you describe the pain? (e.g. sharp, dull ache, burning, crushing)",
        "section": "character",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "तेज़ / चुभने वाला (Sharp)", "label_english": "Sharp", "value": "Sharp"},
            {"label_native": "भारी / दबाव (Crushing)", "label_english": "Crushing", "value": "Crushing"},
            {"label_native": "जलन वाला (Burning)", "label_english": "Burning", "value": "Burning"},
            {"label_native": "मीठा दर्द (Dull Ache)", "label_english": "Dull Ache", "value": "Dull Ache"},
        ]
    },
    "radiation": {
        "id": "socrates_radiation",
        "text_en": "Does the pain travel or radiate anywhere else, like your arm, back, or jaw?",
        "section": "radiation",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "बाएं हाथ में (Left Arm)", "label_english": "Left Arm", "value": "Left Arm"},
            {"label_native": "पीठ में (Back)", "label_english": "Back", "value": "Back"},
            {"label_native": "कहीं नहीं (Does not radiate)", "label_english": "No radiation", "value": "No radiation"},
        ]
    },
    "exacerbating_relieving": {
        "id": "socrates_exacerbating",
        "text_en": "Does anything make the symptom better or worse, like walking, resting, or deep breaths?",
        "section": "exacerbating_relieving",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "चलने से बढ़ता है (Worse with walking)", "label_english": "Worse with walking", "value": "Worse with walking"},
            {"label_native": "आराम से ठीक (Better with rest)", "label_english": "Better with rest", "value": "Better with rest"},
            {"label_native": "सांस से बढ़ता है (Worse with deep breath)", "label_english": "Worse with deep breath", "value": "Worse with deep breath"},
        ]
    },
    "severity": {
        "id": "socrates_severity",
        "text_en": "On a scale of 1 to 10, how severe is your pain or discomfort?",
        "section": "severity",
        "input_mode": "voice_and_touch",
        "answer_type": "numeric_scale",
        "options": [
            {"label_native": "1 - बहुत कम (Mild)", "label_english": "1", "value": "1"},
            {"label_native": "5 - मध्यम (Moderate)", "label_english": "5", "value": "5"},
            {"label_native": "8 - तेज़ (Severe)", "label_english": "8", "value": "8"},
            {"label_native": "10 - असहनीय (Unbearable)", "label_english": "10", "value": "10"},
        ]
    },
    "agni": {
        "id": "ayush_agni",
        "text_en": "How is your digestion and appetite currently?",
        "section": "ayush_agni",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "धीमा (Mandagni / Slow)", "label_english": "Mandagni (Slow)", "value": "Mandagni (Slow)"},
            {"label_native": "अनियमित (Vishama / Irregular)", "label_english": "Vishama (Irregular)", "value": "Vishama (Irregular)"},
            {"label_native": "सामान्य (Sama / Normal)", "label_english": "Sama (Normal)", "value": "Sama (Normal)"},
        ]
    },
    "koshtha": {
        "id": "ayush_koshtha",
        "text_en": "How are your bowel movements?",
        "section": "ayush_koshtha",
        "input_mode": "voice_and_touch",
        "answer_type": "single_choice",
        "options": [
            {"label_native": "कब्ज (Constipated)", "label_english": "Constipated", "value": "Constipated"},
            {"label_native": "दस्त / ढीला (Loose)", "label_english": "Loose", "value": "Loose"},
            {"label_native": "नियमित (Regular)", "label_english": "Regular", "value": "Regular"},
        ]
    },
}


def _get_str_val(val, default="en") -> str:
    if val is None:
        return default
    if hasattr(val, "value"):
        return str(val.value)
    return str(val)


def _to_question_option(opt) -> QuestionOption:
    if isinstance(opt, QuestionOption):
        return opt
    if isinstance(opt, dict):
        return QuestionOption(**opt)
    if isinstance(opt, str):
        return QuestionOption(label_native=opt, label_english=opt, value=opt)
    return QuestionOption(label_native=str(opt), label_english=str(opt), value=str(opt))


class InterviewManager:
    def create_session(self, req: StartSessionRequest) -> StartSessionResponse:
        session_id = f"sess_{uuid.uuid4().hex[:10]}"
        now = datetime.datetime.utcnow().isoformat()

        lang_str = _get_str_val(req.language, "hi")
        greeting_native = multilingual_engine.get_prompt("greeting", lang_str)

        # Build Initial Question Model
        first_q_meta = CLINICAL_QUESTIONS_REGISTRY["site"]
        first_q_model = QuestionModel(
            question_id=first_q_meta["id"],
            text_native=greeting_native,
            text_english=first_q_meta["text_en"],
            section=first_q_meta["section"],
            input_mode=first_q_meta["input_mode"],
            answer_type=first_q_meta["answer_type"],
            options=[_to_question_option(opt) for opt in first_q_meta["options"]],
            allow_voice=True,
            allow_text=True,
            allow_touch=True,
            progress=QuestionProgress(section="symptom_assessment", completed=0, estimated_total=7, percentage=0),
        )

        session_record = {
            "session_id": session_id,
            "patient_id": req.patient_id,
            "patient_name": req.patient_name,
            "age": req.age,
            "gender": req.gender,
            "language": req.language,
            "intake_mode": req.intake_mode,
            "status": SessionStatus.INITIATED,
            "chief_complaint": None,
            "socrates": SOCRATESData().model_dump(),
            "ayush": AYUSHParikshaData().model_dump(),
            "triage": TriageAssessment().model_dump(),
            "current_question": first_q_model.model_dump(),
            "turns": [],
            "created_at": now,
            "updated_at": now,
        }

        sessions_db[session_id] = session_record
        _save_sessions_db(sessions_db)

        audio_base64 = multilingual_engine.generate_tts_base64(greeting_native, lang_str)
        suggested_responses = ["Chest Pain", "Fever & Cough", "Headache", "Stomach Ache"] if lang_str == "en" else ["सीने में दर्द", "बुखार और खांसी", "सिरदर्द", "पेट दर्द"]

        return StartSessionResponse(
            session_id=session_id,
            patient_id=req.patient_id,
            status=SessionStatus.INITIATED,
            language=req.language if isinstance(req.language, LanguageCode) else LanguageCode(lang_str),
            greeting=greeting_native,
            greeting_audio_url=f"data:audio/mp3;base64,{audio_base64}" if audio_base64 else None,
            initial_question=greeting_native,
            current_question=first_q_model,
            suggested_quick_responses=suggested_responses,
        )

    async def process_turn(self, req: DialogueTurnRequest) -> DialogueTurnResponse:
        session_id = req.session_id
        if session_id not in sessions_db:
            raise ValueError(f"Session {session_id} not found.")

        sess = sessions_db[session_id]
        lang = _get_str_val(req.language) if req.language else _get_str_val(sess.get("language"), "hi")
        now = datetime.datetime.utcnow().isoformat()

        # Combine text or touch option input
        user_input_native = req.selected_option or req.user_text or ""
        text_english = await multilingual_engine.translate_to_english(user_input_native, lang)

        if not sess.get("chief_complaint"):
            sess["chief_complaint"] = text_english

        # 1. Critical Triage Analysis on every turn
        triage_res = triage_engine.analyze_utterance(text_english, user_input_native)

        if triage_res.is_critical:
            sess["status"] = SessionStatus.CRITICAL_EMERGENCY
            sess["triage"] = triage_res.model_dump()

            emergency_msg_en = triage_res.emergency_instructions or multilingual_engine.get_prompt("general_emergency", "en")
            emergency_msg_native = multilingual_engine.get_prompt("chest_pain_alert", lang) or emergency_msg_en

            turn_id = len(sess["turns"]) + 1
            sess["turns"].append(TurnLog(
                turn_id=turn_id,
                speaker="patient",
                text_native=user_input_native,
                text_english=text_english,
                language=lang,
                timestamp=now,
                intent="critical_symptom_report"
            ).model_dump())

            audio_b64 = multilingual_engine.generate_tts_base64(emergency_msg_native, lang)

            return DialogueTurnResponse(
                session_id=session_id,
                turn_id=turn_id,
                status=SessionStatus.CRITICAL_EMERGENCY,
                recognized_text_native=user_input_native,
                translated_text_english=text_english,
                ai_response_native=emergency_msg_native,
                ai_response_english=emergency_msg_en,
                current_question=None,
                response_audio_base64=audio_b64,
                triage=triage_res,
                current_framework_step="EMERGENCY_OVERRIDE",
                suggested_quick_responses=["I have reported to Emergency Staff"],
                extracted_clinical_updates={"is_critical": True},
                is_completed=True
            )

        if triage_res.priority_score > sess["triage"]["priority_score"]:
            sess["triage"] = triage_res.model_dump()

        sess["status"] = SessionStatus.INTAKE_IN_PROGRESS

        # 2. Extract Clinical Entities dynamically from user response
        socrates_data = sess["socrates"]
        ayush_data = sess["ayush"]

        extracted_updates = await multilingual_engine.extract_clinical_entities(
            text_english=text_english,
            current_socrates=socrates_data,
            current_ayush=ayush_data,
        )

        for k, v in extracted_updates.items():
            if k in socrates_data and (socrates_data[k] is None or socrates_data[k] == "" or socrates_data[k] == []):
                socrates_data[k] = v
            elif k in ayush_data and (ayush_data[k] is None or ayush_data[k] == "" or ayush_data[k] == []):
                ayush_data[k] = v

        # 3. Adaptive Question Selection Algorithm
        # Evaluate unanswered fields in order of priority
        mode_str = _get_str_val(sess.get("intake_mode"), "allopathy")
        target_fields = ["site", "onset", "character", "radiation", "exacerbating_relieving", "severity"]
        if mode_str in ["ayush", "hybrid"]:
            target_fields.extend(["agni", "koshtha"])

        completed_count = sum(1 for f in target_fields if (socrates_data.get(f) is not None or ayush_data.get(f) is not None))
        total_count = len(target_fields)

        # Find the FIRST unanswered field
        next_unanswered_field = None
        for field in target_fields:
            val = socrates_data.get(field) or ayush_data.get(field)
            if val is None or val == "" or val == []:
                next_unanswered_field = field
                break

        is_completed = False
        next_q_model = None
        next_q_native = ""
        next_q_en = ""
        current_step_tag = ""

        if next_unanswered_field and next_unanswered_field in CLINICAL_QUESTIONS_REGISTRY:
            q_meta = CLINICAL_QUESTIONS_REGISTRY[next_unanswered_field]
            base_q_en = q_meta["text_en"]
            next_q_native, next_q_en = await multilingual_engine.generate_adaptive_doctor_question(
                user_text_native=user_input_native,
                user_text_english=text_english,
                chief_complaint=sess.get("chief_complaint", ""),
                socrates_data=socrates_data,
                next_field=next_unanswered_field,
                base_q_english=base_q_en,
                target_lang=lang,
            )
            current_step_tag = f"DYNAMIC_{next_unanswered_field.upper()}"


            pct = int((completed_count / total_count) * 100)
            next_q_model = QuestionModel(
                question_id=q_meta["id"],
                text_native=next_q_native,
                text_english=next_q_en,
                section=q_meta["section"],
                input_mode=q_meta["input_mode"],
                answer_type=q_meta["answer_type"],
                options=[_to_question_option(opt) for opt in q_meta["options"]],
                allow_voice=True,
                allow_text=True,
                allow_touch=True,
                progress=QuestionProgress(
                    section="symptom_assessment",
                    completed=completed_count,
                    estimated_total=total_count,
                    percentage=pct,
                ),
            )
            sess["current_question"] = next_q_model.model_dump()
        else:
            is_completed = True
            sess["status"] = SessionStatus.COMPLETED
            next_q_en = multilingual_engine.get_prompt("completion", "en")
            next_q_native = await multilingual_engine.translate_from_english(next_q_en, lang)
            current_step_tag = "COMPLETED"
            sess["current_question"] = None

        turn_id = len(sess["turns"]) + 1
        sess["turns"].append(TurnLog(
            turn_id=turn_id,
            speaker="patient",
            text_native=user_input_native,
            text_english=text_english,
            language=lang,
            timestamp=now,
            extracted_entities=extracted_updates,
        ).model_dump())

        audio_b64 = multilingual_engine.generate_tts_base64(next_q_native, lang)
        sess["updated_at"] = now
        _save_sessions_db(sessions_db)

        return DialogueTurnResponse(
            session_id=session_id,
            turn_id=turn_id,
            status=sess["status"],
            recognized_text_native=user_input_native,
            translated_text_english=text_english,
            ai_response_native=next_q_native,
            ai_response_english=next_q_en,
            current_question=next_q_model,
            response_audio_base64=audio_b64,
            triage=TriageAssessment(**sess["triage"]),
            current_framework_step=current_step_tag,
            suggested_quick_responses=[opt.label_native for opt in next_q_model.options] if next_q_model else ["Yes", "No", "Complete"],
            extracted_clinical_updates=extracted_updates,
            is_completed=is_completed,
        )

    def pause_session(self, session_id: str) -> SessionStateResponse:
        if session_id not in sessions_db:
            raise ValueError(f"Session {session_id} not found.")
        sess = sessions_db[session_id]
        sess["status"] = SessionStatus.PAUSED
        sess["updated_at"] = datetime.datetime.utcnow().isoformat()
        _save_sessions_db(sessions_db)
        return self.get_session_state(session_id)

    def resume_session(self, session_id: str) -> SessionStateResponse:
        if session_id not in sessions_db:
            raise ValueError(f"Session {session_id} not found.")
        sess = sessions_db[session_id]
        sess["status"] = SessionStatus.INTAKE_IN_PROGRESS
        sess["updated_at"] = datetime.datetime.utcnow().isoformat()
        _save_sessions_db(sessions_db)
        return self.get_session_state(session_id)

    def complete_session(self, session_id: str) -> SessionStateResponse:
        if session_id not in sessions_db:
            raise ValueError(f"Session {session_id} not found.")
        sess = sessions_db[session_id]
        sess["status"] = SessionStatus.COMPLETED
        sess["updated_at"] = datetime.datetime.utcnow().isoformat()
        _save_sessions_db(sessions_db)
        return self.get_session_state(session_id)

    def get_session_state(self, session_id: str) -> SessionStateResponse:
        if session_id not in sessions_db:
            raise ValueError(f"Session {session_id} not found.")

        s = sessions_db[session_id]
        q_model = QuestionModel(**s["current_question"]) if s.get("current_question") else None

        return SessionStateResponse(
            session_id=s["session_id"],
            patient_id=s["patient_id"],
            patient_name=s["patient_name"],
            language=s["language"],
            intake_mode=s["intake_mode"],
            status=s["status"],
            triage=TriageAssessment(**s["triage"]),
            socrates=SOCRATESData(**s["socrates"]),
            ayush=AYUSHParikshaData(**s["ayush"]),
            chief_complaint=s["chief_complaint"],
            current_question=q_model,
            turns=[TurnLog(**t) for t in s["turns"]],
            created_at=s["created_at"],
            updated_at=s["updated_at"],
        )

    def get_opd_queue(self) -> List[dict]:
        """Generates live OPD patient queue list for physician dashboard review."""
        queue_items = []
        idx = 101
        for sid, sess in sessions_db.items():
            triage_info = sess.get("triage", {})
            triage_lvl = triage_info.get("triage_level") or triage_info.get("triagePriority") or "ROUTINE"
            is_crit = triage_info.get("is_critical") or triage_lvl in ["CRITICAL_EMERGENCY", "P1_CRITICAL", "CRITICAL"]

            queue_items.append({
                "session_id": sid,
                "token_number": f"A-{idx}",
                "patient_name": sess.get("patient_name") or "Rajesh Sharma",
                "age": sess.get("age") or 42,
                "gender": sess.get("gender") or "Male",
                "language": sess.get("language") or "Hindi",
                "chief_complaint": sess.get("chief_complaint") or "Clinical intake in progress",
                "triage_level": triage_lvl,
                "is_critical": is_crit,
                "status": "History Ready",
                "time_waiting": "4 Mins",
            })
            idx += 1

        if not queue_items:
            # Provide initial default queue items if store is empty
            queue_items = [
                {
                    "session_id": "sess_live_101",
                    "token_number": "A-101",
                    "patient_name": "Rajesh Sharma",
                    "age": 42,
                    "gender": "Male",
                    "language": "Hindi",
                    "chief_complaint": "Severe chest discomfort & shortness of breath",
                    "triage_level": "CRITICAL_EMERGENCY",
                    "is_critical": True,
                    "status": "History Ready",
                    "time_waiting": "4 Mins",
                },
                {
                    "session_id": "sess_live_102",
                    "token_number": "A-102",
                    "patient_name": "Sunita Devi",
                    "age": 58,
                    "gender": "Female",
                    "language": "Hindi",
                    "chief_complaint": "High fever, severe headache, and joint pain for 3 days",
                    "triage_level": "URGENT",
                    "is_critical": False,
                    "status": "History Ready",
                    "time_waiting": "12 Mins",
                },
            ]
        return queue_items


interview_manager = InterviewManager()

