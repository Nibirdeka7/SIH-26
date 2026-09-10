from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MediKiosk Conversation Service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"

    # LLM Provider Configuration
    AI_PROVIDER: str = "gemini"  # gemini, groq, or mock
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Pinecone Vector RAG Configuration
    PINECONE_API_KEY: str | None = None
    PINECONE_INDEX_NAME: str = "medikiosk-clinical-kb"
    PINECONE_NAMESPACE: str = "triage-socrates-ayush"

    # Supported Multilingual Languages
    SUPPORTED_LANGUAGES: dict[str, str] = {
        "en": "English",
        "hi": "Hindi (हिंदी)",
        "ta": "Tamil (தமிழ்)",
        "te": "Telugu (తెలుగు)",
        "kn": "Kannada (கன்னட)",
        "bn": "Bengali (বাংলা)",
        "mr": "Marathi (मराठी)",
        "gu": "Gujarati (ગુજરાતી)",
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
