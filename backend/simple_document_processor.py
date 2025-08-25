# -*- coding: utf-8 -*-
import os
import logging
from typing import List, Dict, Any
from logging_config import setup_logging
from managers.qdrant_manager import QdrantManager
from managers.data_manager import DataManager
from managers.corpus_statistics_manager import CorpusStatisticsManager
from managers.vector_store_manager import VectorStoreManager
from managers.search_manager import SearchManager

# Set up logging
logger = setup_logging(__name__)

DEFAULT_FOLDER_LOCATION = "./data/"
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "student_loan_corpus")

class SimpleDocumentProcessor:
    """Orchestrator for document processing, quality assessment, and vector storage."""

    def __init__(self):
        self.data_folder = self._get_data_folder()
        self.qdrant_manager = QdrantManager(QDRANT_COLLECTION_NAME)
        self.data_manager = DataManager(self.data_folder)
        self.corpus_stats_manager = CorpusStatisticsManager()
        self.vector_store_manager = VectorStoreManager(self.qdrant_manager, self.data_manager)
        self.search_manager = SearchManager(self.data_manager, self.qdrant_manager)
        self._documents_loaded = False

    def _get_data_folder(self) -> str:
        """Get the data folder path from environment variable."""
        data_folder = os.getenv("DATA_FOLDER", "./data/")
        logger.info(f"📁 Data folder: {data_folder}")
        return data_folder

    def get_corpus_stats(self) -> Dict[str, Any]:
        """
        Generate and return corpus statistics.
        Optimized to avoid unnecessary document reloading when vector store is already populated.
        """
        # First check if we have cached stats and vector store has data
        if (self.corpus_stats_manager._corpus_stats_cache is not None and 
            self._documents_loaded and 
            self._has_vector_store_data()):
            logger.info("📋 Returning cached corpus statistics (vector store already populated)")
            return self.corpus_stats_manager._corpus_stats_cache
        
        # Only load documents if we need to compute stats or initialize vector store
        combined_docs = self.data_manager.load_all_documents()
        
        # Separate by type for stats
        csv_docs = [doc for doc in combined_docs if doc.metadata.get('source', '').endswith('.csv')]
        pdf_docs = [doc for doc in combined_docs if doc.metadata.get('source', '').endswith('.pdf')]

        if not self._documents_loaded:
            self.vector_store_manager.initialize_vector_store_if_needed(combined_docs)
            self._documents_loaded = True

        return self.corpus_stats_manager.get_corpus_stats(csv_docs, pdf_docs, combined_docs, self.qdrant_manager)
    
    def _has_vector_store_data(self) -> bool:
        """Check if the vector store has data without expensive operations."""
        try:
            collection_info = self.qdrant_manager.client.get_collection(self.qdrant_manager.collection_name)
            points_count = collection_info.points_count
            logger.debug(f"📊 Vector store has {points_count} points")
            return points_count > 0
        except Exception as e:
            logger.debug(f"Could not check vector store: {e}")
            return False

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents based on a query.
        """
        return self.search_manager.search_documents(query, top_k)
