import os
from dotenv import load_dotenv
from google import genai
from pinecone import Pinecone

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
gemini_key = os.getenv("GEMINI_API_KEY")
pinecone_key = os.getenv("PINECONE_API_KEY")

gemini_client = genai.Client(api_key=gemini_key)
pc = Pinecone(api_key=pinecone_key)
index = pc.Index("sih")

def get_embedding(text: str) -> list[float]:
    res = gemini_client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=text,
    )
    vals = res.embeddings[0].values
    # Normalize slice to 1024 dimensions for Pinecone sih index
    sliced = vals[:1024]
    mag = sum(x*x for x in sliced) ** 0.5
    return [x/mag for x in sliced]

# Test Upsert
vec = get_embedding("Acute cardiac chest pain radiating to left arm and jaw")
print(f"Generated Vector Dim: {len(vec)}")

index.upsert(
    vectors=[
        {
            "id": "cardiac-01",
            "values": vec,
            "metadata": {
                "category": "cardiology",
                "content": "Acute coronary syndrome protocol: Chest pain radiating to arm, neck, or jaw. Perform ECG, give oxygen, notify ER triage immediately.",
            }
        }
    ],
    namespace="triage-kb"
)
print("Successfully upserted test vector to Pinecone 'sih' index!")

# Test Query
query_vec = get_embedding("सीने में दर्द और बाएं हाथ में दर्द")
res = index.query(
    namespace="triage-kb",
    vector=query_vec,
    top_k=1,
    include_metadata=True
)
print("\nPINECONE SEARCH MATCHES:")
for match in res.matches:
    print(f"  Score: {match.score:.4f} | ID: {match.id} | Metadata: {match.metadata}")
