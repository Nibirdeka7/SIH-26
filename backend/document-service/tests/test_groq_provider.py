from app.ai.providers.groq import GroqProvider


def test_groq_provider_initializes():
    provider = GroqProvider()

    assert provider.client is not None
    assert provider.model_name