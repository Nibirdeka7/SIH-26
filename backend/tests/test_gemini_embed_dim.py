import os
from dotenv import load_dotenv
from google import genai

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
gemini_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=gemini_key)

for m_name in ["models/gemini-embedding-001", "models/gemini-embedding-2"]:
    try:
        res = client.models.embed_content(
            model=m_name,
            contents="SOCRATES Cardiac triage guidelines for acute chest pain",
        )
        emb = res.embedding.values
        print(f"SUCCESS {m_name}: Dimension = {len(emb)}")
    except Exception as e:
        print(f"ERROR {m_name}: {e}")
