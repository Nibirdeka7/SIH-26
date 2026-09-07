from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MediKiosk Document Service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"

    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    # MEDGEMMA_MODEL: str = "google/medgemma-1.5-4b-it"
    # MEDGEMMA_MAX_NEW_TOKENS: int = 4096
    # MEDGEMMA_TEMPERATURE: float = 0.0
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    OCR_CONFIDENCE_THRESHOLD: float = 0.80
    TESSERACT_CMD: str = "tesseract"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()