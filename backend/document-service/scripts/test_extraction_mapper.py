"""
Tests for ExtractionMapper against the redesigned Gemini contract.

Two fixtures are used:

- WELL_FORMED_GEMINI_OUTPUT: a hand-built payload representing what the
  redesigned Gemini prompt is *supposed* to produce for the discharge
  summary described in the mapping spec. This is a generic contract
  fixture — the mapper contains no logic that references this content;
  it is exercised the same way any other DISCHARGE_SUMMARY payload
  would be.

- DEGRADED_GEMINI_OUTPUT: a trimmed version of an actual observed
  Gemini response that exhibits the real bugs the mapper needed to
  survive (vitals under a differently-named key, a structured
  confidence object, some entities with a null name but usable
  evidence). This exists to prove the mapper's *robustness* logic
  (Section 25/31), not to assert exact field values that Gemini itself
  failed to extract.
"""

from app.schemas.extraction import VerificationStatus
from app.services.extraction_mapper import ExtractionMapper


def _confidence(extraction_confidence=0.97, evidence_support="explicit",
                 verification_status="not_independently_verified"):
    return {
        "extraction_confidence": extraction_confidence,
        "evidence_support": evidence_support,
        "verification_status": verification_status,
    }


WELL_FORMED_GEMINI_OUTPUT = {
    "patient": {
        "name": "Ananya Sharma",
        "age": "56 Years",
        "sex": "Female",
        "date_of_birth": "14/03/1970",
        "patient_id": "CCH-2026-048721",
        "hospital_id": None,
        "address": "24 Lake Road, Kolkata, West Bengal",
        "phone": None,
        "blood_group": "B+",
    },
    "provider": {
        "physician_name": "Dr. Rakesh Mehta",
        "physician_registration_number": None,
        "facility_name": "City Care Multispeciality Hospital",
        "facility_address": None,
        "department": "Internal Medicine",
        "specialty": "Internal Medicine",
    },
    "document_date": "12/08/2026",
    "admission_date": "06/08/2026",
    "discharge_date": "12/08/2026",
    "chief_complaints_note": None,
    "symptoms": [
        {"name": "increased thirst", "duration": "approximately 3 weeks",
         "evidence": "increased thirst, frequent urination...", "confidence": _confidence()},
        {"name": "frequent urination", "duration": "approximately 3 weeks",
         "evidence": "increased thirst, frequent urination...", "confidence": _confidence()},
        {"name": "generalized weakness", "duration": "approximately 3 weeks",
         "evidence": "increased thirst, frequent urination...", "confidence": _confidence()},
        {"name": "intermittent dizziness", "duration": "approximately 3 weeks",
         "evidence": "increased thirst, frequent urination...", "confidence": _confidence()},
        {"name": "swelling of both feet", "duration": "last 5 days",
         "evidence": "swelling of both feet for the last 5 days.", "confidence": _confidence()},
    ],
    "past_medical_history": [
        {"condition": "Type 2 Diabetes Mellitus", "duration": "8 years", "status": "active_history",
         "evidence": "Known case of Type 2 Diabetes Mellitus for 8 years.", "confidence": _confidence()},
        {"condition": "Hypertension", "duration": "6 years", "status": "active_history",
         "evidence": "Hypertension for 6 years.", "confidence": _confidence()},
        {"condition": "Dyslipidemia", "duration": None, "status": "active_history",
         "evidence": "Dyslipidemia.", "confidence": _confidence()},
        {"condition": "tuberculosis", "duration": None, "status": "negated",
         "evidence": "No previous history of tuberculosis.", "confidence": _confidence()},
        {"condition": "bronchial asthma", "duration": None, "status": "negated",
         "evidence": "No known history of bronchial asthma.", "confidence": _confidence()},
    ],
    "allergies": [
        {"substance": "Penicillin", "reaction": "skin rash and itching", "status": "present",
         "evidence": "Allergy to Penicillin - develops skin rash and itching.", "confidence": _confidence()},
        {"substance": "food", "reaction": None, "status": "negated",
         "evidence": "No known food allergy.", "confidence": _confidence()},
    ],
    "vitals": [
        {"name": "Blood Pressure", "value": "168/96", "unit": "mmHg", "context": "on admission",
         "evidence": "Blood Pressure: 168/96 mmHg", "confidence": _confidence()},
        {"name": "Pulse", "value": "92", "unit": "bpm", "context": "on admission",
         "evidence": "Pulse: 92 bpm", "confidence": _confidence()},
        {"name": "Respiratory Rate", "value": "18", "unit": "/min", "context": "on admission",
         "evidence": "Respiratory Rate: 18/min", "confidence": _confidence()},
        {"name": "Temperature", "value": "98.4", "unit": "F", "context": "on admission",
         "evidence": "Temperature: 98.4 F", "confidence": _confidence()},
        {"name": "SpO2", "value": "97", "unit": "%", "context": "on admission, room air",
         "evidence": "SpO2: 97% on room air", "confidence": _confidence()},
        {"name": "Weight", "value": "78", "unit": "kg", "context": "on admission",
         "evidence": "Weight: 78 kg", "confidence": _confidence()},
        {"name": "Blood Pressure", "value": "132/82", "unit": "mmHg", "context": "at discharge",
         "evidence": "Blood pressure at discharge: 132/82 mmHg.", "confidence": _confidence()},
    ],
    "lab_results": [
        {"test_name": "Hemoglobin", "value": "10.8", "unit": "g/dL",
         "evidence": "Hemoglobin: 10.8 g/dL", "confidence": _confidence()},
        {"test_name": "WBC Count", "value": "9,600", "unit": "cells/uL",
         "evidence": "WBC Count: 9,600 cells/uL", "confidence": _confidence()},
        {"test_name": "Platelet Count", "value": "2.18", "unit": "lakh/uL",
         "evidence": "Platelet Count: 2.18 lakh/uL", "confidence": _confidence()},
        {"test_name": "Serum Creatinine", "value": "1.4", "unit": "mg/dL",
         "evidence": "Serum Creatinine: 1.4 mg/dL", "confidence": _confidence()},
        {"test_name": "Blood Urea", "value": "42", "unit": "mg/dL",
         "evidence": "Blood Urea: 42 mg/dL", "confidence": _confidence()},
        {"test_name": "eGFR", "value": "46", "unit": "mL/min/1.73m2",
         "evidence": "eGFR: 46 mL/min/1.73m2", "confidence": _confidence()},
        {"test_name": "Fasting Blood Glucose", "value": "168", "unit": "mg/dL",
         "evidence": "Fasting Blood Glucose: 168 mg/dL", "confidence": _confidence()},
        {"test_name": "Post Prandial Blood Glucose", "value": "246", "unit": "mg/dL",
         "evidence": "Post Prandial Blood Glucose: 246 mg/dL", "confidence": _confidence()},
        {"test_name": "HbA1c", "value": "8.7", "unit": "%",
         "evidence": "HbA1c: 8.7 %", "confidence": _confidence()},
        {"test_name": "Total Cholesterol", "value": "218", "unit": "mg/dL",
         "evidence": "Total Cholesterol: 218 mg/dL", "confidence": _confidence()},
        {"test_name": "LDL Cholesterol", "value": "142", "unit": "mg/dL",
         "evidence": "LDL Cholesterol: 142 mg/dL", "confidence": _confidence()},
        {"test_name": "HDL Cholesterol", "value": "38", "unit": "mg/dL",
         "evidence": "HDL Cholesterol: 38 mg/dL", "confidence": _confidence()},
        {"test_name": "Triglycerides", "value": "191", "unit": "mg/dL",
         "evidence": "Triglycerides: 191 mg/dL", "confidence": _confidence()},
        {"test_name": "AST", "value": "31", "unit": "U/L",
         "evidence": "AST: 31 U/L", "confidence": _confidence()},
        {"test_name": "ALT", "value": "28", "unit": "U/L",
         "evidence": "ALT: 28 U/L", "confidence": _confidence()},
        {"test_name": "Total Bilirubin", "value": "0.8", "unit": "mg/dL",
         "evidence": "Total Bilirubin: 0.8 mg/dL", "confidence": _confidence()},
        {"test_name": "Urine Protein", "value": "++", "unit": None,
         "evidence": "Protein: ++", "confidence": _confidence()},
        {"test_name": "Urine Glucose", "value": "+", "unit": None,
         "evidence": "Glucose: +", "confidence": _confidence()},
        {"test_name": "Urine RBC", "value": "1-2", "unit": "/HPF",
         "evidence": "RBC: 1-2 /HPF", "confidence": _confidence()},
        {"test_name": "Urine WBC", "value": "3-4", "unit": "/HPF",
         "evidence": "WBC: 3-4 /HPF", "confidence": _confidence()},
    ],
    "investigation_findings": [
        {"study_name": "ECG", "findings": "Sinus rhythm. No acute ST-T changes.",
         "evidence": "ECG: Sinus rhythm. No acute ST-T changes.", "confidence": _confidence()},
        {"study_name": "Ultrasound Abdomen",
         "findings": "Mild fatty changes in liver. Both kidneys show mild increased cortical "
                      "echogenicity. No hydronephrosis or renal calculus.",
         "evidence": "Mild fatty changes in liver...", "confidence": _confidence()},
    ],
    "imaging_findings": [],
    "clinical_findings": [
        {"finding": "pedal edema", "body_site": "bilateral", "severity": "mild", "status": "present",
         "evidence": "Bilateral pedal edema, mild.", "confidence": _confidence()},
        {"finding": "respiratory distress", "status": "negated",
         "evidence": "No respiratory distress.", "confidence": _confidence()},
        {"finding": "chest examination clear bilaterally", "status": "present",
         "evidence": "Chest examination clear bilaterally.", "confidence": _confidence()},
        {"finding": "focal neurological deficit", "status": "negated",
         "evidence": "No focal neurological deficit.", "confidence": _confidence()},
    ],
    "diagnoses": [
        {"name": "Type 2 Diabetes Mellitus - poorly controlled", "status": "active",
         "evidence": "1. Type 2 Diabetes Mellitus - poorly controlled", "confidence": _confidence()},
        {"name": "Essential Hypertension", "status": "active",
         "evidence": "2. Essential Hypertension", "confidence": _confidence()},
        {"name": "Dyslipidemia", "status": "active",
         "evidence": "3. Dyslipidemia", "confidence": _confidence()},
        {"name": "Chronic Kidney Disease, Stage 3a", "status": "active",
         "evidence": "4. Chronic Kidney Disease, Stage 3a", "confidence": _confidence()},
        {"name": "Mild anemia", "status": "active",
         "evidence": "5. Mild anemia", "confidence": _confidence()},
        {"name": "Bilateral pedal edema", "status": "active",
         "evidence": "6. Bilateral pedal edema", "confidence": _confidence()},
    ],
    "procedures": [],
    "medications": [
        {"name": "Metformin", "strength": "500 mg", "dose": "1 tablet", "route": "Oral",
         "frequency": "Twice daily", "instructions": "Take after breakfast and dinner.",
         "evidence": "1. Metformin 500 mg tablet...", "confidence": _confidence()},
        {"name": "Amlodipine", "strength": "5 mg", "dose": "1 tablet", "route": "Oral",
         "frequency": "Once daily", "instructions": "Take in the morning.",
         "evidence": "2. Amlodipine 5 mg tablet...", "confidence": _confidence()},
        {"name": "Atorvastatin", "strength": "20 mg", "dose": "1 tablet", "route": "Oral",
         "frequency": "Once daily at night", "evidence": "3. Atorvastatin 20 mg tablet...",
         "confidence": _confidence()},
        {"name": "Losartan", "strength": "50 mg", "dose": "1 tablet", "route": "Oral",
         "frequency": "Once daily", "evidence": "4. Losartan 50 mg tablet...",
         "confidence": _confidence()},
        {"name": "Ferrous Sulfate", "strength": "325 mg", "dose": "1 tablet", "route": "Oral",
         "frequency": "Once daily", "duration": "30 days",
         "evidence": "5. Ferrous Sulfate 325 mg tablet...", "confidence": _confidence()},
    ],
    "hospital_course": (
        "Patient was admitted for evaluation of uncontrolled blood glucose, hypertension and "
        "pedal edema. Blood glucose was monitored regularly. Antihypertensive and antidiabetic "
        "medications were adjusted. Renal function remained stable during hospitalization. "
        "Patient's blood pressure improved gradually and pedal edema decreased."
    ),
    "condition_at_discharge": (
        "Hemodynamically stable. Blood pressure at discharge: 132/82 mmHg. Blood glucose "
        "improved but requires continued monitoring."
    ),
    "discharge_instructions": [
        "Continue medications as prescribed.",
        "Monitor fasting and post-prandial blood glucose.",
        "Maintain low-salt diabetic diet.",
        "Avoid NSAIDs unless specifically advised by physician.",
        "Maintain adequate hydration.",
        "Monitor blood pressure at home.",
        "Follow up with Internal Medicine after 2 weeks.",
        "Repeat renal function and HbA1c as advised.",
    ],
    "follow_up": {
        "facility_or_department": "Internal Medicine OPD",
        "date": "26/08/2026",
        "instructions": [],
    },
    "additional_notes": [
        {"note": "Patient was advised to bring previous renal function reports during follow-up.",
         "evidence": "Patient was advised to bring previous renal function reports during follow-up."},
    ],
    "completeness_audit": {
        "sections_detected_in_source": ["patient_information", "hospital_course", "discharge_instructions"],
        "sections_represented_in_output": ["patient_information", "hospital_course", "discharge_instructions"],
        "sections_detected_but_not_represented": [],
        "unmapped_content": [],
    },
    "extraction_summary": {
        "needs_review": False,
        "review_reasons": [],
        "note": "Automated extraction only. No field in this document constitutes independent clinical verification.",
    },
}


