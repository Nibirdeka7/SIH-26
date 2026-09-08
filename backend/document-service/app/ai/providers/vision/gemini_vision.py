"""
GeminiVisionProvider - raw multimodal API interaction only.

This module owns exactly: calling the Gemini multimodal API with the
ORIGINAL image bytes (never a preprocessed/thresholded version) plus a
constructed prompt, and parsing/validating the raw JSON response shape.
It contains NO orchestration, retry, or confidence-decision logic - that
lives entirely in app.ai.agents.vision_extraction_agent. Keeping that
boundary is what lets a future GroqExtractionAgent reuse the same
orchestration against a differently-implemented provider without a
rewrite (see that module's docstring).
"""

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.vision.base import VisionProvider
from app.ai.providers.vision.prompts import (
    build_extraction_prompt,
    build_inspection_prompt,
    build_targeted_reextraction_prompt,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class VisionProviderError(Exception):
    """Raised when the vision model call or its response is unusable."""


class GeminiVisionProvider(VisionProvider):
    _ALLOWED_VERIFICATION_STATUSES = {
        "not_independently_verified",
        "needs_review",
    }

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured.")

        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_VISION_MODEL

    async def inspect(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type_hint: str | None = None,
    ) -> dict[str, Any]:
        prompt = build_inspection_prompt(document_type_hint=document_type_hint)
        return await self._call(image_data=image_data, mime_type=mime_type, prompt=prompt)

    async def extract(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type: str,
        inspection: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = build_extraction_prompt(document_type=document_type, inspection=inspection)
        return await self._call(image_data=image_data, mime_type=mime_type, prompt=prompt)

    async def targeted_reextract(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type: str,
        review_issues: list[dict[str, Any]],
        previous_data: dict[str, Any],
    ) -> dict[str, Any]:
        prompt = build_targeted_reextraction_prompt(
            document_type=document_type,
            review_issues=review_issues,
            previous_data=previous_data,
        )
        return await self._call(image_data=image_data, mime_type=mime_type, prompt=prompt)

    async def _call(self, *, image_data: bytes, mime_type: str, prompt: str) -> dict[str, Any]:
        if not image_data:
            raise VisionProviderError("Image data is required for vision extraction.")

        contents = [
            types.Part.from_bytes(data=image_data, mime_type=mime_type),
            prompt,
        ]

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=contents,
            )
        except Exception as exc:
            # Covers auth errors, rate limits, timeouts, and any other
            # transport/API failure. A model/API failure must never
            # become a fake extraction - it always surfaces here.
            logger.exception("Gemini vision API call failed.")
            raise VisionProviderError("Vision model request failed.") from exc

        response_text = (getattr(response, "text", None) or "").strip()

        if not response_text:
            raise VisionProviderError("Vision model returned an empty response.")

        return self._parse_vision_response(response_text)

    @classmethod
    def _parse_vision_response(cls, response_text: str) -> dict[str, Any]:
        """
        Parse and sanitize the Vision-only transport response before it is
        checked by the shared Gemini guardrails.

        Gemini Vision occasionally emits `VERIFIED` / `FULLY_VERIFIED` even
        when prompted not to.  Those labels would falsely imply independent
        clinical verification.  This method changes only that invalid
        metadata value, using the already-returned evidence-support signal:
        explicit evidence remains *not independently verified*; every other
        support state remains or becomes *needs review*.  It never changes a
        medical value, evidence string, or confidence score.
        """
        cleaned = response_text.strip()

        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise VisionProviderError("Vision model returned invalid JSON.") from exc

        if not isinstance(parsed, dict):
            raise VisionProviderError("Vision model JSON response must be an object.")

        normalized_paths = cls._normalize_verification_statuses(parsed)
        if normalized_paths:
            logger.warning(
                "Normalized invalid Vision verification_status values at: %s",
                ", ".join(normalized_paths),
            )

        try:
            # Keep the shared guardrails in force, but call them only after
            # the Vision-local metadata correction above.  Gemini/Groq text
            # extraction continues to use GeminiProvider.parse_json exactly
            # as before.
            GeminiProvider._validate_contract(parsed)
        except ValueError as exc:
            raise VisionProviderError(str(exc)) from exc

        return parsed

    @classmethod
    def _normalize_verification_statuses(cls, data: dict[str, Any]) -> list[str]:
        normalized_paths: list[str] = []

        def walk(node: Any, path: str) -> None:
            if isinstance(node, dict):
                confidence = node.get("confidence")
                if isinstance(confidence, dict):
                    raw_status = confidence.get("verification_status")
                    status = str(raw_status).strip().lower() if raw_status is not None else ""

                    if status not in cls._ALLOWED_VERIFICATION_STATUSES:
                        # `VERIFIED` and `FULLY_VERIFIED` must never survive
                        # extraction.  Explicit source support is still not
                        # independent verification; weak/unknown support is
                        # retained as a review signal.
                        confidence["verification_status"] = (
                            "not_independently_verified"
                            if confidence.get("evidence_support") == "explicit"
                            else "needs_review"
                        )
                        normalized_paths.append(f"{path}.confidence.verification_status")
                    elif raw_status != status:
                        # Case-normalize the two approved values without
                        # changing their semantics.
                        confidence["verification_status"] = status

                for key, value in node.items():
                    walk(value, f"{path}.{key}")
            elif isinstance(node, list):
                for index, item in enumerate(node):
                    walk(item, f"{path}[{index}]")

        walk(data, "root")
        return normalized_paths
