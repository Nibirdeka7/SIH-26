from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    """
    Provider-independent interface for AI-powered
    document analysis.
    """

    @abstractmethod
    async def analyze_document(
        self,
        *,
        text: str | None = None,
        image_data: bytes | None = None,
        document_type: str | None = None,
    ) -> dict[str, Any]:
        """
        Analyze a medical document using the AI provider.

        Implementations may use extracted text, document images,
        or both.
        """
        raise NotImplementedError