# A trimmed slice of an actually-observed degraded Gemini response,
# reproducing the real bugs (not the sample document's exact wording is
# what matters, but the *shape* of the malformations).
DEGRADED_GEMINI_OUTPUT = {
    "patient": {"name": "Ananya Sharma", "age": 56, "sex": "Female"},
    "provider": {"physician_name": "Dr. Rakesh Mehta"},
    "document_date": "12/08/2026",
    "admission_date": None,
    "discharge_date": None,
    "symptoms": [
        {
            "name": "Increased thirst",
            "duration": "approximately 3 weeks",
            "confidence": _confidence(extraction_confidence=0.0, evidence_support="ambiguous",
                                       verification_status="needs_review"),
        }
    ],
    "diagnoses": [
        {
            "name": None,
            "status": "active",
            "evidence": "1. Type 2 Diabetes Mellitus - poorly controlled",
            "confidence": _confidence(extraction_confidence=0.0, evidence_support="ambiguous",
                                       verification_status="needs_review"),
        },
        {
            # Nothing to recover an identity from at all.
            "name": None,
            "status": "active",
            "confidence": _confidence(extraction_confidence=0.0),
        },
    ],
    "allergies": [
        {
            "substance": None,
            "reaction": "skin rash and itching",
            "status": "active",
            "evidence": "Allergy to Penicillin - develops skin rash and itching.",
            "confidence": _confidence(extraction_confidence=0.0),
        },
        {
            "substance": None,
            "reaction": None,
            "status": "negated",
            "evidence": "No known food allergy.",
            "confidence": _confidence(extraction_confidence=0.0),
        },
    ],
    "clinical_findings": [
        {
            "finding": "Respiratory distress",
            "status": "negated",
            "evidence": "No respiratory distress.",
            "confidence": _confidence(extraction_confidence=0.0),
        },
    ],
    # Old/wrong key name a still-buggy Gemini call might use — the mapper
    # should NOT read this; it must read "vitals" and correctly find none.
    "vital_signs": [{"name": "Blood Pressure", "value": "168/96", "unit": "mmHg"}],
    "vitals": [],
    "extraction_summary": {"needs_review": True, "review_reasons": ["Low extraction confidence."]},
}


