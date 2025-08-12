# -*- coding: utf-8 -*-
import os
import logging
from typing import List, Dict, Any
from logging_config import setup_logging
from qdrant_manager import QdrantManager
from data_manager import DataManager
from corpus_statistics_manager import CorpusStatisticsManager
from vector_store_manager import VectorStoreManager
from search_manager import SearchManager

# Set up logging
logger = setup_logging(__name__)

DEFAULT_FOLDER_LOCATION = "../data/"
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "student_loan_corpus")

class SimpleDocumentProcessor:
    """Orchestrator for document processing, quality assessment, and vector storage."""

    def __init__(self):
        self.data_folder = self._get_data_folder()
        self.qdrant_manager = QdrantManager(QDRANT_COLLECTION_NAME)
        self.data_manager = DataManager(self.data_folder)
        self.corpus_stats_manager = CorpusStatisticsManager()
        self.vector_store_manager = VectorStoreManager(self.qdrant_manager, self.data_manager)
        self.search_manager = SearchManager(self.data_manager)
        self._documents_loaded = False

    def _get_data_folder(self) -> str:
        """Get the data folder path."""
        data_folder = os.getenv("DATA_FOLDER")
        if not data_folder or not os.path.exists(data_folder):
            data_folder = os.path.join(os.path.dirname(__file__), "..", "data")
        logger.info(f"📁 Data folder: {data_folder}")
        return data_folder

    def get_corpus_stats(self) -> Dict[str, Any]:
        """
        Generate and return corpus statistics.
        """
        csv_docs = self.data_manager.load_csv_data()
        pdf_docs = self.data_manager.load_pdf_data()
        combined_docs = csv_docs + pdf_docs

        if not self._documents_loaded:
            self.vector_store_manager.initialize_vector_store_if_needed(combined_docs)
            self._documents_loaded = True

        return self.corpus_stats_manager.get_corpus_stats(csv_docs, pdf_docs, combined_docs)

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents based on a query.
        """
        return self.search_manager.search_documents(query, top_k)
