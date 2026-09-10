import os
from dotenv import load_dotenv
from google import genai

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
gemini_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=gemini_key)

res = client.models.embed_content(
    model="text-embedding-004",
    contents="SOCRATES Cardiac triage guidelines for acute chest pain",
)
emb = res.embedding.values
print(f"Gemini Embedding Length: {len(emb)}")