def _mapper():
    return ExtractionMapper()


def test_well_formed_patient_and_dates():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    assert result.metadata.patient.name == "Ananya Sharma"
    assert result.metadata.patient.age == 56
    assert result.metadata.patient.address == "24 Lake Road, Kolkata, West Bengal"
    assert result.metadata.patient.blood_group == "B+"
    assert result.discharge_summary.admission_date == "06/08/2026"
    assert result.discharge_summary.discharge_date == "12/08/2026"
    assert result.metadata.document_date == "12/08/2026"


def test_well_formed_chief_complaints_no_duplication_no_null_names():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    complaints = result.discharge_summary.chief_complaints
    assert len(complaints) == 5
    assert all(c.name for c in complaints)
    assert {c.name for c in complaints} == {
        "increased thirst", "frequent urination", "generalized weakness",
        "intermittent dizziness", "swelling of both feet",
    }


def test_well_formed_diagnoses_all_named():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    diagnoses = result.discharge_summary.diagnoses
    assert len(diagnoses) == 6
    assert all(d.name for d in diagnoses)


def test_well_formed_allergy_substance_and_negation():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    allergies = {a.substance: a for a in result.discharge_summary.allergies}
    assert allergies["Penicillin"].status == "present"
    assert allergies["food"].status == "negated"


