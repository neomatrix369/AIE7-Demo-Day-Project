# -*- coding: utf-8 -*-
import logging
from typing import List, Dict, Any

# Set up logging
logger = logging.getLogger(__name__)

class SearchManager:
    """Manages search operations."""

    def __init__(self, data_manager):
        self.data_manager = data_manager

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Simple keyword-based document search.
        """
        csv_docs = self.data_manager.load_csv_data()
        pdf_docs = self.data_manager.load_pdf_data()
        all_docs = csv_docs + pdf_docs
        
        if not all_docs:
            return []
        
        query_lower = query.lower()
        query_words = query_lower.split()
        
        results = []
        for doc in all_docs:
            content_lower = doc.page_content.lower()
            score = 0
            
            for word in query_words:
                score += content_lower.count(word)
            
            if query_lower in content_lower:
                score += 5
            
            if score > 0:
                results.append({
                    "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                    "score": score / max(1, len(query_words)),
                    "metadata": doc.metadata
                })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
