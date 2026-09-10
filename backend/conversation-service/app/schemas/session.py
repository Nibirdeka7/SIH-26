from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class LanguageCode(str, Enum):
    EN = "en"
    HI = "hi"
    TA = "ta"
    TE = "te"
    KN = "kn"
    BN = "bn"
    MR = "mr"
    GU = "gu"
    ML = "ml"
    AS = "as"


class IntakeMode(str, Enum):
    ALLOPATHY = "allopathy"
    AYUSH = "ayush"
    HYBRID = "hybrid"


class SessionStatus(str, Enum):
    INITIATED = "INITIATED"
    INTAKE_IN_PROGRESS = "INTAKE_IN_PROGRESS"
    CRITICAL_EMERGENCY = "CRITICAL_EMERGENCY"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RedFlagCategory(str, Enum):
    CARDIAC = "CARDIAC"
    RESPIRATORY = "RESPIRATORY"
    NEUROLOGICAL = "NEUROLOGICAL"
    SEVERE_TRAUMA = "SEVERE_TRAUMA"
    HEMORRHAGE = "HEMORRHAGE"
    ANAPHYLAXIS = "ANAPHYLAXIS"
    PSYCHIATRIC_EMERGENCY = "PSYCHIATRIC_EMERGENCY"


class TriageAssessment(BaseModel):
    is_critical: bool = False
    priority_score: int = Field(default=1, ge=1, le=10, description="1 (Routine) to 10 (Imminent Risk)")
    triage_level: str = "ROUTINE"  # ROUTINE, URGENT, CRITICAL_EMERGENCY
    red_flags: List[str] = Field(default_factory=list)
    red_flag_categories: List[RedFlagCategory] = Field(default_factory=list)
    emergency_instructions: Optional[str] = None
    immediate_action_required: bool = False


class SOCRATESData(BaseModel):
    site: Optional[str] = None
    onset: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    associations: Optional[List[str]] = Field(default_factory=list)
    time_course: Optional[str] = None
    exacerbating_relieving: Optional[str] = None
    severity: Optional[int] = Field(default=None, ge=1, le=10)


class AYUSHParikshaData(BaseModel):
    prakriti: Optional[str] = None
    vikriti: Optional[str] = None
    agni: Optional[str] = None  # Manda, Vishama, Tikshna, Sama
    koshtha: Optional[str] = None
    sara: Optional[str] = None


class QuestionOption(BaseModel):
    label_native: str
    label_english: str
    value: str
    icon: Optional[str] = None


class QuestionProgress(BaseModel):
    section: str
    completed: int
    estimated_total: int
    percentage: int


class QuestionModel(BaseModel):
    question_id: str
    text_native: str
    text_english: str
    section: str
    input_mode: str = "voice_and_touch"  # voice_and_touch, voice_and_text, touch_only
    answer_type: str = "single_choice"  # single_choice, multiple_choice, numeric_scale, free_text, yes_no
    options: List[QuestionOption] = Field(default_factory=list)
    allow_voice: bool = True
    allow_text: bool = True
    allow_touch: bool = True
    progress: Optional[QuestionProgress] = None


class StartSessionRequest(BaseModel):
    patient_id: str
    patient_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    language: LanguageCode = LanguageCode.HI
    intake_mode: IntakeMode = IntakeMode.ALLOPATHY


class StartSessionResponse(BaseModel):
    session_id: str
    patient_id: str
    status: SessionStatus
    language: LanguageCode
    greeting: str
    greeting_audio_url: Optional[str] = None
    initial_question: str
    current_question: Optional[QuestionModel] = None
    suggested_quick_responses: List[str] = Field(default_factory=list)


class DialogueTurnRequest(BaseModel):
    session_id: str
    user_text: Optional[str] = None
    selected_option: Optional[str] = None  # Touch option selection
    audio_base64: Optional[str] = None
    language: Optional[LanguageCode] = None


class TurnLog(BaseModel):
    turn_id: int
    speaker: str  # "patient" or "system"
    text_native: str
    text_english: str
    language: str
    timestamp: str
    intent: Optional[str] = None
    extracted_entities: dict[str, Any] = Field(default_factory=dict)


class DialogueTurnResponse(BaseModel):
    session_id: str
    turn_id: int
    status: SessionStatus
    recognized_text_native: str
    translated_text_english: str
    ai_response_native: str
    ai_response_english: str
    current_question: Optional[QuestionModel] = None
    response_audio_base64: Optional[str] = None
    triage: TriageAssessment
    current_framework_step: str
    suggested_quick_responses: List[str] = Field(default_factory=list)
    extracted_clinical_updates: dict[str, Any] = Field(default_factory=dict)
    is_completed: bool = False


class SessionStateResponse(BaseModel):
    session_id: str
    patient_id: str
    patient_name: str
    language: LanguageCode
    intake_mode: IntakeMode
    status: SessionStatus
    triage: TriageAssessment
    socrates: SOCRATESData
    ayush: AYUSHParikshaData
    chief_complaint: Optional[str] = None
    current_question: Optional[QuestionModel] = None
    turns: List[TurnLog] = Field(default_factory=list)
    created_at: str
    updated_at: str
