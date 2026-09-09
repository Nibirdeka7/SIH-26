import os
import sys
from dotenv import load_dotenv

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")

gemini_key = os.getenv("GEMINI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")
pinecone_key = os.getenv("PINECONE_API_KEY")

print(f"Loaded Keys:")
print(f"  Gemini Key: {gemini_key[:10]}... (len {len(gemini_key) if gemini_key else 0})")
print(f"  Groq Key: {groq_key[:10]}... (len {len(groq_key) if groq_key else 0})")
print(f"  Pinecone Key: {pinecone_key[:10]}... (len {len(pinecone_key) if pinecone_key else 0})")

# Test Gemini
if gemini_key:
    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents='Hello, respond with "Gemini Connected!"',
        )
        print("\nGEMINI SUCCESS:", response.text.strip())
    except Exception as e:
        print("\nGEMINI ERROR:", e)

# Test Groq with llama-3.1-8b-instant or llama3-70b-8192
if groq_key:
    for model_candidate in ["llama-3.1-8b-instant", "llama3-70b-8192", "mixtral-8x7b-32768"]:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": "Hello, respond with 'Groq Connected!'"}] ,
                model=model_candidate,
            )
            print(f"\nGROQ SUCCESS ({model_candidate}):", chat_completion.choices[0].message.content.strip())
            break
        except Exception as e:
            print(f"\nGROQ ERROR ({model_candidate}):", e)

# Test Pinecone
if pinecone_key:
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=pinecone_key)
        indexes = pc.list_indexes()
        index_names = [idx.name for idx in indexes]
        print(f"\nPINECONE SUCCESS: Indexes found = {index_names}")
    except Exception as e:
        print("\nPINECONE ERROR:", e)
