# -*- coding: utf-8 -*-
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import traceback
import asyncio
import random
import logging
import os
from logging_config import setup_logging
from simple_document_processor import SimpleDocumentProcessor
from managers.qdrant_manager import QdrantManager
from managers.data_manager import DataManager
from managers.search_manager import SearchManager
from dotenv import load_dotenv

# Load environment variables from root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI(title="RagCheck API", version="1.0.0")

# Set up logging
logger = setup_logging(__name__)

# Initialize managers
doc_processor = SimpleDocumentProcessor()
qdrant_manager = QdrantManager(collection_name="student_loan_corpus")
data_manager = DataManager(data_folder=os.path.join(os.path.dirname(__file__), '..', 'data'))
search_manager = SearchManager(data_manager, qdrant_manager)
documents_loaded = False

# Store for experiment results
experiment_results = []

def similarity_to_quality_score(similarity: float) -> float:
    """
    Transform similarity score from 0-1 scale to 0-10 quality score scale.
    
    Args:
        similarity: Similarity score between 0 and 1
        
    Returns:
        Quality score between 0 and 10, rounded to 1 decimal place
    """
    return round(similarity * 10, 1)

def save_experiment_results(results: List[Dict[str, Any]]) -> str:
    """Save experiment results to a timestamped JSON file in experiments folder."""
    try:
        import json
        from datetime import datetime
        
        # Create experiments folder if it doesn't exist
        experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
        os.makedirs(experiments_folder, exist_ok=True)
        
        # Generate timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"experiment_{timestamp}.json"
        results_file = os.path.join(experiments_folder, filename)
        
        # Add metadata to results
        avg_similarity = sum(r["avg_similarity"] for r in results) / len(results) if results else 0
        avg_quality_score = similarity_to_quality_score(avg_similarity)
        
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

def load_experiment_results(filename: str = None) -> List[Dict[str, Any]]:
    """Load experiment results from JSON file."""
    try:
        import json
        
        if filename:
            # Load specific experiment file
            experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
            results_file = os.path.join(experiments_folder, filename)
        else:
            # Load the most recent experiment (for backward compatibility)
            results_file = os.path.join(os.path.dirname(__file__), 'experiment_results.json')
        
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

