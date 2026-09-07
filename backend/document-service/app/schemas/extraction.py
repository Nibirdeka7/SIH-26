from enum import Enum

from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"

    # NOTE: the mapper (ExtractionMapper) never assigns VERIFIED any more.
    # Extraction confidence is not clinical verification, and Gemini's
    # redesigned contract never claims independent verification either.
    # The enum value is kept only so any existing code that reads/compares
    # against VerificationStatus.VERIFIED does not break at import time.


class FieldConfidence(BaseModel):
    """
    Backward-compatible confidence wrapper.

    `score` / `status` / `source_text` / `reason` are the original fields
    and keep their original meaning for any existing caller.

    `extraction_confidence` / `evidence_support` / `verification_status`
    are additive: they carry Gemini's new, more honest confidence
    semantics through untouched, for callers that want them.
    """

    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score for the extracted field, from 0 to 1.",
    )

    status: VerificationStatus = VerificationStatus.UNVERIFIED

    source_text: str | None = Field(
        default=None,
        description="Exact text from the document supporting this extracted value.",
    )

    reason: str | None = Field(
        default=None,
        description="Reason when the field is uncertain or requires review.",
    )

    # --- Additive fields (new Gemini contract semantics) -----------------
    extraction_confidence: float | None = Field(
        default=None,
        description="Raw Gemini extraction_confidence (0-1): how clearly "
        "the source text supports this value. NOT a clinical verification "
        "signal.",
    )

    evidence_support: str | None = Field(
        default=None,
        description="One of: explicit, ambiguous, ocr_uncertain, contradictory.",
    )

    verification_status: str | None = Field(
        default=None,
        description="Raw Gemini verification_status: "
        "not_independently_verified | needs_review.",
    )


class VerificationSummary(BaseModel):
    overall_confidence: float = Field(
        ge=0.0,
        le=1.0,
        default=0.0,
        description="Advisory average of available extraction_confidence "
        "values. Not a clinical verification score, and not computed at "
        "all when Gemini's own extraction_summary already provides "
        "needs_review/review_reasons.",
    )

    needs_review: bool = False

    review_reasons: list[str] = Field(
        default_factory=list,
    )

    # --- Additive field ----------------------------------------------------
    note: str | None = Field(
        default=None,
        description="Gemini's own extraction_summary.note, when provided.",
    )


class CompletenessAudit(BaseModel):
    """
    Preserves Gemini's self-reported section-coverage check
    (`completeness_audit` in the new contract) plus any items the mapper
    itself could not safely map. This is advisory, model-generated
    information — not an independent validation system.
    """

    sections_detected_in_source: list[str] = Field(default_factory=list)
    sections_represented_in_output: list[str] = Field(default_factory=list)
    sections_detected_but_not_represented: list[str] = Field(default_factory=list)
    unmapped_content: list[str] = Field(default_factory=list)


class PatientInfo(BaseModel):
    name: str | None = None
    age: int | None = None
    sex: str | None = None

    date_of_birth: str | None = None

    patient_id: str | None = None
    hospital_id: str | None = None

    address: str | None = None
    phone: str | None = None

    blood_group: str | None = None


class ProviderInfo(BaseModel):
    physician_name: str | None = None
    physician_registration_number: str | None = None

    facility_name: str | None = None
    facility_address: str | None = None

    department: str | None = None
    specialty: str | None = None


class ExtractionMetadata(BaseModel):
    document_title: str | None = None
    document_date: str | None = None

    patient: PatientInfo | None = None
    provider: ProviderInfo | None = None


