# -*- coding: utf-8 -*-
import logging
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

# Set up logging
logger = logging.getLogger(__name__)

class SearchManager:
    """Manages search operations with vector search capabilities."""

    def __init__(self, data_manager, qdrant_manager=None):
        self.data_manager = data_manager
        self.qdrant_manager = qdrant_manager
        self.embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        self._vector_store = None

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

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search documents using vector similarity.
        """
        return self.vector_search(query, top_k)

    def vector_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search using Qdrant with chunk UUID capture.
        """
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
        results = self.search_documents(query, top_k * 2)  # Get more results to filter
        filtered_results = [r for r in results if r["similarity"] >= threshold]
        return filtered_results[:top_k]
