from app.ai.agents.vision_verifier import VisionExtractionValidator


def _confidence(score=0.9, support="explicit", status="not_independently_verified"):
    return {
        "extraction_confidence": score,
        "evidence_support": support,
        "verification_status": status,
    }


def _base_document(**overrides):
    doc = {
        "patient": {"name": "John Doe"},
        "provider": {},
        "document_date": "2024-01-01",
        "medications": [],
        "diagnoses": [],
        "symptoms": [],
        "allergies": [],
        "vitals": [],
        "lab_results": [],
        "investigation_findings": [],
        "imaging_findings": [],
        "clinical_findings": [],
        "past_medical_history": [],
        "procedures": [],
        "additional_notes": [],
        "completeness_audit": {
            "sections_detected_in_source": ["medications"],
            "sections_represented_in_output": ["medications"],
            "sections_detected_but_not_represented": [],
            "unmapped_content": [],
        },
        "extraction_summary": {"needs_review": False, "review_reasons": [], "note": None},
    }
    doc.update(overrides)
    return doc


def test_well_supported_medication_passes_without_retry():
    validator = VisionExtractionValidator(critical_field_threshold=0.75)
    data = _base_document(
        medications=[
            {
                "name": "Metformin",
                "strength": "500 mg",
                "dose": "1 tablet",
                "frequency": "twice daily",
                "evidence": "Metformin 500 mg 1 tab BD",
                "confidence": _confidence(0.92),
            }
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert result.is_valid_schema
    assert not result.critical_field_issues
    assert not result.needs_retry
    assert result.extraction_confidence > 0.7


def test_illegible_medication_name_flags_critical_issue_and_retry():
    validator = VisionExtractionValidator(critical_field_threshold=0.75)
    data = _base_document(
        medications=[
            {
                "name": "Metformin",  # model guessed despite weak evidence
                "strength": "500 mg",
                "dose": None,
                "frequency": None,
                "evidence": "Metf... 500 mg",
                "confidence": _confidence(0.4, support="illegible_handwriting", status="needs_review"),
            }
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert result.needs_retry
    paths = {issue.field_path for issue in result.critical_field_issues}
    assert "medications[0].name" in paths
    assert "medications[0].strength" in paths  # strength also below threshold at 0.4


def test_strong_strength_confidence_does_not_rescue_weak_name_confidence():
    """
    Core safety property from the brief: a confidently-read strength must
    never make an uncertain drug name look reliable. Each medication
    sub-field is checked independently against the SAME confidence
    object here (current contract has one confidence object per
    medication, not per sub-field) - so a low overall confidence still
    flags every populated sub-field, it cannot be "balanced out".
    """
    validator = VisionExtractionValidator(critical_field_threshold=0.75)
    data = _base_document(
        medications=[
            {
                "name": "Metformin",
                "strength": "500 mg",
                "dose": None,
                "frequency": None,
                "evidence": "Metf... 500mg",
                "confidence": _confidence(0.97, support="ambiguous", status="needs_review"),
            }
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    # evidence_support != "explicit" alone is enough to flag, regardless
    # of how high the numeric score is.
    assert result.needs_retry
    assert any(i.field_path == "medications[0].name" for i in result.critical_field_issues)


def test_missing_evidence_is_a_schema_error():
    validator = VisionExtractionValidator()
    data = _base_document(
        diagnoses=[
            {
                "name": "Type 2 Diabetes Mellitus",
                "evidence": None,
                "confidence": _confidence(0.9),
            }
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert any("evidence" in error for error in result.schema_errors)


def test_verified_status_never_allowed_flags_inconsistency():
    validator = VisionExtractionValidator()
    data = _base_document(
        medications=[
            {
                "name": "Amoxicillin",
                "strength": "250 mg",
                "dose": "1 cap",
                "frequency": "TDS",
                "evidence": "Amoxicillin 250mg 1 cap TDS",
                "confidence": {
                    "extraction_confidence": 0.99,
                    "evidence_support": "ambiguous",
                    "verification_status": "not_independently_verified",
                },
            }
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert any("not escalated" in error for error in result.schema_errors)


def test_generic_placeholder_evidence_is_flagged_as_suspicious():
    validator = VisionExtractionValidator()
    data = _base_document(
        medications=[
            {
                "name": "Ibuprofen",
                "strength": "400 mg",
                "dose": "1 tab",
                "frequency": "OD",
                "evidence": "medicine prescribed",
                "confidence": _confidence(0.85),
            }
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert any("generic placeholder" in error for error in result.schema_errors)


def test_diagnosis_without_evidence_is_flagged_as_unsupported_inference():
    validator = VisionExtractionValidator()
    data = _base_document(diagnoses=[{"name": "Hypertension", "evidence": None, "confidence": None}])

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert any("never be inferred" in error for error in result.schema_errors)


def test_impossible_age_is_flagged():
    validator = VisionExtractionValidator()
    data = _base_document(patient={"name": "John Doe", "age": 999})

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert any("plausible range" in error for error in result.schema_errors)


def test_wrapped_primitive_values_are_rejected_at_the_vision_boundary():
    validator = VisionExtractionValidator()
    data = _base_document(
        patient={"name": {"value": "John Doe", "evidence": "John Doe"}},
        diagnoses=[
            {
                "name": {"value": "Hypertension", "evidence": "Dx: Hypertension"},
                "evidence": "Dx: Hypertension",
                "confidence": _confidence(),
            }
        ],
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert not result.is_valid_schema
    assert any("patient.name" in error for error in result.schema_errors)
    assert any("diagnoses[0].name" in error for error in result.schema_errors)


def test_canonical_discharge_instruction_strings_are_accepted():
    validator = VisionExtractionValidator()
    data = _base_document(
        discharge_instructions=[
            "Eat a low-calorie diet.",
            "Exercise at least 30 minutes a day.",
        ]
    )

    result = validator.validate(data, document_type="PRESCRIPTION")

    assert result.is_valid_schema
    assert not result.needs_retry


def test_completeness_ratio_lowers_confidence_when_sections_missing():
    validator = VisionExtractionValidator()

    complete = _base_document(
        medications=[
            {
                "name": "Metformin",
                "strength": "500 mg",
                "dose": "1 tab",
                "frequency": "BD",
                "evidence": "Metformin 500 mg 1 tab BD",
                "confidence": _confidence(0.9),
            }
        ]
    )
    incomplete = _base_document(
        medications=complete["medications"],
        completeness_audit={
            "sections_detected_in_source": ["medications", "diagnosis", "vitals"],
            "sections_represented_in_output": ["medications"],
            "sections_detected_but_not_represented": ["diagnosis", "vitals"],
            "unmapped_content": [],
        },
    )

    complete_result = validator.validate(complete, document_type="PRESCRIPTION")
    incomplete_result = validator.validate(incomplete, document_type="PRESCRIPTION")

    assert incomplete_result.extraction_confidence < complete_result.extraction_confidence
