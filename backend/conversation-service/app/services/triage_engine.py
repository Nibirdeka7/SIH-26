import logging
import re
from app.schemas.session import RedFlagCategory, TriageAssessment

logger = logging.getLogger(__name__)

# Enhanced Multilingual Real-World Keywords & Regex Patterns for Red Flag Detection
RED_FLAG_PATTERNS = {
    RedFlagCategory.CARDIAC: [
        r"chest.*pain", r"pain.*chest", r"सीने.*दर्द", r"छाती.*दर्द", r"दर्द.*सीने",
        r"left arm.*pain", r"jaw.*pain", r"pressure.*chest", r"heart attack",
        r"दिल का दौरा", r"सीने में दबाव", r"छाती में दबाव", r"angina", r"substernal",
        r"நெஞ்சு வலி", r"கடுமையான நெஞ்சு வலி"
    ],
    RedFlagCategory.RESPIRATORY: [
        r"cannot breathe", r"shortness of breath", r"difficulty breathing", r"breathless", r"dyspnea",
        r"सांस.*फूलना", r"सांस.*तकलीफ", r"सांस.*परेशानी", r"gasping", r"suffocat",
        r"stridor", r"wheezing", r"airway", r"high fever", r"10[1-9]°?f?", r"10[1-9] degree",
        r"febrile", r"lethargic", r"तेज़ बुखार", r"बुखार", r"மூச்சுத்திணறல்", r"ಉಸಿರಾಟದ ತೊಂದರೆ"
    ],
    RedFlagCategory.NEUROLOGICAL: [
        r"facial.*droop", r"droop", r"slur", r"speech.*slur", r"sudden.*weakness", r"arm.*weakness",
        r"hand.*weakness", r"side.*weakness", r"weakness", r"stroke", r"लकवा", r"पैरालिसिस",
        r"thunderclap", r"unconscious", r"बेहोश", r"seizure", r"convulsion",
        r"মুখ.*বেঁকে", r"হাত.*দুর্বল", r"কথা.*জড়াতে", r"মুখের একদিক"
    ],
    RedFlagCategory.SEVERE_TRAUMA: [
        r"head injury", r"major accident", r"road accident", r"trauma", r"fracture"
    ],
    RedFlagCategory.HEMORRHAGE: [
        r"coughing blood", r"vomiting blood", r"खून की उल्टी", r"uncontrolled bleeding",
        r"bleeding", r"hemorrhage", r"blood.*loss", r"લોહી", r"રક્તસ્ત્રાવ"
    ],
    RedFlagCategory.ANAPHYLAXIS: [
        r"allergic reaction", r"swelling.*tongue", r"swelling.*throat", r"swollen tongue",
        r"tongue.*swell", r"swell.*tongue", r"pruritus", r"एलर्जी", r"hives", r"anaphylaxis",
        r"ನಾಲಿಗೆ ಊದಿಕೊಂಡಿದೆ"
    ],
    RedFlagCategory.PSYCHIATRIC_EMERGENCY: [
        r"suicid", r"want to die", r"end my life", r"kill myself", r"आत्महत्या", r"hopeless"
    ]
}


class TriageEngine:
    def analyze_utterance(self, text_english: str, text_native: str, reported_severity: int | None = None) -> TriageAssessment:
        combined_text = f"{text_english} {text_native}".lower()
        red_flags: list[str] = []
        categories: list[RedFlagCategory] = []
        max_score = 1

        for category, patterns in RED_FLAG_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, combined_text, re.IGNORECASE):
                    flag_msg = f"Red Flag ({category.value}): Matched '{pattern}' in input"
                    if flag_msg not in red_flags:
                        red_flags.append(flag_msg)
                        if category not in categories:
                            categories.append(category)

        if RedFlagCategory.CARDIAC in categories:
            max_score = max(max_score, 10)
        elif RedFlagCategory.RESPIRATORY in categories:
            max_score = max(max_score, 9)
        elif RedFlagCategory.NEUROLOGICAL in categories:
            max_score = max(max_score, 9)
        elif RedFlagCategory.SEVERE_TRAUMA in categories or RedFlagCategory.HEMORRHAGE in categories:
            max_score = max(max_score, 9)
        elif RedFlagCategory.ANAPHYLAXIS in categories or RedFlagCategory.PSYCHIATRIC_EMERGENCY in categories:
            max_score = max(max_score, 9)
        elif len(categories) > 0:
            max_score = max(max_score, 7)

        if reported_severity and reported_severity >= 9:
            max_score = max(max_score, 8)
            red_flags.append(f"High Pain Severity Score: {reported_severity}/10")

        is_critical = max_score >= 8
        triage_level = "CRITICAL_EMERGENCY" if is_critical else ("URGENT" if max_score >= 5 else "ROUTINE")

        emergency_instructions = None
        if is_critical:
            if RedFlagCategory.CARDIAC in categories:
                emergency_instructions = "EMERGENCY CARDIAC ALERT: Please notify hospital triage staff immediately! Rest quietly in a seated position."
            elif RedFlagCategory.RESPIRATORY in categories:
                emergency_instructions = "EMERGENCY RESPIRATORY ALERT: Immediate oxygenation & triage evaluation required. Do not lie flat."
            elif RedFlagCategory.NEUROLOGICAL in categories:
                emergency_instructions = "EMERGENCY STROKE ALERT: Possible FAST stroke signs detected. Immediate CT scan & neurology evaluation required."
            elif RedFlagCategory.HEMORRHAGE in categories or RedFlagCategory.SEVERE_TRAUMA in categories:
                emergency_instructions = "EMERGENCY TRAUMA/HEMORRHAGE ALERT: Apply direct pressure to bleeding site. Immediate transfer to Trauma Bay."
            elif RedFlagCategory.ANAPHYLAXIS in categories:
                emergency_instructions = "EMERGENCY ANAPHYLAXIS ALERT: Airway compromise risk. Administer epinephrine/anti-allergy stat."
            elif RedFlagCategory.PSYCHIATRIC_EMERGENCY in categories:
                emergency_instructions = "EMERGENCY CRISIS ALERT: High suicide risk. Immediate crisis intervention staff notified."
            else:
                emergency_instructions = "EMERGENCY ALERT: High-priority clinical intervention needed. Directing to Emergency Room."

        return TriageAssessment(
            is_critical=is_critical,
            priority_score=max_score,
            triage_level=triage_level,
            red_flags=red_flags,
            red_flag_categories=categories,
            emergency_instructions=emergency_instructions,
            immediate_action_required=is_critical,
        )


triage_engine = TriageEngine()
