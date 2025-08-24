#!/usr/bin/env python3
"""Quick test to compare standard vs enhanced RAG retrieval"""

import requests
import json

# Test queries
test_queries = [
    "What is GPT-5's performance on benchmarks?",
    "How does Claude compare to other models?",
    "Which model has the best reasoning capabilities?",
]

print("🔬 Testing RAG Retrieval Comparison\n")
print("=" * 80)

for query in test_queries:
    print(f"\n📝 Query: {query}")
    print("-" * 60)
    
    # Test with standard retrieval
    config_standard = {
        "selected_groups": ["llm"],
        "top_k": 5,
        "similarity_threshold": 0.5,
        "use_enhanced_retrieval": False
    }
    
    # Test with enhanced retrieval  
    config_enhanced = {
        "selected_groups": ["llm"],
        "top_k": 5,
        "similarity_threshold": 0.5,
        "use_enhanced_retrieval": True
    }
    
    # Search using standard
    response = requests.get(
        "http://localhost:8001/api/corpus/search",
        params={"query": query, "top_k": 5}
    )
    
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", [])
        
        if results:
            avg_score = sum(r.get("similarity", 0) for r in results) / len(results)
            print(f"\n📊 Results found: {len(results)} documents")
            print(f"   Average similarity: {avg_score:.3f}")
            print(f"   Top result: {results[0].get('title', 'Unknown')[:50]}...")
            print(f"   Top score: {results[0].get('similarity', 0):.3f}")
        else:
            print("   ❌ No results found")
    else:
        print(f"   ❌ Error: {response.status_code}")

print("\n" + "=" * 80)
print("✅ Test complete!")