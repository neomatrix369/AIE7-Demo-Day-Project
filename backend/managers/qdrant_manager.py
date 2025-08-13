# -*- coding: utf-8 -*-
import os
import logging
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams

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
        self.client = self._get_qdrant_client()
        self._ensure_collection_exists()

    def _get_qdrant_client(self) -> QdrantClient:
        """
        Create and return a Qdrant client instance.
        """
        logger.info(f"🔗 Connecting to Qdrant server at {QDRANT_URL}")
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
        try:
            collections = client.get_collections()
            logger.info("✅ Successfully connected to Qdrant server")
            logger.info(f"📊 Found {len(collections.collections)} existing collections")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Qdrant server: {e}")
            raise
        return client

    def _ensure_collection_exists(self) -> bool:
        """
        Ensure the collection exists, create it if it doesn't.
        """
        try:
            collections = self.client.get_collections()
            collection_names = [c.name for c in collections.collections]
            if self.collection_name in collection_names:
                collection_info = self.client.get_collection(self.collection_name)
                logger.info(f"📦 Collection '{self.collection_name}' exists with {collection_info.points_count} points")
                return True
            
            logger.info(f"📦 Creating new Qdrant collection '{self.collection_name}'")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            logger.info(f"✅ Successfully created collection '{self.collection_name}'")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to ensure collection exists: {e}")
            return False

    def check_collection_has_documents(self, expected_doc_count: int) -> bool:
        """
        Check if the collection already has the expected number of documents.
        """
        try:
            collection_info = self.client.get_collection(self.collection_name)
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