def list_experiment_files() -> List[Dict[str, Any]]:
    """List all available experiment files with metadata."""
    try:
        import json
        from datetime import datetime
        
        experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
        if not os.path.exists(experiments_folder):
            return []
        
        experiment_files = []
        for filename in os.listdir(experiments_folder):
            if filename.endswith('.json'):
                filepath = os.path.join(experiments_folder, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Extract metadata
                    if isinstance(data, dict) and "metadata" in data:
                        metadata = data["metadata"]
                        avg_similarity = metadata.get("avg_similarity", 0)
                        avg_quality_score = metadata.get("avg_quality_score", similarity_to_quality_score(avg_similarity))
                        
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
                        avg_quality_score = similarity_to_quality_score(avg_similarity)
                        
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

# Load any existing results on startup (for backward compatibility)
experiment_results = load_experiment_results()

# Try to load documents on startup
try:
    logger.info("🚀 Initializing document processing and vector store...")
    stats = doc_processor.get_corpus_stats()
    if stats["corpus_loaded"]:
        documents_loaded = True
        logger.info("✅ Document processing initialized successfully")
        
        # Initialize vector store if needed
        try:
            combined_docs = data_manager.load_all_documents()
            if combined_docs:
                qdrant_manager.initialize_collection()
                search_manager.get_vector_store()  # Test connection
                logger.info("✅ Vector store initialized successfully")
            else:
                logger.warning("⚠️ No documents found for vector store")
        except Exception as e:
            logger.error(f"❌ Vector store initialization failed: {str(e)}")
            logger.info("📝 Will use keyword search fallback")
    else:
        logger.warning("⚠️ No documents found - using mock data")
except Exception as e:
    logger.error(f"❌ Document processing initialization failed: {str(e)}")
    logger.error(traceback.format_exc())
    logger.info("📝 Falling back to mock data mode")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import json

# Fallback mock data
MOCK_CORPUS_STATUS = {
    "corpus_loaded": True,
    "document_count": 152,
    "chunk_count": 1247,
    "embedding_model": "mock-model",
    "corpus_metadata": {
        "total_size_mb": 45.2,
        "document_types": {"pdf": 120, "txt": 32},
        "avg_doc_length": 2400
    }
}

def load_questions_from_file(filename: str) -> Dict[str, Any]:
    """
    Load questions from a JSON file.
    
    Args:
        filename: The path to the JSON file
        
    Returns:
        A dictionary containing the questions, count, and categories
    """
    try:
        with open(filename, 'r', encoding='utf-8-sig') as f:
            questions_data = json.load(f)
        
        # Restructure the data to match the original format
        all_questions = []
        categories = []
        for category in questions_data:
            categories.append(category["name"])
            for question in category["questions"]:
                all_questions.append(question["text"])

        return {
            "count": len(all_questions),
            "sample": random.sample(all_questions, min(len(all_questions), 3)),
            "categories": categories,
            "questions": questions_data
        }
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Error loading questions from {filename}: {e}")
        return {
            "count": 0,
            "sample": [],
            "categories": [],
            "questions": []
        }

# Load LLM questions from the JSON file
LLM_QUESTIONS = load_questions_from_file(
    os.path.join(os.path.dirname(__file__), '..', 'data', 'questions', 'llm-generated.json')
)

# Load RAGAS questions from the JSON file
RAGAS_QUESTIONS = load_questions_from_file(
    os.path.join(os.path.dirname(__file__), '..', 'data', 'questions', 'ragas-generated.json')
)

# Pydantic models
class ExperimentConfig(BaseModel):
    selected_groups: List[str]
    top_k: int = 5
    similarity_threshold: float = 0.5  # Keep internal processing in 0-1 scale

class QuestionResult(BaseModel):
    question_id: str
    question: str
    source: str
    avg_similarity: float  # Internal processing still uses similarity
    retrieved_docs: List[Dict[str, Any]]

# API Endpoints
@app.get("/api/corpus/status")
async def get_corpus_status():
    """Get corpus status - real data if available, otherwise mock data."""
    if documents_loaded:
        # Return real corpus statistics
        return doc_processor.get_corpus_stats()
    else:
        # Return mock data
        logger.info("📝 Returning mock corpus status (no real documents loaded)")
        return MOCK_CORPUS_STATUS

@app.get("/api/questions/llm")
async def get_llm_questions():
    return LLM_QUESTIONS["questions"]

@app.get("/api/questions/ragas")
async def get_ragas_questions():
    return RAGAS_QUESTIONS["questions"]

@app.post("/api/experiment/run")
async def run_experiment(config: ExperimentConfig):
    # Mock experiment execution
    total_questions = 0
    if "llm" in config.selected_groups:
        total_questions += LLM_QUESTIONS["count"]
    if "ragas" in config.selected_groups:
        total_questions += RAGAS_QUESTIONS["count"]
    
    return {
        "experiment_id": "exp_001",
        "total_questions": total_questions,
        "status": "running",
        "config": config.dict()
    }

@app.get("/api/results/analysis")
async def get_analysis_results():
    """Get analysis results from the most recent experiment."""
    global experiment_results
    
    if not experiment_results:
        logger.warning("⚠️ No experiment results available, returning empty analysis")
        return {
            "overall": {
                "avg_quality_score": 0.0,
                "success_rate": 0.0,
                "total_questions": 0,
                "corpus_health": "no_data",
                "key_insight": "No experiment has been run yet"
            },
            "per_group": {
                "llm": {"avg_score": 0.0, "distribution": []},
                "ragas": {"avg_score": 0.0, "distribution": []}
            },
            "per_question": []
        }
    
    logger.info(f"📊 Analyzing {len(experiment_results)} experiment results")
    
    # Convert experiment results to analysis format
    per_question_results = convert_experiment_results_to_analysis(experiment_results)
    
    # Calculate and return analysis metrics
    return build_analysis_response(per_question_results)

@app.post("/api/results/clear")
async def clear_experiment_results():
    """Clear stored experiment results."""
    global experiment_results
    
    try:
        experiment_results.clear()
        
        # Also delete the file
        results_file = os.path.join(os.path.dirname(__file__), 'experiment_results.json')
        if os.path.exists(results_file):
            os.remove(results_file)
        
        logger.info("🗑️ Cleared experiment results")
        return {"success": True, "message": "Experiment results cleared"}
        
    except Exception as e:
        logger.error(f"❌ Failed to clear experiment results: {e}")
        return {"success": False, "message": f"Failed to clear results: {str(e)}"}

@app.post("/api/results/test")
async def set_test_results():
    """Set test results for debugging (development only)."""
    global experiment_results
    
    # Create some test results (keeping similarity format for internal processing)
    test_results = [
        {
            "question_id": "llm_q_001",
            "question": "How much can I borrow for my degree program?",
            "source": "llm",
            "avg_similarity": 0.75,
            "retrieved_docs": [
                {"doc_id": "doc_1", "similarity": 0.8, "title": "Student Loan Limits"},
                {"doc_id": "doc_2", "similarity": 0.7, "title": "Borrowing Guidelines"}
            ]
        },
        {
            "question_id": "ragas_q_001", 
            "question": "What is the issue with Aidvantage in the borrower's complaint?",
            "source": "ragas",
            "avg_similarity": 0.65,
            "retrieved_docs": [
                {"doc_id": "doc_3", "similarity": 0.7, "title": "Servicer Complaints"},
                {"doc_id": "doc_4", "similarity": 0.6, "title": "Aidvantage Issues"}
            ]
        },
        {
            "question_id": "llm_q_002",
            "question": "What are my repayment options after graduation?",
            "source": "llm",
            "avg_similarity": 0.85,
            "retrieved_docs": [
                {"doc_id": "doc_5", "similarity": 0.9, "title": "Repayment Plans"},
                {"doc_id": "doc_6", "similarity": 0.8, "title": "Graduation Options"}
            ]
        }
    ]
    
    experiment_results = test_results
    save_experiment_results(experiment_results)
    
    logger.info("🧪 Set test experiment results")
    return {"success": True, "message": "Test results set", "count": len(test_results)}

@app.get("/api/experiments/list")
async def list_experiments():
    """List all available experiment files."""
    try:
        experiment_files = list_experiment_files()
        logger.info(f"📋 Listed {len(experiment_files)} experiment files")
        return {
            "success": True,
            "experiments": experiment_files
        }
    except Exception as e:
        logger.error(f"❌ Failed to list experiments: {e}")
        return {
            "success": False,
            "message": f"Failed to list experiments: {str(e)}",
            "experiments": []
        }

@app.post("/api/experiments/load")
async def load_experiment(filename: str):
    """Load a specific experiment file."""
    global experiment_results
    
    try:
        results = load_experiment_results(filename)
        if results:
            experiment_results = results
            logger.info(f"📂 Loaded experiment {filename} with {len(results)} results")
            return {
                "success": True,
                "message": f"Loaded experiment {filename}",
                "count": len(results)
            }
        else:
            return {
                "success": False,
                "message": f"No results found in {filename}"
            }
    except Exception as e:
        logger.error(f"❌ Failed to load experiment {filename}: {e}")
        return {
            "success": False,
            "message": f"Failed to load experiment: {str(e)}"
        }

@app.delete("/api/experiments/delete")
async def delete_experiment(filename: str):
    """Delete a specific experiment file."""
    try:
        import os
        experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
        filepath = os.path.join(experiments_folder, filename)
        
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"🗑️ Deleted experiment file {filename}")
            return {
                "success": True,
                "message": f"Deleted experiment {filename}"
            }
        else:
            return {
                "success": False,
                "message": f"Experiment file {filename} not found"
            }
    except Exception as e:
        logger.error(f"❌ Failed to delete experiment {filename}: {e}")
        return {
            "success": False,
            "message": f"Failed to delete experiment: {str(e)}"
        }

