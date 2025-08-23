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
from datetime import datetime
from typing import List, Dict, Any
from services.quality_score_service import QualityScoreService

logger = logging.getLogger(__name__)


class ExperimentService:
    """Service for experiment data management and processing."""
    
    def __init__(self):
        self.experiments_folder = os.path.join(os.path.dirname(__file__), '..', '..', 'experiments')
        
    def save_experiment_results(self, results: List[Dict[str, Any]]) -> str:
        """Save experiment results to a timestamped JSON file in experiments folder."""
        try:
            # Create experiments folder if it doesn't exist
            os.makedirs(self.experiments_folder, exist_ok=True)
            
            # Generate timestamp for filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"experiment_{timestamp}.json"
            results_file = os.path.join(self.experiments_folder, filename)
            
            # Add metadata to results
            avg_similarity = sum(r["avg_similarity"] for r in results) / len(results) if results else 0
            avg_quality_score = QualityScoreService.similarity_to_quality_score(avg_similarity)
            
            experiment_data = {
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "filename": filename,
                    "total_questions": len(results),
                    "sources": list(set(r["source"] for r in results)),
                    "avg_similarity": avg_similarity,
                    "avg_quality_score": avg_quality_score
                },
                "results": results
            }
            
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(experiment_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved {len(results)} experiment results to {filename}")
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