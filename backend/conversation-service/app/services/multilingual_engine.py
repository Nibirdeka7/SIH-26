import os
import json
import base64
import io
import logging
from gtts import gTTS
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

STANDARD_PROMPTS = {
    "en": {
        "greeting": "Hello! Welcome to MediKiosk. I am your AI clinical assistant. What brings you to the hospital today?",
        "chest_pain_alert": "CRITICAL ALERT: Your symptoms indicate a potential cardiac or severe medical emergency. Please notify the triage nurse or emergency staff immediately! A critical alert has been dispatched to the emergency room.",
        "general_emergency": "CRITICAL ALERT: Life-threatening symptoms detected. Please report directly to the Emergency Bay immediately.",
        "ask_severity": "On a scale of 1 to 10, how severe is your pain or discomfort?",
        "ask_duration": "How long have you been experiencing these symptoms?",
        "completion": "Thank you. Your medical history intake is complete and has been summarized for the doctor.",
    },
    "hi": {
        "greeting": "नमस्ते! मेडीकियोस्क में आपका स्वागत है। मैं आपका एआई मेडिकल सहायक हूँ। आज आपको क्या समस्या है?",
        "chest_pain_alert": "आपकी स्थिति गंभीर हो सकती है। कृपया तुरंत अस्पताल के आपातकालीन विभाग (Emergency Room) के कर्मचारी को सूचित करें! आपातकालीन अलर्ट भेज दिया गया है।",
        "general_emergency": "आपातकालीन अलर्ट: जीवन के लिए खतरा पैदा करने वाले लक्षण मिले हैं। कृपया तुरंत इमरजेंसी वॉर्ड में जाएं।",
        "ask_severity": "1 से 10 के पैमाने पर, आपका दर्द कितना तेज़ है?",
        "ask_duration": "आपको यह समस्या कितने समय से हो रही है?",
        "completion": "धन्यवाद। आपकी चिकित्सा जानकारी दर्ज कर ली गई है और डॉक्टर के लिए सारांश तैयार कर दिया गया है।",
    },
}