class Medication(BaseModel):
    name: str | None = None
    generic_name: str | None = None

    strength: str | None = None
    dosage_form: str | None = None

    dose: str | None = None
    route: str | None = None
    frequency: str | None = None

    duration: str | None = None
    quantity: str | None = None

    instructions: str | None = None

    start_date: str | None = None
    end_date: str | None = None

    prescribed_by: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class Diagnosis(BaseModel):
    name: str | None = None
    code: str | None = None
    code_system: str | None = None

    status: str | None = None
    onset_date: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class Symptom(BaseModel):
    name: str | None = None

    severity: str | None = None
    duration: str | None = None
    onset: str | None = None

    associated_factors: list[str] = Field(
        default_factory=list,
    )

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class Allergy(BaseModel):
    substance: str | None = None

    reaction: str | None = None
    severity: str | None = None

    status: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class VitalSign(BaseModel):
    name: str | None = None

    value: str | None = None
    unit: str | None = None

    measurement_date: str | None = None
    measurement_time: str | None = None

    reference_range: str | None = None

    # Additive: preserves qualifiers like "on admission" / "at discharge"
    # when Gemini does not give an explicit date/time for the reading, so
    # repeated measurements of the same vital are never conflated.
    context: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class LabResult(BaseModel):
    test_name: str | None = None

    value: str | None = None
    unit: str | None = None

    reference_range: str | None = None

    abnormal_flag: str | None = None

    specimen_type: str | None = None
    specimen_collection_date: str | None = None

    test_date: str | None = None

    method: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class Procedure(BaseModel):
    name: str | None = None

    code: str | None = None
    code_system: str | None = None

    status: str | None = None

    performed_date: str | None = None

    indication: str | None = None

    findings: str | None = None

    outcome: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class ClinicalFinding(BaseModel):
    finding: str | None = None

    body_site: str | None = None

    severity: str | None = None
    status: str | None = None

    date: str | None = None

    related_diagnosis: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class ImagingFinding(BaseModel):
    finding: str | None = None

    body_site: str | None = None
    laterality: str | None = None

    modality: str | None = None

    measurement: str | None = None
    measurement_unit: str | None = None

    severity: str | None = None

    impression: str | None = None

    comparison_with_previous: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class HistoryItem(BaseModel):
    """
    Past medical history is semantically distinct from an active diagnosis
    or a current symptom (Section 5 of the mapping spec) and needed its
    own minimal representation — the old schema had nowhere to put it
    that didn't misrepresent it as active/current.
    """

    condition: str | None = None
    duration: str | None = None

    # e.g. "active_history" | "negated" — preserved as Gemini reports it,
    # never inferred.
    status: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class InvestigationFinding(BaseModel):
    """
    Qualitative/narrative investigation results (ECG, ultrasound, etc.)
    that do not fit the numeric LabResult shape. Introduced because the
    old schema had no field that could hold this without either dropping
    it or forcing it into a numeric model it doesn't fit.
    """

    study_name: str | None = None
    findings: str | None = None
    impression: str | None = None
    date: str | None = None

    notes: str | None = None

    evidence: str | None = None
    confidence: FieldConfidence | None = None


class PrescriptionData(BaseModel):
    medications: list[Medication] = Field(
        default_factory=list,
    )

    diagnoses: list[Diagnosis] = Field(
        default_factory=list,
    )

    symptoms: list[Symptom] = Field(
        default_factory=list,
    )

    allergies: list[Allergy] = Field(
        default_factory=list,
    )

    clinical_findings: list[ClinicalFinding] = Field(
        default_factory=list,
    )

    vitals: list[VitalSign] = Field(
        default_factory=list,
    )

    prescription_date: str | None = None

    follow_up_date: str | None = None
    follow_up_instructions: str | None = None

    general_instructions: list[str] = Field(
        default_factory=list,
    )

    additional_notes: list[str] = Field(
        default_factory=list,
    )


