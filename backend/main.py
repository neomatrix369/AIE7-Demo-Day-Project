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
from simple_document_processor import SimpleDocumentProcessor, TEXT_EMBEDDINGS_MODEL, TEXT_EMBEDDINGS_MODEL_PROVIDER
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Corpus Quality Assessment API", version="1.0.0")

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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fallback mock data
MOCK_CORPUS_STATUS = {
    "corpus_loaded": True,
    "document_count": 152,
    "chunk_count": 1247,
    "embedding_model": f"{TEXT_EMBEDDINGS_MODEL} ({TEXT_EMBEDDINGS_MODEL_PROVIDER})",
    "corpus_metadata": {
        "total_size_mb": 45.2,
        "document_types": {"pdf": 120, "txt": 32},
        "avg_doc_length": 2400
    }
}

LLM_QUESTIONS = {
    "count": 25,
    "sample": [
        "How to implement OAuth 2.0 authentication?",
        "What are the best practices for API design?",
        "How to troubleshoot database connection issues?"
    ],
    "categories": ["implementation", "best_practices", "troubleshooting"]
}

RAGAS_QUESTIONS = {
    "count": 30,
    "sample": [
        "What is JWT token expiration?",
        "Explain rate limiting strategies",
        "What are the benefits of microservices architecture?"
    ],
    "categories": ["factual", "reasoning", "multi_hop"]
}

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
    return {"llm_questions": LLM_QUESTIONS}

@app.get("/api/questions/ragas")
async def get_ragas_questions():
    return {"ragas_questions": RAGAS_QUESTIONS}

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
    # Mock analysis results
    per_question_results = []
    
    # Generate mock results for LLM questions
    for i in range(25):
        similarity = round(random.uniform(0.3, 0.9), 2)
        status = "good" if similarity > 0.7 else "weak" if similarity > 0.5 else "poor"
        per_question_results.append({
            "id": f"llm_q_{i+1:03d}",
            "text": f"LLM Question {i+1}: How to implement feature X?",
            "source": "llm",
            "similarity": similarity,
            "status": status,
            "retrieved_docs": [
                {"doc_id": f"d_{j}", "similarity": round(similarity + random.uniform(-0.1, 0.1), 2), 
                 "title": f"Document {j}"} for j in range(1, 4)
            ]
        })
    
    # Generate mock results for RAGAS questions
    for i in range(30):
        similarity = round(random.uniform(0.2, 0.8), 2)
        status = "good" if similarity > 0.7 else "weak" if similarity > 0.5 else "poor"
        per_question_results.append({
            "id": f"ragas_q_{i+1:03d}",
            "text": f"RAGAS Question {i+1}: What is concept Y?",
            "source": "ragas",
            "similarity": similarity,
            "status": status,
            "retrieved_docs": [
                {"doc_id": f"d_{j}", "similarity": round(similarity + random.uniform(-0.1, 0.1), 2), 
                 "title": f"Document {j}"} for j in range(1, 4)
            ]
        })
    
    # Calculate overall metrics
    all_similarities = [q["similarity"] for q in per_question_results]
    avg_similarity = round(sum(all_similarities) / len(all_similarities), 2)
    success_rate = len([s for s in all_similarities if s > 0.7]) / len(all_similarities)
    
    # Calculate per-group metrics
    llm_similarities = [q["similarity"] for q in per_question_results if q["source"] == "llm"]
    ragas_similarities = [q["similarity"] for q in per_question_results if q["source"] == "ragas"]
    
    corpus_health = "excellent" if avg_similarity > 0.8 else "good" if avg_similarity > 0.6 else "needs_work"
    
    return {
        "overall": {
            "avg_similarity": avg_similarity,
            "success_rate": round(success_rate, 2),
            "total_questions": len(per_question_results),
            "corpus_health": corpus_health,
            "key_insight": f"{round((1-success_rate)*100)}% of questions scored below 0.7 threshold"
        },
        "per_group": {
            "llm": {
                "avg_score": round(sum(llm_similarities) / len(llm_similarities), 2),
                "distribution": llm_similarities
            },
            "ragas": {
                "avg_score": round(sum(ragas_similarities) / len(ragas_similarities), 2),
                "distribution": ragas_similarities
            }
        },
        "per_question": per_question_results
    }

@app.websocket("/ws/experiment/stream")
async def websocket_experiment_stream(websocket: WebSocket):
    await websocket.accept()
    
    # Simulate real-time experiment execution
    all_questions = []
    
    # Add LLM questions
    for i in range(25):
        all_questions.append({
            "question_id": f"llm_q_{i+1:03d}",
            "question": f"LLM Question {i+1}: How to implement feature X?",
            "source": "llm"
        })
    
    # Add RAGAS questions
    for i in range(30):
        all_questions.append({
            "question_id": f"ragas_q_{i+1:03d}",
            "question": f"RAGAS Question {i+1}: What is concept Y?",
            "source": "ragas"
        })
    
    for question in all_questions:
        # Simulate processing delay
        await asyncio.sleep(0.5)
        
        # Generate mock result
        similarity = round(random.uniform(0.3, 0.9), 2)
        result = {
            **question,
            "avg_similarity": similarity,
            "retrieved_docs": [
                {
                    "doc_id": f"d_{j}",
                    "similarity": round(similarity + random.uniform(-0.1, 0.1), 2),
                    "title": f"Document {j}"
                } for j in range(1, 4)
            ]
        }
        
        await websocket.send_json(result)
    
    # Send completion signal
    await websocket.send_json({"type": "completed", "message": "Experiment completed"})

@app.get("/")
async def root():
    return {
        "message": "Corpus Quality Assessment API", 
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