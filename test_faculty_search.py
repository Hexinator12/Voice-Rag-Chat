#!/usr/bin/env python3
"""Test faculty search retrieval"""
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize
model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
client = QdrantClient(url=os.getenv('QDRANT_URL'), api_key=os.getenv('QDRANT_API_KEY'))
collection = os.getenv('QDRANT_COLLECTION_NAME', 'uit_rag')

# Test query
query = "which faculty members specialize in AI/ML"
query_embedding = model.encode(query).tolist()

results = client.query_points(
    collection_name=collection,
    query=query_embedding,
    limit=10,
    with_payload=True
)

print(f"🔍 Search results for: '{query}'\n")
print(f"Found {len(results.points)} results:\n")

for i, hit in enumerate(results.points, 1):
    payload = hit.payload
    category = payload.get('category', 'unknown')
    content = payload.get('content', '')[:130]
    score = hit.score
    print(f"{i}. [{category}] (score: {score:.3f})")
    print(f"   {content}...\n")
