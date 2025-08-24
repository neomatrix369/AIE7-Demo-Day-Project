# -*- coding: utf-8 -*-
"""
Enhanced RAG Manager for Improved Retrieval Accuracy

This module provides enhanced retrieval capabilities with:
- Hybrid search (vector + keyword)
- Reranking for better relevance
- Query expansion for improved recall
- Adaptive retrieval strategies
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from langchain_openai import OpenAIEmbeddings
from sklearn.metrics.pairwise import cosine_similarity
import re

logger = logging.getLogger(__name__)

class EnhancedRAGManager:
    """Manager for enhanced RAG retrieval with improved accuracy."""
    
    def __init__(self, search_manager, embedding_model: str = "text-embedding-3-small"):
        self.search_manager = search_manager
        self.embedding = OpenAIEmbeddings(model=embedding_model)
        
        # Configuration for enhanced retrieval
        self.config = {
            'use_query_expansion': True,
            'use_reranking': True,
            'use_hybrid_search': True,
            'expansion_terms': 3,
            'rerank_top_n': 10,
            'min_similarity_threshold': 0.3,
            'boost_exact_match': 1.5,
            'boost_partial_match': 1.2,
            'semantic_weight': 0.7,
            'keyword_weight': 0.3
        }
        
    def enhanced_retrieve(self, query: str, top_k: int = 5) -> Tuple[List[Dict[str, Any]], float]:
        """
        Perform enhanced retrieval with multiple strategies.
        
        Returns:
            Tuple of (retrieved_documents, average_score)
        """
        try:
            # Step 1: Query expansion
            expanded_queries = self._expand_query(query) if self.config['use_query_expansion'] else [query]
            
            # Step 2: Retrieve candidates using multiple queries
            all_candidates = []
            seen_ids = set()
            
            for exp_query in expanded_queries:
                # Get more candidates for reranking
                candidates = self.search_manager.vector_search(
                    exp_query, 
                    top_k=self.config['rerank_top_n'] if self.config['use_reranking'] else top_k
                )
                
                for candidate in candidates:
                    doc_id = candidate.get('chunk_id', candidate.get('doc_id'))
                    if doc_id not in seen_ids:
                        seen_ids.add(doc_id)
                        all_candidates.append(candidate)
            
            # Step 3: Apply hybrid scoring if enabled
            if self.config['use_hybrid_search']:
                all_candidates = self._apply_hybrid_scoring(query, all_candidates)
            
            # Step 4: Rerank candidates if enabled
            if self.config['use_reranking'] and len(all_candidates) > top_k:
                all_candidates = self._rerank_documents(query, all_candidates)
            
            # Step 5: Filter by threshold and select top-k
            filtered_candidates = [
                doc for doc in all_candidates 
                if doc.get('similarity', 0) >= self.config['min_similarity_threshold']
            ]
            
            # Select top-k documents
            final_documents = filtered_candidates[:top_k]
            
            # Calculate average similarity score
            avg_score = 0.0
            if final_documents:
                avg_score = sum(doc.get('similarity', 0) for doc in final_documents) / len(final_documents)
            
            logger.info(f"🎯 Enhanced retrieval: {len(final_documents)} docs, avg score: {avg_score:.3f}")
            
            return final_documents, avg_score
            
        except Exception as e:
            logger.error(f"❌ Enhanced retrieval failed: {e}")
            # Fallback to standard retrieval
            return self.search_manager.vector_search(query, top_k), 0.0
    
    def _expand_query(self, query: str) -> List[str]:
        """
        Expand query with related terms and variations.
        """
        expanded = [query]  # Always include original
        
        # Extract key concepts from query
        query_lower = query.lower()
        
        # AI model specific expansions
        ai_model_expansions = {
            'gpt': ['gpt-5', 'gpt-4', 'openai', 'chatgpt'],
            'claude': ['claude 3', 'claude opus', 'anthropic', 'constitutional ai'],
            'gemini': ['google gemini', 'gemini pro', 'bard'],
            'llama': ['meta llama', 'llama 3', 'open source'],
            'benchmark': ['performance', 'evaluation', 'score', 'metrics'],
            'reasoning': ['logic', 'problem solving', 'thinking', 'analysis'],
            'multimodal': ['vision', 'image', 'audio', 'multi-modal'],
            'context': ['context window', 'token limit', 'context length'],
            'safety': ['alignment', 'safety measures', 'responsible ai', 'ethics'],
            'deployment': ['hosting', 'serving', 'inference', 'production'],
            'cost': ['pricing', 'cost-effective', 'efficiency', 'budget'],
            'api': ['api access', 'integration', 'endpoint', 'interface']
        }
        
        # Check for concept matches and add expansions
        for concept, terms in ai_model_expansions.items():
            if concept in query_lower:
                # Add a variation with the first expansion term
                if terms:
                    expanded_query = query.replace(concept, terms[0])
                    if expanded_query != query:
                        expanded.append(expanded_query)
                        break  # Limit expansions
        
        # Add question variations for common patterns
        if query.startswith("What"):
            expanded.append(query.replace("What", "Which", 1))
        elif query.startswith("How"):
            expanded.append(query.replace("How", "What", 1))
        
        return expanded[:self.config['expansion_terms']]
    
    def _apply_hybrid_scoring(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply hybrid scoring combining semantic and keyword matching.
        """
        query_lower = query.lower()
        query_terms = set(re.findall(r'\b\w+\b', query_lower))
        
        for doc in documents:
            semantic_score = doc.get('similarity', 0)
            content = doc.get('content', '').lower()
            title = doc.get('title', '').lower()
            
            # Calculate keyword matching score
            content_terms = set(re.findall(r'\b\w+\b', content))
            title_terms = set(re.findall(r'\b\w+\b', title))
            
            # Check for exact phrase matches
            exact_match_boost = 0
            if query_lower in content or query_lower in title:
                exact_match_boost = self.config['boost_exact_match']
            
            # Calculate term overlap
            content_overlap = len(query_terms & content_terms) / max(len(query_terms), 1)
            title_overlap = len(query_terms & title_terms) / max(len(query_terms), 1)
            keyword_score = max(content_overlap, title_overlap * 1.5)  # Title matches are more important
            
            # Apply partial match boost for important terms
            important_terms = self._extract_important_terms(query)
            partial_match_boost = 0
            for term in important_terms:
                if term in content or term in title:
                    partial_match_boost = self.config['boost_partial_match']
                    break
            
            # Combine scores with weights
            hybrid_score = (
                self.config['semantic_weight'] * semantic_score +
                self.config['keyword_weight'] * keyword_score
            )
            
            # Apply boosts
            if exact_match_boost > 0:
                hybrid_score *= exact_match_boost
            elif partial_match_boost > 0:
                hybrid_score *= partial_match_boost
            
            # Update document score
            doc['similarity'] = min(1.0, hybrid_score)  # Cap at 1.0
            doc['scoring_method'] = 'hybrid'
        
        # Re-sort by new hybrid scores
        documents.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        
        return documents
    
    def _rerank_documents(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rerank documents using cross-encoder style scoring.
        """
        try:
            # Get query embedding
            query_embedding = self.embedding.embed_query(query)
            
            # Calculate refined similarity scores
            for doc in documents:
                content = doc.get('content', '')
                
                # Get content embedding (in production, these would be cached)
                content_embedding = self.embedding.embed_query(content[:500])  # Limit content length
                
                # Calculate cosine similarity
                similarity = cosine_similarity(
                    [query_embedding], 
                    [content_embedding]
                )[0][0]
                
                # Apply length penalty for very short or very long content
                content_length = len(content)
                length_penalty = 1.0
                if content_length < 50:
                    length_penalty = 0.8  # Penalize very short content
                elif content_length > 1000:
                    length_penalty = 0.9  # Slight penalty for very long content
                
                # Apply relevance boosting based on metadata
                relevance_boost = 1.0
                metadata = doc.get('metadata', {})
                
                # Boost documents with relevant metadata
                if 'model' in metadata or 'benchmark' in metadata:
                    relevance_boost = 1.1
                
                # Calculate final reranked score
                reranked_score = similarity * length_penalty * relevance_boost
                
                # Blend with original score (to maintain some of the original ranking)
                original_score = doc.get('similarity', 0)
                doc['similarity'] = 0.7 * reranked_score + 0.3 * original_score
                doc['reranked'] = True
            
            # Re-sort by reranked scores
            documents.sort(key=lambda x: x.get('similarity', 0), reverse=True)
            
            logger.info(f"🔄 Reranked {len(documents)} documents")
            
        except Exception as e:
            logger.warning(f"⚠️ Reranking failed, using original scores: {e}")
        
        return documents
    
    def _extract_important_terms(self, query: str) -> List[str]:
        """
        Extract important terms from query for boosting.
        """
        # AI model names and important concepts
        important_patterns = [
            r'\bgpt-?\d+\b', r'\bclaude\b', r'\bgemini\b', r'\bllama\b',
            r'\bbenchmark\b', r'\bperformance\b', r'\bsafety\b',
            r'\bmultimodal\b', r'\breasoning\b', r'\bcontext\b',
            r'\bapi\b', r'\bcost\b', r'\bdeployment\b'
        ]
        
        important_terms = []
        query_lower = query.lower()
        
        for pattern in important_patterns:
            matches = re.findall(pattern, query_lower)
            important_terms.extend(matches)
        
        return list(set(important_terms))  # Remove duplicates
    
    def analyze_retrieval_quality(self, query: str, retrieved_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze the quality of retrieval for diagnostics.
        """
        if not retrieved_docs:
            return {
                'quality': 'poor',
                'issues': ['No documents retrieved'],
                'suggestions': ['Expand corpus', 'Lower similarity threshold']
            }
        
        avg_score = sum(doc.get('similarity', 0) for doc in retrieved_docs) / len(retrieved_docs)
        
        quality = 'good' if avg_score >= 0.7 else 'moderate' if avg_score >= 0.5 else 'poor'
        
        issues = []
        suggestions = []
        
        if avg_score < 0.5:
            issues.append('Low average similarity scores')
            suggestions.append('Consider query expansion or corpus enhancement')
        
        if len(retrieved_docs) < 3:
            issues.append('Few relevant documents found')
            suggestions.append('Add more content on this topic')
        
        # Check diversity of sources
        unique_sources = len(set(doc.get('doc_id', '') for doc in retrieved_docs))
        if unique_sources == 1 and len(retrieved_docs) > 1:
            issues.append('All results from same document')
            suggestions.append('Improve content distribution across documents')
        
        return {
            'quality': quality,
            'avg_score': round(avg_score, 3),
            'num_docs': len(retrieved_docs),
            'unique_sources': unique_sources,
            'issues': issues,
            'suggestions': suggestions
        }
    
    def update_config(self, **kwargs):
        """
        Update configuration parameters.
        """
        self.config.update(kwargs)
        logger.info(f"📝 Updated RAG config: {kwargs}")