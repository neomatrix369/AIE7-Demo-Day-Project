# -*- coding: utf-8 -*-
import logging
import hashlib
import time
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from managers.retrieval_manager import RetrievalMethodManager
from config.settings import RETRIEVAL_METHOD

# Set up logging
logger = logging.getLogger(__name__)

class SearchManager:
    """Manages search operations with vector search capabilities and caching."""

    def __init__(self, data_manager, qdrant_manager=None):
        self.data_manager = data_manager
        self.qdrant_manager = qdrant_manager
        self.embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        self._vector_store = None
        
        # Search result cache with TTL
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes TTL
        self._max_cache_size = 100

    def get_vector_store(self):
        """Get or create vector store instance."""
        if self._vector_store is None and self.qdrant_manager:
            try:
                self._vector_store = QdrantVectorStore(
                    client=self.qdrant_manager.client,
                    collection_name=self.qdrant_manager.collection_name,
                    embedding=self.embedding,
                )
                logger.info("✅ Connected to Qdrant vector store")
            except Exception as e:
                logger.error(f"❌ Failed to connect to vector store: {e}")
                self._vector_store = None
        return self._vector_store

    def _get_cache_key(self, query: str, top_k: int) -> str:
        """Generate cache key for search query."""
        return hashlib.md5(f"{query}_{top_k}".encode()).hexdigest()

    def _is_cache_valid(self, timestamp: float) -> bool:
        """Check if cache entry is still valid."""
        return time.time() - timestamp < self._cache_ttl

    def _cleanup_cache(self):
        """Remove expired entries and enforce size limits."""
        current_time = time.time()
        
        # Remove expired entries
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if current_time - timestamp >= self._cache_ttl
        ]
        for key in expired_keys:
            del self._cache[key]
        
        # Enforce size limit by removing oldest entries
        if len(self._cache) > self._max_cache_size:
            sorted_items = sorted(
                self._cache.items(),
                key=lambda x: x[1][1]  # Sort by timestamp
            )
            
            # Remove oldest entries
            excess_count = len(self._cache) - self._max_cache_size
            for key, _ in sorted_items[:excess_count]:
                del self._cache[key]

    def _get_cached_result(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached search result if valid."""
        if cache_key in self._cache:
            result, timestamp = self._cache[cache_key]
            if self._is_cache_valid(timestamp):
                logger.info(f"🚀 Using cached search result for query hash: {cache_key[:8]}...")
                return result
            else:
                # Remove expired entry
                del self._cache[cache_key]
        return None

    def _cache_result(self, cache_key: str, result: List[Dict[str, Any]]):
        """Cache search result with timestamp."""
        self._cleanup_cache()
        self._cache[cache_key] = (result, time.time())
        logger.info(f"💾 Cached search result for query hash: {cache_key[:8]}...")

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search documents using vector similarity.
        """
        return self.vector_search(query, top_k)

    def vector_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search using Qdrant with chunk UUID capture and caching.
        """
        # Check cache first
        cache_key = self._get_cache_key(query, top_k)
        cached_result = self._get_cached_result(cache_key)
        if cached_result is not None:
            return cached_result
            
        try:
            vector_store = self.get_vector_store()
            if not vector_store:
                logger.warning("⚠️ Vector store not available for search")
                return []
            
            logger.info(f"🔍 Performing vector search for: {query[:100]}...")
            
            # Perform similarity search with LangChain
            docs_and_scores = vector_store.similarity_search_with_score(query, k=top_k)
            
            # Also get raw Qdrant results to capture chunk UUIDs
            raw_qdrant_results = self._get_raw_qdrant_results(query, top_k)
            
            results = []
            for i, (doc, score) in enumerate(docs_and_scores):
                # Try to match with raw Qdrant result to get chunk UUID
                chunk_id = "unknown"
                if i < len(raw_qdrant_results):
                    chunk_id = str(raw_qdrant_results[i].id)
                
                results.append({
                    "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                    "similarity": round(score, 3),
                    "metadata": doc.metadata,
                    "doc_id": doc.metadata.get("source", "unknown"),
                    "chunk_id": chunk_id,
                    "title": doc.metadata.get("title", "Document")
                })
            
            logger.info(f"📚 Vector search found {len(results)} results with chunk IDs")
            
            # Cache the results before returning
            self._cache_result(cache_key, results)
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Vector search failed: {e}")
            return []

    def _get_raw_qdrant_results(self, query: str, top_k: int = 5) -> List[Any]:
        """
        Get raw Qdrant search results to capture chunk UUIDs.
        """
        try:
            if not self.qdrant_manager:
                return []
            
            # Get query embedding
            query_vector = self.embedding.embed_query(query)
            
            # Direct Qdrant search to get UUIDs
            from qdrant_client.http.models import SearchRequest
            search_result = self.qdrant_manager.client.search(
                collection_name=self.qdrant_manager.collection_name,
                query_vector=query_vector,
                limit=top_k,
                with_payload=False,  # We don't need payload, just IDs
                with_vectors=False   # We don't need vectors either
            )
            
            return search_result
            
        except Exception as e:
            logger.warning(f"⚠️ Could not get raw Qdrant results for chunk IDs: {e}")
            return []

    def search_with_similarity_threshold(self, query: str, top_k: int = 5, threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Search documents and filter by similarity threshold.
        """
        retrieval_manager = RetrievalMethodManager(
            method=list(RETRIEVAL_METHOD.keys())[0],
            search_manager=self
        )
        return retrieval_manager.search(query, top_k, threshold)

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring and debugging."""
        current_time = time.time()
        valid_entries = sum(
            1 for _, timestamp in self._cache.values()
            if self._is_cache_valid(timestamp)
        )
        
        return {
            "total_entries": len(self._cache),
            "valid_entries": valid_entries,
            "expired_entries": len(self._cache) - valid_entries,
            "cache_size_limit": self._max_cache_size,
            "cache_ttl_seconds": self._cache_ttl,
            "cache_usage_percent": round((len(self._cache) / self._max_cache_size) * 100, 1)
        }

    def clear_cache(self):
        """Clear all cached search results."""
        self._cache.clear()
        logger.info("🗑️ Search cache cleared")
