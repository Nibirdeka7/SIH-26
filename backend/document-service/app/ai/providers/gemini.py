"""
GeminiProvider — redesigned extraction stage for MediKiosk's
AI Doc Analyzer.

Scope of this change: ONLY the Gemini prompt construction and the
JSON contract it produces. No changes to DB, Celery, object storage,
FHIR, or API endpoints.

Priority order the prompt is designed around (highest first):
  1. No hallucination
  2. No omission of explicit information
  3. No duplication
  4. Correct section mapping
  5. Correct evidence
  6. Correct confidence semantics
  7. Consistent JSON structure
"""

import json
import logging
from typing import Any

from google import genai

from app.ai.providers.base import AIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Document-type-specific guidance injected into the generic prompt.
# Keep this generic/structural — never hardcode phrases from a specific
# test document. These are *section categories*, not literal strings to
# match against.
# ---------------------------------------------------------------------------
_DOC_TYPE_GUIDANCE: dict[str, str] = {
    "PRESCRIPTION": """
This document type typically contains: patient/provider identification,
a prescription date, symptoms/complaints, diagnoses, allergies, clinical
findings, vitals, medications, follow-up, and general instructions.
There is usually no admission/discharge timeline and no hospital course —
leave those fields null/empty rather than guessing at a structure that
is not present.
""".strip(),
    "LAB_REPORT": """
This document type typically contains: patient/provider/laboratory
identification, specimen collection date, report date, one or more
panels of individual test results (each with its own reference range
and abnormal flag), specimen type, and — only if explicitly written on
the report — narrative comments or diagnoses. Do not infer a diagnosis
from an abnormal value; only record a diagnosis if the document itself
states one in words.
""".strip(),
    "DISCHARGE_SUMMARY": """
This document type typically contains many sections: patient/provider
identification, admission date, discharge date, chief complaints, past
medical history, allergies, vitals (often at multiple timepoints),
investigations (quantitative labs AND qualitative studies such as ECG
or ultrasound narratives), clinical findings, diagnoses, hospital
course (a narrative paragraph), medications on discharge, discharge
condition, discharge instructions (often a bulleted list), follow-up,
additional/pathology notes, and a document date. Discharge summaries
are the highest-risk document type for section-level omission because
they contain many narrative (non-tabular) fields — treat every labeled
section header as a signal that a corresponding field or note MUST be
populated if that section has content.
""".strip(),
    "RADIOLOGY_REPORT": """
This document type typically contains: modality, body site, laterality,
study date, report date, clinical indication, technique, a findings
narrative (often multiple paragraphs or bullet findings), measurements,
an impression/conclusion, comparison with prior studies, and
recommendations. The "impression" is a summary written by the
radiologist, not something you should paraphrase or generate yourself —
extract it verbatim as written if present.
""".strip(),
}


