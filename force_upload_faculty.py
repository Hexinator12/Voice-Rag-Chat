#!/usr/bin/env python3
"""Force upload all faculty data to Qdrant"""
import json
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

load_dotenv()

print("=" * 60)
print("FACULTY DATA UPLOAD - FORCE SYNC")
print("=" * 60)

# Load data
print("\n[1] Loading rag_chunks_with_faculty.json...")
with open('rag_chunks_with_faculty.json', 'r') as f:
    all_chunks = json.load(f)

faculty_chunks = [c for c in all_chunks if 'faculty' in c.get('category', '')]
print(f"   ✅ Found {len(faculty_chunks)} faculty chunks out of {len(all_chunks)} total")

# List them
print("\n   Faculty chunks in JSON:")
for chunk in faculty_chunks[:5]:
    print(f"      - {chunk['id']}: {chunk['content'][:70]}...")

# Connect to Qdrant
print(f"\n[2] Connecting to Qdrant...")
try:
    client = QdrantClient(
        url=os.getenv('QDRANT_URL'),
        api_key=os.getenv('QDRANT_API_KEY'),
        timeout=30
    )
    collection = os.getenv('QDRANT_COLLECTION_NAME', 'university_knowledge_base')
    info = client.get_collection(collection)
    print(f"   ✅ Connected to '{collection}'")
    print(f"   Current vectors in Qdrant: {info.points_count}")
except Exception as e:
    print(f"   ❌ Connection failed: {e}")
    exit(1)

# Create embeddings
print(f"\n[3] Creating embeddings for faculty chunks...")
model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")

faculty_contents = [c['content'] for c in faculty_chunks]
print(f"   Embedding {len(faculty_contents)} faculty texts...")
embeddings = model.encode(faculty_contents, show_progress_bar=False)
print(f"   ✅ Embeddings created")

# Upload
print(f"\n[4] Uploading faculty chunks to Qdrant...")
points = []
for idx, (chunk, embedding) in enumerate(zip(faculty_chunks, embeddings)):
    point = PointStruct(
        id=len(all_chunks) + idx,  # Avoid ID conflicts
        vector=embedding.tolist(),
        payload={
            "chunk_id": chunk['id'],
            "content": chunk['content'],
            "category": chunk['category'],
            "program": chunk.get('program', 'ALL'),
            "keywords": chunk.get('keywords', [])
        }
    )
    points.append(point)

try:
    client.upsert(
        collection_name=collection,
        points=points,
        wait=True
    )
    print(f"   ✅ Uploaded {len(points)} faculty chunks")
except Exception as e:
    print(f"   ❌ Upload failed: {e}")
    exit(1)

# Verify
print(f"\n[5] Verifying upload...")
info = client.get_collection(collection)
print(f"   ✅ Total vectors in Qdrant now: {info.points_count}")

# Test search
print(f"\n[6] Testing faculty search...")
test_query = "which faculty teach AI"
test_embedding = model.encode(test_query).tolist()
results = client.query_points(
    collection_name=collection,
    query=test_embedding,
    limit=5,
    with_payload=True
)

print(f"   Results for '{test_query}':")
for i, hit in enumerate(results.points, 1):
    category = hit.payload.get('category', 'unknown')
    content = hit.payload.get('content', '')[:80]
    print(f"   {i}. [{category}] (score: {hit.score:.3f}) {content}...")

print(f"\n" + "=" * 60)
print(f"✅ FACULTY DATA SUCCESSFULLY SYNCED TO QDRANT!")
print(f"=" * 60)
