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
from dotenv import load_dotenv

# Load environment variables from root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI(title="RagCheck API", version="1.0.0")

# Set up logging
logger = setup_logging(__name__)

# Initialize simple document processor
doc_processor = SimpleDocumentProcessor()
documents_loaded = False

# Try to load documents on startup
try:
    logger.info("🚀 Initializing simple document processing...")
    stats = doc_processor.get_corpus_stats()
    if stats["corpus_loaded"]:
        documents_loaded = True
        logger.info("✅ Document processing initialized successfully")
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
    similarity_threshold: float = 0.5

class QuestionResult(BaseModel):
    question_id: str
    question: str
    source: str
    avg_similarity: float
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
    # Generate mock analysis results
    per_question_results = generate_mock_question_results()
    
    # Calculate and return analysis metrics
    return build_analysis_response(per_question_results)

def generate_mock_question_results() -> List[Dict[str, Any]]:
    """
    Generate mock question results for both LLM and RAGAS questions.
    
    Returns:
        List of mock question result dictionaries
    """
    per_question_results = []
    
    # Generate mock results for LLM questions
    llm_questions = generate_mock_llm_results()
    per_question_results.extend(llm_questions)
    
    # Generate mock results for RAGAS questions
    ragas_questions = generate_mock_ragas_results()
    per_question_results.extend(ragas_questions)
    
    return per_question_results

def generate_mock_llm_results() -> List[Dict[str, Any]]:
    """
    Generate mock results for LLM questions.
    
    Returns:
        List of mock LLM question results
    """
    results = []
    for i in range(25):
        similarity = round(random.uniform(0.3, 0.9), 2)
        status = get_similarity_status(similarity)
        
        results.append({
            "id": f"llm_q_{i+1:03d}",
            "text": f"LLM Question {i+1}: How to implement feature X?",
            "source": "llm",
            "similarity": similarity,
            "status": status,
            "retrieved_docs": generate_mock_retrieved_docs(similarity)
        })
    
    return results

def generate_mock_ragas_results() -> List[Dict[str, Any]]:
    """
    Generate mock results for RAGAS questions.
    
    Returns:
        List of mock RAGAS question results
    """
    results = []
    for i in range(30):
        similarity = round(random.uniform(0.2, 0.8), 2)
        status = get_similarity_status(similarity)
        
        results.append({
            "id": f"ragas_q_{i+1:03d}",
            "text": f"RAGAS Question {i+1}: What is concept Y?",
            "source": "ragas",
            "similarity": similarity,
            "status": status,
            "retrieved_docs": generate_mock_retrieved_docs(similarity)
        })
    
    return results

def get_similarity_status(similarity: float) -> str:
    """
    Determine status based on similarity score.
    
    Args:
        similarity: Similarity score between 0 and 1
        
    Returns:
        Status string: 'good', 'weak', or 'poor'
    """
    if similarity > 0.7:
        return "good"
    elif similarity > 0.5:
        return "weak"
    else:
        return "poor"

def generate_mock_retrieved_docs(similarity: float) -> List[Dict[str, Any]]:
    """
    Generate mock retrieved documents for a question.
    
    Args:
        similarity: Base similarity score for variation
        
    Returns:
        List of mock document dictionaries
    """
    return [
        {
            "doc_id": f"d_{j}",
            "similarity": round(similarity + random.uniform(-0.1, 0.1), 2),
            "title": f"Document {j}"
        } for j in range(1, 4)
    ]

def calculate_overall_metrics(per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate overall analysis metrics.
    
    Args:
        per_question_results: List of question results
        
    Returns:
        Dictionary with overall metrics
    """
    all_similarities = [q["similarity"] for q in per_question_results]
    avg_similarity = round(sum(all_similarities) / len(all_similarities), 2)
    success_rate = len([s for s in all_similarities if s > 0.7]) / len(all_similarities)
    
    corpus_health = "excellent" if avg_similarity > 0.8 else "good" if avg_similarity > 0.6 else "needs_work"
    
    return {
        "avg_similarity": avg_similarity,
        "success_rate": round(success_rate, 2),
        "total_questions": len(per_question_results),
        "corpus_health": corpus_health,
        "key_insight": f"{round((1-success_rate)*100)}% of questions scored below 0.7 threshold"
    }

def calculate_per_group_metrics(per_question_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate per-group analysis metrics.
    
    Args:
        per_question_results: List of question results
        
    Returns:
        Dictionary with per-group metrics
    """
    llm_similarities = [q["similarity"] for q in per_question_results if q["source"] == "llm"]
    ragas_similarities = [q["similarity"] for q in per_question_results if q["source"] == "ragas"]
    
    return {
        "llm": {
            "avg_score": round(sum(llm_similarities) / len(llm_similarities), 2),
            "distribution": llm_similarities
        },
        "ragas": {
            "avg_score": round(sum(ragas_similarities) / len(ragas_similarities), 2),
            "distribution": ragas_similarities
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
        await stream_question_results(websocket, all_questions)
        
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

async def stream_question_results(websocket: WebSocket, questions: List[Dict[str, Any]]) -> None:
    """
    Stream processing results for each question.
    
    Args:
        websocket: WebSocket connection
        questions: List of questions to process
    """
    for question in questions:
        # Simulate processing delay
        await asyncio.sleep(0.5)
        
        # Generate and send mock result
        result = generate_streaming_result(question)
        await websocket.send_json(result)

def generate_streaming_result(question: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a mock streaming result for a question.
    
    Args:
        question: Question dictionary
        
    Returns:
        Result dictionary with similarity and retrieved docs
    """
    similarity = round(random.uniform(0.3, 0.9), 2)
    
    return {
        **question,
        "avg_similarity": similarity,
        "retrieved_docs": generate_mock_retrieved_docs(similarity)
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
    """Search the corpus using simple keyword matching."""
    if not documents_loaded:
        return {
            "error": "Documents not loaded",
            "message": "Document processing failed during startup",
            "results": []
        }
    
    try:
        logger.info(f"🔍 Searching corpus for: {query[:100]}...")
        
        # Perform simple search
        results = doc_processor.search_documents(query, top_k)
        
        logger.info(f"📚 Found {len(results)} relevant documents")
        
        return {
            "query": query,
            "results": results,
            "total_found": len(results),
            "search_method": "keyword_matching"
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