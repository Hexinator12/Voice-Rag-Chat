#!/usr/bin/env python3
"""
Upload all university data with faculty to Qdrant using high-quality embeddings
Uses all-mpnet-base-v2 (768 dimensions) for superior retrieval quality
"""
import json
import os
import time
from typing import List
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

load_dotenv()

print("\n" + "="*80)
print("QDRANT UPLOAD: ALL DATA + FACULTY (HIGH-QUALITY EMBEDDINGS)")
print("="*80)

# Configuration
DATA_FILE = "rag_chunks_with_faculty.json"
EMBEDDING_MODEL = "sentence-transformers/all-mpnet-base-v2"  # 768D - Best quality
EMBEDDING_DIM = 768
BATCH_SIZE = 10  # Smaller batches for reliability

qdrant_url = os.getenv("QDRANT_URL")
qdrant_api_key = os.getenv("QDRANT_API_KEY")
collection_name = os.getenv("QDRANT_COLLECTION_NAME", "university_knowledge_base")

print(f"\n📋 Configuration:")
print(f"   Data file: {DATA_FILE}")
print(f"   Embedding model: {EMBEDDING_MODEL}")
print(f"   Embedding dimension: {EMBEDDING_DIM}D")
print(f"   Batch size: {BATCH_SIZE}")
print(f"   Collection: {collection_name}")
print(f"   Cluster: {qdrant_url[:50]}...")

if not qdrant_url or not qdrant_api_key:
    print("\n❌ Error: QDRANT_URL and QDRANT_API_KEY not set in .env")
    exit(1)

# Step 1: Load data
print(f"\n[1/6] Loading data...")
try:
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data_chunks = json.load(f)
    
    faculty_chunks = [c for c in data_chunks if 'faculty' in c.get('category', '')]
    print(f"   ✅ Total chunks: {len(data_chunks)}")
    print(f"   ✅ Faculty chunks: {len(faculty_chunks)}")
    
    print(f"\n   Faculty data includes:")
    print(f"      - {len([c for c in faculty_chunks if c['category'] == 'faculty'])} individual faculty members")
    print(f"      - {len([c for c in faculty_chunks if c['category'] == 'faculty_subject'])} faculty-subject mappings")
    
except Exception as e:
    print(f"   ❌ Failed to load data: {e}")
    exit(1)

# Step 2: Connect to Qdrant
print(f"\n[2/6] Connecting to Qdrant...")
try:
    client = QdrantClient(
        url=qdrant_url,
        api_key=qdrant_api_key,
        timeout=60
    )
    collections = client.get_collections()
    print(f"   ✅ Connected successfully")
    print(f"   ℹ️  Existing collections: {len(collections.collections)}")
    
except Exception as e:
    print(f"   ❌ Connection failed: {e}")
    exit(1)

# Step 3: Load embedding model
print(f"\n[3/6] Loading embedding model...")
try:
    print(f"   ⏳ Loading {EMBEDDING_MODEL}...")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    print(f"   ✅ Model loaded (768-dimensional embeddings)")
except Exception as e:
    print(f"   ❌ Failed to load model: {e}")
    exit(1)

# Step 4: Create/recreate collection
print(f"\n[4/6] Setting up Qdrant collection...")
try:
    existing_collections = [col.name for col in client.get_collections().collections]
    
    if collection_name in existing_collections:
        print(f"   ⚠️  Collection exists, deleting...")
        client.delete_collection(collection_name)
        print(f"   ✅ Deleted")
        time.sleep(1)
    
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=EMBEDDING_DIM,
            distance=Distance.COSINE
        )
    )
    print(f"   ✅ Collection created")
    print(f"      - Name: {collection_name}")
    print(f"      - Dimension: {EMBEDDING_DIM}D")
    print(f"      - Distance: COSINE")
    
except Exception as e:
    print(f"   ❌ Failed to create collection: {e}")
    exit(1)

# Step 5: Generate embeddings
print(f"\n[5/6] Generating embeddings...")
try:
    contents = [chunk['content'] for chunk in data_chunks]
    
    print(f"   ⏳ Encoding {len(contents)} texts...")
    embeddings = embedding_model.encode(
        contents,
        show_progress_bar=True,
        batch_size=32
    )
    print(f"   ✅ Embeddings generated")
    
except Exception as e:
    print(f"   ❌ Embedding failed: {e}")
    exit(1)

# Step 6: Upload to Qdrant
print(f"\n[6/6] Uploading to Qdrant...")
try:
    points = []
    for idx, (chunk, embedding) in enumerate(zip(data_chunks, embeddings)):
        point = PointStruct(
            id=idx,
            vector=embedding.tolist(),
            payload={
                "chunk_id": chunk.get("id", f"chunk_{idx}"),
                "content": chunk["content"],
                "category": chunk.get("category", "general"),
                "program": chunk.get("program", "ALL"),
                "keywords": chunk.get("keywords", [])
            }
        )
        points.append(point)
    
    print(f"   ⏳ Uploading {len(points)} vectors in batches...")
    
    uploaded = 0
    for i in tqdm(range(0, len(points), BATCH_SIZE), desc="   Progress"):
        batch = points[i:i + BATCH_SIZE]
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                client.upsert(
                    collection_name=collection_name,
                    points=batch,
                    wait=True
                )
                uploaded += len(batch)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"\n   ⚠️  Batch {i//BATCH_SIZE} failed, retrying...")
                    time.sleep(2)
                else:
                    raise
        
        time.sleep(0.3)  # Small delay between batches
    
    print(f"   ✅ Upload complete: {uploaded} vectors")
    
except Exception as e:
    print(f"   ❌ Upload failed: {e}")
    exit(1)

# Verification
print(f"\n" + "="*80)
print("VERIFICATION")
print("="*80)

try:
    info = client.get_collection(collection_name)
    print(f"\n✅ Collection Status:")
    print(f"   Name: {collection_name}")
    print(f"   Total vectors: {info.points_count}")
    print(f"   Dimension: {info.config.params.vectors.size}D")
    print(f"   Distance metric: {info.config.params.vectors.distance}")
    
    # Test faculty search
    print(f"\n" + "-"*80)
    print("Testing Faculty Search...")
    print("-"*80)
    
    test_queries = [
        "which faculty teach AI and machine learning",
        "who teaches applied AI",
        "faculty members in computer science"
    ]
    
    for query in test_queries:
        query_embedding = embedding_model.encode(query).tolist()
        results = client.query_points(
            collection_name=collection_name,
            query=query_embedding,
            limit=3,
            with_payload=True
        )
        
        print(f"\nQuery: '{query}'")
        print(f"Results: {len(results.points)} matches")
        
        for i, hit in enumerate(results.points[:2], 1):
            category = hit.payload.get('category', 'unknown')
            content = hit.payload.get('content', '')[:80]
            score = hit.score
            print(f"  {i}. [{category}] (score: {score:.3f})")
            print(f"     {content}...")
    
    print(f"\n" + "="*80)
    print("✅ SUCCESS! ALL DATA + FACULTY UPLOADED TO QDRANT")
    print("="*80)
    print(f"\n📊 Summary:")
    print(f"   ✅ {info.points_count} total vectors")
    print(f"   ✅ {len(faculty_chunks)} faculty-related chunks")
    print(f"   ✅ High-quality 768D embeddings for superior retrieval")
    print(f"   ✅ Ready for faculty queries!")
    print(f"\n🔄 Next: Restart your backend and test faculty queries\n")
    
except Exception as e:
    print(f"\n❌ Verification failed: {e}")
    exit(1)
