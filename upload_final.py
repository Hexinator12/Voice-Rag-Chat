#!/usr/bin/env python3
"""
Fast upload of all data (including new AIML curriculum chunks) to Qdrant
Uses all-mpnet-base-v2 model (768D) for high-quality semantic search
"""
import json
import os
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

load_dotenv()

print("\n" + "="*70)
print("UPLOADING ALL DATA + NEW AIML CURRICULUM TO QDRANT")
print("="*70)

# Load data
print("\n[1] Loading data...")
with open('rag_chunks_with_faculty.json') as f:
    all_chunks = json.load(f)

aiml_chunks = [c for c in all_chunks if 'AIML' in c.get('program', '')]
cse_chunks = [c for c in all_chunks if 'CSE' in c.get('program', '')]

print(f"   ✅ Total chunks: {len(all_chunks)}")
print(f"   ✅ AIML chunks: {len(aiml_chunks)}")
print(f"   ✅ CSE chunks: {len(cse_chunks)}")

# Connect
print("\n[2] Connecting to Qdrant...")
try:
    client = QdrantClient(
        url=os.getenv('QDRANT_URL'),
        api_key=os.getenv('QDRANT_API_KEY'),
        timeout=30
    )
    collection = os.getenv('QDRANT_COLLECTION_NAME', 'university_knowledge_base')
    print(f"   ✅ Connected")
except Exception as e:
    print(f"   ❌ Connection failed: {e}")
    sys.exit(1)

# Load model
print("\n[3] Loading embedding model...")
model = SentenceTransformer("all-mpnet-base-v2")
print(f"   ✅ Loaded (768D embeddings)")

# Delete old collection
print("\n[4] Recreating collection...")
try:
    client.delete_collection(collection)
    print(f"   ✅ Old collection deleted")
except:
    pass

try:
    client.create_collection(
        collection_name=collection,
        vectors_config=VectorParams(size=768, distance=Distance.COSINE)
    )
    print(f"   ✅ New collection created")
except Exception as e:
    print(f"   ❌ Creation failed: {e}")
    sys.exit(1)

# Generate embeddings
print(f"\n[5] Generating embeddings ({len(all_chunks)} chunks)...")
try:
    embeddings = model.encode(
        [c['content'] for c in all_chunks],
        show_progress_bar=False,
        batch_size=32
    )
    print(f"   ✅ Embeddings ready")
except Exception as e:
    print(f"   ❌ Embedding failed: {e}")
    sys.exit(1)

# Upload
print(f"\n[6] Uploading to Qdrant...")
try:
    points = []
    for idx, (chunk, embedding) in enumerate(zip(all_chunks, embeddings)):
        points.append(PointStruct(
            id=idx,
            vector=embedding.tolist(),
            payload={
                "chunk_id": chunk.get("id"),
                "content": chunk["content"],
                "category": chunk.get("category", "general"),
                "program": chunk.get("program", "ALL"),
                "keywords": chunk.get("keywords", [])
            }
        ))
    
    # Upload in small batches
    batch_size = 5
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        client.upsert(collection_name=collection, points=batch, wait=True)
        progress = min(i + batch_size, len(points))
        print(f"   ⏳ {progress}/{len(points)} vectors", end='\r')
    
    print(f"   ✅ {len(points)} vectors uploaded      ")
except Exception as e:
    print(f"   ❌ Upload failed: {e}")
    sys.exit(1)

# Verify
print(f"\n[7] Verification...")
try:
    info = client.get_collection(collection)
    print(f"   ✅ Collection: {info.points_count} vectors")
    
    # Test AIML curriculum search
    test_query = "AIML curriculum differences with CSE program"
    embedding = model.encode(test_query).tolist()
    results = client.query_points(collection_name=collection, query=embedding, limit=3, with_payload=True)
    
    print(f"\n   Test search: '{test_query}'")
    print(f"   Results found: {len(results.points)}")
    for hit in results.points:
        print(f"      ✅ {hit.payload.get('category')}: {hit.payload.get('content')[:70]}...")
    
    print(f"\n" + "="*70)
    print(f"✅ SUCCESS! Updated data uploaded to Qdrant")
    print(f"="*70)
    print(f"\n📚 New content added:")
    print(f"   - AIML curriculum details")
    print(f"   - AIML vs CSE curriculum comparison")
    print(f"   - AIML career paths")
    print(f"   - AIML industry opportunities")
    print(f"\n🔄 Backend is ready to answer curriculum comparison questions!")
    
except Exception as e:
    print(f"   ❌ Failed: {e}")
    sys.exit(1)
