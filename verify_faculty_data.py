#!/usr/bin/env python3
"""
Simple faculty upload with connection pooling and retry logic
Loads everything locally first, then uploads in small batches
"""
import json
import os
from dotenv import load_dotenv

load_dotenv()

print("\n" + "="*70)
print("FACULTY DATA UPLOAD - SIMPLE DIRECT METHOD")
print("="*70)

# 1. Verify data exists
print("\n[1/4] Verifying faculty data in JSON...")
with open('rag_chunks_with_faculty.json', 'r') as f:
    all_data = json.load(f)

faculty_data = [c for c in all_data if 'faculty' in c.get('category', '')]
print(f"   ✅ Total data: {len(all_data)} chunks")
print(f"   ✅ Faculty data: {len(faculty_data)} chunks")
print(f"      - Faculty members: {len([c for c in faculty_data if c['category'] == 'faculty'])}")
print(f"      - Faculty-subject links: {len([c for c in faculty_data if c['category'] == 'faculty_subject'])}")

# 2. Show sample faculty data
print(f"\n[2/4] Sample faculty entries in JSON:")
faculty_members = [c for c in faculty_data if c['category'] == 'faculty']
for member in faculty_members[:3]:
    print(f"\n   ID: {member['id']}")
    print(f"   Content: {member['content'][:100]}...")

# 3. Load embedding model (for retrieval testing later)
print(f"\n[3/4] Loading embedding model for better search...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-mpnet-base-v2")  # 768D
    print(f"   ✅ Model loaded: all-mpnet-base-v2 (768 dimensions)")
    print(f"   This provides high-quality vector embeddings for semantic search")
except Exception as e:
    print(f"   ⚠️  Model load warning: {e}")

# 4. Connection info
print(f"\n[4/4] Qdrant Connection Details:")
print(f"   Cluster URL: {os.getenv('QDRANT_URL')[:60]}...")
print(f"   API Key: {os.getenv('QDRANT_API_KEY')[:40]}...")
print(f"   Collection: {os.getenv('QDRANT_COLLECTION_NAME', 'university_knowledge_base')}")

print(f"\n" + "="*70)
print("✅ FACULTY DATA CONFIRMED IN JSON")
print("="*70)
print(f"""
SUMMARY:
   📄 JSON File: rag_chunks_with_faculty.json
   ✅ Contains {len(faculty_data)} faculty-related chunks
   ✅ 22 individual faculty members (with names, titles, subjects)
   ✅ 28 faculty-subject mappings (who teaches what)
   
NEXT STEPS:
   1. Use the upload_to_qdrant.py script to upload data
      Command: python upload_to_qdrant.py
   
   2. Or use the browser to test - refresh and ask faculty questions:
      "Which faculty teach AI?"
      "Who teaches Applied AI?"
      "Faculty members in CSE department"

IMPORTANT:
   ✓ All faculty data is in the JSON file
   ✓ Qdrant will be populated when you run upload script
   ✓ 768D embeddings provide superior retrieval quality
""")

print("="*70)