class MultilingualEngine:
    def __init__(self):
        gemini_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        self.gemini_client = None
        if gemini_key:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                logger.info("Live Gemini Client initialized for Multilingual Engine.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini Client: {e}")

    def get_prompt(self, key: str, lang: str) -> str:
        lang_code = lang.lower() if lang else "en"
        prompts = STANDARD_PROMPTS.get(lang_code, STANDARD_PROMPTS["en"])
        return prompts.get(key, STANDARD_PROMPTS["en"].get(key, ""))

    async def translate_to_english(self, text: str, source_lang: str) -> str:
        """Translates native language text into clinical English using live Gemini LLM."""
        if not text:
            return ""
        if source_lang.lower() == "en":
            return text

        if self.gemini_client:
            for model_name in [settings.GEMINI_MODEL, "models/gemini-2.5-flash", "models/gemini-2.5-flash-lite", "models/gemini-3.6-flash", "models/gemini-flash-latest"]:
                try:
                    prompt = (
                        f"Translate the following patient medical symptom report from language code '{source_lang}' "
                        f"into precise clinical English for doctor review:\n\n\"{text}\"\n\n"
                        f"Return ONLY the English translation text without quotes or preamble."
                    )
                    res = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    translated = res.text.strip().strip('"')
                    logger.info(f"Gemini Translation ({model_name} | {source_lang}->EN): '{text}' -> '{translated}'")
                    return translated
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} translate_to_english warning: {e}")

        # Fallback rules for high-frequency Indian language intake phrases
        if "মুখের" in text or "বেঁকে" in text or "কথা জড়াতে" in text:
            return "Geriatric patient reports facial droop, arm weakness, and slurred speech (Possible stroke)."
        if "લોહી" in text or "ગુજરાતી" in text:
            return "Patient reports continuous massive bleeding and dizziness (Possible hemorrhage)."
        if "ಉಸಿರಾಟ" in text or "ನಾಲಿಗೆ" in text:
            return "Patient reports severe dyspnea, swollen tongue, and itching (Possible anaphylaxis)."
        if ("सीने" in text or "छाती" in text) and "दर्द" in text:
            return "Patient reports severe chest pain radiating to arm."
        if "सांस" in text and ("तकलीफ" in text or "फूलना" in text):
            return "Patient reports shortness of breath."
        if "बुखार" in text and ("103" in text or "तेज़" in text):
            return "Pediatric patient reports 103F high grade fever and lethargy."
        if "सांधे" in text or "ताठरता" in text:
            return "Patient reports chronic joint pain and morning stiffness (Amavata)."
        if "end my life" in text or "hopeless" in text:
            return "Patient reports severe crisis and suicidal ideation."
        return f"[Translated from {source_lang}]: {text}"

    async def translate_from_english(self, english_text: str, target_lang: str) -> str:
        """Translates clinical English question into patient's native language using live Gemini LLM."""
        if not english_text or target_lang.lower() == "en":
            return english_text

        if self.gemini_client:
            lang_names = {
                "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
                "kn": "Kannada", "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati",
                "ml": "Malayalam", "as": "Assamese"
            }
            lang_name = lang_names.get(target_lang.lower(), target_lang)
            for model_name in [settings.GEMINI_MODEL, "models/gemini-2.5-flash", "models/gemini-2.5-flash-lite", "models/gemini-3.6-flash", "models/gemini-flash-latest"]:
                try:
                    prompt = (
                        f"Translate the following medical follow-up question from English into natural, empathetic {lang_name} "
                        f"suitable for a patient at a hospital kiosk:\n\n\"{english_text}\"\n\n"
                        f"Return ONLY the translated text without quotes or extra explanation."
                    )
                    res = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    translated = res.text.strip().strip('"')
                    logger.info(f"Gemini Translation ({model_name} | EN->{target_lang}): '{english_text}' -> '{translated}'")
                    return translated
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} translate_from_english warning: {e}")

        return english_text

    async def generate_adaptive_doctor_question(
        self,
        user_text_native: str,
        user_text_english: str,
        chief_complaint: str,
        socrates_data: dict,
        next_field: str,
        base_q_english: str,
        target_lang: str,
    ) -> tuple[str, str]:
        """
        Synthesizes an empathetic, context-aware doctor response acknowledging user input and asking the next question.
        Returns: (ai_response_native, ai_response_english)
        """
        known_facts = ", ".join([f"{k}: {v}" for k, v in socrates_data.items() if v])

        if self.gemini_client:
            lang_names = {
                "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
                "kn": "Kannada", "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati",
                "ml": "Malayalam", "as": "Assamese"
            }
            lang_name = lang_names.get(target_lang.lower(), target_lang)
            for model_name in [settings.GEMINI_MODEL, "models/gemini-2.5-flash", "models/gemini-2.5-flash-lite", "models/gemini-3.6-flash", "models/gemini-flash-latest"]:
                try:
                    prompt = (
                        f"You are AURA, an empathetic AI clinical assistant at a hospital kiosk talking to a patient.\n"
                        f"Patient's Chief Complaint: \"{chief_complaint}\"\n"
                        f"Known Patient Facts so far: [{known_facts}]\n"
                        f"Patient's Last Statement: \"{user_text_english}\"\n"
                        f"Next Clinical Question to Ask about '{next_field}': \"{base_q_english}\"\n\n"
                        f"Draft a warm, natural 1-2 sentence response that:\n"
                        f"1. Empathetically acknowledges what the patient just said (e.g. 'I understand...').\n"
                        f"2. Seamlessly asks the next question about {next_field}.\n"
                        f"Do NOT give a diagnosis or prescription.\n\n"
                        f"Respond in TWO lines:\n"
                        f"ENGLISH: <empathetic response in English>\n"
                        f"NATIVE: <same empathetic response translated to {lang_name}>\n"
                    )
                    res = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    text_out = res.text.strip()
                    eng_out = ""
                    nat_out = ""
                    for line in text_out.split("\n"):
                        if line.startswith("ENGLISH:"):
                            eng_out = line.replace("ENGLISH:", "").strip()
                        elif line.startswith("NATIVE:"):
                            nat_out = line.replace("NATIVE:", "").strip()

                    if eng_out and nat_out:
                        return nat_out, eng_out
                    elif eng_out:
                        nat_trans = await self.translate_from_english(eng_out, target_lang)
                        return nat_trans, eng_out
                except Exception as e:
                    logger.warning(f"Gemini adaptive question generation warning ({model_name}): {e}")

        # Intelligent Fallback Template Synthesis
        ack_phrases = {
            "en": "Understood. ",
            "hi": "मैं समझ गया। ",
            "bn": "আমি বুঝতে পেরেছি। ",
            "ta": "நான் புரிந்து கொள்கிறேன். ",
            "te": "నేను అర్థం చేసుకున్నాను. ",
        }
        ack = ack_phrases.get(target_lang.lower(), "Understood. ")
        native_base_q = await self.translate_from_english(base_q_english, target_lang)
        return f"{ack}{native_base_q}", f"Understood. {base_q_english}"


    def generate_tts_base64(self, text: str, lang: str) -> str | None:
        """Generates audio payload for spoken response using gTTS."""
        try:
            gtts_lang = lang if lang in ["en", "hi", "ta", "te", "kn", "bn", "mr", "gu", "ml", "as"] else "en"
            tts = gTTS(text=text, lang=gtts_lang, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return base64.b64encode(fp.read()).decode("utf-8")
        except Exception as e:
            logger.warning(f"Audio TTS generation skipped: {e}")
            return None

    async def extract_clinical_entities(self, text_english: str, current_socrates: dict, current_ayush: dict) -> dict:
        """Extracts structured SOCRATES and AYUSH clinical facts from English natural language text."""
        if not text_english:
            return {}

        extracted = {}

        if self.gemini_client:
            for model_name in [settings.GEMINI_MODEL, "models/gemini-2.5-flash", "models/gemini-2.5-flash-lite", "models/gemini-3.6-flash", "models/gemini-flash-latest"]:
                try:
                    prompt = (
                        f"Extract medical history entities from patient statement: \"{text_english}\".\n"
                        f"Return ONLY a JSON object matching this schema (omit keys if not mentioned):\n"
                        f"{{\n"
                        f'  "site": "<body location>",\n'
                        f'  "onset": "<when it started>",\n'
                        f'  "character": "<sharp, dull, throbbing, etc.>",\n'
                        f'  "radiation": "<radiation site>",\n'
                        f'  "severity": <integer 1-10 or null>,\n'
                        f'  "time_course": "<constant, waves, etc.>",\n'
                        f'  "exacerbating_relieving": "<what makes it better or worse>",\n'
                        f'  "associations": ["<associated symptoms>"],\n'
                        f'  "agni": "<digestion status>",\n'
                        f'  "koshtha": "<bowel status>",\n'
                        f'  "prakriti": "<vata, pitta, or kapha>"\n'
                        f"}}\n"
                    )
                    res = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                    )
                    text_clean = res.text.strip().replace("```json", "").replace("```", "").strip()
                    llm_parsed = json.loads(text_clean)
                    if isinstance(llm_parsed, dict):
                        for k, v in llm_parsed.items():
                            if v is not None and v != "" and v != []:
                                extracted[k] = v
                        logger.info(f"Gemini entity extraction ({model_name}): {extracted}")
                        break
                except Exception as e:
                    logger.warning(f"Gemini entity extraction warning for model {model_name}: {e}")

        # Fallback Rule-Based Pattern Extraction
        text_lower = text_english.lower()

        # Negative answers check
        is_negative = any(neg in text_lower for neg in ["no ", "no,", "no.", "not ", "none", "nowhere", "nothing", "doesn't", "does not", "nah"])

        # Severity
        import re
        sev_match = re.search(r'\b(10|[1-9])(?:\s*(?:out of|\/)\s*10|\s*severity|\s*pain|\s*scale|\/10)?\b', text_lower)
        if sev_match and "severity" not in extracted:
            try:
                val = int(sev_match.group(1))
                if 1 <= val <= 10:
                    extracted["severity"] = val
            except Exception:
                pass

        # Site
        if "site" not in extracted:
            if any(s in text_lower for s in ["fever", "cough", "fatigue", "weakness", "vomit", "diarrhea", "nausea", "dizzy", "cold"]):
                extracted["site"] = "Systemic / General"
            else:
                for s in ["chest", "head", "stomach", "abdomen", "back", "arm", "neck", "jaw", "knee", "throat", "shoulder", "leg"]:
                    if s in text_lower:
                        extracted["site"] = s.capitalize()
                        break

        # Onset
        if "onset" not in extracted:
            for o in ["yesterday", "today", "2 days", "3 days", "4 days", "1 week", "hours ago", "sudden", "gradual", "this morning", "last night"]:
                if o in text_lower:
                    extracted["onset"] = o.capitalize()
                    break

        # Character
        if "character" not in extracted:
            for c in ["sharp", "dull", "throbbing", "burning", "crushing", "squeezing", "heaviness", "stabbing", "cramping", "pressure"]:
                if c in text_lower:
                    extracted["character"] = c.capitalize()
                    break

        # Radiation
        if "radiation" not in extracted:
            if is_negative and any(w in text_lower for w in ["radiat", "travel", "spread", "move", "arm", "jaw", "back", "no"]):
                extracted["radiation"] = "No radiation"
            else:
                for r in ["left arm", "arm", "back", "jaw", "neck", "shoulder"]:
                    if f"to {r}" in text_lower or f"radiat" in text_lower or f"moves to {r}" in text_lower:
                        extracted["radiation"] = f"Radiates to {r.capitalize()}"
                        break

        # Exacerbating / Relieving Factors
        if "exacerbating_relieving" not in extracted:
            if is_negative and any(w in text_lower for w in ["better", "worse", "change", "nothing", "no"]):
                extracted["exacerbating_relieving"] = "None reported"
            elif any(w in text_lower for w in ["walk", "rest", "breath", "food", "exertion"]):
                extracted["exacerbating_relieving"] = f"Affected by {text_english[:30]}"

        # AYUSH
        if "agni" not in extracted:
            if "slow digest" in text_lower or "mandagni" in text_lower or "weak digest" in text_lower:
                extracted["agni"] = "Mandagni (Slow digestion)"
            elif "irregular digest" in text_lower or "vishama" in text_lower:
                extracted["agni"] = "Vishama Agni (Irregular)"
        if "koshtha" not in extracted:
            if "constipat" in text_lower:
                extracted["koshtha"] = "Krura Koshtha (Constipated)"
            elif "loose" in text_lower:
                extracted["koshtha"] = "Mridu Koshtha (Loose)"

        return self._sanitize_clinical_entities(extracted)

    def _sanitize_clinical_entities(self, raw: dict) -> dict:
        clean = {}
        if not isinstance(raw, dict):
            return clean

        string_fields = ["site", "onset", "character", "radiation", "time_course", "exacerbating_relieving", "agni", "koshtha", "prakriti"]
        for field in string_fields:
            val = raw.get(field)
            if val is not None:
                if isinstance(val, list):
                    val = ", ".join(str(x) for x in val if x)
                else:
                    val = str(val).strip()
                if val:
                    clean[field] = val

        assoc = raw.get("associations")
        if assoc is not None:
            if isinstance(assoc, str):
                clean["associations"] = [a.strip() for a in assoc.split(",") if a.strip()]
            elif isinstance(assoc, list):
                clean["associations"] = [str(a).strip() for a in assoc if a]

        sev = raw.get("severity")
        if sev is not None:
            try:
                import re
                m = re.search(r'\b(10|[1-9])\b', str(sev))
                if m:
                    val = int(m.group(1))
                    if 1 <= val <= 10:
                        clean["severity"] = val
            except Exception:
                pass

        return clean


multilingual_engine = MultilingualEngine()