class LabReportData(BaseModel):
    results: list[LabResult] = Field(
        default_factory=list,
    )

    diagnoses: list[Diagnosis] = Field(
        default_factory=list,
    )

    symptoms: list[Symptom] = Field(
        default_factory=list,
    )

    allergies: list[Allergy] = Field(
        default_factory=list,
    )

    vitals: list[VitalSign] = Field(
        default_factory=list,
    )

    clinical_findings: list[ClinicalFinding] = Field(
        default_factory=list,
    )

    collection_date: str | None = None
    report_date: str | None = None

    laboratory_name: str | None = None
    laboratory_address: str | None = None

    pathologist_name: str | None = None
    pathologist_registration_number: str | None = None

    general_notes: list[str] = Field(
        default_factory=list,
    )

    additional_notes: list[str] = Field(
        default_factory=list,
    )


class DischargeSummaryData(BaseModel):
    admission_date: str | None = None
    discharge_date: str | None = None

    admission_reason: str | None = None

    chief_complaints: list[Symptom] = Field(
        default_factory=list,
    )

    # Additive: previously had nowhere to go; see HistoryItem docstring.
    past_medical_history: list[HistoryItem] = Field(
        default_factory=list,
    )

    diagnoses: list[Diagnosis] = Field(
        default_factory=list,
    )

    clinical_findings: list[ClinicalFinding] = Field(
        default_factory=list,
    )

    procedures: list[Procedure] = Field(
        default_factory=list,
    )

    medications: list[Medication] = Field(
        default_factory=list,
    )

    allergies: list[Allergy] = Field(
        default_factory=list,
    )

    vitals: list[VitalSign] = Field(
        default_factory=list,
    )

    investigations: list[LabResult] = Field(
        default_factory=list,
    )
    imaging_findings: list[ImagingFinding] = Field(default_factory=list)

    # Additive: qualitative studies (ECG/ultrasound/etc.) — see
    # InvestigationFinding docstring.
    investigation_findings: list[InvestigationFinding] = Field(
        default_factory=list,
    )

    hospital_course: str | None = None

    treatment_summary: str | None = None

    condition_at_discharge: str | None = None

    discharge_instructions: list[str] = Field(
        default_factory=list,
    )

    follow_up_instructions: list[str] = Field(
        default_factory=list,
    )

    follow_up_date: str | None = None

    # Additive: Gemini's follow_up.facility_or_department had no home.
    follow_up_facility: str | None = None

    diet_instructions: list[str] = Field(
        default_factory=list,
    )

    activity_restrictions: list[str] = Field(
        default_factory=list,
    )

    warning_signs: list[str] = Field(
        default_factory=list,
    )

    additional_notes: list[str] = Field(
        default_factory=list,
    )


class RadiologyReportData(BaseModel):
    modality: str | None = None

    body_site: str | None = None
    laterality: str | None = None

    study_date: str | None = None
    report_date: str | None = None

    clinical_indication: str | None = None

    technique: str | None = None

    findings: list[ImagingFinding] = Field(
        default_factory=list,
    )

    impression: str | None = None

    comparison: str | None = None

    recommendations: list[str] = Field(
        default_factory=list,
    )

    diagnoses: list[Diagnosis] = Field(
        default_factory=list,
    )

    clinical_findings: list[ClinicalFinding] = Field(
        default_factory=list,
    )

    additional_notes: list[str] = Field(
        default_factory=list,
    )


class Evidence(BaseModel):
    source_text: str | None = None

    page_number: int | None = None

    section: str | None = None

    confidence: float = Field(
        ge=0.0,
        le=1.0,
        default=0.0,
    )


class ExtractionResult(BaseModel):
    document_id: str
    session_id: str

    document_type: str

    metadata: ExtractionMetadata | None = None

    prescription: PrescriptionData | None = None
    lab_report: LabReportData | None = None
    discharge_summary: DischargeSummaryData | None = None
    radiology_report: RadiologyReportData | None = None

    verification: VerificationSummary

    evidence: list[Evidence] = Field(
        default_factory=list,
    )

    # Additive: see CompletenessAudit docstring.
    completeness_audit: CompletenessAudit | None = None

    raw_text: str | None = None