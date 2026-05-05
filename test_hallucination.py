#!/usr/bin/env python3
"""Test Voice RAG for hallucination risk"""

test_queries = [
    # These should have high confidence (data exists)
    ("Who teaches Applied AI?", True),  # Expected: High confidence
    ("What is CSE program?", True),      # Expected: High confidence
    ("What are placement statistics?", True),  # Expected: High confidence
    
    # These should have low confidence (data doesn't exist)
    ("What is the exact cutoff score?", False),  # Expected: Low confidence
    ("Which internship companies recruit?", False),  # Expected: Low confidence
    ("When is the next festival?", False),  # Expected: Low confidence
]

# Run each query and check confidence
import subprocess
for query, should_be_high in test_queries:
    print(f"\n📋 Testing: {query}")
    print(f"   Expected confidence: {'HIGH ✅' if should_be_high else 'LOW ⚠️'}")
    
    # You'd call your backend API here and check the confidence score
    # response = requests.post("http://localhost:8000/chat", 
    #                         json={"question": query})
    # print(f"   Actual confidence: {response['confidence']}%")
    # print(f"   Hallucination risk: {'LOW' if (should_be_high and response['confidence'] > 60) else 'HIGH'}")