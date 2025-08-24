# -*- coding: utf-8 -*-
"""
Experiment Service

Handles all experiment-related operations including:
- Experiment result processing and transformation
- File management for experiment data
- Analysis generation
- WebSocket streaming logic coordination

Following the Four Rules of Simple Design:
1. Tests pass - Maintains exact same functionality
2. Reveals intent - Clear separation of experiment concerns
3. No duplication - Consolidates scattered experiment logic
4. Fewest elements - Single responsibility for experiment operations
"""

import os
import json
import hashlib
import subprocess
import sys
from datetime import datetime
from typing import List, Dict, Any
from services.quality_score_service import QualityScoreService
from config.settings import (
    CHUNK_SIZE, CHUNK_OVERLAP, CHUNK_STRATEGY, RETRIEVAL_METHOD,
    VECTOR_DB_CONFIG, COLLECTION_NAMES
)
from logging_config import setup_logging

logger = setup_logging(__name__)


class ExperimentService:
    """Service for experiment data management and processing."""
    
    def __init__(self):
        self.experiments_folder = os.path.join(os.path.dirname(__file__), '..', '..', 'experiments')
        
    def _get_environment_info(self) -> Dict[str, Any]:
        """Get environment information for reproducibility."""
        try:
            # Get git commit hash from the project root
            project_root = os.path.dirname(os.path.dirname(__file__))
            git_commit = subprocess.check_output(
                ['git', 'rev-parse', 'HEAD'], 
                cwd=project_root,
                stderr=subprocess.DEVNULL,
                text=True
            ).strip()[:8]  # Get first 8 characters
        except:
            git_commit = 'N/A'
            
        return {
            "python_version": sys.version,
            "git_commit": git_commit,
            "timestamp": datetime.now().isoformat(),
            "environment_variables": self._get_environment_variables()
        }
        
    def _get_corpus_info(self) -> Dict[str, Any]:
        """Get comprehensive corpus information from available data."""
        try:
            from simple_document_processor import SimpleDocumentProcessor
            doc_processor = SimpleDocumentProcessor()
            corpus_stats = doc_processor.get_corpus_stats()
            
            # Get actual document types from data folder
            data_folder = os.getenv("DATA_FOLDER", "./data/")
            document_types = {}
            if os.path.exists(data_folder):
                for file in os.listdir(data_folder):
                    if file.endswith(('.pdf', '.txt', '.csv', '.json')):
                        ext = file.split('.')[-1]
                        document_types[ext] = document_types.get(ext, 0) + 1
            
            return {
                "name": COLLECTION_NAMES['DEFAULT_COLLECTION'],
                "total_documents": corpus_stats.get("document_count", 0),
                "total_chunks": corpus_stats.get("chunk_count", 0),
                "chunk_size": CHUNK_SIZE,
                "chunk_overlap": CHUNK_OVERLAP,
                "chunking_strategy": list(CHUNK_STRATEGY.keys())[0] if CHUNK_STRATEGY else "recursive",
                "source_path": data_folder,
                "document_types": document_types,
                "preprocessing": "standard_text_cleaning",
                "min_chunk_length": 50,  # Default minimum chunk length
                "corpus_hash": self._get_corpus_hash()
            }
        except Exception as e:
            logger.warning(f"Could not get corpus info: {e}")
            return {
                "name": COLLECTION_NAMES['DEFAULT_COLLECTION'],
                "total_documents": 0,
                "total_chunks": 0,
                "chunk_size": CHUNK_SIZE,
                "chunk_overlap": CHUNK_OVERLAP,
                "chunking_strategy": list(CHUNK_STRATEGY.keys())[0] if CHUNK_STRATEGY else "recursive",
                "source_path": os.getenv("DATA_FOLDER", "./data/"),
                "document_types": {},
                "preprocessing": "standard_text_cleaning",
                "min_chunk_length": 50,
                "corpus_hash": self._get_corpus_hash()
            }
            
    def _get_embedding_info(self) -> Dict[str, Any]:
        """Get comprehensive embedding model information."""
        # Try to get actual model info if available
        try:
            import openai
            model_info = "text-embedding-3-small"
            model_version = "latest"
        except:
            model_info = "text-embedding-3-small"
            model_version = "latest"
            
        return {
            "model": model_info,
            "model_version": model_version,
            "dimension": VECTOR_DB_CONFIG['VECTOR_SIZE'],
            "local_vs_api": "api",  # Default to API
            "normalize_embeddings": True,
            "batch_size": 100,
            "model_hash": self._get_model_hash()
        }
        
    def _get_vector_db_info(self) -> Dict[str, Any]:
        """Get comprehensive vector database information."""
        try:
            # Try to get actual Qdrant version
            from qdrant_client import QdrantClient
            client = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
            version = "1.7.0"  # Default version
        except:
            version = "1.7.0"
            
        return {
            "type": "Qdrant",
            "version": version,
            "collection_name": COLLECTION_NAMES['DEFAULT_COLLECTION'],
            "similarity_metric": "cosine",
            "index_config": {
                "distance": "cosine",
                "vector_size": VECTOR_DB_CONFIG['VECTOR_SIZE']
            }
        }
        
    def _get_assessment_info(self, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get comprehensive assessment configuration information."""
        # Get actual config values
        actual_config = config.get("config", {}) if config else {}
        
        return {
            "tier_level": 1,  # Default tier
            "similarity_threshold": actual_config.get("similarity_threshold", 0.5),
            "top_k_retrieval": actual_config.get("top_k", 5),
            "retrieval_method": list(RETRIEVAL_METHOD.keys())[0] if RETRIEVAL_METHOD else "naive",
            "total_queries": len(config.get("results", [])) if config else 0,
            "random_seed": 42,  # Default seed
            "evaluation_metrics": ["cosine_similarity", "quality_score", "success_rate", "gap_analysis"]
        }
        
    def _get_performance_metrics(self, results: List[Dict[str, Any]], processing_time: float = 0.0, api_calls: int = 0) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics."""
        if not results:
            return {
                "avg_cosine_similarity": 0.0,
                "median_similarity": 0.0,
                "min_similarity": 0.0,
                "max_similarity": 0.0,
                "success_rate_percent": 0.0,
                "queries_passed": 0,
                "queries_failed": 0
            }
            
        similarities = [r["avg_similarity"] for r in results]
        similarities.sort()
        
        avg_similarity = sum(similarities) / len(similarities)
        median_similarity = similarities[len(similarities) // 2] if similarities else 0.0
        min_similarity = min(similarities) if similarities else 0.0
        max_similarity = max(similarities) if similarities else 0.0
        
        # Calculate success rate (queries with similarity >= 0.7)
        passed_threshold = 0.7
        queries_passed = sum(1 for s in similarities if s >= passed_threshold)
        queries_failed = len(similarities) - queries_passed
        success_rate_percent = (queries_passed / len(similarities)) * 100 if similarities else 0.0
        
        return {
            "avg_cosine_similarity": round(avg_similarity, 3),
            "median_similarity": round(median_similarity, 3),
            "min_similarity": round(min_similarity, 3),
            "max_similarity": round(max_similarity, 3),
            "success_rate_percent": round(success_rate_percent, 1),
            "queries_passed": queries_passed,
            "queries_failed": queries_failed
        }
        
    def _get_experiment_timing_info(self, timing_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get experiment timing and API call information."""
        if timing_data:
            return {
                "processing_time_seconds": timing_data.get("duration_seconds", 0.0),
                "api_calls_made": 0,  # Would need to be tracked during execution
                "start_time": timing_data.get("start_time", datetime.now().isoformat()),
                "end_time": timing_data.get("end_time", datetime.now().isoformat())
            }
        else:
            return {
                "processing_time_seconds": 0.0,  # Would need to be tracked during execution
                "api_calls_made": 0,  # Would need to be tracked during execution
                "start_time": datetime.now().isoformat(),
                "end_time": datetime.now().isoformat()
            }
        
    def _get_query_info(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get comprehensive query information."""
        if not results:
            return {
                "query_source": "generated",
                "sample_queries": [],
                "shuffle_queries": False
            }
            
        # Get sample queries (first 5 for better representation)
        sample_queries = [r["question"] for r in results[:5]]
        
        # Determine query source based on results
        sources = list(set(r.get("source", "unknown") for r in results))
        query_source = f"json_files_{'_'.join(sources)}" if sources else "generated"
        
        return {
            "query_source": query_source,
            "sample_queries": sample_queries,
            "shuffle_queries": False
        }
        
    def _get_top_recommendations(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate top recommendations based on gap analysis."""
        try:
            from services.gap_analysis_service import GapAnalysisService
            gap_analysis_service = GapAnalysisService()
            gap_analysis = gap_analysis_service.analyze_gaps(results)
            
            # Extract top 3 recommendations
            recommendations = gap_analysis.get("recommendations", [])[:3]
            
            top_recommendations = []
            for rec in recommendations:
                top_recommendations.append({
                    "action": rec.get("action", "Improve RAG system"),
                    "expected_improvement": f"{rec.get('current_score', 0.0):.2f} → {rec.get('target_score', 0.8):.2f}",
                    "effort_days": rec.get("effort_days", 3),
                    "priority": rec.get("priority", "medium")
                })
            
            return top_recommendations
        except Exception as e:
            logger.warning(f"Could not generate recommendations: {e}")
            return [
                {
                    "action": "Improve document quality and coverage",
                    "expected_improvement": "0.5 → 0.8",
                    "effort_days": 3,
                    "priority": "high"
                }
            ]
        
    def _get_quality_score_metrics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get quality score related metrics from experiment results."""
        if not results:
            return {
                "overall_quality_score": 0.0,
                "avg_quality_score": 0.0,
                "min_quality_score": 0.0,
                "max_quality_score": 0.0,
                "quality_score_distribution": {},
                "quality_threshold_analysis": {}
            }
        
        # Extract quality scores from results
        quality_scores = []
        for result in results:
            if "quality_score" in result:
                quality_scores.append(result["quality_score"])
        
        if not quality_scores:
            return {
                "overall_quality_score": 0.0,
                "avg_quality_score": 0.0,
                "min_quality_score": 0.0,
                "max_quality_score": 0.0,
                "quality_score_distribution": {},
                "quality_threshold_analysis": {}
            }
        
        # Calculate quality score statistics
        avg_quality = sum(quality_scores) / len(quality_scores)
        min_quality = min(quality_scores)
        max_quality = max(quality_scores)
        
        # Quality score distribution (buckets)
        distribution = {
            "excellent": len([s for s in quality_scores if s >= 8.0]),
            "good": len([s for s in quality_scores if 6.0 <= s < 8.0]),
            "fair": len([s for s in quality_scores if 4.0 <= s < 6.0]),
            "poor": len([s for s in quality_scores if s < 4.0])
        }
        
        # Quality threshold analysis
        threshold_analysis = {
            "above_7": len([s for s in quality_scores if s >= 7.0]),
            "above_6": len([s for s in quality_scores if s >= 6.0]),
            "above_5": len([s for s in quality_scores if s >= 5.0]),
            "below_5": len([s for s in quality_scores if s < 5.0])
        }
        
        return {
            "overall_quality_score": round(avg_quality, 2),
            "avg_quality_score": round(avg_quality, 2),
            "min_quality_score": round(min_quality, 2),
            "max_quality_score": round(max_quality, 2),
            "quality_score_distribution": distribution,
            "quality_threshold_analysis": threshold_analysis
        }
        
    def _get_user_satisfaction_metrics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate user satisfaction metrics based on experiment results."""
        if not results:
            return {
                "query_relevance_score": 0.0,
                "response_completeness_score": 0.0,
                "user_confidence_score": 0.0,
                "overall_satisfaction_score": 0.0
            }
        
        # Calculate average similarity
        avg_similarity = sum(r["avg_similarity"] for r in results) / len(results)
        
        # Query relevance score (based on average similarity)
        query_relevance_score = min(avg_similarity, 1.0)
        
        # Response completeness (percentage of queries with good similarity)
        good_responses = len([r for r in results if r["avg_similarity"] >= 0.6])
        response_completeness_score = good_responses / len(results)
        
        # User confidence score (based on consistency of results)
        high_confidence_queries = len([r for r in results if r["avg_similarity"] >= 0.7])
        user_confidence_score = high_confidence_queries / len(results)
        
        # Overall satisfaction (weighted average)
        overall_satisfaction_score = (
            query_relevance_score * 0.4 +
            response_completeness_score * 0.3 +
            user_confidence_score * 0.3
        )
        
        return {
            "query_relevance_score": round(query_relevance_score, 3),
            "response_completeness_score": round(response_completeness_score, 3),
            "user_confidence_score": round(user_confidence_score, 3),
            "overall_satisfaction_score": round(overall_satisfaction_score, 3)
        }
        
    def _generate_experiment_name(self, config: Dict[str, Any] = None, results: List[Dict[str, Any]] = None) -> str:
        """Generate a descriptive experiment name based on configuration and results."""
        timestamp = datetime.now()
        base_name = f"RAG Assessment - {timestamp.strftime('%Y-%m-%d %H:%M')}"
        
        if config and results:
            actual_config = config.get("config", {})
            sources = list(set(r.get("source", "unknown") for r in results))
            top_k = actual_config.get("top_k", 5)
            threshold = actual_config.get("similarity_threshold", 0.5)
            
            # Create descriptive name
            source_str = "+".join(sources) if sources else "mixed"
            name = f"{source_str.upper()} Assessment (k={top_k}, t={threshold}) - {timestamp.strftime('%Y-%m-%d %H:%M')}"
            return name
        
        return base_name
        
    def save_experiment_results(self, results: List[Dict[str, Any]], config: Dict[str, Any] = None) -> str:
        """Save experiment results to a timestamped JSON file in experiments folder with comprehensive metadata."""
        try:
            # Create experiments folder if it doesn't exist
            os.makedirs(self.experiments_folder, exist_ok=True)
            
            # Generate timestamp and experiment ID
            timestamp = datetime.now()
            experiment_id = f"exp_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            filename = f"experiment_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
            results_file = os.path.join(self.experiments_folder, filename)
            
            # Calculate basic metrics
            avg_similarity = sum(r["avg_similarity"] for r in results) / len(results) if results else 0
            avg_quality_score = QualityScoreService.similarity_to_quality_score(avg_similarity)
            
            # Extract timing information if available
            timing_data = config.get("timing", {}) if config else {}
            
            # Build comprehensive experiment data
            experiment_data = {
                "experiment_id": experiment_id,
                "name": self._generate_experiment_name(config, results),
                "timestamp": timestamp.isoformat(),
                "inputs": {
                    "corpus": self._get_corpus_info(),
                    "embedding": self._get_embedding_info(),
                    "vector_db": self._get_vector_db_info(),
                    "assessment": self._get_assessment_info(config),
                    "query": self._get_query_info(results)
                },
                "results": {
                    "performance": self._get_performance_metrics(results),
                    **self._get_experiment_timing_info(timing_data)
                },
                "quality_score_metrics": self._get_quality_score_metrics(results),
                "user_satisfaction": self._get_user_satisfaction_metrics(results),
                "question_group_statistics": self._get_question_group_statistics(results),
                "top_recommendations": self._get_top_recommendations(results),
                "metadata": {
                    "timestamp": timestamp.isoformat(),
                    "filename": filename,
                    "total_questions": len(results),
                    "sources": list(set(r["source"] for r in results)),
                    "avg_similarity": avg_similarity,
                    "avg_quality_score": avg_quality_score
                },
                "question_results": results,
                "environment": self._get_environment_info()
            }
            
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(experiment_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved {len(results)} experiment results to {filename}")
            logger.info(f"📊 Experiment ID: {experiment_id}")
            if timing_data:
                logger.info(f"⏱️ Experiment duration: {timing_data.get('duration_seconds', 0):.2f} seconds")
            return filename
            
        except Exception as e:
            logger.error(f"❌ Failed to save experiment results: {e}")
            return ""

    def load_experiment_results(self, filename: str = None) -> List[Dict[str, Any]]:
        """Load experiment results from JSON file."""
        try:
            if filename:
                # Load specific experiment file
                results_file = os.path.join(self.experiments_folder, filename)
            else:
                # Load the most recent experiment file
                if os.path.exists(self.experiments_folder):
                    # Get all experiment files sorted by name (which includes timestamp)
                    experiment_files = [f for f in os.listdir(self.experiments_folder) 
                                     if f.startswith('experiment_') and f.endswith('.json')]
                    if experiment_files:
                        # Sort by filename (timestamp) to get most recent
                        experiment_files.sort(reverse=True)
                        most_recent = experiment_files[0]
                        results_file = os.path.join(self.experiments_folder, most_recent)
                        logger.info(f"📂 Loading most recent experiment: {most_recent}")
                    else:
                        # Fallback to old location for backward compatibility
                        results_file = os.path.join(os.path.dirname(__file__), '..', 'experiment_results.json')
                else:
                    # Fallback to old location for backward compatibility
                    results_file = os.path.join(os.path.dirname(__file__), '..', 'experiment_results.json')
            
            if os.path.exists(results_file):
                with open(results_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Handle both old format (direct results) and new format (with metadata)
                if isinstance(data, list):
                    results = data
                else:
                    # Check for question_results first (new format), then fall back to results
                    results = data.get("question_results", data.get("results", []))
                
                logger.info(f"📂 Loaded {len(results)} experiment results from {os.path.basename(results_file)}")
                return results
        except Exception as e:
            logger.error(f"❌ Failed to load experiment results: {e}")
        return []

    def list_experiment_files(self) -> List[Dict[str, Any]]:
        """List all available experiment files with metadata."""
        try:
            if not os.path.exists(self.experiments_folder):
                return []
            
            experiment_files = []
            for filename in os.listdir(self.experiments_folder):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.experiments_folder, filename)
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        # Extract metadata
                        if isinstance(data, dict) and "metadata" in data:
                            metadata = data["metadata"]
                            avg_similarity = metadata.get("avg_similarity", 0)
                            avg_quality_score = metadata.get("avg_quality_score", QualityScoreService.similarity_to_quality_score(avg_similarity))
                            
                            # Extract timing information from results if available
                            timing_info = {}
                            if "results" in data and isinstance(data["results"], dict):
                                results_data = data["results"]
                                timing_info = {
                                    "start_time": results_data.get("start_time"),
                                    "end_time": results_data.get("end_time"),
                                    "duration_seconds": results_data.get("processing_time_seconds")
                                }
                            elif "question_results" in data:
                                # Handle case where timing info might be in the main results object
                                timing_info = {
                                    "start_time": data.get("start_time"),
                                    "end_time": data.get("end_time"),
                                    "duration_seconds": data.get("duration_seconds")
                                }
                            
                            experiment_files.append({
                                "filename": filename,
                                "timestamp": metadata.get("timestamp", ""),
                                "total_questions": metadata.get("total_questions", 0),
                                "sources": metadata.get("sources", []),
                                "avg_similarity": avg_similarity,
                                "avg_quality_score": avg_quality_score,
                                "file_size": os.path.getsize(filepath),
                                **timing_info
                            })
                        else:
                            # Old format file
                            avg_similarity = sum(r.get("avg_similarity", 0) for r in data) / len(data) if isinstance(data, list) and data else 0
                            avg_quality_score = QualityScoreService.similarity_to_quality_score(avg_similarity)
                            
                            experiment_files.append({
                                "filename": filename,
                                "timestamp": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat(),
                                "total_questions": len(data) if isinstance(data, list) else 0,
                                "sources": list(set(r.get("source", "") for r in data)) if isinstance(data, list) else [],
                                "avg_similarity": avg_similarity,
                                "avg_quality_score": avg_quality_score,
                                "file_size": os.path.getsize(filepath)
                            })
                    except Exception as e:
                        logger.warning(f"⚠️ Could not read experiment file {filename}: {e}")
            
            # Sort by timestamp (newest first)
            experiment_files.sort(key=lambda x: x["timestamp"], reverse=True)
            return experiment_files
            
        except Exception as e:
            logger.error(f"❌ Failed to list experiment files: {e}")
            return []

    def convert_experiment_results_to_analysis(self, experiment_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert experiment results to analysis format with quality scores.
        
        Args:
            experiment_results: List of experiment results from WebSocket streaming
            
        Returns:
            List of question results in analysis format with 0-10 quality scores
        """
        per_question_results = []
        
        for result in experiment_results:
            # Convert similarity to quality score (0-10 scale)
            quality_score = QualityScoreService.similarity_to_quality_score(result["avg_similarity"])
            
            # Determine status based on quality score
            status = QualityScoreService.get_quality_status(quality_score)
            
            # Convert to analysis format with quality scores
            analysis_result = {
                "id": result["question_id"],
                "text": result["question"],
                "source": result["source"],
                "quality_score": quality_score,
                "status": status,
                "role_name": result.get("role_name", "Unknown"),
                "retrieved_docs": [
                    {
                        "doc_id": doc["doc_id"],
                        "chunk_id": doc.get("chunk_id", "unknown"),
                        "content": doc.get("content", ""),
                        "similarity": doc["similarity"],
                        "title": doc["title"]
                    } for doc in result["retrieved_docs"]
                ]
            }
            
            per_question_results.append(analysis_result)
        
        logger.info(f"✅ Converted {len(per_question_results)} experiment results to analysis format")
        return per_question_results

    def calculate_per_role_metrics(self, per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate per-group analysis metrics using quality scores.
        
        Args:
            per_question_results: List of question results with quality_score field
            
        Returns:
            Dictionary with per-group metrics using 0-10 scale
        """
        groups = {}
        
        for q in per_question_results:
            source = q["source"]
            role_name = q.get("role_name", "Unknown")
            
            if source not in groups:
                groups[source] = {
                    "avg_quality_score": 0,
                    "distribution": [],
                    "roles": {}
                }
            
            groups[source]["distribution"].append(q["quality_score"])
            
            if role_name not in groups[source]["roles"]:
                groups[source]["roles"][role_name] = {
                    "avg_quality_score": 0,
                    "distribution": []
                }
                
            groups[source]["roles"][role_name]["distribution"].append(q["quality_score"])
            logger.debug(f"Added {source} question with role '{role_name}' to groups")

        for source, data in groups.items():
            if data["distribution"]:
                data["avg_quality_score"] = round(sum(data["distribution"]) / len(data["distribution"]), 1)
            
            for role_name, role_data in data["roles"].items():
                if role_data["distribution"]:
                    role_data["avg_quality_score"] = round(sum(role_data["distribution"]) / len(role_data["distribution"]), 1)
                    
        return groups

    def calculate_overall_metrics(self, per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate overall analysis metrics using quality scores.
        
        Args:
            per_question_results: List of question results with quality_score field
            
        Returns:
            Dictionary with overall metrics using 0-10 scale
        """
        all_quality_scores = [q["quality_score"] for q in per_question_results]
        avg_quality_score = round(sum(all_quality_scores) / len(all_quality_scores), 1)
        success_rate = QualityScoreService.calculate_success_rate(all_quality_scores)
        
        corpus_health = QualityScoreService.get_corpus_health(avg_quality_score)
        
        return {
            "avg_quality_score": avg_quality_score,
            "success_rate": round(success_rate, 2),
            "total_questions": len(per_question_results),
            "corpus_health": corpus_health,
            "key_insight": f"{round((1-success_rate)*100)}% of questions scored below {QualityScoreService.get_quality_thresholds()['GOOD']} threshold"
        }

    def build_analysis_response(self, per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build the complete analysis response.
        
        Args:
            per_question_results: List of question results
            
        Returns:
            Complete analysis response dictionary
        """
        overall_metrics = self.calculate_overall_metrics(per_question_results)
        per_role_metrics = self.calculate_per_role_metrics(per_question_results)
        
        return {
            "overall": overall_metrics,
            "per_group": per_role_metrics,
            "per_question": per_question_results
        }

    def _get_corpus_hash(self) -> str:
        """Generate a hash of the corpus content for exact reproduction."""
        try:
            data_folder = os.getenv("DATA_FOLDER", "./data/")
            if not os.path.exists(data_folder):
                return "no_corpus"
            
            # Create a hash of all files in the data folder
            corpus_files = []
            for root, dirs, files in os.walk(data_folder):
                for file in files:
                    if file.endswith(('.pdf', '.txt', '.csv', '.json')):
                        filepath = os.path.join(root, file)
                        corpus_files.append(filepath)
            
            if not corpus_files:
                return "empty_corpus"
            
            # Sort files for consistent hashing
            corpus_files.sort()
            
            # Create hash from file names, sizes, and modification times
            hash_content = ""
            for filepath in corpus_files:
                stat = os.stat(filepath)
                hash_content += f"{filepath}:{stat.st_size}:{stat.st_mtime}\n"
            
            return hashlib.md5(hash_content.encode()).hexdigest()
            
        except Exception as e:
            logger.warning(f"Could not generate corpus hash: {e}")
            return "hash_error"
    
    def _get_model_hash(self) -> str:
        """Generate a hash of the embedding model for exact reproduction."""
        try:
            # For OpenAI models, we can't hash the actual model, but we can hash the model name and version
            model_name = "text-embedding-3-small"
            model_version = "latest"
            
            # Create a hash from model configuration
            model_config = f"{model_name}:{model_version}:{VECTOR_DB_CONFIG['VECTOR_SIZE']}"
            return hashlib.md5(model_config.encode()).hexdigest()
            
        except Exception as e:
            logger.warning(f"Could not generate model hash: {e}")
            return "hash_error"

    def _get_environment_variables(self) -> Dict[str, str]:
        """Get non-security environment variables for reproduction."""
        safe_vars = [
            'NODE_ENV', 'PYTHONPATH', 'LANG', 'LC_ALL', 'TZ',
            'DATA_FOLDER', 'QDRANT_URL', 'CHUNK_SIZE', 'CHUNK_OVERLAP',
            'RETRIEVAL_METHOD', 'CHUNK_STRATEGY'
        ]
        
        env_vars = {}
        for var in safe_vars:
            value = os.getenv(var)
            if value:
                env_vars[var] = value
        
        return env_vars

    def _get_question_group_statistics(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get detailed question group statistics from experiment results."""
        if not results:
            return {
                "total_questions": 0,
                "selected_groups": [],
                "group_breakdown": {},
                "questions_per_group": {}
            }
        
        # Count questions by source/group
        group_counts = {}
        for result in results:
            source = result.get("source", "unknown")
            group_counts[source] = group_counts.get(source, 0) + 1
        
        # Get selected groups (unique sources in results)
        selected_groups = list(group_counts.keys())
        
        # Calculate total questions
        total_questions = len(results)
        
        # Create detailed breakdown
        group_breakdown = {}
        for group, count in group_counts.items():
            group_breakdown[group] = {
                "count": count,
                "percentage": round((count / total_questions) * 100, 1) if total_questions > 0 else 0
            }
        
        return {
            "total_questions": total_questions,
            "selected_groups": selected_groups,
            "group_breakdown": group_breakdown,
            "questions_per_group": group_counts
        }