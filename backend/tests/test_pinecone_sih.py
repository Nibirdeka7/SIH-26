import os
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv("d:/Projects/SIH-2026/backend/conversation-service/.env")
pinecone_key = os.getenv("PINECONE_API_KEY")

pc = Pinecone(api_key=pinecone_key)
index = pc.Index("sih")
print("Pinecone Index 'sih' Stats:", index.describe_index_stats())
