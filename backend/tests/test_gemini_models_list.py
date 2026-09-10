import os
from dotenv import load_dotenv
from google import genai

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
gemini_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=gemini_key)

for m in client.models.list():
    if "embed" in m.name:
        print(f"AVAILABLE EMBEDDING MODEL: {m.name}")
