import json

from app.services.extraction_mapper import ExtractionMapper


INPUT_FILE = "scripts/real_gemini_output.json"


def load_gemini_output() -> dict:
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        payload = json.load(f)

    # GeminiProvider returns a wrapper:
    # {
    #     "text": "<JSON string>",
    #     "model": "...",
    #     "raw_response": "<JSON string>"
    # }
    #
    # The mapper expects the JSON contained inside "text".
    if isinstance(payload, dict) and isinstance(payload.get("text"), str):
        return json.loads(payload["text"])

    # Already-unwrapped JSON
    if isinstance(payload, dict):
        return payload

    raise ValueError("Invalid Gemini output format")


def count_items(data: dict, key: str) -> int:
    value = data.get(key)
    return len(value) if isinstance(value, list) else 0


def main() -> None:
    gemini_data = load_gemini_output()

    print("\n========== GEMINI INPUT ==========\n")
    print("Top-level keys:")
    for key in gemini_data.keys():
        print(f"  - {key}")

    mapper = ExtractionMapper()

    result = mapper.map(
        gemini_data=gemini_data,
        document_id="audit-doc-001",
        session_id="audit-session-001",
        document_type="DISCHARGE_SUMMARY",
        raw_text=None,
    )

    canonical = result.model_dump(mode="json")

    print("\n========== EXTRACTION AUDIT ==========\n")

    ds = canonical.get("discharge_summary") or {}

    checks = {
        "symptoms": len(ds.get("chief_complaints", [])),
        "past_medical_history": len(ds.get("past_medical_history", [])),
        "allergies": len(ds.get("allergies", [])),
        "vitals": len(ds.get("vitals", [])),
        "lab_results": len(ds.get("investigations", [])),
        "investigation_findings": len(ds.get("investigation_findings", [])),
        "imaging_findings": len(ds.get("imaging_findings", [])),
        "clinical_findings": len(ds.get("clinical_findings", [])),
        "diagnoses": len(ds.get("diagnoses", [])),
        "procedures": len(ds.get("procedures", [])),
        "medications": len(ds.get("medications", [])),
    }

    source_keys = {
        "symptoms": "symptoms",
        "past_medical_history": "past_medical_history",
        "allergies": "allergies",
        "vitals": "vitals",
        "lab_results": "lab_results",
        "investigation_findings": "investigation_findings",
        "imaging_findings": "imaging_findings",
        "clinical_findings": "clinical_findings",
        "diagnoses": "diagnoses",
        "procedures": "procedures",
        "medications": "medications",
    }

    for name, mapped_count in checks.items():
        source_count = count_items(gemini_data, source_keys[name])

        print(
            f"{name:25} "
            f"Gemini={source_count:<3} "
            f"Mapper={mapped_count:<3}"
        )

    print("\n========== VERIFICATION ==========\n")
    print(json.dumps(
        canonical["verification"],
        indent=2,
        ensure_ascii=False,
    ))

    print("\n========== COMPLETENESS AUDIT ==========\n")
    print(json.dumps(
        canonical.get("completeness_audit"),
        indent=2,
        ensure_ascii=False,
    ))

    output_file = "scripts/canonical_extraction.json"

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            canonical,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print("\n======================================")
    print(f"Canonical JSON written to: {output_file}")


if __name__ == "__main__":
    main()