def test_well_formed_vitals_preserved_with_context_both_timepoints():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    bp_readings = [v for v in result.discharge_summary.vitals if v.name == "Blood Pressure"]
    assert len(bp_readings) == 2
    contexts = {v.context for v in bp_readings}
    assert contexts == {"on admission", "at discharge"}


def test_well_formed_lab_results_all_preserved():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    assert len(result.discharge_summary.investigations) == 20


def test_well_formed_qualitative_investigations_preserved():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    studies = {f.study_name: f for f in result.discharge_summary.investigation_findings}
    assert "Sinus rhythm" in studies["ECG"].findings
    assert "fatty changes" in studies["Ultrasound Abdomen"].findings


def test_well_formed_narrative_fields_survive():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    ds = result.discharge_summary
    assert ds.hospital_course is not None and "admitted" in ds.hospital_course
    assert ds.condition_at_discharge is not None and "stable" in ds.condition_at_discharge
    assert len(ds.discharge_instructions) == 8


def test_well_formed_follow_up_and_additional_notes():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    ds = result.discharge_summary
    assert ds.follow_up_facility == "Internal Medicine OPD"
    assert ds.follow_up_date == "26/08/2026"
    assert len(ds.additional_notes) == 1
    assert "renal function reports" in ds.additional_notes[0]


