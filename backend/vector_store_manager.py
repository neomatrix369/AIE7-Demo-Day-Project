# -*- coding: utf-8 -*-
import logging
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

# Set up logging
logger = logging.getLogger(__name__)

TEXT_EMBEDDINGS_MODEL = "text-embedding-3-small"
QDRANT_COLLECTION_NAME = "student_loan_corpus"

class VectorStoreManager:
    """Manages the vector store operations."""

    def __init__(self, qdrant_manager, data_manager):
        self.qdrant_manager = qdrant_manager
        self.data_manager = data_manager
        self.embedding = OpenAIEmbeddings(model=TEXT_EMBEDDINGS_MODEL)
        self._vector_store = None

    def get_vector_store(self, split_documents):
        """
        Create or connect to persistent Qdrant vector store.
        """
        logger.info("🗃️ Connecting to persistent Qdrant server")
        client = self.qdrant_manager.client
        vector_store = self._create_vector_store_instance(client)
        self._handle_document_addition(client, vector_store, split_documents)
        return vector_store

    def _create_vector_store_instance(self, client: QdrantClient) -> QdrantVectorStore:
        """
        Create a QdrantVectorStore instance.
        """
        return QdrantVectorStore(
            client=client,
            collection_name=self.qdrant_manager.collection_name,
            embedding=self.embedding,
        )

    def _check_existing_documents(self, client: QdrantClient, split_documents_count: int) -> bool:
        """
        Check if collection already has sufficient documents.
        """
        collection_info = client.get_collection(self.qdrant_manager.collection_name)
        existing_count = collection_info.points_count
        if existing_count > 0:
            logger.info(f"📚 Collection '{self.qdrant_manager.collection_name}' already contains {existing_count} documents")
            logger.info("🔄 Checking if we need to add new documents...")
            if existing_count >= split_documents_count:
                logger.info("✅ Collection appears to be fully populated, skipping document addition")
                return True
        return False

    def _add_documents_to_collection(self, client: QdrantClient, vector_store: QdrantVectorStore, 
                                   split_documents: List[Dict[str, Any]]) -> None:
        """
        Add documents to the Qdrant collection.
        """
        logger.info(f"⬆️ Adding {len(split_documents)} documents to Qdrant collection '{self.qdrant_manager.collection_name}'")
        vector_store.add_documents(documents=split_documents)
        updated_info = client.get_collection(self.qdrant_manager.collection_name)
        logger.info(f"✅ Qdrant vector store ready with {updated_info.points_count} total documents")

    def _handle_document_addition(self, client: QdrantClient, vector_store: QdrantVectorStore, 
                                split_documents: List[Dict[str, Any]]) -> None:
        """
        Handle the logic for adding documents to the collection if needed.
        """
        if not split_documents:
            logger.warning("⚠️ No documents provided to add to vector store")
            return
        if self._check_existing_documents(client, len(split_documents)):
            return
        self._add_documents_to_collection(client, vector_store, split_documents)

    def initialize_vector_store_if_needed(self, combined_docs: List[Dict[str, Any]]) -> None:
        """
        Initialize vector store if documents haven't been loaded yet.
        """
        try:
            chunks = self.data_manager.split_documents(combined_docs)
            expected_chunk_count = len(chunks)
            if self.qdrant_manager.check_collection_has_documents(expected_chunk_count):
                self._connect_to_existing_collection()
            else:
                self._load_documents_to_collection(chunks)
            logger.info("✅ Vector store initialized")
        except Exception as e:
            logger.error(f"❌ Error initializing vector store: {e}")

    def _connect_to_existing_collection(self) -> None:
        """
        Connect to existing Qdrant collection without adding documents.
        """
        logger.info("🚀 Collection already populated, skipping document loading")
        self._vector_store = QdrantVectorStore(
            client=self.qdrant_manager.client,
            collection_name=self.qdrant_manager.collection_name,
            embedding=self.embedding,
        )

    def _load_documents_to_collection(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Load documents into the Qdrant collection.
        """
        logger.info("📥 Loading documents into vector store")
        self._vector_store = self.get_vector_store(chunks)
