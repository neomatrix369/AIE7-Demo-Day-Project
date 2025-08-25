# -*- coding: utf-8 -*-
import os
import logging
import time
import threading
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams
import httpx

# Set up logging
logger = logging.getLogger(__name__)

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
VECTOR_SIZE = 1536  # OpenAI text-embedding-3-small dimensions

class QdrantManager:
    """Manages Qdrant client and collections."""

    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._client = None
        self._client_lock = threading.Lock()
        self._last_connection_time = 0
        self._connection_timeout = 30  # seconds
        self._max_connection_age = 300  # 5 minutes - recreate connection after this
        self._ensure_collection_exists()

    def _get_qdrant_client(self) -> QdrantClient:
        """
        Create and return a Qdrant client instance with connection management.
        """
        with self._client_lock:
            current_time = time.time()
            
            # Check if we need to create a new connection
            if (self._client is None or 
                current_time - self._last_connection_time > self._max_connection_age):
                
                # Close existing connection if it exists
                if self._client is not None:
                    try:
                        self._client.close()
                        logger.info("🔌 Closed existing Qdrant connection")
                    except Exception as e:
                        logger.warning(f"⚠️ Error closing Qdrant connection: {e}")
                
                # Create new connection with proper timeout
                logger.info(f"🔗 Creating new Qdrant connection to {QDRANT_URL}")
                logger.info(f"🔑 Using API key: {'Yes' if QDRANT_API_KEY else 'No'}")
                
                try:
                    # Create Qdrant client with extended timeout for better connection management
                    self._client = QdrantClient(
                        url=QDRANT_URL, 
                        api_key=QDRANT_API_KEY, 
                        timeout=60  # Extended timeout to prevent hanging connections
                    )
                    
                    # Test the connection
                    collections = self._client.get_collections()
                    self._last_connection_time = current_time
                    
                    logger.info("✅ Successfully connected to Qdrant server")
                    logger.info(f"📊 Found {len(collections.collections)} existing collections")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to connect to Qdrant server: {e}")
                    logger.error(f"❌ URL: {QDRANT_URL}")
                    logger.error(f"❌ Has API key: {'Yes' if QDRANT_API_KEY else 'No'}")
                    self._client = None
                    raise
            
            return self._client

    def close_connection(self):
        """Close the Qdrant connection and cleanup resources."""
        with self._client_lock:
            if self._client is not None:
                try:
                    self._client.close()
                    logger.info("🔌 Closed Qdrant connection")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing Qdrant connection: {e}")
                finally:
                    self._client = None
                    self._last_connection_time = 0

    def __del__(self):
        """Cleanup when the manager is destroyed."""
        self.close_connection()

    @property
    def client(self) -> QdrantClient:
        """Get the Qdrant client instance with connection management."""
        return self._get_qdrant_client()

    def _ensure_collection_exists(self) -> bool:
        """
        Ensure the collection exists with proper configuration.
        """
        try:
            client = self._get_qdrant_client()
            collections = client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            if self.collection_name in collection_names:
                collection_info = client.get_collection(self.collection_name)
                logger.info(f"📦 Collection '{self.collection_name}' exists with {collection_info.points_count} points")
                return True
            
            logger.info(f"📦 Creating new Qdrant collection '{self.collection_name}'")
            
            client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            
            logger.info(f"✅ Successfully created collection '{self.collection_name}'")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to ensure collection exists: {e}")
            return False

    def delete_collection(self) -> bool:
        """
        Delete the collection if it exists.
        """
        try:
            collections = self._get_qdrant_client().get_collections()
            collection_names = [c.name for c in collections.collections]
            if self.collection_name in collection_names:
                logger.info(f"🗑️ Deleting existing collection '{self.collection_name}'")
                self._get_qdrant_client().delete_collection(self.collection_name)
                logger.info(f"✅ Successfully deleted collection '{self.collection_name}'")
                return True
            else:
                logger.info(f"📦 Collection '{self.collection_name}' does not exist, nothing to delete")
                return True
        except Exception as e:
            logger.error(f"❌ Failed to delete collection: {e}")
            return False

    def recreate_collection(self) -> bool:
        """
        Delete and recreate the collection.
        """
        if self.delete_collection():
            return self.initialize_collection()
        return False

    def check_collection_has_documents(self, expected_doc_count: int) -> bool:
        """
        Check if the collection already has the expected number of documents.
        """
        try:
            collection_info = self._get_qdrant_client().get_collection(self.collection_name)
            existing_count = collection_info.points_count
            threshold = max(1, int(expected_doc_count * 0.8))
            if existing_count >= threshold:
                logger.info(f"✅ Collection '{self.collection_name}' has {existing_count} documents (expected: {expected_doc_count})")
                return True
            else:
                logger.info(f"📊 Collection '{self.collection_name}' has {existing_count} documents, need at least {threshold}")
                return False
        except Exception as e:
            logger.warning(f"⚠️ Could not check collection document count: {e}")
            return False

    def initialize_collection(self) -> bool:
        """
        Initialize the collection if it doesn't exist.
        """
        try:
            return self._ensure_collection_exists()
        except Exception as e:
            logger.error(f"❌ Failed to initialize collection: {e}")
            return False

    def get_collection_info(self):
        """
        Get collection information including points count.
        """
        try:
            return self._get_qdrant_client().get_collection(self.collection_name)
        except Exception as e:
            logger.error(f"❌ Failed to get collection info: {e}")
            raise