# ---------------------------------------------------------------------------
# JSON contract. This is a superset of the previous schema. Additions:
#   - patient.address / phone / blood_group / hospital_id
#   - provider.registration_number / facility_address / department
#   - admission block (admission_date, discharge_date)
#   - hospital_course, condition_at_discharge, discharge_instructions,
#     follow_up, additional_notes, document_date  (narrative DISCHARGE_SUMMARY
#     fields that were previously silently dropped)
#   - investigation_findings[] — for qualitative studies (ECG, ultrasound
#     narratives) that do not fit numeric lab_results
#   - past_medical_history[] — separate from current symptoms/diagnoses,
#     with a status field so negated history ("no history of TB") is
#     preserved as a negative statement instead of discarded or flipped
#   - a `status`/`negated` field wherever a negation is clinically
#     meaningful (allergies, clinical_findings, past_medical_history)
#   - a restructured `confidence` object (see CONFIDENCE SEMANTICS below)
#     replacing the old flat {"score": 1.0, "status": "VERIFIED"} pattern
#   - completeness_audit — the model's own section-coverage self-check
#   - extraction_summary — top-level, replaces the old blind
#     overall_confidence / needs_review pair
# ---------------------------------------------------------------------------
_JSON_SCHEMA = """
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
    "note": "Automated extraction only. No field in this document constitutes independent clinical verification."
  }
}
""".strip()


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured.")

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL

    async def analyze_document(
        self,
        *,
        text: str | None = None,
        image_data: bytes | None = None,
        document_type: str | None = None,
    ) -> dict[str, Any]:
        if not text or not text.strip():
            raise ValueError("Document text is required for Gemini extraction.")

        prompt = self._build_extraction_prompt(text=text, document_type=document_type)

        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=prompt,
        )

        response_text = (response.text or "").strip()

        if not response_text:
            raise ValueError("Gemini returned an empty response.")

        return {
            "text": response_text,
            "model": self.model_name,
            "raw_response": response_text,
        }

    @staticmethod
    def _build_extraction_prompt(*, text: str, document_type: str | None) -> str:
        doc_type_key = (document_type or "").strip().upper()
        doc_type_guidance = _DOC_TYPE_GUIDANCE.get(
            doc_type_key,
            "No document-type-specific guidance is available for this type. "
            "Extract generically using the section-detection rules below.",
        )

        return f"""

        You are MediKiosk's medical document INFORMATION EXTRACTION engine.
        You are NOT a diagnostic system and must NOT provide medical advice.

        Your task is to convert the supplied document into the exact JSON schema below.

        CORE RULE:
        Extract EVERYTHING explicitly stated, NOTHING inferred, NOTHING silently
        discarded, and NOTHING duplicated.

        DOCUMENT TYPE: {doc_type_key or "UNKNOWN"}
        GUIDANCE: {doc_type_guidance}

        ===========================================================
        1. EXTRACTION PRIORITY
        ===========================================================

        Apply these priorities in order:

        1. Preserve every explicit piece of information.
        2. Never hallucinate or infer unsupported medical facts.
        3. Map information to the correct schema field.
        4. Preserve negation, qualifiers, chronology, and context.
        5. Preserve source evidence for every extracted entity.
        6. Avoid duplicate representation of the same information.
        7. Return valid JSON matching the schema exactly.

        If information does not fit a structured field, preserve it in
        `additional_notes` or `completeness_audit.unmapped_content`.
        NEVER silently discard source content.
        NEVER invent a new top-level field.

        ===========================================================
        2. SOURCE RECONCILIATION — DO THIS BEFORE EXTRACTION
        ===========================================================

        Read the entire document from beginning to end.

        Identify every:
        - section/header
        - paragraph
        - sentence
        - bullet
        - numbered item
        - table row
        - measurement
        - medication
        - diagnosis
        - symptom
        - investigation
        - instruction
        - negative statement
        - date
        - qualifier
        - narrative statement

        Record all detected sections in:
        `completeness_audit.sections_detected_in_source`.

        For EVERY source statement, determine exactly where it belongs:

        A. structured schema field
        B. `additional_notes`
        C. `completeness_audit.unmapped_content`

        Nothing may disappear.

        Do NOT treat the absence of a convenient schema field as permission
        to discard explicit information.

        After extraction, mentally reconcile the source from top to bottom again.
        Any source statement without a destination is an omission and must be fixed.

        ===========================================================
        3. FIELD OWNERSHIP — CRITICAL
        ===========================================================

        Use semantic meaning, not merely keyword matching.

        - `chief_complaints`
        = the canonical destination for distinct complaints when the schema
        represents complaints through `symptoms`.
        Extract EACH complaint as the exact object structure required by
        `_JSON_SCHEMA`; never output complaint strings when the schema expects
        symptom objects.

        - `admission_reason`
        = explicit reason for admission.
        Do not automatically copy every chief complaint here.

        - `past_medical_history`
        = structured history entities. Split the condition from duration when
        explicitly stated. Preserve historical negatives as structured
        entities with the appropriate negative status.

        - `diagnoses`
        = diagnoses explicitly named by the document.
        NEVER derive diagnoses from symptoms, laboratory values, or imaging.

        - `clinical_findings`
        = physical examination, observed clinical findings, or examination
        observations only.
        Do NOT put ordinary symptoms, admission narrative, or hospital-course
        sentences here.

        - `symptoms`
        = each distinct symptom is a structured entity.
        Preserve its name, duration, status, evidence, and confidence only
        when those fields exist in the schema and are explicitly supported.

        - `allergies`
        = each distinct allergy/allergen is a structured entity.
        Extract the allergen separately from descriptive wording.
        Preserve allergy status, evidence, and confidence according to
        `_JSON_SCHEMA`.
        Positive statements such as "Penicillin allergy" remain positive.
        Negative statements such as "No known drug allergies" remain negated.
        Do NOT infer an allergy from medication intolerance, symptoms,
        diagnosis, or treatment.
        Do NOT merge unrelated allergens into one object.

        - `vital_signs`
        = explicit measurements such as BP, HR, temperature, SpO2, etc.
        Preserve explicit temporal context such as Admission or Discharge.

        - `lab_results`
        = quantitative investigations with explicit values/units/reference data.

        - `investigation_findings`
        = qualitative study/report findings such as ECG, ultrasound, X-ray,
        CT, MRI, pathology, etc.
        The unit is the STUDY, not each individual finding.

        - `procedures`
        = explicitly performed, planned, or documented procedures.

        - `medications`
        = medications explicitly documented in the source.

        - `hospital_course`
        = narrative events occurring during the hospitalization/stay.

        - `treatment_summary`
        = explicit summary of treatments/interventions given.

        - `condition_at_discharge`
        = explicit condition/status at discharge.

        - `discharge_instructions`
        = instructions specifically given for discharge/home care.

        - `follow_up_instructions`
        = complete explicit follow-up instructions, including relative timing
        such as "follow up after 7 days".

        - `follow_up_date`
        = calendar date ONLY.
        Never convert "after 7 days", "next week", etc. into a fabricated date.

        - `follow_up_facility`
        = actual named location/facility/department where follow-up occurs.
        Never put the physician's role/name here.

        - `additional_notes`
        = only genuinely uncategorized information.
        NEVER duplicate information already extracted into another field.

        ===========================================================
        4. ANTI-HALLUCINATION
        ===========================================================

        NEVER:
        - invent a value
        - infer a diagnosis
        - infer a medication dose from strength
        - infer duration from quantity
        - infer a date from nearby dates
        - infer a reference range
        - infer medication route/form/frequency
        - medically "correct" an unclear value without preserving uncertainty
        - convert relative dates into calendar dates
        - assume missing information
        - use general medical knowledge as evidence

        If the document does not explicitly support a value:
        use `null`, `[]`, or preserve the unsupported statement in
        `additional_notes`/`unmapped_content`, depending on context.

        ===========================================================
        5. ATOMIC ENTITIES
        ===========================================================

        One distinct real-world entity = one object.

        Split:
        "fever, cough and shortness of breath"
        into three symptom/complaint objects when the schema supports it.

        Do NOT split:
        "Amoxicillin-Clavulanate"
        into two medications.

        Do NOT merge different entities.

        Repeated mentions of the SAME entity should normally be represented once,
        using the most informative evidence.

        EXCEPTION:
        Repeated measurements at different times/contexts MUST remain separate.

        Never create an entity with a null primary identifying field.

        If a statement cannot be assigned to a named entity, preserve the
        statement in `additional_notes` or `unmapped_content`.

        Do NOT use the evidence sentence itself as an entity name.

        ===========================================================
        6. MEDICATION EXTRACTION — HIGH PRECISION
        ===========================================================

        Create exactly one medication object per distinct medication.

        `name` contains ONLY the medication identity.

        Example:
        "Metformin 500 mg twice daily"

        means:

        name = "Metformin"
        strength = "500 mg"
        frequency = "twice daily"

        Do NOT place strength, dose, route, dosage form, frequency, duration,
        quantity, PRN wording, or instructions inside `name`.

        IMPORTANT:
        `strength` and `dose` are DIFFERENT.

        - strength = amount per unit
        - dose = amount administered per administration

        Never copy strength into dose unless the source explicitly states dose.

        Populate each medication field ONLY when explicitly supported:
        - name
        - strength
        - dose
        - dosage_form
        - route
        - frequency
        - duration
        - quantity
        - instructions
        - dates, if supported by schema

        Never calculate or infer any medication field.

        Preserve "as needed", "PRN", etc. as explicit instructions/frequency
        without converting them into a fixed schedule.

        Every populated medication field must be supported by its evidence.

        Before final output, re-check:
        - identity-only name
        - correct medication count
        - no accidental merging
        - no accidental splitting
        - no inferred dose
        - no inferred duration
        - no lost PRN instructions

        ===========================================================
        7. NEGATION, STATUS & TEMPORAL CONTEXT
        ===========================================================

        Preserve explicit negative statements.

        Examples:
        "No history of tuberculosis"
        "No previous major surgeries"
        "No acute ST-T changes"

        NEVER turn a negation into a positive finding.

        Use appropriate status such as:
        - `active_history`
        - `negated`

        For denied allergies, use the schema's negative allergy status.

        For denied clinical findings, preserve the negative status.

        Every explicit "no", "denies", "without", or equivalent negative statement
        must appear in the appropriate field or in `additional_notes`.

        Keep these contexts separate:
        - past history
        - current symptoms
        - admission findings
        - discharge findings
        - hospital-course events
        - follow-up information

        If a measurement appears multiple times with different contexts,
        create separate entries.

        Example:
        Admission BP 150/90
        Discharge BP 128/82

        MUST remain two separate vital-sign entries.

        ===========================================================
        8. VITAL SIGNS
        ===========================================================

        Extract every explicit vital measurement.

        Preserve:
        - value
        - unit
        - name/type
        - explicit context
        - evidence
        - confidence

        If the source says:
        "Admission Vitals"
        then context = "Admission".

        If it says:
        "Discharge Vitals"
        then context = "Discharge".

        NEVER drop explicit temporal/context labels.

        Do not infer context from document position alone.

        ===========================================================
        9. INVESTIGATION FINDINGS
        ===========================================================

        For qualitative investigations, the unit is the STUDY.

        Example:

        ECG:
        - Sinus tachycardia
        - No acute ST-T changes

        MUST become ONE `investigation_findings` object:

        study_name = "ECG"
        findings = "Sinus tachycardia; No acute ST-T changes"

        Do NOT create one object for each finding.

        Do NOT use "Sinus tachycardia" as the study name.

        Do NOT merge ECG with ultrasound.

        Preserve separate fields when explicitly available:
        - findings
        - impression
        - date
        - notes

        NEVER invent an impression.

        Quantitative laboratory tests belong in `lab_results`, not
        `investigation_findings`.

        Do not duplicate the same result across both sections.

        ===========================================================
        10. NARRATIVE INFORMATION
        ===========================================================

        Narrative fields are NOT optional when their corresponding source
        section contains information.

        If the source contains:
        - hospital course → populate `hospital_course`
        - treatment description → populate `treatment_summary`
        - discharge condition → populate `condition_at_discharge`
        - follow-up instructions → populate `follow_up_instructions`
        - investigation impression → populate `impression`
        - technique → populate `technique`
        when those fields exist in the schema.

        Do not discard narrative content simply because it is not a structured
        entity.

        Keep narrative content semantically in its correct field.

        Do not move:
        - admission narrative → clinical findings
        - symptoms → diagnoses
        - treatment → procedures unless it is actually a procedure
        - physician → follow_up_facility

        ===========================================================
        11. FOLLOW-UP INFORMATION
        ===========================================================

        Preserve follow-up information even when incomplete.

        Example:
        "Follow up with the physician after 7 days at the outpatient department."

        Extract:

        follow_up_instructions:
        "Follow up with the physician after 7 days."

        follow_up_facility:
        "outpatient department"

        follow_up_date:
        null

        NEVER convert "after 7 days" into a calendar date.

        A relative period belongs in the free-text follow-up instruction,
        not in a calendar-date field.

        Never use "physician", "doctor", or a clinician role as the facility.

        ===========================================================
        12. EVIDENCE GROUNDING
        ===========================================================

        Every populated entity must contain evidence when the schema supports it.

        Evidence MUST be copied VERBATIM from the source.

        Evidence must:
        - not be fabricated
        - not be paraphrased
        - not be translated
        - not be medically corrected
        - preserve negation
        - preserve relevant qualifiers
        - support every populated field in that object

        Use the smallest source span that supports all populated fields.

        Example:
        If evidence says:
        "Metformin 500 mg twice daily"

        do not create evidence containing information from another medication.

        For negative statements, preserve the negative wording exactly.

        If a field has no textual support, do not populate it.

        ===========================================================
        13. OCR / UNCERTAINTY / CONTRADICTIONS
        ===========================================================

        Treat OCR-derived values as potentially unreliable.

        Highest-risk information:
        - medication names
        - medication doses/strengths
        - numbers
        - units
        - dates
        - patient identifiers
        - laboratory values

        Do NOT silently correct unclear OCR.

        Example:
        "1O mg" must not automatically become "10 mg".

        If the intended value is essentially certain from the source context:
        - extract the corrected value
        - preserve the original text in `evidence`
        - set `evidence_support = "ocr_uncertain"`
        - set `verification_status = "needs_review"`
        - explain the issue in review reasons

        If genuinely ambiguous:
        leave the structured value null and preserve the original statement
        in evidence/additional notes where appropriate.

        If two source statements conflict and there is no clear temporal or
        contextual explanation:
        preserve the contradiction.
        Do not silently choose one value.

        ===========================================================
        14. CONFIDENCE
        ===========================================================

        Confidence describes EXTRACTION QUALITY, not clinical correctness.

        Every entity confidence must use:

        {{
        "extraction_confidence": 0.0,
        "evidence_support": "explicit",
        "verification_status": "not_independently_verified"
        }}

        Allowed `evidence_support`:
        - `explicit`
        - `ambiguous`
        - `ocr_uncertain`
        - `contradictory`

        Allowed `verification_status`:
        - `not_independently_verified`
        - `needs_review`

        NEVER use `VERIFIED`.

        Clear source text:
        `evidence_support = "explicit"`

        Ambiguous/OCR-uncertain/conflicting source:
        use the appropriate non-explicit status.

        If evidence_support is not `explicit`,
        `verification_status` MUST be `needs_review`.

        Do not automatically assign 1.0 to every field.
        Confidence must reflect actual extraction clarity.

        Remember:
        a value can be explicitly stated and confidently extracted while still
        being NOT independently clinically verified.

        ===========================================================
        15. NULL VS EMPTY ARRAY
        ===========================================================

        For absent singular fields:
        use `null`.

        For absent collections:
        use `[]`.

        NEVER create placeholder objects with null identifying fields.

        Keep every schema key present even when its value is null or [].

        ===========================================================
        16. COMPLETENESS AUDIT
        ===========================================================

        Populate:

        `sections_detected_in_source`
        = every detected source section.

        `sections_represented_in_output`
        = every source section successfully mapped.

        `sections_detected_but_not_represented`
        = sections/content that could not be represented structurally,
        with a reason.

        `unmapped_content`
        = only genuinely unmapped information.

        Before finalizing, verify that `additional_notes` does NOT duplicate
        information already represented elsewhere.

        Warnings about mapper fallback/recovered identifiers should only exist
        when genuinely necessary.

        ===========================================================
        17. FINAL RECONCILIATION CHECK
        ===========================================================

        Before returning JSON, perform this checklist internally:

        [ ] Read the entire source again from beginning to end.
        [ ] Every explicit sentence/bullet/table item has a destination.
        [ ] Every detected section is represented or explicitly audited.
        [ ] No explicit information was silently dropped.
        [ ] No diagnosis was inferred.
        [ ] No medication field was inferred.
        [ ] Medication names contain identity only.
        [ ] Strength and dose were not confused.
        [ ] Relative follow-up timing was not converted into a date.
        [ ] Follow-up facility is actually a facility/location.
        [ ] Chief complaints were not lost.
        [ ] Past-history conditions and explicit durations were preserved.
        [ ] Negations were preserved and never flipped.
        [ ] Admission/discharge/current contexts remain distinct.
        [ ] Vital-sign context was preserved.
        [ ] Qualitative investigations are grouped by study.
        [ ] Quantitative investigations remain lab results.
        [ ] Narrative sections are populated when source content exists.
        [ ] Treatment information was not lost.
        [ ] Discharge instructions were not lost.
        [ ] Follow-up instructions were not lost.
        [ ] Additional notes contain no duplicates.
        [ ] Every populated entity has supporting evidence.
        [ ] Evidence is verbatim source text.
        [ ] OCR uncertainty is explicitly marked.
        [ ] Contradictions are preserved.
        [ ] No entity has a null identifying field.
        [ ] No duplicate entities were created.
        [ ] Confidence reflects extraction quality.
        [ ] No `VERIFIED` status is used.
        [ ] JSON contains no Markdown, commentary, or extra text.
        [ ] JSON matches the supplied schema exactly.

        ===========================================================
        18. OUTPUT SHAPE — STRICT
        ===========================================================

        The JSON schema is authoritative. Every field MUST use exactly the
        type and object structure defined by `_JSON_SCHEMA`.

        NEVER replace an object with a string.

        If a field is an array of objects, EVERY item MUST be an object
        containing the schema-defined keys.

        Examples:

        WRONG:
        "symptoms": ["Fever for 5 days", "Cough for 4 days"]

        CORRECT:
        "symptoms": [
        {{
            "name": "Fever",
            "duration": "5 days",
            "evidence": "Fever for 5 days",
            "confidence": {{
                "extraction_confidence": 0.98,
                "evidence_support": "explicit",
                "verification_status": "not_independently_verified"
            }}
        }}
        ]

        WRONG:
        "past_medical_history": ["Hypertension for 8 years"]

        CORRECT:
        "past_medical_history": [
        {{
            "condition": "Hypertension",
            "duration": "8 years",
            "status": "active_history",
            "evidence": "Hypertension for 8 years",
            "confidence": {{
            "extraction_confidence": 0.98,
            "evidence_support": "explicit",
            "verification_status": "not_independently_verified"
            }}
        }}
        ]

        WRONG:
        "allergies": ["Penicillin allergy"]

        CORRECT:
        "allergies": [
        {{
            "name": "Penicillin",
            "status": "positive",
            "evidence": "Penicillin allergy",
            "confidence": {{
            "extraction_confidence": 0.98,
            "evidence_support": "explicit",
            "verification_status": "not_independently_verified"
            }}
        }}
        ]

        The examples illustrate the REQUIRED principle:
        preserve structured information as structured objects.

        Before returning JSON, validate every array item against `_JSON_SCHEMA`:

        - object array → every item is an object
        - string array → every item is a string
        - scalar → scalar
        - nested object → nested object
        - absent singular value → null
        - absent collection → []

        NEVER flatten structured information into strings.

        NEVER invent keys that are not in `_JSON_SCHEMA`.

        The schema is the source of truth for JSON TYPE and SHAPE.
        The document is the source of truth for CONTENT.

        ===========================================================
        OUTPUT CONTRACT
        ===========================================================

        Return ONLY one valid JSON object.

        Do not return:
        - Markdown
        - ```json fences
        - explanations
        - comments
        - reasoning
        - text before or after the JSON

        The output MUST match this schema exactly:

        {_JSON_SCHEMA}

        ===========================================================
        DOCUMENT TEXT
        ===========================================================

        {text}
        """.strip()

    @staticmethod
    def parse_json(response_text: str) -> dict[str, Any]:
        cleaned = response_text.strip()

        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error("Gemini returned invalid JSON: %s", exc)
            raise ValueError("Gemini returned invalid JSON.") from exc

        if not isinstance(parsed, dict):
            raise ValueError("Gemini JSON response must be an object.")

        GeminiProvider._validate_contract(parsed)
        return parsed

    @staticmethod
    def _validate_contract(parsed: dict[str, Any]) -> None:
        """
        Cheap, deterministic guardrails that don't require re-calling the
        model. This is NOT a substitute for the Pydantic mapper — it just
        catches the two failure modes this redesign specifically targets,
        early and loudly, so they never reach downstream storage.
        """
        offenders: list[str] = []

        def _walk(node: Any, path: str) -> None:
            if isinstance(node, dict):
                if "verification_status" in node:
                    status = str(node.get("verification_status", "")).upper()
                    if "VERIFIED" in status and "NOT_INDEPENDENTLY" not in status:
                        offenders.append(f"{path}.verification_status={status}")
                if "name" in node and node.get("name") is None and len(node) > 1:
                    # Looks like an entity object (has other keys) with a
                    # null name — exactly the malformed-symptom pattern
                    # this redesign eliminates.
                    offenders.append(f"{path} has null 'name' with sibling keys")
                for key, value in node.items():
                    _walk(value, f"{path}.{key}")
            elif isinstance(node, list):
                for idx, item in enumerate(node):
                    _walk(item, f"{path}[{idx}]")

        _walk(parsed, "root")

        if offenders:
            logger.warning(
                "Gemini extraction violated contract guardrails: %s",
                offenders,
            )