from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "MediKiosk Summary Service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"

    # Microservice URLs
    CONVERSATION_SERVICE_URL: str = "http://localhost:8001/api/v1"
    DOCUMENT_SERVICE_URL: str = "http://localhost:8000/api/v1"

    # LLM Engine Configuration
    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Pinecone Knowledge Base
    PINECONE_API_KEY: str | None = None
    PINECONE_INDEX_NAME: str = "medikiosk-clinical-kb"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
