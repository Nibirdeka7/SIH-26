"""
Prompt construction + the JSON contract for the vision path.

EXTRACTION_JSON_SCHEMA below is deliberately identical in shape to
GeminiProvider._JSON_SCHEMA (app/ai/providers/gemini.py) - same keys,
same nesting, same confidence object shape - so that ExtractionMapper
can consume vision output with ZERO changes.

NOTE: this is a second copy of that schema, not a shared import. That is
a conscious, documented trade-off: importing/refactoring gemini.py's
schema out from under its 1000+ line, carefully-tuned prompt carried a
real risk of an editing mistake regressing a working, tested extraction
path, for a purely cosmetic DRY win. The safer choice was to duplicate
the (static, rarely-changing) JSON template here and flag it clearly.
If GeminiProvider's `_JSON_SCHEMA` ever changes, this constant must be
updated to match - consider extracting both into a shared
`app/ai/schema_contract.py` module in a follow-up, reviewed as its own
change.
"""

from typing import Any

EXTRACTION_JSON_SCHEMA = """
{
  "patient": {
    "name": null,
    "age": null,
    "sex": null,
    "date_of_birth": null,
    "patient_id": null,
    "hospital_id": null,
    "address": null,
    "phone": null,
    "blood_group": null
  },

  "provider": {
    "physician_name": null,
    "physician_registration_number": null,
    "facility_name": null,
    "facility_address": null,
    "department": null,
    "specialty": null
  },

  "document_date": null,
  "admission_date": null,
  "discharge_date": null,

  "chief_complaints_note": null,

  "symptoms": [],
  "past_medical_history": [],
  "allergies": [],
  "vitals": [],
  "lab_results": [],
  "investigation_findings": [],
  "imaging_findings": [],
  "clinical_findings": [],
  "diagnoses": [],
  "procedures": [],
  "medications": [
  {
    "name": null,
    "generic_name": null,
    "strength": null,
    "dosage_form": null,
    "dose": null,
    "route": null,
    "frequency": null,
    "duration": null,
    "quantity": null,
    "instructions": null,
    "start_date": null,
    "end_date": null,
    "prescribed_by": null,
    "evidence": null,
    "confidence": {
      "extraction_confidence": 0.0,
      "evidence_support": "explicit",
      "verification_status": "not_independently_verified"
    }
  }
],

  "hospital_course": null,
  "condition_at_discharge": null,
  "discharge_instructions": [],
  "follow_up": {
    "facility_or_department": null,
    "date": null,
    "instructions": []
  },
  "additional_notes": [],

  "completeness_audit": {
    "sections_detected_in_source": [],
    "sections_represented_in_output": [],
    "sections_detected_but_not_represented": [],
    "unmapped_content": []
  },

  "extraction_summary": {
    "needs_review": false,
    "review_reasons": [],
    "note": "Automated vision extraction only. No field in this document constitutes independent clinical verification."
  }
}
""".strip()


INSPECTION_JSON_SCHEMA = """
{
  "is_medical_document": true,
  "likely_document_type": "PRESCRIPTION",
  "document_form": "HANDWRITTEN",
  "image_quality_sufficient": true,
  "has_tables_or_forms": false,
  "ambiguous_regions": [],
  "type_contradiction": null,
  "notes": null
}
""".strip()


_DOC_TYPE_SECTION_HINTS: dict[str, str] = {
    "PRESCRIPTION": (
        "patient information, physician/facility, date, complaints, "
        "diagnosis, investigations, a medication section (name/strength/"
        "dose/route/frequency/duration per line), advice, and follow-up."
    ),
    "LAB_REPORT": (
        "patient, specimen, one or more test/result/unit/reference-range "
        "rows with abnormal flags, and a report date."
    ),
    "DISCHARGE_SUMMARY": (
        "patient identification, admission/discharge dates, chief "
        "complaints, history, allergies, vitals, investigations, "
        "diagnoses, procedures, a hospital-course narrative, discharge "
        "medications, condition at discharge, discharge instructions, "
        "and follow-up."
    ),
    "RADIOLOGY_REPORT": (
        "modality, body site, laterality, indication, technique, a "
        "findings narrative, measurements, an impression, comparison "
        "with prior studies, and recommendations."
    ),
}


