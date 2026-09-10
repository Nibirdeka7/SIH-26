import os
from dotenv import load_dotenv

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
groq_key = os.getenv("GROQ_API_KEY")

from groq import Groq
client = Groq(api_key=groq_key)

candidates = ["llama-3.3-70b-specdec", "llama-3.2-11b-vision-preview", "llama-3.2-3b-preview", "llama-3.1-8b-instant", "gemma2-9b-it", "deepseek-r1-distill-llama-70b", "qwen-2.5-32b"]

for model in candidates:
    try:
        resp = client.chat.completions.create(
            messages=[{"role": "user", "content": "Hi"}],
            model=model
        )
        print(f"ACTIVE GROQ MODEL: {model} -> {resp.choices[0].message.content.strip()}")
        break
    except Exception as e:
        print(f"Groq {model} failed: {e}")
