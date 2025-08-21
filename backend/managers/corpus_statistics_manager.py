# -*- coding: utf-8 -*-
import logging
from typing import List, Dict, Any

# Set up logging
logger = logging.getLogger(__name__)

TEXT_EMBEDDINGS_MODEL = "text-embedding-3-small"
TEXT_EMBEDDINGS_MODEL_PROVIDER = "OpenAI"

class CorpusStatisticsManager:
    """Manages the corpus statistics."""

    def __init__(self):
        self._corpus_stats_cache = None

    def get_corpus_stats(self, csv_docs: List[Dict[str, Any]], pdf_docs: List[Dict[str, Any]], combined_docs: List[Dict[str, Any]], qdrant_manager=None) -> Dict[str, Any]:
        """
        Generate corpus statistics with caching to avoid expensive recomputation.
        """
        if self._corpus_stats_cache is not None:
            logger.info("📋 Returning cached corpus statistics")
            return self._corpus_stats_cache

        logger.info("🧮 Computing corpus statistics for the first time")
        if not combined_docs:
            self._corpus_stats_cache = self._create_empty_corpus_stats()
            return self._corpus_stats_cache
        
        stats = self._calculate_corpus_statistics(csv_docs, pdf_docs, combined_docs, qdrant_manager)
        self._corpus_stats_cache = self._create_corpus_stats_response(stats, csv_docs, pdf_docs)
        return self._corpus_stats_cache

    def _create_empty_corpus_stats(self) -> Dict[str, Any]:
        """
        Create statistics response for empty corpus.
        """
        return {
            "corpus_loaded": False,
            "document_count": 0,
            "chunk_count": 0,
            "embedding_model": "none",
            "corpus_metadata": {
                "total_size_mb": 0.0,
                "document_types": {"pdf": 0, "csv": 0},
                "avg_doc_length": 0
            }
        }

    def _calculate_corpus_statistics(self, csv_docs: List[Dict[str, Any]], 
                                   pdf_docs: List[Dict[str, Any]], 
                                   combined_docs: List[Dict[str, Any]],
                                   qdrant_manager=None) -> Dict[str, Any]:
        """
        Calculate basic corpus statistics.
        """
        total_docs = len(combined_docs)
        total_content_length = sum(len(getattr(doc, 'page_content', '')) for doc in combined_docs)
        total_size_mb = total_content_length / (1024 * 1024)
        avg_doc_length = total_content_length // total_docs if total_docs > 0 else 0
        
        # Get actual chunk count from Qdrant if available, otherwise estimate
        if qdrant_manager and hasattr(qdrant_manager, 'get_collection_info'):
            try:
                actual_chunks = qdrant_manager.get_collection_info().points_count
                logger.info(f"📊 Stats computed: {total_docs} docs, {actual_chunks} actual chunks (from Qdrant)")
            except Exception as e:
                logger.warning(f"⚠️ Failed to get actual chunk count from Qdrant: {e}")
                actual_chunks = max(total_docs, total_content_length // 750)
                logger.info(f"📊 Stats computed: {total_docs} docs, {actual_chunks} estimated chunks")
        else:
            actual_chunks = max(total_docs, total_content_length // 750)
            logger.info(f"📊 Stats computed: {total_docs} docs, {actual_chunks} estimated chunks")
        
        return {
            "total_docs": total_docs,
            "total_content_length": total_content_length,
            "total_size_mb": total_size_mb,
            "avg_doc_length": avg_doc_length,
            "estimated_chunks": actual_chunks
        }

    def _create_corpus_stats_response(self, stats: Dict[str, Any], 
                                    csv_docs: List[Dict[str, Any]], 
                                    pdf_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create the final corpus statistics response.
        """
        return {
            "corpus_loaded": True,
            "document_count": stats["total_docs"],
            "chunk_count": stats["estimated_chunks"],
            "embedding_model": f"{TEXT_EMBEDDINGS_MODEL} ({TEXT_EMBEDDINGS_MODEL_PROVIDER})",
            "corpus_metadata": {
                "total_size_mb": round(stats["total_size_mb"], 2),
                "document_types": {"pdf": len(pdf_docs), "csv": len(csv_docs)},
                "avg_doc_length": stats["avg_doc_length"]
            }
        }
