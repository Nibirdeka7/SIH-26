import os
import json
import datetime
import uuid
import logging
import httpx
from typing import Dict
from google import genai
from app.core.config import settings
try:
    from app.schemas.summary import (
        AYUSHParikshaSummary,
        ClinicalSummaryResponse,
        ConfirmSummaryRequest,
        GenerateSummaryRequest,
        SOCRATESSummary,
        TriageSummary,
    )
except ImportError:
    import sys, os
    summ_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    if summ_dir not in sys.path:
        sys.path.insert(0, summ_dir)
    from app.schemas.summary import (
        AYUSHParikshaSummary,
        ClinicalSummaryResponse,
        ConfirmSummaryRequest,
        GenerateSummaryRequest,
        SOCRATESSummary,
        TriageSummary,
    )

logger = logging.getLogger(__name__)

summaries_db: Dict[str, dict] = {}


class SummaryGeneratorService:
    def __init__(self):
        gemini_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        self.gemini_client = None
        if gemini_key:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                logger.info("Live Gemini Client initialized for Summary Service.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini Client in Summary Service: {e}")

    async def fetch_session_data(self, session_id: str) -> dict:
        """Fetches session data from Conversation Service via HTTP, in-memory sessions_db, or fallback."""
        url = f"{settings.CONVERSATION_SERVICE_URL}/sessions/{session_id}"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass

        # Dynamic in-process lookup if running in combined test context
        try:
            import importlib
            conv_mod = importlib.import_module("app.services.interview_manager")
            sessions_db = getattr(conv_mod, "sessions_db", {})
            if session_id in sessions_db:
                return sessions_db[session_id]
        except Exception:
            pass

        from app.services.mock_data import MOCK_SESSIONS
        if session_id in MOCK_SESSIONS:
            return MOCK_SESSIONS[session_id]

        raise ValueError(f"Session {session_id} not found.")

    async def generate_summary(self, req: GenerateSummaryRequest) -> ClinicalSummaryResponse:
        session_data = await self.fetch_session_data(req.session_id)
        now = datetime.datetime.utcnow().isoformat()

        patient_name = session_data.get("patient_name", "Patient")
        lang = session_data.get("language", "hi")
        chief_complaint = session_data.get("chief_complaint") or "General discomfort"
        socrates_raw = session_data.get("socrates", {})
        ayush_raw = session_data.get("ayush", {})
        triage_raw = session_data.get("triage", {})
        turns_raw = session_data.get("turns", [])

        # Call live Gemini LLM for structured synthesis if client available
        if self.gemini_client:
            for model_name in [settings.GEMINI_MODEL, "models/gemini-2.5-flash", "models/gemini-2.5-flash-lite", "models/gemini-3.6-flash", "models/gemini-flash-latest"]:
                try:
                    prompt = f"""
                    You are a senior physician AI at MediKiosk. Synthesize a clinical summary from the patient's intake data.

                    Patient Info: Name={patient_name}, Age={session_data.get('age', 45)}, Gender={session_data.get('gender', 'M')}, Language={lang}
                    Chief Complaint: {chief_complaint}
                    Triage Assessment: Critical={triage_raw.get('is_critical', False)}, Score={triage_raw.get('priority_score', 1)}, Red Flags={triage_raw.get('red_flags', [])}
                    SOCRATES Raw: {json.dumps(socrates_raw)}
                    Turns History: {json.dumps(turns_raw)}

                    Return ONLY a JSON object matching this schema without markdown codeblocks or extra text:
                    {{
                        "suggested_specialty": "<e.g. Cardiology, Pulmonology, Neurology, AYUSH, General Medicine>",
                        "bilingual_recap_native": "<2 sentence patient recap in language code '{lang}'>",
                        "unverified_medications": ["<list of any self-reported meds requiring verification>"],
                        "socrates_character": "<detailed description of pain character>",
                        "socrates_radiation": "<radiation site>",
                        "socrates_associations": ["<associated symptoms>"]
                    }}
                    """
                    res = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    text_clean = res.text.strip().replace("```json", "").replace("```", "").strip()
                    llm_parsed = json.loads(text_clean)
                    logger.info(f"Gemini LLM ({model_name}) Clinical Summary Synthesis Completed for Session {req.session_id}!")
                    
                    suggested_specialty = llm_parsed.get("suggested_specialty", "General Medicine OPD")
                    bilingual_recap = llm_parsed.get("bilingual_recap_native", f"आपकी मुख्य शिकायत '{chief_complaint}' दर्ज कर ली गई है।")
                    unverified_meds = llm_parsed.get("unverified_medications", [])
                    
                    if llm_parsed.get("socrates_character"):
                        socrates_raw["character"] = llm_parsed["socrates_character"]
                    if llm_parsed.get("socrates_radiation"):
                        socrates_raw["radiation"] = llm_parsed["socrates_radiation"]
                    if llm_parsed.get("socrates_associations"):
                        socrates_raw["associations"] = llm_parsed["socrates_associations"]

                    break

                except Exception as e:
                    logger.warning(f"Gemini summary synthesis failed for model {model_name}: {e}. Trying next candidate...")
                    suggested_specialty = "General Medicine OPD"
                    bilingual_recap = f"Your primary complaint of '{chief_complaint}' has been recorded for the doctor."
                    unverified_meds = []
        else:
            suggested_specialty = "General Medicine OPD"
            bilingual_recap = f"Your primary complaint of '{chief_complaint}' has been recorded for the doctor."
            unverified_meds = []

        hpi = SOCRATESSummary(
            site=socrates_raw.get("site") or "General / Unspecified",
            onset=socrates_raw.get("onset") or "Not specified",
            character=socrates_raw.get("character") or "Not specified",
            radiation=socrates_raw.get("radiation") or "None reported",
            associations=socrates_raw.get("associations") or [],
            time_course=socrates_raw.get("time_course") or "Not specified",
            exacerbating_relieving=socrates_raw.get("exacerbating_relieving") or "None reported",
            severity=socrates_raw.get("severity"),
        )

        ayush = AYUSHParikshaSummary(
            prakriti=ayush_raw.get("prakriti") or "Unassessed",
            vikriti=ayush_raw.get("vikriti") or "Unassessed",
            agni=ayush_raw.get("agni") or "Unassessed",
            koshtha=ayush_raw.get("koshtha") or "Unassessed",
        )

        triage = TriageSummary(
            triage_level=triage_raw.get("triage_level", "ROUTINE"),
            priority_score=triage_raw.get("priority_score", 1),
            is_critical=triage_raw.get("is_critical", False),
            red_flags=triage_raw.get("red_flags", []),
            emergency_instructions=triage_raw.get("emergency_instructions"),
        )

        summary_id = f"sum_{uuid.uuid4().hex[:10]}"
        summary_record = ClinicalSummaryResponse(
            summary_id=summary_id,
            session_id=req.session_id,
            patient_id=session_data.get("patient_id", "P-100"),
            patient_name=patient_name,
            age=session_data.get("age", 45),
            gender=session_data.get("gender", "M"),
            language=lang,
            chief_complaint=chief_complaint,
            hpi_socrates=hpi,
            ayush_pariksha=ayush,
            triage_assessment=triage,
            suggested_specialty=suggested_specialty,
            unverified_medications=unverified_meds,
            bilingual_recap_native=bilingual_recap,
            is_confirmed_by_doctor=False,
            created_at=now,
            updated_at=now,
        )

        summaries_db[req.session_id] = summary_record.model_dump()
        return summary_record

    def confirm_summary(self, req: ConfirmSummaryRequest) -> ClinicalSummaryResponse:
        if req.session_id not in summaries_db:
            raise ValueError(f"Summary for session {req.session_id} not found.")

        rec = summaries_db[req.session_id]
        rec["is_confirmed_by_doctor"] = True
        rec["physician_id"] = req.physician_id
        rec["physician_notes"] = req.physician_notes or f"Confirmed by Dr. {req.physician_name}"
        rec["updated_at"] = datetime.datetime.utcnow().isoformat()

        summaries_db[req.session_id] = rec
        return ClinicalSummaryResponse(**rec)

    def get_summary(self, session_id: str) -> ClinicalSummaryResponse:
        if session_id not in summaries_db:
            raise ValueError(f"Summary for session {session_id} not found.")
        return ClinicalSummaryResponse(**summaries_db[session_id])


summary_generator_service = SummaryGeneratorService()
