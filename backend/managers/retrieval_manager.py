# -*- coding: utf-8 -*-
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RetrievalMethodManager:
    def __init__(self, method, search_manager):
        self.method = method
        self.search_manager = search_manager

    def search(self, query: str, top_k: int = 5, threshold: float = 0.5) -> List[Dict[str, Any]]:
        logger.info(f"🔍 Performing search with method: {self.method}")
        if self.method == "naive":
            return self._naive_search_with_threshold(query, top_k, threshold)
        else:
            logger.warning(f"⚠️ Unknown retrieval method '{self.method}'. Defaulting to 'naive'.")
            return self._naive_search_with_threshold(query, top_k, threshold)

    def _naive_search_with_threshold(self, query: str, top_k: int = 5, threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Search documents and filter by similarity threshold.
        """
        results = self.search_manager.search_documents(query, top_k * 2)  # Get more results to filter
        filtered_results = [r for r in results if r["similarity"] >= threshold]
        return filtered_results[:top_k]
