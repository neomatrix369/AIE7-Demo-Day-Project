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
        """
        csv_docs = self.data_manager.load_csv_data()
        pdf_docs = self.data_manager.load_pdf_data()
        combined_docs = csv_docs + pdf_docs

        if not self._documents_loaded:
            self.vector_store_manager.initialize_vector_store_if_needed(combined_docs)
            self._documents_loaded = True

        return self.corpus_stats_manager.get_corpus_stats(csv_docs, pdf_docs, combined_docs, self.qdrant_manager)

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for documents based on a query.
        """
        return self.search_manager.search_documents(query, top_k)
