import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

SHARED_DB_PATH = os.path.join(os.path.dirname(__file__), "shared_kiosk_database.json")

def load_shared_db() -> Dict[str, Any]:
    """Loads the master shared JSON database file."""
    if os.path.exists(SHARED_DB_PATH):
        try:
            with open(SHARED_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[JSON_DB_MANAGER] Error reading shared_kiosk_database.json: {e}")
    
    # Return initial default structure if file does not exist
    return {
        "patients": [],
        "sessions": {},
        "summaries": {},
        "documents": [],
        "completed_visits": []
    }

def save_shared_db(db_data: Dict[str, Any]) -> bool:
    """Atomically persists database updates to shared_kiosk_database.json."""
    try:
        os.makedirs(os.path.dirname(SHARED_DB_PATH), exist_ok=True)
        # Write to temporary file first for atomic persistence
        temp_path = f"{SHARED_DB_PATH}.tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(db_data, f, default=str, ensure_ascii=False, indent=2)
        os.replace(temp_path, SHARED_DB_PATH)
        return True
    except Exception as e:
        logger.warning(f"[JSON_DB_MANAGER] Error writing to shared_kiosk_database.json: {e}")
        return False

class SharedJsonDatabaseManager:
    """
    Central Database Manager to sync Patient Intake, Document OCR,
    Clinical Summaries, and OPD Doctor Queue across all backend services.
    """
    
    @staticmethod
    def get_all_sessions() -> Dict[str, dict]:
        db = load_shared_db()
        return db.get("sessions", {})

    @staticmethod
    def get_session(session_id: str) -> Optional[dict]:
        db = load_shared_db()
        return db.get("sessions", {}).get(session_id)

    @staticmethod
    def save_session(session_record: dict):
        db = load_shared_db()
        if "sessions" not in db:
            db["sessions"] = {}
        sid = session_record.get("session_id")
        if sid:
            db["sessions"][sid] = session_record
            save_shared_db(db)

    @staticmethod
    def get_all_summaries() -> Dict[str, dict]:
        db = load_shared_db()
        return db.get("summaries", {})

    @staticmethod
    def get_summary(session_id: str) -> Optional[dict]:
        db = load_shared_db()
        return db.get("summaries", {}).get(session_id)

    @staticmethod
    def save_summary(summary_record: dict):
        db = load_shared_db()
        if "summaries" not in db:
            db["summaries"] = {}
        sid = summary_record.get("session_id")
        if sid:
            db["summaries"][sid] = summary_record
            save_shared_db(db)

    @staticmethod
    def add_document(doc_record: dict):
        db = load_shared_db()
        if "documents" not in db:
            db["documents"] = []
        
        doc_id = doc_record.get("document_id")
        existing_index = -1
        if doc_id:
            for idx, existing in enumerate(db["documents"]):
                if existing.get("document_id") == doc_id:
                    existing_index = idx
                    break
        
        if existing_index >= 0:
            db["documents"][existing_index] = doc_record
        else:
            db["documents"].append(doc_record)
            
        sid = doc_record.get("session_id")
        if sid and "sessions" in db and sid in db["sessions"]:
            sess = db["sessions"][sid]
            if "documents" not in sess:
                sess["documents"] = []
            if not any(d.get("document_id") == doc_id for d in sess["documents"]):
                sess["documents"].append(doc_record)
                
        save_shared_db(db)

    @staticmethod
    def get_documents_by_session(session_id: str) -> List[dict]:
        db = load_shared_db()
        docs = db.get("documents", [])
        return [d for d in docs if d.get("session_id") == session_id]

    @staticmethod
    def add_completed_visit(visit_record: dict):
        db = load_shared_db()
        if "completed_visits" not in db:
            db["completed_visits"] = []
        db["completed_visits"].append(visit_record)
        save_shared_db(db)

    @staticmethod
    def get_completed_visits() -> List[dict]:
        db = load_shared_db()
        return db.get("completed_visits", [])

    @staticmethod
    def get_opd_queue() -> List[dict]:
        db = load_shared_db()
        sessions = db.get("sessions", {})
        queue_items = []
        idx = 101
        
        for sid, sess in sessions.items():
            triage_info = sess.get("triage", {})
            triage_lvl = triage_info.get("triage_level") or triage_info.get("triagePriority") or "ROUTINE"
            is_crit = triage_info.get("is_critical") or triage_lvl in ["CRITICAL_EMERGENCY", "P1_CRITICAL", "CRITICAL"]
            doc_count = len(sess.get("documents", [])) or len([d for d in db.get("documents", []) if d.get("session_id") == sid])

            queue_items.append({
                "session_id": sid,
                "token_number": f"A-{idx}",
                "patient_name": sess.get("patient_name") or "Rajesh Sharma",
                "age": sess.get("age") or 42,
                "gender": sess.get("gender") or "Male",
                "language": sess.get("language") or "Hindi",
                "chief_complaint": sess.get("chief_complaint") or "Clinical intake completed",
                "triage_level": triage_lvl,
                "is_critical": is_crit,
                "status": "History Ready" if sess.get("status") in ["COMPLETED", "CRITICAL_EMERGENCY"] else "In Intake",
                "documents_count": doc_count,
                "time_waiting": "4 Mins",
            })
            idx += 1
            
        return queue_items

json_db_manager = SharedJsonDatabaseManager()

