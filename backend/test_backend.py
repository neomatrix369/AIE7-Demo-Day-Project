#!/usr/bin/env python3
"""
Simple test script to verify backend components work correctly.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from managers.qdrant_manager import QdrantManager
from managers.data_manager import DataManager
from managers.search_manager import SearchManager

def test_managers():
    """Test the manager components."""
    print("🧪 Testing backend managers...")
    
    try:
        # Test QdrantManager
        print("📦 Testing QdrantManager...")
        qdrant_manager = QdrantManager(collection_name="test_collection")
        print("✅ QdrantManager initialized successfully")
        
        # Test DataManager
        print("📚 Testing DataManager...")
        data_folder = os.path.join(os.path.dirname(__file__), '..', 'data')
        data_manager = DataManager(data_folder=data_folder)
        print("✅ DataManager initialized successfully")
        
        # Test SearchManager
        print("🔍 Testing SearchManager...")
        search_manager = SearchManager(data_manager, qdrant_manager)
        print("✅ SearchManager initialized successfully")
        
        # Test loading documents
        print("📄 Testing document loading...")
        docs = data_manager.load_all_documents()
        print(f"✅ Loaded {len(docs)} documents")
        
        print("🎉 All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_managers()
    sys.exit(0 if success else 1)
