import os
import logging
from typing import List, Dict, Any
from google import genai
from pinecone import Pinecone
from app.core.config import settings

logger = logging.getLogger(__name__)


class PineconeRAGService:
    def __init__(self):
        self.pinecone_client = None
        self.index = None
        self.gemini_client = None
        self.use_mock = True

        gemini_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        pinecone_key = os.getenv("PINECONE_API_KEY") or settings.PINECONE_API_KEY
        index_name = os.getenv("PINECONE_INDEX_NAME") or settings.PINECONE_INDEX_NAME or "sih"

        if gemini_key and pinecone_key:
            try:
                self.gemini_client = genai.Client(api_key=gemini_key)
                self.pinecone_client = Pinecone(api_key=pinecone_key)
                self.index = self.pinecone_client.Index(index_name)
                self.use_mock = False
                logger.info(f"Connected to Pinecone live index '{index_name}' with Gemini embeddings.")
            except Exception as e:
                logger.warning(f"Could not connect to Pinecone: {e}. Falling back to in-memory clinical KB.")
        else:
            logger.info("No API keys found. Using in-memory clinical vector fallback.")

    async def query_knowledge_base(self, query_text: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """Queries Pinecone index 'sih' for clinical guidelines using Gemini vector embeddings."""
        if not query_text:
            return []

        if not self.use_mock and self.index and self.gemini_client:
            try:
                res = self.gemini_client.models.embed_content(
                    model="models/gemini-embedding-001",
                    contents=query_text,
                )
                vals = res.embeddings[0].values[:1024]
                mag = sum(x*x for x in vals) ** 0.5
                query_vec = [x/mag for x in vals]

                pinecone_res = self.index.query(
                    namespace="triage-kb",
                    vector=query_vec,
                    top_k=top_k,
                    include_metadata=True
                )

                results = []
                for match in pinecone_res.matches:
                    results.append({
                        "id": match.id,
                        "score": match.score,
                        "title": match.metadata.get("title", ""),
                        "category": match.metadata.get("category", ""),
                        "text": match.metadata.get("content", ""),
                    })
                logger.info(f"Retrieved {len(results)} live vector matches from Pinecone 'sih' index for query '{query_text}'.")
                return results

            except Exception as e:
                logger.error(f"Live Pinecone query failed: {e}. Falling back to keyword search.")

        # In-memory keyword fallback if Pinecone call fails
        from app.services.pinecone_rag_fallback import FALLBACK_CLINICAL_KB
        query_words = set(query_text.lower().split())
        scored_results = []
        for kb_item in FALLBACK_CLINICAL_KB:
            matches = sum(1 for kw in kb_item["keywords"] if kw in query_text.lower())
            word_overlap = len(query_words.intersection(set(kb_item["text"].lower().split())))
            score = (matches * 3.0) + (word_overlap * 0.1)
            if score > 0:
                scored_results.append((score, kb_item))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_results[:top_k]]


pinecone_rag_service = PineconeRAGService()
