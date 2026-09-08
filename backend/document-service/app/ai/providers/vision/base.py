from abc import ABC, abstractmethod
from typing import Any


class VisionProvider(ABC):
    """
    Provider-independent interface for vision-capable document analysis.

    Mirrors the split already used by app.ai.providers.base.AIProvider:
    a provider is ONLY API/model interaction, prompt construction, and
    response (de)serialization. It holds no orchestration, retry, or
    confidence-decision logic - that lives entirely in
    app.ai.agents.vision_extraction_agent.VisionExtractionAgent, so a
    future GroqExtractionAgent can drive a differently-shaped
    GroqVisionProvider through the exact same orchestration.
    """

    @abstractmethod
    async def inspect(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type_hint: str | None = None,
    ) -> dict[str, Any]:
        """
        STEP 1 - document inspection only. Must NOT extract clinical
        fields. Returns a raw parsed JSON dict shaped like
        prompts.INSPECTION_JSON_SCHEMA.
        """
        raise NotImplementedError

    @abstractmethod
    async def extract(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type: str,
        inspection: dict[str, Any],
    ) -> dict[str, Any]:
        """
        STEPS 2-3 - structure discovery + field extraction. Returns a raw
        parsed JSON dict shaped like prompts.EXTRACTION_JSON_SCHEMA (the
        same contract GeminiProvider's text path produces).
        """
        raise NotImplementedError

    @abstractmethod
    async def targeted_reextract(
        self,
        *,
        image_data: bytes,
        mime_type: str,
        document_type: str,
        review_issues: list[dict[str, Any]],
        previous_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Targeted re-inspection of ONLY the regions/fields named in
        `review_issues`, not a blind full re-extraction. Returns a raw
        parsed JSON dict in the same EXTRACTION_JSON_SCHEMA shape; the
        agent is responsible for merging only the targeted paths into
        the running candidate.
        """
        raise NotImplementedError
