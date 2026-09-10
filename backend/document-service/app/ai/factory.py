from app.ai.providers.base import AIProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.groq import GroqProvider
from app.core.config import settings


def get_ai_provider() -> AIProvider:
    """
    Return the configured AI provider.
    """

    provider = settings.AI_PROVIDER.lower()

    # if provider == "medgemma":
    #     return MedGemmaProvider()

    if provider == "groq":
        return GroqProvider()

    if provider == "gemini":
        return GeminiProvider()

    raise ValueError(
        f"Unsupported AI provider: {settings.AI_PROVIDER}"
    )