def test_well_formed_no_finding_flipped_from_negation():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    findings = {f.finding: f.status for f in result.discharge_summary.clinical_findings}
    assert findings["respiratory distress"] == "negated"
    assert findings["focal neurological deficit"] == "negated"


def test_well_formed_confidence_never_verified():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    all_confidences = [
        d.confidence for d in result.discharge_summary.diagnoses
    ] + [
        s.confidence for s in result.discharge_summary.chief_complaints
    ]
    assert all(c is not None for c in all_confidences)
    assert all(c.status != VerificationStatus.VERIFIED for c in all_confidences)
    assert all(c.verification_status == "not_independently_verified" for c in all_confidences)


def test_well_formed_evidence_survives_per_entity():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    diag = result.discharge_summary.diagnoses[0]
    assert diag.evidence == "1. Type 2 Diabetes Mellitus - poorly controlled"


def test_well_formed_extraction_summary_preserved_not_recomputed():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    assert result.verification.needs_review is False
    assert "independent clinical verification" in result.verification.note


def test_well_formed_past_medical_history_negation_not_diagnosis():
    result = _mapper().map(
        gemini_data=WELL_FORMED_GEMINI_OUTPUT,
        document_id="doc-1", session_id="sess-1", document_type="DISCHARGE_SUMMARY",
    )
    history = {h.condition: h.status for h in result.discharge_summary.past_medical_history}
    assert history["tuberculosis"] == "negated"
    diagnosis_names = {d.name for d in result.discharge_summary.diagnoses}
    assert "tuberculosis" not in diagnosis_names


# ----------------------------------------------------------------------
# Robustness against a degraded/malformed Gemini payload
# ----------------------------------------------------------------------

def test_degraded_payload_does_not_crash():
    result = _mapper().map(
        gemini_data=DEGRADED_GEMINI_OUTPUT,
        document_id="doc-2", session_id="sess-2", document_type="DISCHARGE_SUMMARY",
    )
    assert result.discharge_summary is not None


def test_degraded_payload_reads_vitals_key_not_vital_signs():
    result = _mapper().map(
        gemini_data=DEGRADED_GEMINI_OUTPUT,
        document_id="doc-2", session_id="sess-2", document_type="DISCHARGE_SUMMARY",
    )
    # "vitals": [] is present and correct; "vital_signs" must be ignored.
    assert result.discharge_summary.vitals == []


