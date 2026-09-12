import json
import logging
from typing import Any

from groq import AsyncGroq

from app.ai.providers.base import AIProvider
from app.ai.providers.gemini import GeminiProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class GroqProvider(AIProvider):
    """
    Groq-based AI provider for medical document extraction.

    Uses the same extraction prompt and output contract as the
    existing Gemini provider so the downstream pipeline remains
    unchanged.
    """

    def __init__(self) -> None:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured.")

        self.client = AsyncGroq(
            api_key=settings.GROQ_API_KEY
        )
        self.model_name = settings.GROQ_MODEL

    async def analyze_document(
        self,
        *,
        text: str | None = None,
        image_data: bytes | None = None,
        document_type: str | None = None,
    ) -> dict[str, Any]:

        if not text or not text.strip():
            raise ValueError(
                "Document text is required for Groq extraction."
            )

        # Reuse the exact extraction prompt already used by Gemini.
        prompt = GeminiProvider._build_extraction_prompt(
            text=text,
            document_type=document_type,
        )

        try:
            try:
                response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a medical document information "
                                "extraction system. Follow the user's "
                                "instructions exactly and return only "
                                "structured JSON."
                            ),
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    response_format={
                        "type": "json_object",
                    },
                    reasoning_effort="medium",
                    max_completion_tokens=16000,
                )
            except Exception as inner_e:
                logger.info("Retrying Groq completion without reasoning_effort: %s", inner_e)
                response = await self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a medical document information "
                                "extraction system. Follow the user's "
                                "instructions exactly and return only "
                                "structured JSON."
                            ),
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    response_format={
                        "type": "json_object",
                    },
                    max_completion_tokens=16000,
                )

        except Exception as exc:
            logger.warning(
                "Groq document extraction failed: %s. Attempting Gemini fallback if available.",
                exc,
            )
            if settings.GEMINI_API_KEY:
                try:
                    gemini_provider = GeminiProvider()
                    return await gemini_provider.analyze_document(
                        text=text,
                        image_data=image_data,
                        document_type=document_type,
                    )
                except Exception as gemini_exc:
                    logger.exception("Gemini fallback also failed: %s", gemini_exc)
            raise

        response_text = (
            response.choices[0].message.content or ""
        ).strip()

        if not response_text:
            raise ValueError(
                "Groq returned an empty response."
            )

        # Make sure the model actually returned valid JSON.
        try:
            json.loads(response_text)
        except json.JSONDecodeError as exc:
            logger.error(
                "Groq returned invalid JSON: %s",
                response_text,
            )
            raise ValueError(
                "Groq returned invalid JSON."
            ) from exc

        return {
            "text": response_text,
            "model": self.model_name,
            "raw_response": response_text,
        }