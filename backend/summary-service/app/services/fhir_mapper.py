import uuid
import datetime
from typing import Dict, Any

class FHIRMapper:
    """
    FHIR R4 Serializer for MediKiosk
    Converts internal ClinicalSummary schemas into standard FHIR R4 JSON Bundles
    suitable for ABDM Health Information Exchange (HIE) & Hospital HIS EMR sync.
    """
    
    @staticmethod
    def generate_fhir_bundle(summary_dict: Dict[str, Any]) -> Dict[str, Any]:
        bundle_id = f"fhir-bundle-{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.utcnow().isoformat() + "Z"
        patient_id = summary_dict.get("patient_id", "p_guest_101")
        patient_name = summary_dict.get("patient_name", "Anonymous Patient")
        gender = summary_dict.get("gender", "male").lower()
        chief_complaint = summary_dict.get("chief_complaint", "General Intake")
        hpi = summary_dict.get("hpi_socrates", {})
        triage = summary_dict.get("triage_assessment", {})
        physician_name = summary_dict.get("physician_name", "Dr. Assigned OPD")

        # 1. FHIR Patient Resource
        fhir_patient = {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [
                {
                    "system": "https://abha.abdm.gov.in/patient-id",
                    "value": patient_id
                }
            ],
            "name": [
                {
                    "use": "official",
                    "text": patient_name
                }
            ],
            "gender": gender if gender in ["male", "female", "other"] else "unknown",
        }

        # 2. FHIR Condition Resource (Chief Complaint & HPI)
        condition_id = f"cond-{uuid.uuid4().hex[:8]}"
        fhir_condition = {
            "resourceType": "Condition",
            "id": condition_id,
            "clinicalStatus": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                }]
            },
            "verificationStatus": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                    "code": "confirmed"
                }]
            },
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                    "code": "encounter-diagnosis",
                    "display": "Encounter Diagnosis"
                }]
            }],
            "code": {
                "text": chief_complaint
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "onsetDateTime": now,
            "note": [
                {"text": f"SOCRATES Location: {hpi.get('site', 'N/A')}, Character: {hpi.get('character', 'N/A')}, Severity: {hpi.get('severity', 'N/A')}/10"}
            ]
        }

        # 3. FHIR Observation Resource (Triage Assessment)
        obs_id = f"obs-{uuid.uuid4().hex[:8]}"
        fhir_triage_observation = {
            "resourceType": "Observation",
            "id": obs_id,
            "status": "final",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                    "code": "survey",
                    "display": "Clinical Triage Survey"
                }]
            }],
            "code": {
                "text": "MediKiosk Clinical Triage Urgency Assessment"
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "effectiveDateTime": now,
            "valueString": triage.get("triage_level", "ROUTINE"),
            "interpretation": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                    "code": "CRIT" if triage.get("is_critical") else "NORM",
                    "display": "Critical Red Flag Triggered" if triage.get("is_critical") else "Standard Triage"
                }]
            }]
        }

        # 4. FHIR Composition Resource (Header document)
        comp_id = f"comp-{uuid.uuid4().hex[:8]}"
        fhir_composition = {
            "resourceType": "Composition",
            "id": comp_id,
            "status": "final",
            "type": {
                "text": "MediKiosk Clinical Intake & Pre-Consultation Summary"
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "date": now,
            "author": [
                {
                    "display": physician_name
                }
            ],
            "title": f"OPD Clinical Summary - {patient_name}",
            "section": [
                {
                    "title": "History of Present Illness (SOCRATES)",
                    "entry": [{"reference": f"Condition/{condition_id}"}]
                },
                {
                    "title": "Triage & Vitals Assessment",
                    "entry": [{"reference": f"Observation/{obs_id}"}]
                }
            ]
        }

        # Assemble Full FHIR R4 Collection Bundle
        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "collection",
            "timestamp": now,
            "entry": [
                {"resource": fhir_composition},
                {"resource": fhir_patient},
                {"resource": fhir_condition},
                {"resource": fhir_triage_observation}
            ]
        }

fhir_mapper = FHIRMapper()