def test_degraded_payload_recovers_diagnosis_name_from_evidence():
    result = _mapper().map(
        gemini_data=DEGRADED_GEMINI_OUTPUT,
        document_id="doc-2", session_id="sess-2", document_type="DISCHARGE_SUMMARY",
    )
    diagnoses = result.discharge_summary.diagnoses
    # The first malformed diagnosis has evidence -> recovered, numbering stripped.
    assert any(d.name == "Type 2 Diabetes Mellitus - poorly controlled" for d in diagnoses)
    # The second has neither name nor evidence -> safely skipped, not
    # invented, not left in the list as a null-name object.
    assert all(d.name for d in diagnoses)
    assert len(diagnoses) == 1


def test_degraded_payload_skip_is_recorded_in_completeness_audit():
    result = _mapper().map(
        gemini_data=DEGRADED_GEMINI_OUTPUT,
        document_id="doc-2", session_id="sess-2", document_type="DISCHARGE_SUMMARY",
    )
    assert result.completeness_audit is not None
    assert any("skipped" in note.lower() for note in result.completeness_audit.unmapped_content)


def test_degraded_payload_confidence_dict_does_not_crash_and_never_verified():
    result = _mapper().map(
        gemini_data=DEGRADED_GEMINI_OUTPUT,
        document_id="doc-2", session_id="sess-2", document_type="DISCHARGE_SUMMARY",
    )
    symptom = result.discharge_summary.chief_complaints[0]
    assert symptom.confidence is not None
    assert symptom.confidence.status == VerificationStatus.REQUIRES_REVIEW
    assert symptom.confidence.status != VerificationStatus.VERIFIED


def test_degraded_payload_negation_preserved_not_flipped():
    result = _mapper().map(
        gemini_data=DEGRADED_GEMINI_OUTPUT,
        document_id="doc-2", session_id="sess-2", document_type="DISCHARGE_SUMMARY",
    )
    finding = result.discharge_summary.clinical_findings[0]
    assert finding.status == "negated"

    food_allergy = [a for a in result.discharge_summary.allergies if a.status == "negated"]
    assert len(food_allergy) == 1


def test_legacy_flat_confidence_score_never_produces_verified():
    """
    Backward compatibility: even if some caller still sends the OLD
    {"confidence": 0.99} flat-number shape, the mapper must not resurrect
    the false-verification bug.
    """
    legacy_item = {"name": "Old-format diagnosis", "confidence": 0.99}
    confidence = ExtractionMapper._build_confidence(legacy_item)
    assert confidence.status != VerificationStatus.VERIFIED


def test_medication_strength_and_dose_are_preserved():
    gemini_data = {
        "medications": [
            {
                "name": "Metformin",
                "generic_name": None,
                "strength": "500 mg",
                "dosage_form": "tablet",
                "dose": "1 tablet",
                "route": "oral",
                "frequency": "twice daily",
                "duration": None,
                "quantity": None,
                "instructions": None,
                "start_date": None,
                "end_date": None,
                "prescribed_by": None,
                "evidence": "Metformin 500 mg tablet, 1 tablet orally twice daily",
                "confidence": {
                    "extraction_confidence": 0.98,
                    "evidence_support": "explicit",
                    "verification_status": "not_independently_verified",
                },
            }
        ]
    }

    result = ExtractionMapper().map(
        gemini_data=gemini_data,
        document_id="test-doc",
        session_id="test-session",
        document_type="PRESCRIPTION",
    )

    medication = result.prescription.medications[0]

    assert medication.name == "Metformin"
    assert medication.strength == "500 mg"
    assert medication.dosage_form == "tablet"
    assert medication.dose == "1 tablet"
    assert medication.route == "oral"
    assert medication.frequency == "twice daily"

def test_medication_missing_strength_is_not_invented():
    gemini_data = {
        "medications": [
            {
                "name": "Salbutamol inhaler",
                "strength": None,
                "dose": None,
                "frequency": "as required",
                "evidence": "Salbutamol inhaler as required",
                "confidence": {
                    "extraction_confidence": 0.98,
                    "evidence_support": "explicit",
                    "verification_status": "not_independently_verified",
                },
            }
        ]
    }

    result = ExtractionMapper().map(
        gemini_data=gemini_data,
        document_id="test-doc",
        session_id="test-session",
        document_type="PRESCRIPTION",
    )

    medication = result.prescription.medications[0]

    assert medication.strength is None
    assert medication.dose is None