def convert_experiment_results_to_analysis(experiment_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
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
        quality_score = similarity_to_quality_score(result["avg_similarity"])
        
        # Determine status based on quality score
        status = get_quality_status(quality_score)
        
        # Convert to analysis format with quality scores
        analysis_result = {
            "id": result["question_id"],
            "text": result["question"],
            "source": result["source"],
            "quality_score": quality_score,
            "status": status,
            "retrieved_docs": [
                {
                    "doc_id": doc["doc_id"],
                    "similarity": doc["similarity"],
                    "title": doc["title"]
                } for doc in result["retrieved_docs"]
            ]
        }
        
        per_question_results.append(analysis_result)
    
    logger.info(f"✅ Converted {len(per_question_results)} experiment results to analysis format")
    return per_question_results



def get_quality_status(quality_score: float) -> str:
    """
    Determine status based on quality score.
    
    Args:
        quality_score: Quality score between 0 and 10
        
    Returns:
        Status string: 'good', 'weak', or 'poor'
    """
    if quality_score >= 7.0:
        return "good"
    elif quality_score >= 5.0:
        return "weak"
    else:
        return "poor"



def calculate_overall_metrics(per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate overall analysis metrics using quality scores.
    
    Args:
        per_question_results: List of question results with quality_score field
        
    Returns:
        Dictionary with overall metrics using 0-10 scale
    """
    all_quality_scores = [q["quality_score"] for q in per_question_results]
    avg_quality_score = round(sum(all_quality_scores) / len(all_quality_scores), 1)
    success_rate = len([s for s in all_quality_scores if s >= 7.0]) / len(all_quality_scores)
    
    corpus_health = "excellent" if avg_quality_score >= 8.0 else "good" if avg_quality_score >= 6.0 else "needs_work"
    
    return {
        "avg_quality_score": avg_quality_score,
        "success_rate": round(success_rate, 2),
        "total_questions": len(per_question_results),
        "corpus_health": corpus_health,
        "key_insight": f"{round((1-success_rate)*100)}% of questions scored below 7.0 threshold"
    }

def calculate_per_group_metrics(per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate per-group analysis metrics using quality scores.
    
    Args:
        per_question_results: List of question results with quality_score field
        
    Returns:
        Dictionary with per-group metrics using 0-10 scale
    """
    llm_quality_scores = [q["quality_score"] for q in per_question_results if q["source"] == "llm"]
    ragas_quality_scores = [q["quality_score"] for q in per_question_results if q["source"] == "ragas"]
    
    return {
        "llm": {
            "avg_quality_score": round(sum(llm_quality_scores) / len(llm_quality_scores), 1) if llm_quality_scores else 0.0,
            "distribution": llm_quality_scores
        },
        "ragas": {
            "avg_quality_score": round(sum(ragas_quality_scores) / len(ragas_quality_scores), 1) if ragas_quality_scores else 0.0,
            "distribution": ragas_quality_scores
        }
    }

def build_analysis_response(per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build the complete analysis response.
    
    Args:
        per_question_results: List of question results
        
    Returns:
        Complete analysis response dictionary
    """
    overall_metrics = calculate_overall_metrics(per_question_results)
    per_group_metrics = calculate_per_group_metrics(per_question_results)
    
    return {
        "overall": overall_metrics,
        "per_group": per_group_metrics,
        "per_question": per_question_results
    }

@app.websocket("/ws/experiment/stream")
async def websocket_experiment_stream(websocket: WebSocket):
    logger.info("🔌 WebSocket connection attempt")
    await websocket.accept()
    logger.info("✅ WebSocket connection accepted")
    
    try:
        # Wait for configuration from the client
        logger.info("⏳ Waiting for configuration from client...")
        config_data = await websocket.receive_json()
        logger.info(f"📨 Received config: {config_data}")
        config = ExperimentConfig(**config_data)
        logger.info(f"✅ Config validated: {config.selected_groups} groups, {config.top_k} top_k")
        
        # Generate questions based on selected groups using real data
        all_questions = generate_real_experiment_questions(config.selected_groups)
        logger.info(f"📝 Generated {len(all_questions)} questions for experiment")
        
        # Stream results for each question
        experiment_results.clear()  # Clear previous results
        await stream_question_results(websocket, all_questions, config)
        
        # Save experiment results
        save_experiment_results(experiment_results)
        
        # Send completion signal
        logger.info("🏁 Sending completion signal")
        await websocket.send_json({"type": "completed", "message": "Experiment completed"})
    except Exception as e:
        await websocket.send_json({"type": "error", "message": f"Experiment failed: {str(e)}"})
        await websocket.close()

def generate_experiment_questions() -> List[Dict[str, Any]]:
    """
    Generate all questions for the experiment simulation.
    
    Returns:
        List of question dictionaries for both LLM and RAGAS
    """
    all_questions = []
    
    # Add LLM questions
    llm_questions = generate_llm_experiment_questions()
    all_questions.extend(llm_questions)
    
    # Add RAGAS questions
    ragas_questions = generate_ragas_experiment_questions()
    all_questions.extend(ragas_questions)
    
    return all_questions

def generate_llm_experiment_questions() -> List[Dict[str, Any]]:
    """
    Generate LLM questions for experiment streaming.
    
    Returns:
        List of LLM question dictionaries
    """
    return [
        {
            "question_id": f"llm_q_{i+1:03d}",
            "question": f"LLM Question {i+1}: How to implement feature X?",
            "source": "llm"
        } for i in range(25)
    ]

def generate_ragas_experiment_questions() -> List[Dict[str, Any]]:
    """
    Generate RAGAS questions for experiment streaming.
    
    Returns:
        List of RAGAS question dictionaries
    """
    return [
        {
            "question_id": f"ragas_q_{i+1:03d}",
            "question": f"RAGAS Question {i+1}: What is concept Y?",
            "source": "ragas"
        } for i in range(30)
    ]

def generate_real_experiment_questions(selected_groups: List[str]) -> List[Dict[str, Any]]:
    """
    Generate real questions from JSON files based on selected groups.
    
    Args:
        selected_groups: List of selected question groups ('llm' and/or 'ragas')
        
    Returns:
        List of real question dictionaries from JSON data
    """
    all_questions = []
    question_counter = 1
    
    if "llm" in selected_groups:
        # Get real LLM questions from loaded data
        llm_data = LLM_QUESTIONS["questions"]
        for group in llm_data:
            for question in group.get("questions", []):
                all_questions.append({
                    "question_id": f"llm_q_{question_counter:03d}",
                    "question": question["text"],
                    "source": "llm",
                    "focus": question.get("focus", "General"),
                    "group_name": group["name"]
                })
                question_counter += 1
    
    if "ragas" in selected_groups:
        # Get real RAGAS questions from loaded data
        ragas_data = RAGAS_QUESTIONS["questions"]
        question_counter = 1  # Reset counter for RAGAS
        for group in ragas_data:
            for question in group.get("questions", []):
                all_questions.append({
                    "question_id": f"ragas_q_{question_counter:03d}",
                    "question": question["text"],
                    "source": "ragas",
                    "focus": question.get("focus", "General"),
                    "group_name": group["name"]
                })
                question_counter += 1
    
    return all_questions

async def stream_question_results(websocket: WebSocket, questions: List[Dict[str, Any]], config: ExperimentConfig) -> None:
    """
    Stream processing results for each question using real vector search.
    
    Args:
        websocket: WebSocket connection
        questions: List of questions to process
        config: Experiment configuration
    """
    for i, question in enumerate(questions):
        try:
            # Simulate processing delay
            await asyncio.sleep(0.3)
            
            # Perform real vector search
            result = await process_question_with_search(question, config)
            
            # Convert similarity to quality score for streaming
            result_with_quality_score = {
                **result,
                "avg_quality_score": similarity_to_quality_score(result["avg_similarity"])
            }
            
            # Store the result for analysis
            experiment_results.append(result)
            
            await websocket.send_json(result_with_quality_score)
            
            # Send progress update
            progress = ((i + 1) / len(questions)) * 100
            await websocket.send_json({
                "type": "progress",
                "progress": round(progress, 1),
                "processed": i + 1,
                "total": len(questions)
            })
            
        except Exception as e:
            logger.error(f"❌ Error processing question {question.get('question_id', 'unknown')}: {e}")
            # Send error result but continue
            error_result = {
                **question,
                "avg_similarity": 0.0,
                "retrieved_docs": [],
                "error": str(e)
            }
            await websocket.send_json(error_result)

async def process_question_with_search(question: Dict[str, Any], config: ExperimentConfig) -> Dict[str, Any]:
    """
    Process a single question using real vector search.
    
    Args:
        question: Question dictionary
        config: Experiment configuration
        
    Returns:
        Result dictionary with real similarity scores and retrieved docs
    """
    try:
        query = question["question"]
        
        # Perform vector search with configuration
        search_results = search_manager.search_with_similarity_threshold(
            query=query,
            top_k=config.top_k,
            threshold=config.similarity_threshold
        )
        
        # Calculate average similarity
        if search_results:
            avg_similarity = sum(r["similarity"] for r in search_results) / len(search_results)
        else:
            avg_similarity = 0.0
        
        # Format retrieved documents
        retrieved_docs = []
        for result in search_results:
            retrieved_docs.append({
                "doc_id": result["doc_id"],
                "similarity": result["similarity"],
                "title": result["title"]
            })
        
        return {
            **question,
            "avg_similarity": round(avg_similarity, 3),
            "retrieved_docs": retrieved_docs
        }
        
    except Exception as e:
        logger.error(f"❌ Search failed for question {question.get('question_id', 'unknown')}: {e}")
        return {
            **question,
            "avg_similarity": 0.0,
            "retrieved_docs": [],
            "error": str(e)
        }

@app.get("/")
async def root():
    return {
        "message": "RagCheck API", 
        "status": "running",
        "document_processor": {
            "initialized": documents_loaded,
            "documents_loaded": doc_processor.get_corpus_stats()["document_count"] if documents_loaded else 0,
            "mode": "real_data" if documents_loaded else "mock_data"
        }
    }

@app.get("/api/corpus/search")
async def search_corpus(query: str, top_k: int = 5):
    """Search the corpus using vector similarity search."""
    if not documents_loaded:
        return {
            "error": "Documents not loaded",
            "message": "Document processing failed during startup",
            "results": []
        }
    
    try:
        logger.info(f"🔍 Searching corpus for: {query[:100]}...")
        
        # Perform vector search using enhanced search manager
        results = search_manager.search_documents(query, top_k)
        
        logger.info(f"📚 Found {len(results)} relevant documents")
        
        return {
            "query": query,
            "results": results,
            "total_found": len(results),
            "search_method": "vector_similarity" if search_manager.get_vector_store() else "keyword_matching"
        }
        
    except Exception as e:
        logger.error(f"❌ Search failed: {str(e)}")
        return {
            "error": "Search failed",
            "message": str(e),
            "results": []
        }

@app.post("/api/corpus/reload")
async def reload_corpus():
    """Reload the corpus data (for development/testing)."""
    global documents_loaded
    
    try:
        logger.info("🔄 Reloading corpus data...")
        
        # Reinitialize simple document processor
        stats = doc_processor.get_corpus_stats()
        
        if stats["corpus_loaded"]:
            documents_loaded = True
            logger.info("✅ Corpus reloaded successfully")
            return {
                "success": True,
                "message": "Corpus reloaded successfully",
                "documents_loaded": stats["document_count"],
                "processor_ready": True
            }
        else:
            documents_loaded = False
            logger.warning("⚠️ Corpus reload failed - no documents found")
            return {
                "success": False,
                "message": "Failed to reload corpus - check data folder",
                "documents_loaded": 0,
                "processor_ready": False
            }
            
    except Exception as e:
        logger.error(f"❌ Corpus reload failed: {str(e)}")
        documents_loaded = False
        return {
            "success": False,
            "message": f"Reload failed: {str(e)}",
            "documents_loaded": 0,
            "processor_ready": False
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)