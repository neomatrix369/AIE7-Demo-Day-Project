#!/usr/bin/env python3
"""
Explore Qdrant's search functions, outputs, and data structures
"""

import os
import sys
import json
import pprint
from typing import List, Dict, Any

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(__file__))

from qdrant_client import QdrantClient
from qdrant_client.http.models import SearchRequest, Filter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from managers.qdrant_manager import QdrantManager
from managers.search_manager import SearchManager
from managers.data_manager import DataManager
from logging_config import setup_logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

def explore_qdrant_methods():
    """Explore available Qdrant client methods and capabilities."""
    logger = setup_logging(__name__)
    
    print("🔍 EXPLORING QDRANT API METHODS AND DATA STRUCTURES")
    print("=" * 60)
    
    try:
        # Initialize managers
        qdrant_manager = QdrantManager("student_loan_corpus")
        data_manager = DataManager(os.path.join(os.path.dirname(__file__), '..', 'data'))
        search_manager = SearchManager(data_manager, qdrant_manager)
        
        client = qdrant_manager.client
        collection_name = qdrant_manager.collection_name
        
        print(f"📦 Collection: {collection_name}")
        print(f"🔗 Qdrant URL: {os.getenv('QDRANT_URL', 'http://localhost:6333')}")
        print()
        
        # 1. Explore collection info
        print("1️⃣ COLLECTION INFORMATION")
        print("-" * 30)
        try:
            collection_info = client.get_collection(collection_name)
            print(f"   📊 Points count: {collection_info.points_count}")
            print(f"   📏 Vector size: {collection_info.config.params.vectors.size}")
            print(f"   📐 Distance metric: {collection_info.config.params.vectors.distance}")
            print(f"   💾 Status: {collection_info.status}")
            print()
        except Exception as e:
            print(f"   ❌ Collection info error: {e}")
            print()
        
        # 2. Explore available client methods
        print("2️⃣ AVAILABLE QDRANT CLIENT METHODS")
        print("-" * 35)
        search_methods = [method for method in dir(client) if 'search' in method.lower()]
        print("   🔍 Search-related methods:")
        for method in search_methods[:10]:  # Show first 10
            print(f"      • {method}")
        
        query_methods = [method for method in dir(client) if 'query' in method.lower()]
        print("   🔎 Query-related methods:")
        for method in query_methods[:5]:
            print(f"      • {method}")
        print()
        
        # 3. Test different search methods
        print("3️⃣ TESTING DIFFERENT SEARCH METHODS")
        print("-" * 35)
        
        test_query = "student loan payment issues"
        print(f"   🔍 Test query: '{test_query}'")
        print()
        
        # Method 1: LangChain vector store search
        print("   📚 METHOD 1: LangChain Vector Store Search")
        try:
            vector_store = search_manager.get_vector_store()
            if vector_store:
                docs_and_scores = vector_store.similarity_search_with_score(test_query, k=3)
                print(f"      ✅ Found {len(docs_and_scores)} results")
                if docs_and_scores:
                    doc, score = docs_and_scores[0]
                    print(f"      📄 Sample result structure:")
                    print(f"         • Score: {score}")
                    print(f"         • Content length: {len(doc.page_content)}")
                    print(f"         • Metadata keys: {list(doc.metadata.keys())}")
                    print(f"         • Sample metadata: {dict(list(doc.metadata.items())[:3])}")
            else:
                print("      ❌ Vector store not available")
        except Exception as e:
            print(f"      ❌ LangChain search error: {e}")
        print()
        
        # Method 2: Direct Qdrant client search
        print("   🔧 METHOD 2: Direct Qdrant Client Search")
        try:
            # Get embedding for the query
            embedding_model = OpenAIEmbeddings(model="text-embedding-3-small")
            query_vector = embedding_model.embed_query(test_query)
            
            # Direct Qdrant search
            search_result = client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=3,
                with_payload=True,
                with_vectors=False
            )
            
            print(f"      ✅ Found {len(search_result)} results")
            if search_result:
                first_result = search_result[0]
                print(f"      📄 Raw Qdrant result structure:")
                print(f"         • Result type: {type(first_result)}")
                print(f"         • Score: {first_result.score}")
                print(f"         • ID: {first_result.id}")
                print(f"         • Payload keys: {list(first_result.payload.keys()) if first_result.payload else 'None'}")
                
                # Pretty print the full structure of first result
                print(f"      📋 Complete first result structure:")
                result_dict = {
                    "id": first_result.id,
                    "score": first_result.score,
                    "payload": first_result.payload,
                    "vector": first_result.vector
                }
                pprint.pprint(result_dict, indent=10, width=80)
        except Exception as e:
            print(f"      ❌ Direct Qdrant search error: {e}")
        print()
        
        # Method 3: Qdrant search with filters
        print("   🎯 METHOD 3: Qdrant Search with Filters")
        try:
            search_result_filtered = client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=2,
                with_payload=True,
                with_vectors=False,
                score_threshold=0.1  # Filter by minimum score
            )
            
            print(f"      ✅ Found {len(search_result_filtered)} results with score threshold")
            for i, result in enumerate(search_result_filtered):
                print(f"         Result {i+1}: Score {result.score:.4f}, ID: {result.id}")
        except Exception as e:
            print(f"      ❌ Filtered search error: {e}")
        print()
        
        # 4. Explore payload structure in detail
        print("4️⃣ DETAILED PAYLOAD ANALYSIS")
        print("-" * 30)
        try:
            if search_result and search_result[0].payload:
                payload = search_result[0].payload
                print("   📦 Payload structure:")
                for key, value in payload.items():
                    value_type = type(value).__name__
                    value_preview = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                    print(f"      • {key} ({value_type}): {value_preview}")
        except Exception as e:
            print(f"   ❌ Payload analysis error: {e}")
        print()
        
        # 5. Test scroll/pagination
        print("5️⃣ PAGINATION AND SCROLL CAPABILITIES")
        print("-" * 38)
        try:
            scroll_result = client.scroll(
                collection_name=collection_name,
                limit=5,
                with_payload=True,
                with_vectors=False
            )
            points, next_page_offset = scroll_result
            print(f"   📄 Scroll returned {len(points)} points")
            print(f"   ➡️  Next page offset: {next_page_offset}")
            if points:
                print(f"   📋 First point ID: {points[0].id}")
        except Exception as e:
            print(f"   ❌ Scroll error: {e}")
        print()
        
        # 6. Available methods summary
        print("6️⃣ KEY QDRANT CLIENT METHODS SUMMARY")
        print("-" * 40)
        key_methods = [
            "search", "scroll", "get", "count", "retrieve",
            "query_points", "recommend", "search_batch"
        ]
        print("   🛠️  Key methods for data retrieval:")
        for method in key_methods:
            if hasattr(client, method):
                print(f"      ✅ {method}")
            else:
                print(f"      ❌ {method} (not available)")
        print()
        
        print("✅ Exploration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Exploration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def explore_langchain_qdrant_methods():
    """Explore LangChain's QdrantVectorStore methods."""
    print("\n🔗 EXPLORING LANGCHAIN QDRANT METHODS")
    print("=" * 40)
    
    try:
        qdrant_manager = QdrantManager("student_loan_corpus")
        embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        
        vector_store = QdrantVectorStore(
            client=qdrant_manager.client,
            collection_name=qdrant_manager.collection_name,
            embedding=embedding,
        )
        
        # Explore available methods
        search_methods = [method for method in dir(vector_store) if 'search' in method.lower()]
        print("🔍 LangChain QdrantVectorStore search methods:")
        for method in search_methods:
            print(f"   • {method}")
        
        similarity_methods = [method for method in dir(vector_store) if 'similar' in method.lower()]
        print("\n📊 Similarity methods:")
        for method in similarity_methods:
            print(f"   • {method}")
        
        return True
        
    except Exception as e:
        print(f"❌ LangChain exploration failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Qdrant API Exploration...")
    success1 = explore_qdrant_methods()
    success2 = explore_langchain_qdrant_methods()
    
    if success1 and success2:
        print("\n🎉 All explorations completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Some explorations failed")
        sys.exit(1)