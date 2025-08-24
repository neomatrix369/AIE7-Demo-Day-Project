# -*- coding: utf-8 -*-
"""
Advanced RAG v2 - Next-Generation Retrieval with Semantic Understanding

This module provides state-of-the-art retrieval capabilities with:
- Contextual query understanding
- Multi-stage retrieval pipeline
- Semantic chunking awareness
- Query decomposition and reconstruction
- Advanced relevance scoring with learned weights
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from langchain_openai import OpenAIEmbeddings
from sklearn.metrics.pairwise import cosine_similarity
import re
import json
from collections import defaultdict

logger = logging.getLogger(__name__)

class AdvancedRAGv2:
    """Advanced RAG v2 with state-of-the-art retrieval techniques."""
    
    def __init__(self, search_manager, embedding_model: str = "text-embedding-3-small"):
        self.search_manager = search_manager
        self.embedding = OpenAIEmbeddings(model=embedding_model)
        
        # Advanced configuration
        self.config = {
            'use_semantic_decomposition': True,
            'use_contextual_expansion': True,
            'use_multi_stage_retrieval': True,
            'use_answer_aware_reranking': True,
            'semantic_weight': 0.6,
            'keyword_weight': 0.2,
            'structural_weight': 0.2,
            'stages': 3,
            'candidates_per_stage': [20, 10, 5],
            'min_confidence': 0.4,
            'enable_query_understanding': True
        }
        
        # Query type patterns for better understanding
        self.query_patterns = {
            'comparison': r'(compare|versus|vs|better|worse|difference|between)',
            'specification': r'(spec|specification|requirement|memory|gpu|hardware|compute)',
            'performance': r'(performance|benchmark|score|evaluation|result|accuracy)',
            'capability': r'(can|able|capability|support|feature|function)',
            'implementation': r'(how|implement|use|deploy|run|setup|configure)',
            'cost': r'(cost|price|pricing|expensive|cheap|budget|free)',
            'safety': r'(safety|safe|alignment|harm|risk|secure|ethical)',
            'technical': r'(architecture|model|parameter|layer|attention|transformer)',
            'licensing': r'(license|open source|commercial|apache|mit|gpl|proprietary)'
        }
        
        # Model-specific knowledge base for better expansion
        self.model_knowledge = {
            'gpt-5': {
                'aliases': ['gpt5', 'gpt 5', 'openai gpt-5'],
                'company': 'openai',
                'type': 'proprietary',
                'related_terms': ['chatgpt', 'gpt-4', 'transformer', 'llm'],
                'key_features': ['reasoning', 'coding', 'multimodal']
            },
            'claude': {
                'aliases': ['claude 3', 'claude-3', 'opus', 'sonnet', 'haiku'],
                'company': 'anthropic',
                'type': 'proprietary',
                'related_terms': ['constitutional ai', 'helpful harmless honest'],
                'key_features': ['safety', 'long context', 'reasoning']
            },
            'gemini': {
                'aliases': ['bard', 'google gemini', 'gemini pro', 'gemini ultra'],
                'company': 'google',
                'type': 'proprietary',
                'related_terms': ['palm', 'lamda', 'google ai'],
                'key_features': ['multimodal', 'long context', 'reasoning']
            },
            'llama': {
                'aliases': ['llama3', 'llama 3', 'meta llama'],
                'company': 'meta',
                'type': 'open source',
                'related_terms': ['facebook', 'open source', 'community'],
                'key_features': ['open source', 'fine-tunable', 'efficient']
            },
            'gpt-oss': {
                'aliases': ['gptoss', 'gpt oss', 'open source gpt'],
                'company': 'open source',
                'type': 'open source',
                'related_terms': ['apache', 'community', 'free'],
                'key_features': ['open source', 'transparent', 'customizable']
            }
        }
    
    def advanced_retrieve(self, query: str, top_k: int = 5) -> Tuple[List[Dict[str, Any]], float, Dict[str, Any]]:
        """
        Perform advanced multi-stage retrieval with detailed diagnostics.
        
        Returns:
            Tuple of (retrieved_documents, average_score, diagnostics)
        """
        diagnostics = {
            'original_query': query,
            'query_type': self._identify_query_type(query),
            'stages': []
        }
        
        try:
            # Stage 1: Query Understanding and Decomposition
            if self.config['use_semantic_decomposition']:
                sub_queries = self._decompose_query(query)
                diagnostics['sub_queries'] = sub_queries
            else:
                sub_queries = [query]
            
            # Stage 2: Contextual Expansion
            if self.config['use_contextual_expansion']:
                expanded_queries = []
                for sub_q in sub_queries:
                    expanded = self._contextual_expansion(sub_q, diagnostics['query_type'])
                    expanded_queries.extend(expanded)
                diagnostics['expanded_queries'] = expanded_queries
            else:
                expanded_queries = sub_queries
            
            # Stage 3: Multi-Stage Retrieval
            if self.config['use_multi_stage_retrieval']:
                candidates = self._multi_stage_retrieval(expanded_queries, diagnostics)
            else:
                # Fallback to single-stage
                candidates = []
                for eq in expanded_queries[:3]:  # Limit to prevent too many searches
                    results = self.search_manager.vector_search(eq, top_k=20)
                    candidates.extend(results)
            
            # Stage 4: Advanced Scoring and Reranking
            if self.config['use_answer_aware_reranking']:
                final_results = self._answer_aware_reranking(query, candidates, top_k, diagnostics)
            else:
                final_results = self._basic_reranking(query, candidates, top_k)
            
            # Calculate average score
            avg_score = 0.0
            if final_results:
                avg_score = sum(doc.get('final_score', doc.get('similarity', 0)) for doc in final_results) / len(final_results)
            
            diagnostics['final_avg_score'] = avg_score
            diagnostics['documents_retrieved'] = len(final_results)
            
            logger.info(f"🚀 Advanced RAG v2: Retrieved {len(final_results)} docs, avg score: {avg_score:.3f}")
            
            return final_results, avg_score, diagnostics
            
        except Exception as e:
            logger.error(f"❌ Advanced retrieval failed: {e}")
            # Fallback to standard retrieval
            results = self.search_manager.vector_search(query, top_k)
            return results, 0.0, {'error': str(e)}
    
    def _identify_query_type(self, query: str) -> str:
        """Identify the type of query for better handling."""
        query_lower = query.lower()
        
        for qtype, pattern in self.query_patterns.items():
            if re.search(pattern, query_lower):
                return qtype
        
        return 'general'
    
    def _decompose_query(self, query: str) -> List[str]:
        """Decompose complex queries into sub-queries."""
        sub_queries = [query]  # Always include original
        
        # Handle comparison queries
        if 'compare' in query.lower() or 'vs' in query.lower() or 'versus' in query.lower():
            # Extract entities being compared
            models = self._extract_model_names(query)
            if len(models) >= 2:
                # Create individual queries for each model
                for model in models:
                    sub_queries.append(f"{model} performance benchmarks")
                    sub_queries.append(f"{model} capabilities features")
        
        # Handle multi-aspect queries
        aspects = ['performance', 'cost', 'capabilities', 'requirements', 'safety']
        aspect_count = sum(1 for aspect in aspects if aspect in query.lower())
        if aspect_count >= 2:
            # Split into aspect-specific queries
            for aspect in aspects:
                if aspect in query.lower():
                    base_query = re.sub(r'\b(and|or|with|plus)\b', '', query)
                    sub_queries.append(f"{base_query} {aspect}")
        
        # Handle question chains (questions with "and", "or")
        if ' and ' in query.lower() or ' or ' in query.lower():
            parts = re.split(r'\s+(?:and|or)\s+', query.lower())
            if len(parts) > 1:
                # Keep the main subject and vary the predicates
                main_subject = self._extract_main_subject(query)
                for part in parts:
                    if main_subject and main_subject not in part:
                        sub_queries.append(f"{main_subject} {part}")
        
        return list(set(sub_queries))[:5]  # Limit to 5 unique sub-queries
    
    def _contextual_expansion(self, query: str, query_type: str) -> List[str]:
        """Expand query with contextual understanding."""
        expanded = [query]
        query_lower = query.lower()
        
        # Model-specific expansion
        for model_name, info in self.model_knowledge.items():
            if model_name in query_lower or any(alias in query_lower for alias in info['aliases']):
                # Add company context
                expanded.append(query.replace(model_name, f"{info['company']} {model_name}"))
                
                # Add type context for relevant queries
                if query_type in ['licensing', 'cost', 'implementation']:
                    expanded.append(f"{query} {info['type']}")
                
                # Add related model context for comparisons
                if query_type == 'comparison' and info['related_terms']:
                    for related in info['related_terms'][:2]:
                        expanded.append(f"{query} {related}")
                
                # Add feature context
                if query_type in ['capability', 'performance'] and info['key_features']:
                    for feature in info['key_features'][:2]:
                        expanded.append(f"{model_name} {feature}")
        
        # Query-type specific expansions
        if query_type == 'performance':
            # Add benchmark-specific expansions
            benchmarks = ['mmlu', 'humaneval', 'gpqa', 'aime', 'math']
            for benchmark in benchmarks:
                if benchmark in query_lower:
                    expanded.append(query.replace(benchmark, f"{benchmark} benchmark score"))
        
        elif query_type == 'specification':
            # Add technical detail expansions
            specs = ['memory', 'vram', 'gpu', 'cpu', 'ram', 'parameters', 'context']
            for spec in specs:
                if spec in query_lower:
                    expanded.append(f"{query} requirements specifications")
        
        elif query_type == 'comparison':
            # Add comparative terms
            expanded.append(query.replace('compare', 'comparison between'))
            expanded.append(query.replace('vs', 'versus'))
            expanded.append(query + " differences similarities")
        
        return list(set(expanded))[:5]  # Limit expansion
    
    def _multi_stage_retrieval(self, queries: List[str], diagnostics: Dict) -> List[Dict[str, Any]]:
        """Perform multi-stage retrieval with progressive refinement."""
        all_candidates = []
        seen_ids = set()
        
        for stage in range(self.config['stages']):
            stage_candidates = []
            candidates_needed = self.config['candidates_per_stage'][min(stage, len(self.config['candidates_per_stage'])-1)]
            
            # Use different queries for different stages
            stage_queries = queries[stage:stage+2] if stage < len(queries) else queries[-2:]
            
            for sq in stage_queries:
                results = self.search_manager.vector_search(sq, top_k=candidates_needed)
                
                for result in results:
                    doc_id = result.get('chunk_id', result.get('doc_id'))
                    if doc_id not in seen_ids:
                        seen_ids.add(doc_id)
                        result['retrieval_stage'] = stage + 1
                        result['retrieval_query'] = sq[:50] + '...' if len(sq) > 50 else sq
                        stage_candidates.append(result)
            
            # Apply stage-specific filtering
            if stage > 0:
                # Progressive filtering - be more selective in later stages
                min_score = 0.4 + (stage * 0.1)
                stage_candidates = [c for c in stage_candidates if c.get('similarity', 0) >= min_score]
            
            all_candidates.extend(stage_candidates)
            
            diagnostics['stages'].append({
                'stage': stage + 1,
                'candidates_retrieved': len(stage_candidates),
                'min_score': min(c.get('similarity', 0) for c in stage_candidates) if stage_candidates else 0
            })
        
        return all_candidates
    
    def _answer_aware_reranking(self, query: str, candidates: List[Dict[str, Any]], 
                                top_k: int, diagnostics: Dict) -> List[Dict[str, Any]]:
        """Advanced reranking considering answer likelihood."""
        if not candidates:
            return []
        
        query_type = diagnostics.get('query_type', 'general')
        query_lower = query.lower()
        
        for doc in candidates:
            content = doc.get('content', '').lower()
            title = doc.get('title', '').lower()
            
            # Base semantic score
            semantic_score = doc.get('similarity', 0)
            
            # Keyword matching score
            query_terms = set(re.findall(r'\b\w+\b', query_lower))
            content_terms = set(re.findall(r'\b\w+\b', content))
            keyword_score = len(query_terms & content_terms) / max(len(query_terms), 1)
            
            # Structural relevance score
            structural_score = 0.0
            
            # Check for answer patterns based on query type
            if query_type == 'performance':
                # Look for numbers, percentages, scores
                if re.search(r'\d+\.?\d*%|\d+/\d+|score.*\d+|accuracy.*\d+', content):
                    structural_score += 0.3
                # Look for benchmark names
                if any(bench in content for bench in ['mmlu', 'humaneval', 'gpqa', 'benchmark']):
                    structural_score += 0.2
            
            elif query_type == 'comparison':
                # Look for comparative language
                if any(word in content for word in ['better', 'worse', 'higher', 'lower', 'compared', 'versus']):
                    structural_score += 0.3
                # Check if both compared entities are mentioned
                models = self._extract_model_names(query)
                if len(models) >= 2:
                    models_found = sum(1 for model in models if model.lower() in content)
                    structural_score += (models_found / len(models)) * 0.3
            
            elif query_type == 'specification':
                # Look for technical specifications
                if re.search(r'\d+GB|\d+MB|\d+[KMG]B|parameters|context.*\d+k', content):
                    structural_score += 0.4
                if any(spec in content for spec in ['memory', 'gpu', 'cpu', 'requirement']):
                    structural_score += 0.2
            
            elif query_type == 'capability':
                # Look for capability indicators
                if any(word in content for word in ['support', 'capable', 'ability', 'feature', 'can', 'enable']):
                    structural_score += 0.3
                # Look for yes/no answers
                if re.search(r'\b(yes|no|supported|unsupported|available|unavailable)\b', content):
                    structural_score += 0.2
            
            # Query-document alignment score
            alignment_score = self._calculate_alignment_score(query, doc)
            
            # Answer confidence boost
            confidence_boost = 1.0
            
            # Boost documents that likely contain direct answers
            if query.startswith(('what', 'which', 'how many', 'when', 'where')):
                # Question-answering pattern matching
                if ':' in content or '=' in content or '-' in content[:100]:
                    confidence_boost = 1.2
                # Check for definition patterns
                if re.search(r'is (a |an |the )?[\w\s]+that', content):
                    confidence_boost = 1.15
            
            # Boost recent retrieval stages (they used refined queries)
            stage_boost = 1.0 + (0.05 * doc.get('retrieval_stage', 1))
            
            # Calculate final composite score
            final_score = (
                self.config['semantic_weight'] * semantic_score +
                self.config['keyword_weight'] * keyword_score +
                self.config['structural_weight'] * structural_score +
                0.1 * alignment_score
            ) * confidence_boost * stage_boost
            
            # Cap at 1.0
            doc['final_score'] = min(1.0, final_score)
            doc['scoring_components'] = {
                'semantic': round(semantic_score, 3),
                'keyword': round(keyword_score, 3),
                'structural': round(structural_score, 3),
                'alignment': round(alignment_score, 3),
                'confidence_boost': round(confidence_boost, 2),
                'stage_boost': round(stage_boost, 2)
            }
        
        # Sort by final score
        candidates.sort(key=lambda x: x.get('final_score', 0), reverse=True)
        
        # Diversity filtering - avoid too many similar documents
        diverse_results = self._ensure_diversity(candidates, top_k)
        
        return diverse_results
    
    def _calculate_alignment_score(self, query: str, doc: Dict[str, Any]) -> float:
        """Calculate how well the document aligns with query intent."""
        content = doc.get('content', '').lower()
        query_lower = query.lower()
        
        alignment = 0.0
        
        # Check for direct question-answer alignment
        if '?' in query:
            question_words = ['what', 'how', 'why', 'when', 'where', 'which', 'who']
            for qw in question_words:
                if query_lower.startswith(qw):
                    # Check if content has answer indicators
                    if any(indicator in content for indicator in ['is', 'are', 'was', 'were', qw]):
                        alignment += 0.3
                    break
        
        # Check for topic continuity
        important_terms = self._extract_important_terms(query)
        term_continuity = sum(1 for term in important_terms if term in content) / max(len(important_terms), 1)
        alignment += term_continuity * 0.4
        
        # Check for similar sentence structure (indicates relevant content)
        if len(content) > 50:
            # Simple check: does the content have similar punctuation density?
            query_sentences = len(re.findall(r'[.!?]', query)) + 1
            content_sentences = len(re.findall(r'[.!?]', content[:500])) + 1
            if abs(query_sentences - content_sentences) <= 2:
                alignment += 0.3
        
        return min(1.0, alignment)
    
    def _ensure_diversity(self, candidates: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        """Ensure diversity in final results."""
        if len(candidates) <= top_k:
            return candidates
        
        diverse_results = []
        seen_sources = set()
        seen_topics = set()
        
        for doc in candidates:
            if len(diverse_results) >= top_k:
                break
            
            # Extract source and topic
            source = doc.get('doc_id', 'unknown')
            content = doc.get('content', '')[:200]
            
            # Simple topic extraction (first significant noun phrase)
            topic = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
            topic = topic[0] if topic else 'general'
            
            # Allow some repetition but not too much
            if source not in seen_sources or len(seen_sources) < top_k // 2:
                if topic not in seen_topics or len(seen_topics) < top_k // 2:
                    diverse_results.append(doc)
                    seen_sources.add(source)
                    seen_topics.add(topic)
        
        # Fill remaining slots if needed
        if len(diverse_results) < top_k:
            for doc in candidates:
                if doc not in diverse_results:
                    diverse_results.append(doc)
                    if len(diverse_results) >= top_k:
                        break
        
        return diverse_results
    
    def _extract_model_names(self, text: str) -> List[str]:
        """Extract AI model names from text."""
        models = []
        text_lower = text.lower()
        
        # Check against known models
        for model_name in self.model_knowledge.keys():
            if model_name in text_lower:
                models.append(model_name)
            else:
                # Check aliases
                for alias in self.model_knowledge[model_name]['aliases']:
                    if alias in text_lower:
                        models.append(model_name)
                        break
        
        # Also check for model patterns not in our knowledge base
        pattern = r'\b(?:gpt|claude|gemini|llama|palm|bert|t5|falcon|mistral|qwen|deepseek|grok)[\-\s]?\w*\b'
        found = re.findall(pattern, text_lower)
        models.extend(found)
        
        return list(set(models))
    
    def _extract_main_subject(self, query: str) -> Optional[str]:
        """Extract the main subject of a query."""
        # Simple approach: look for model names first
        models = self._extract_model_names(query)
        if models:
            return models[0]
        
        # Look for capitalized noun phrases
        noun_phrases = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', query)
        if noun_phrases:
            return noun_phrases[0]
        
        # Fallback: first significant noun
        words = query.split()
        for word in words:
            if len(word) > 3 and word.lower() not in ['what', 'which', 'when', 'where', 'how', 'why']:
                return word
        
        return None
    
    def _extract_important_terms(self, query: str) -> List[str]:
        """Extract important terms from query."""
        # Remove common words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
            'what', 'which', 'when', 'where', 'how', 'why', 'who', 'whom', 'whose'
        }
        
        words = re.findall(r'\b\w+\b', query.lower())
        important = [w for w in words if w not in stop_words and len(w) > 2]
        
        # Prioritize model names and technical terms
        prioritized = []
        for word in important:
            if any(word in model for model in self.model_knowledge.keys()):
                prioritized.insert(0, word)  # Model names first
            elif word in ['benchmark', 'performance', 'capability', 'safety', 'cost']:
                prioritized.insert(1 if prioritized else 0, word)  # Technical terms second
            else:
                prioritized.append(word)
        
        return prioritized[:8]  # Limit to 8 most important terms
    
    def _basic_reranking(self, query: str, candidates: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
        """Fallback basic reranking."""
        # Simple reranking based on similarity
        candidates.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        return candidates[:top_k]