# The JSON template intentionally shows empty collections to keep the prompt
# readable.  This reference supplies the missing per-item contract: these are
# the exact primitive keys ExtractionMapper reads.  It applies only to Vision;
# the established text/Groq prompt and mapper remain untouched.
_CANONICAL_ENTITY_FIELD_REFERENCE = """
CANONICAL ENTITY FIELD CONTRACT (use only these primitive fields)

Every populated list item is one plain JSON object.  Its identifying field
and every listed scalar value are a string or null (except where noted).
Never wrap an individual field in {"value", "evidence", "verification"},
{"confidence": ...}, or any other object.  `evidence` and `confidence` are
entity-level sibling fields only; `confidence` has exactly the object shape in
the JSON template.

- symptoms: name, severity, duration, onset, associated_factors (string
  array), notes, evidence, confidence
- past_medical_history: condition, duration, status, notes, evidence,
  confidence
- allergies: substance, reaction, severity, status, notes, evidence,
  confidence
- vitals: name, value, unit, measurement_date, measurement_time,
  reference_range, context, evidence, confidence
- lab_results: test_name, value, unit, reference_range, abnormal_flag,
  specimen_type, specimen_collection_date, test_date, method, notes,
  evidence, confidence
- investigation_findings: study_name, findings, impression, date, notes,
  evidence, confidence
- imaging_findings: finding, body_site, laterality, modality, measurement,
  measurement_unit, severity, impression, comparison_with_previous, notes,
  evidence, confidence
- clinical_findings: finding, body_site, severity, status, date,
  related_diagnosis, notes, evidence, confidence
- diagnoses: name, code, code_system, status, onset_date, notes, evidence,
  confidence
- procedures: name, code, code_system, status, performed_date, indication,
  findings, outcome, notes, evidence, confidence
- medications: name, generic_name, strength, dosage_form, dose, route,
  frequency, duration, quantity, instructions, start_date, end_date,
  prescribed_by, evidence, confidence

`patient` and `provider` fields in the template are primitive strings or
null, except `patient.age`, which is an integer or null.  Do not attach
entity-level evidence/confidence to either object because the canonical
contract has no place for it.  For unreadable values use null; do not create
placeholder entity objects merely to retain uncertain fragments.
""".strip()


def build_inspection_prompt(*, document_type_hint: str | None) -> str:
    if document_type_hint:
        hint_line = (
            f"An upstream OCR/classification step suggested this document "
            f"may be: {document_type_hint}. Treat this ONLY as a hint - "
            f"verify it against what you can actually see in the image. "
            f"If the visual evidence contradicts it, say so in "
            f"`type_contradiction`; do not silently follow a possibly-"
            f"incorrect hint, and do not silently overrule it either "
            f"without recording the disagreement."
        )
    else:
        hint_line = (
            "No upstream document-type hint is available. Determine the "
            "type purely from what you can see."
        )

    return f"""
You are MediKiosk's medical document INSPECTION step. You are looking
directly at the ORIGINAL document image (or a rendered PDF page), not
OCR text. This step exists specifically because OCR text can be
unreliable on handwriting - trust your own visual reading over any
text hint below.

Do NOT extract clinical fields yet. Only assess the document itself.

{hint_line}

Determine:
- whether this document appears to be a medical document at all
- the single most likely document type: PRESCRIPTION, LAB_REPORT,
  DISCHARGE_SUMMARY, RADIOLOGY_REPORT, or UNKNOWN
- whether the writing is PRINTED, HANDWRITTEN, or MIXED (mixed = some
  regions printed, some handwritten - this is common: printed letterhead
  with handwritten medication lines, for example)
- whether image quality (resolution, lighting, blur, crop, glare) is
  sufficient to reliably read clinical detail
- whether the document contains tables or structured forms
- which regions, if any, are visually ambiguous or hard to read - name
  them specifically and briefly (e.g. "second medication line, the
  strength after the drug name", not just "handwriting is messy")

Be honest about uncertainty. If you genuinely cannot tell the document
type, say UNKNOWN rather than guessing from a single weak cue.

Return ONLY one JSON object, no Markdown, matching this schema exactly:

{INSPECTION_JSON_SCHEMA}
""".strip()


