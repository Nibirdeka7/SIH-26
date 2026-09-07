from app.ai.providers.gemini import GeminiProvider


def test_gemini_provider_initializes():
    provider = GeminiProvider()

    assert provider.client is not None
    assert provider.model_name