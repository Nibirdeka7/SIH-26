import asyncio
import json

from app.ai.factory import get_ai_provider
from app.services.extraction_mapper import ExtractionMapper


MEDICAL_DATA = """
DISCHARGE SUMMARY

Patient Name: Ananya Sharma
Age: 56 Years
Gender: Female

Date of Admission: 12/08/2026
Date of Discharge: 18/08/2026

Chief Complaints:
1. Fever for 5 days
2. Cough for 4 days
3. Shortness of breath for 2 days
4. Generalized weakness
5. Loss of appetite

Past Medical History:
- Hypertension for 8 years
- Type 2 Diabetes Mellitus for 5 years
- No history of tuberculosis
- No previous major surgeries

Allergies:
- Penicillin allergy
- Food allergy: peanuts

Admission Vitals:
- Blood Pressure: 150/90 mmHg
- Heart Rate: 104 bpm
- Temperature: 101.8 F
- SpO2: 91%

Discharge Vitals:
- Blood Pressure: 128/82 mmHg
- Heart Rate: 82 bpm
- Temperature: 98.4 F
- SpO2: 97%

Diagnoses:
1. Community acquired pneumonia
2. Type 2 Diabetes Mellitus
3. Hypertension

Investigations:

CBC:
- Hemoglobin: 11.2 g/dL
- WBC: 14,500 /uL
- Platelets: 2.1 lakh /uL

Kidney Function:
- Creatinine: 1.1 mg/dL
- Urea: 32 mg/dL

Liver Function:
- AST: 32 U/L
- ALT: 35 U/L

Blood Glucose:
- Fasting glucose: 168 mg/dL
- HbA1c: 7.8 %

ECG:
- Sinus tachycardia
- No acute ST-T changes

Ultrasound:
- Mild fatty liver
- No focal hepatic lesion

Procedures:
- IV cannulation
- Chest physiotherapy

Hospital Course:
The patient was admitted with fever, cough and shortness of breath.
Chest examination revealed bilateral crepitations.
The patient was treated with intravenous antibiotics, oxygen supplementation,
bronchodilators and supportive therapy.
Her respiratory symptoms gradually improved and oxygen saturation normalized.

Medications at Discharge:
1. Metformin 500 mg twice daily
2. Amlodipine 5 mg once daily
3. Azithromycin 500 mg once daily for 3 days
4. Salbutamol inhaler as required

Condition at Discharge:
Stable and clinically improved.

Discharge Instructions:
1. Continue prescribed medications.
2. Monitor blood glucose regularly.
3. Follow a diabetic diet.
4. Maintain adequate hydration.
5. Avoid smoking and alcohol.
6. Perform breathing exercises.
7. Return immediately if severe breathlessness develops.
8. Complete the antibiotic course.

Follow-up:
Follow up with the physician after 7 days at the outpatient department.

Additional Note:
Patient was advised to continue monitoring blood pressure and blood glucose.
"""


async def main():
    provider = get_ai_provider()

    result = await provider.analyze_document(
        text=MEDICAL_DATA,
        document_type="DISCHARGE_SUMMARY",
    )

    # ---------------------------------------------------------------
    # 1. Save raw provider output
    # ---------------------------------------------------------------

    print("\n========== RAW LLM OUTPUT ==========\n")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    raw_output_file = (
        f"scripts/real_{provider.__class__.__name__.lower()}_output.json"
    )

    with open(
        raw_output_file,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            result,
            f,
            indent=2,
            ensure_ascii=False,
        )

    # ---------------------------------------------------------------
    # 2. Parse the LLM extraction JSON
    # ---------------------------------------------------------------

    response_text = result.get("text")

    if not response_text:
        raise ValueError("LLM returned no extraction text.")

    try:
        extracted_data = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "LLM extraction response is not valid JSON."
        ) from exc

    # ---------------------------------------------------------------
    # 3. Map provider output -> MediKiosk canonical schema
    # ---------------------------------------------------------------

    mapper = ExtractionMapper()

    canonical_result = mapper.map(
        gemini_data=extracted_data,
        document_id="real-llm-test-document",
        session_id="real-llm-test-session",
        document_type="DISCHARGE_SUMMARY",
        raw_text=MEDICAL_DATA,
    )

    # ---------------------------------------------------------------
    # 4. Serialize canonical ExtractionResult
    # ---------------------------------------------------------------

    canonical_output = canonical_result.model_dump(
        mode="json"
    )

    canonical_file = (
        f"scripts/canonical_{provider.__class__.__name__.lower()}.json"
    )

    with open(
        canonical_file,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            canonical_output,
            f,
            indent=2,
            ensure_ascii=False,
        )

    # ---------------------------------------------------------------
    # 5. Print summary
    # ---------------------------------------------------------------

    print("\n====================================")
    print(f"Provider: {provider.__class__.__name__}")
    print(f"Model: {result.get('model')}")
    print(f"Raw output: {raw_output_file}")
    print(f"Canonical output: {canonical_file}")
    print("====================================\n")


if __name__ == "__main__":
    asyncio.run(main())