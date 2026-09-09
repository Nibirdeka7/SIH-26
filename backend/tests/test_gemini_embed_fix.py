import os
from dotenv import load_dotenv
from google import genai

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
gemini_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=gemini_key)

res = client.models.embed_content(
    model="models/gemini-embedding-001",
    contents="SOCRATES Cardiac triage guidelines for acute chest pain",
)
print("Keys in response:", dir(res))
if hasattr(res, 'embeddings'):
    emb = res.embeddings[0].values
    print(f"Embedding length: {len(emb)}")
