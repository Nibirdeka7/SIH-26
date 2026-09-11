import os
from dotenv import load_dotenv
from google import genai

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
gemini_key = os.getenv("GEMINI_API_KEY")

if gemini_key:
    try:
        client = genai.Client(api_key=gemini_key)
        res = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents="SOCRATES Cardiac triage guidelines for acute chest pain",
        )
        emb = res.embeddings[0].values
        print(f"✅ Gemini Embedding Test Passed! Length: {len(emb)}")
    except Exception as e:
        print(f"⚠️ Gemini Embedding test notice: {e}")
else:
    print("ℹ️ Skipping Gemini embedding test (no GEMINI_API_KEY provided)")
