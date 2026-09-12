from typing import Any, List, Optional
from pydantic import BaseModel, Field


class SOCRATESSummary(BaseModel):
    site: Optional[str] = "Not specified"
    onset: Optional[str] = "Not specified"
    character: Optional[str] = "Not specified"
    radiation: Optional[str] = "None reported"
    associations: List[str] = Field(default_factory=list)
    time_course: Optional[str] = "Not specified"
    exacerbating_relieving: Optional[str] = "None reported"
    severity: Optional[int] = Field(default=None, ge=1, le=10)


class AYUSHParikshaSummary(BaseModel):
    prakriti: Optional[str] = "Unassessed"
    vikriti: Optional[str] = "Unassessed"
    agni: Optional[str] = "Normal (Sama)"
    koshtha: Optional[str] = "Normal"


class TriageSummary(BaseModel):
    triage_level: str = "ROUTINE"  # ROUTINE, URGENT, CRITICAL_EMERGENCY
    priority_score: int = Field(default=1, ge=1, le=10)
    is_critical: bool = False
    red_flags: List[str] = Field(default_factory=list)
    emergency_instructions: Optional[str] = None


class GenerateSummaryRequest(BaseModel):
    session_id: str
    include_documents: bool = True


class ConfirmSummaryRequest(BaseModel):
    session_id: Optional[str] = None
    physician_id: str = "DR_104_OPD"
    physician_name: str = "Dr. Vikramaditya Roy"
    edited_hpi: Optional[str] = None
    confirmed_diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    physician_notes: Optional[str] = None


class ClinicalSummaryResponse(BaseModel):
    summary_id: str
    session_id: str
    patient_id: str
    patient_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    language: str
    chief_complaint: str
    hpi_socrates: SOCRATESSummary
    ayush_pariksha: AYUSHParikshaSummary
    triage_assessment: TriageSummary
    digitized_documents_summary: Optional[dict[str, Any]] = None
    suggested_specialty: str = "General OPD"
    unverified_medications: List[str] = Field(default_factory=list)
    bilingual_recap_native: str
    is_confirmed_by_doctor: bool = False
    physician_id: Optional[str] = None
    physician_notes: Optional[str] = None
    created_at: str
    updated_at: str
