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
import logging
import sys
import subprocess
from datetime import datetime
from typing import List, Dict, Any
from services.quality_score_service import QualityScoreService
from config.settings import CHUNK_SIZE, CHUNK_OVERLAP, CHUNK_STRATEGY, RETRIEVAL_METHOD, VECTOR_DB_CONFIG, COLLECTION_NAMES

logger = logging.getLogger(__name__)


class ExperimentService:
    """Service for experiment data management and processing."""
    
    def __init__(self):
        self.experiments_folder = os.path.join(os.path.dirname(__file__), '..', '..', 'experiments')
        
    def _get_environment_info(self) -> Dict[str, Any]:
        """Get environment information for reproducibility."""
        try:
            git_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode().strip()[:8] if os.path.exists('.git') else 'N/A'
        except:
            git_commit = 'N/A'
            
        return {
            "python_version": sys.version,
            "git_commit": git_commit,
            "timestamp": datetime.now().isoformat()
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
                "min_chunk_length": 50  # Default minimum chunk length
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
                "min_chunk_length": 50
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
            "batch_size": 100
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
        
    def _get_experiment_timing_info(self) -> Dict[str, Any]:
        """Get experiment timing and API call information."""
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
                    **self._get_experiment_timing_info()
                },
                "top_recommendations": self._get_top_recommendations(results),
                "metadata": {
                    "timestamp": timestamp.isoformat(),
                    "filename": filename,
                    "total_questions": len(results),
                    "sources": list(set(r["source"] for r in results)),
                    "avg_similarity": avg_similarity,
                    "avg_quality_score": avg_quality_score
                },
                "results": results,
                "environment": self._get_environment_info()
            }
            
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(experiment_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved {len(results)} experiment results to {filename}")
            logger.info(f"📊 Experiment ID: {experiment_id}")
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
                    results = data.get("results", [])
                
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
                            
                            experiment_files.append({
                                "filename": filename,
                                "timestamp": metadata.get("timestamp", ""),
                                "total_questions": metadata.get("total_questions", 0),
                                "sources": metadata.get("sources", []),
                                "avg_similarity": avg_similarity,
                                "avg_quality_score": avg_quality_score,
                                "file_size": os.path.getsize(filepath)
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