def _handwriting_rules_block() -> str:
    return """
===========================================================
HANDWRITING RULES - THIS IS WHY THIS PATH EXISTS
===========================================================

You are reading the ORIGINAL image, specifically so handwriting that a
text-only OCR pipeline already misread can be re-examined visually.

You MUST:
1. Inspect handwriting visually, stroke by stroke where needed - do not
   rely on any OCR text that may accompany this request.
2. Use surrounding context and common prescription notation to help
   interpret abbreviations, but never as a substitute for what is
   actually legible.
3. NEVER invent an unreadable word.
4. NEVER convert an uncertain drug name into a confident one merely
   because it is medically plausible or common.
5. NEVER infer a dosage/frequency merely because it is a common regimen.
6. NEVER infer a diagnosis from medication alone, or a diagnosis from an
   abnormal lab value, unless the document explicitly states it.
7. Preserve ambiguity when the source is genuinely ambiguous: if you
   cannot confidently read a value, set it to null, keep the readable
   fragment (even if partial) in `evidence`, set
   `evidence_support = "illegible_handwriting"`, and
   `verification_status = "needs_review"`.

Example: if the image shows something like "Metf... 500 mg" and you are
not genuinely confident it says "Metformin", do NOT output "Metformin".
Output name = null, evidence = "Metf... 500 mg", and mark it for review.

MEDICATION LINES ARE HIGH RISK. For each medication, independently judge
how legible the NAME is versus the STRENGTH versus the FREQUENCY - do
not let a clearly-legible strength make you more confident about a
poorly-legible name. If the name is not genuinely legible, null it even
if strength/frequency are clear; do not silently substitute a plausible
drug name because the rest of the line otherwise reads cleanly. Do not
merge two medication lines together, and do not split one medication
across two objects.
""".strip()


