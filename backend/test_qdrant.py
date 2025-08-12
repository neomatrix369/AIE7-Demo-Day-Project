#!/usr/bin/env python3
"""
Test script to verify Qdrant connection and functionality
"""

import os
import sys
sys.path.append(os.path.dirname(__file__))

# Load environment variables from root .env file
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from simple_document_processor import (
    get_qdrant_client, 
    ensure_collection_exists, 
    QDRANT_URL, 
    QDRANT_COLLECTION_NAME,
    SimpleDocumentProcessor
)
from logging_config import setup_logging

def test_qdrant_connection():
    """Test basic Qdrant connection and operations"""
    logger = setup_logging(__name__)
    
    print("🧪 Testing Qdrant Connection...")
    print(f"📍 URL: {QDRANT_URL}")
    print(f"📦 Collection: {QDRANT_COLLECTION_NAME}")
    print()
    
    try:
        # Test 1: Basic connection
        print("1️⃣ Testing basic connection...")
        client = get_qdrant_client()
        print("   ✅ Connection successful!")
        
        # Test 2: Collection creation
        print("2️⃣ Testing collection creation...")
        success = ensure_collection_exists(client, QDRANT_COLLECTION_NAME)
        if success:
            print("   ✅ Collection ready!")
        else:
            print("   ❌ Collection creation failed!")
            return False
            
        # Test 3: Collection info
        print("3️⃣ Getting collection information...")
        collection_info = client.get_collection(QDRANT_COLLECTION_NAME)
        print(f"   📊 Collection has {collection_info.points_count} points")
        print(f"   🎯 Vector size: {collection_info.config.params.vectors.size}")
        print(f"   📏 Distance: {collection_info.config.params.vectors.distance}")
        
        # Test 4: Document processor initialization
        print("4️⃣ Testing document processor...")
        processor = SimpleDocumentProcessor()
        print("   ✅ Document processor initialized!")
        
        print()
        print("🎉 All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_qdrant_connection()
    sys.exit(0 if success else 1)