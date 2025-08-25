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

from unified_document_processor import UnifiedDocumentProcessor
from logging_config import setup_logging

def test_qdrant_connection():
    """Test basic Qdrant connection and operations"""
    logger = setup_logging(__name__)
    
    print("🧪 Testing Qdrant Connection...")
    print()
    
    try:
        # Test 1: Unified processor initialization
        print("1️⃣ Testing unified processor initialization...")
        processor = UnifiedDocumentProcessor()
        print("   ✅ Unified processor initialized!")
        
        # Test 2: Database connectivity
        print("2️⃣ Testing database connectivity...")
        connected = processor._check_database_connectivity()
        if connected:
            print("   ✅ Database connected!")
        else:
            print("   ❌ Database connection failed!")
            return False
            
        # Test 3: Collection info
        print("3️⃣ Getting collection information...")
        collection_info = processor.qdrant_manager.client.get_collection(processor.qdrant_manager.collection_name)
        print(f"   📊 Collection has {collection_info.points_count} points")
        print(f"   🎯 Vector size: {collection_info.config.params.vectors.size}")
        print(f"   📏 Distance: {collection_info.config.params.vectors.distance}")
        
        # Test 4: Status check
        print("4️⃣ Testing status retrieval...")
        status = processor.get_unified_status()
        print(f"   📊 Status retrieved: {status.get('document_count', 0)} documents")
        
        print()
        print("🎉 All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_qdrant_connection()
    sys.exit(0 if success else 1)