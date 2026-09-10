MOCK_SESSIONS = {
    "sess_test_cardiac": {
        "session_id": "sess_test_cardiac",
        "patient_id": "P-9988",
        "patient_name": "Ramesh Kumar",
        "age": 52,
        "gender": "Male",
        "language": "hi",
        "intake_mode": "allopathy",
        "chief_complaint": "Severe left-sided chest pain radiating to left arm",
        "socrates": {
            "site": "Left chest",
            "onset": "Acute onset 30 minutes ago",
            "character": "Heavy crushing pressure",
            "radiation": "Left arm and neck",
            "associations": ["Diaphoresis", "Shortness of breath"],
            "time_course": "Continuous",
            "exacerbating_relieving": "Worse with movement",
            "severity": 9
        },
        "ayush": {},
        "triage": {
            "is_critical": True,
            "priority_score": 10,
            "triage_level": "CRITICAL_EMERGENCY",
            "red_flags": ["Red Flag (CARDIAC): Matched 'chest pain' in patient input"],
            "emergency_instructions": "EMERGENCY CARDIAC ALERT: Please notify hospital triage staff immediately!"
        }
    }
}