def build_extraction_prompt(
    *,
    document_type: str,
    inspection: dict[str, Any],
) -> str:
    doc_type_key = (document_type or "UNKNOWN").strip().upper()
    section_hint = _DOC_TYPE_SECTION_HINTS.get(
        doc_type_key,
        "Extract generically using the section-detection rules below; "
        "do not force sections that are not visually present.",
    )

    form = str(inspection.get("document_form") or "UNKNOWN").upper()
    quality_note = (
        "Inspection flagged this document's image quality as possibly "
        "insufficient - be extra conservative and prefer null over a "
        "guess wherever legibility is in doubt."
        if inspection.get("image_quality_sufficient") is False
        else ""
    )
    ambiguous_regions = inspection.get("ambiguous_regions") or []
    ambiguous_note = (
        f"Inspection already flagged these regions as visually ambiguous: "
        f"{', '.join(str(r) for r in ambiguous_regions)}. Pay close "
        f"attention to them, and if they remain unclear, mark the "
        f"corresponding fields for review rather than guessing."
        if ambiguous_regions
        else ""
    )

    return f"""
You are MediKiosk's medical document INFORMATION EXTRACTION engine,
operating on the ORIGINAL document image (or rendered PDF page), not on
OCR text. You are NOT a diagnostic system and must NOT provide medical
advice.

DOCUMENT TYPE: {doc_type_key}
Typical sections for this type: {section_hint}
Do not force a section that is not visually present in THIS document.

DOCUMENT FORM: {form}
{quality_note}
{ambiguous_note}

CORE RULE:
Extract EVERYTHING explicitly visible, NOTHING inferred, NOTHING
silently discarded, NOTHING duplicated. A correct null is better than a
confident wrong value - this is the single most important rule for a
medical extraction system.

{_handwriting_rules_block()}

===========================================================
GENERAL EXTRACTION RULES
===========================================================

- One distinct real-world entity = one object. Do not merge or split
  entities. Never invent a value, infer a diagnosis, infer a dose from
  strength, infer a route/form/frequency, or convert a relative time
  ("after 7 days") into a calendar date.
- Evidence must be the exact readable text (or a faithful transcription
  of a handwriting region) that supports the value - never fabricated,
  never invented after the fact. If evidence is insufficient, the value
  is null.
- For every populated entity, confidence is an object:
  {{
    "extraction_confidence": 0.0,
    "evidence_support": "explicit",
    "verification_status": "not_independently_verified"
  }}
  Allowed `evidence_support`: "explicit", "ambiguous", "ocr_uncertain",
  "illegible_handwriting", "contradictory".
  Allowed `verification_status`: "not_independently_verified",
  "needs_review". Use these literal lowercase strings only.
  `not_independently_verified` is the required status for explicit
  evidence; it does NOT claim clinical verification. NEVER emit an
  affirmative verification label such as "VERIFIED", "FULLY_VERIFIED",
  or "UNVERIFIED", no matter how legible the source was.
  If `evidence_support` is not "explicit", `verification_status` MUST be
  "needs_review".
- Preserve negation, chronology, and context exactly as written (e.g.
  "No known drug allergies" stays negative; admission vitals and
  discharge vitals stay separate entries).
- Absent singular fields = null. Absent collections = []. Keep every
  schema key present.
- Populate `completeness_audit` (sections detected / represented / not
  represented / unmapped content) and `extraction_summary` (needs_review,
  review_reasons, a short honest note) truthfully based on what you
  could and could not read.

{_CANONICAL_ENTITY_FIELD_REFERENCE}

Return ONLY one valid JSON object - no Markdown, no ```json fences, no
commentary, matching this schema exactly:

{EXTRACTION_JSON_SCHEMA}
""".strip()


def build_targeted_reextraction_prompt(
    *,
    document_type: str,
    review_issues: list[dict[str, Any]],
    previous_data: dict[str, Any],
) -> str:
    doc_type_key = (document_type or "UNKNOWN").strip().upper()

    issue_lines = "\n".join(
        f"- {issue.get('field_path')}: {issue.get('reason')}"
        for issue in review_issues
    ) or "- (no specific fields were flagged)"

    return f"""
You previously extracted this {doc_type_key} document from its original
image. A deterministic review step flagged the following fields as
insufficiently supported to trust as-is:

{issue_lines}

Re-inspect ONLY the image regions corresponding to these specific
fields. Look more closely at the handwriting/print in just those areas.
Do not re-extract or change anything else.

For each flagged field:
- if it is now genuinely legible, return the corrected value with its
  evidence and an honest confidence reflecting the re-inspection
- if it remains illegible or ambiguous even on closer inspection, return
  null for that value, keep whatever fragment is readable in `evidence`,
  and keep `verification_status = "needs_review"`

{_handwriting_rules_block()}

{_CANONICAL_ENTITY_FIELD_REFERENCE}

For every entity returned here, use only the literal lowercase
`verification_status` values `not_independently_verified` or
`needs_review`. Never emit affirmative labels such as `VERIFIED`,
`FULLY_VERIFIED`, or `UNVERIFIED`; explicit evidence is still only
`not_independently_verified`.

Return your answer using the SAME full JSON schema as before (every key
present), so it can be merged consistently - only the fields you were
asked to re-examine will actually be used from your response; do not
worry about repeating the rest exactly, but do not invent new values for
fields you were not asked to re-examine either.

{EXTRACTION_JSON_SCHEMA}
""".strip()
