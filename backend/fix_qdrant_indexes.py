#!/usr/bin/env python3
"""
Utility script to fix missing payload indexes in Qdrant collections.
This script ensures that all required indexes exist for proper filtering.
"""

import os
import sys
import logging
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.settings import COLLECTION_NAMES

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def fix_qdrant_indexes():
    """Fix missing payload indexes in Qdrant collections."""
    try:
        # Get Qdrant configuration
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        collection_name = os.getenv("QDRANT_COLLECTION_NAME", COLLECTION_NAMES["DEFAULT_COLLECTION"])
        
        logger.info(f"🔗 Connecting to Qdrant at: {qdrant_url}")
        logger.info(f"📦 Collection: {collection_name}")
        
        # Create Qdrant client
        client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key,
            timeout=60
        )
        
        # Check if collection exists
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if collection_name not in collection_names:
            logger.error(f"❌ Collection '{collection_name}' does not exist!")
            return False
        
        logger.info(f"✅ Collection '{collection_name}' found")
        
        # Get collection info
        collection_info = client.get_collection(collection_name)
        logger.info(f"📊 Collection has {collection_info.points_count} points")
        
        # Get existing indexes
        existing_indexes = collection_info.payload_indexes if hasattr(collection_info, 'payload_indexes') else []
        existing_field_names = [idx.field_name for idx in existing_indexes] if existing_indexes else []
        
        logger.info(f"📊 Existing payload indexes: {existing_field_names}")
        
        # Define required indexes
        required_indexes = [
            ("document_source", "keyword"),
            ("is_selected", "bool"),
            ("document_type", "keyword")
        ]
        
        # Create missing indexes
        created_count = 0
        for field_name, field_schema in required_indexes:
            if field_name not in existing_field_names:
                logger.info(f"🔧 Creating missing payload index for '{field_name}'")
                try:
                    client.create_payload_index(
                        collection_name=collection_name,
                        field_name=field_name,
                        field_schema=field_schema
                    )
                    logger.info(f"✅ Created payload index for '{field_name}'")
                    created_count += 1
                except Exception as e:
                    logger.error(f"❌ Failed to create payload index for '{field_name}': {e}")
            else:
                logger.info(f"✅ Payload index for '{field_name}' already exists")
        
        if created_count > 0:
            logger.info(f"🎉 Successfully created {created_count} missing payload indexes")
        else:
            logger.info("✅ All required payload indexes already exist")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to fix Qdrant indexes: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting Qdrant index fix utility...")
    success = fix_qdrant_indexes()
    
    if success:
        logger.info("✅ Qdrant index fix completed successfully")
        sys.exit(0)
    else:
        logger.error("❌ Qdrant index fix failed")
        sys.exit(1)
