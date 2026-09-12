from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MediKiosk Document Service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"

    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.6-flash"
    # MEDGEMMA_MODEL: str = "google/medgemma-1.5-4b-it"
    # MEDGEMMA_MAX_NEW_TOKENS: int = 4096
    # MEDGEMMA_TEMPERATURE: float = 0.0
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    OCR_CONFIDENCE_THRESHOLD: float = 0.80
    TESSERACT_CMD: str = "tesseract"

    # --- Vision extraction path -------------------------------------------
    # Reuses GEMINI_API_KEY above. A separate model setting because the
    # best text-extraction model and the best vision-capable model are
    # not guaranteed to be the same, and pinning them independently lets
    # either be upgraded without touching the other path.
    GEMINI_VISION_MODEL: str = "gemini-3.5-flash-lite"

    # Below this DOCUMENT-level engineering confidence score (see
    # VisionExtractionValidator._score), the agent marks the whole
    # extraction needs_review even if no single critical field tripped
    # the per-field threshold below.
    VISION_CONFIDENCE_THRESHOLD: float = 0.70

    # Below this per-field extraction_confidence (combined with
    # evidence_support), a critical field is treated as insufficiently
    # supported - see app/ai/agents/vision_verifier.py for the full,
    # documented multi-signal scoring this feeds into.
    VISION_CRITICAL_FIELD_THRESHOLD: float = 0.75

    # Hard ceiling on targeted re-inspection attempts per document. Must
    # stay small: retries are a single extra model call each, not a
    # search loop.
    VISION_MAX_RETRIES: int = 1

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()