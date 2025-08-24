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
from managers.enhanced_rag_manager import EnhancedRAGManager
from managers.advanced_rag_v2 import AdvancedRAGv2
from services.quality_score_service import QualityScoreService
from services.experiment_service import ExperimentService
from services.gap_analysis_service import GapAnalysisService
from services.error_response_service import ErrorResponseService, ErrorType
from dotenv import load_dotenv

# Load environment variables from root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

data_folder = os.getenv("DATA_FOLDER")

app = FastAPI(title="RagCheck API", version="1.0.0")

# Set up logging
logger = setup_logging(__name__)

# Initialize managers and services
doc_processor = SimpleDocumentProcessor()
qdrant_manager = QdrantManager(collection_name="student_loan_corpus")
data_manager = DataManager(data_folder=data_folder)
search_manager = SearchManager(data_manager, qdrant_manager)
enhanced_rag_manager = EnhancedRAGManager(search_manager)
advanced_rag_v2 = AdvancedRAGv2(search_manager)
experiment_service = ExperimentService()
gap_analysis_service = GapAnalysisService()
documents_loaded = False

# Store for experiment results
experiment_results = []

# Load any existing results on startup (for backward compatibility)
experiment_results = experiment_service.load_experiment_results()

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

# Configure CORS for both local and Vercel deployments
cors_origins = ["http://localhost:3000", "http://localhost:3003"]

# Add production frontend URLs from environment
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in cors_origins:
    cors_origins.append(frontend_url)

# Add Vercel frontend URL from environment
vercel_frontend_url = os.getenv("VERCEL_FRONTEND_URL")
if vercel_frontend_url and vercel_frontend_url not in cors_origins:
    cors_origins.append(vercel_frontend_url)

# Add any additional Vercel domains from environment
vercel_domain = os.getenv("VERCEL_DOMAIN")
if vercel_domain and vercel_domain not in cors_origins:
    cors_origins.append(vercel_domain)

logger.info(f"🌐 CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint for CORS testing
@app.get("/health")
async def health_check():
    """Simple health check endpoint to test CORS configuration."""
    return {
        "status": "healthy",
        "cors_origins": cors_origins,
        "timestamp": "2025-08-18T00:53:19Z"
    }

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
        A dictionary containing the questions, count, and roles
    """
    try:
        logger.info(f"Started loading questions from {filename}")
        with open(filename, 'r', encoding='utf-8-sig') as f:
            questions_data = json.load(f)
        
        # Restructure the data to match the original format
        all_questions = []
        roles = []
        for role_item in questions_data:
            roles.append(role_item["role"])
            for question in role_item["questions"]:
                all_questions.append(question["text"])

        logger.info(f"Loaded {len(all_questions)} questions.")
        logger.info(f"...finished loading questions from {filename}.")

        return {
            "count": len(all_questions),
            "sample": random.sample(all_questions, min(len(all_questions), 3)),
            "roles": roles,
            "questions": questions_data
        }        
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Error loading questions from {filename}: {e}")
        return {
            "count": 0,
            "sample": [],
            "roles": [],
            "questions": []
        }

logger.info(f"📁 Data folder: {data_folder}")

# Check if we should use AI model questions mode
USE_AI_MODEL_MODE = os.getenv('USE_AI_MODEL_MODE', 'true').lower() == 'true'
logger.info(f"🤖 AI Model Mode: {USE_AI_MODEL_MODE}")

if USE_AI_MODEL_MODE:
    # In AI model mode, load AI model questions for all three categories
    logger.info("Loading AI model questions for all categories")
    
    # Create AI model questions for LLM category
    llm_ai_questions_path = os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ai-models-llm.json')
    if os.path.exists(llm_ai_questions_path):
        LLM_QUESTIONS = load_questions_from_file(llm_ai_questions_path)
    else:
        # Use the main AI model questions as fallback
        LLM_QUESTIONS = load_questions_from_file(
            os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ai-models.json')
        )
    
    # Create AI model questions for RAGAS category
    ragas_ai_questions_path = os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ai-models-ragas.json')
    if os.path.exists(ragas_ai_questions_path):
        RAGAS_QUESTIONS = load_questions_from_file(ragas_ai_questions_path)
    else:
        # Use the main AI model questions as fallback
        RAGAS_QUESTIONS = load_questions_from_file(
            os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ai-models.json')
        )
    
    # Load AI Model questions
    AI_MODEL_QUESTIONS = load_questions_from_file(
        os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ai-models.json')
    )
else:
    # Original student loan questions mode
    logger.info("Loading student loan questions")
    
    # Load LLM questions from the JSON file
    LLM_QUESTIONS = load_questions_from_file(
        os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'llm-generated.json')
    )
    
    # Load RAGAS questions from the JSON file
    RAGAS_QUESTIONS = load_questions_from_file(
        os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ragas-generated.json')
    )
    
    # Load AI Model questions from the JSON file (still available as third option)
    AI_MODEL_QUESTIONS = load_questions_from_file(
        os.path.join(os.path.dirname(__file__), data_folder, 'questions', 'ai-models.json')
    )

from config.settings import CHUNK_STRATEGY, RETRIEVAL_METHOD, CHUNK_SIZE, CHUNK_OVERLAP

# Pydantic models
class ExperimentConfig(BaseModel):
    selected_groups: List[str]
    top_k: int = 5
    similarity_threshold: float = 0.5  # Keep internal processing in 0-1 scale
    use_enhanced_retrieval: bool = True  # Enable enhanced RAG by default
    use_advanced_v2: bool = False  # Enable Advanced RAG v2 (opt-in for testing)

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
    
    # Check database connectivity
    database_connected = False
    database_error = None
    vector_store_info = {}
    
    try:
        # Test Qdrant connection
        collections = qdrant_manager.client.get_collections()
        database_connected = True
        logger.info("✅ Database connectivity verified")
        
        # Get vector store statistics
        try:
            collection_info = qdrant_manager.client.get_collection(qdrant_manager.collection_name)
            vector_store_info = {
                "points_count": collection_info.points_count,
                "vectors_count": collection_info.vectors_count,
                "indexed_vectors": collection_info.indexed_vectors_count,
                "collection_status": collection_info.status
            }
        except:
            vector_store_info = {"status": "collection_not_found"}
            
    except Exception as e:
        database_connected = False
        database_error = str(e)
        logger.warning(f"⚠️ Database connectivity issue: {e}")
    
    if documents_loaded and database_connected:
        # Return real corpus statistics with connectivity info
        corpus_stats = doc_processor.get_corpus_stats()
        corpus_stats["database_connected"] = True
        corpus_stats["database_error"] = None
        corpus_stats["vector_store"] = vector_store_info
        
        # Check for specific model coverage
        if vector_store_info.get("points_count", 0) > 0:
            try:
                # Sample check for new PDFs
                sample_results = qdrant_manager.client.scroll(
                    collection_name=qdrant_manager.collection_name,
                    limit=100
                )
                titles = [p.payload.get("metadata", {}).get("title", "") for p in sample_results[0]]
                corpus_stats["indexed_models"] = {
                    "claude": any("claude" in t.lower() for t in titles),
                    "gemini": any("gemini" in t.lower() for t in titles),
                    "gpt5": any("gpt-5" in t.lower() or "gpt_5" in t.lower() for t in titles),
                    "grok": any("grok" in t.lower() for t in titles),
                    "deepseek": any("deepseek" in t.lower() for t in titles)
                }
            except:
                pass
                
        return corpus_stats
    else:
        # Return mock data with connectivity status
        logger.info("📝 Returning mock corpus status (documents not loaded or database not connected)")
        mock_status = MOCK_CORPUS_STATUS.copy()
        mock_status["database_connected"] = database_connected
        mock_status["database_error"] = database_error
        mock_status["documents_loaded"] = documents_loaded
        mock_status["vector_store"] = vector_store_info
        return mock_status

@app.get("/api/v1/experiment/config")
async def get_experiment_config():
    """Get experiment configuration values."""
    return {
        "chunk_strategy": CHUNK_STRATEGY,
        "retrieval_method": RETRIEVAL_METHOD,
        "chunk_size": CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
    }

@app.get("/api/corpus/chunks")
async def get_all_chunks():
    """Get all chunks from the vector database for heatmap visualization."""
    try:
        if not documents_loaded:
            # Return mock chunk data for development
            logger.info("📝 Returning mock chunk data (no real documents loaded)")
            return {
                "chunks": [
                    {"chunk_id": f"mock_chunk_{i:04d}", "doc_id": f"doc_{i//10}", "title": f"Mock Document {i//10}", "content": f"Mock chunk content {i}"}
                    for i in range(50)  # Mock 50 chunks
                ],
                "total_count": 50
            }
        
        # Get all points from Qdrant collection
        collection_info = qdrant_manager.client.get_collection(qdrant_manager.collection_name)
        total_points = collection_info.points_count
        
        if total_points == 0:
            logger.warning("⚠️ No chunks found in vector database")
            return {"chunks": [], "total_count": 0}
        
        # Scroll through all points in the collection
        all_chunks = []
        offset = None
        batch_size = 100
        
        while True:
            scroll_result = qdrant_manager.client.scroll(
                collection_name=qdrant_manager.collection_name,
                limit=batch_size,
                offset=offset,
                with_payload=True,
                with_vectors=False  # Don't need vectors for metadata
            )
            
            points, next_offset = scroll_result
            if not points:
                break
                
            for point in points:
                # Extract metadata from nested structure
                metadata = point.payload.get("metadata", {})
                
                # Use pre-stored processed metadata (doc_id, title) from chunk enhancement
                doc_id = metadata.get("doc_id", "unknown")
                title = metadata.get("title", "Unknown Document")
                
                chunk_data = {
                    "chunk_id": str(point.id),
                    "doc_id": doc_id,
                    "title": title,
                    "content": point.payload.get("page_content", "")[:200] + "..." if len(point.payload.get("page_content", "")) > 200 else point.payload.get("page_content", "")
                }
                all_chunks.append(chunk_data)
            
            if next_offset is None:
                break
            offset = next_offset
        
        logger.info(f"📊 Retrieved {len(all_chunks)} chunks from vector database")
        return {
            "chunks": all_chunks,
            "total_count": len(all_chunks)
        }
        
    except Exception as e:
        error_response = ErrorResponseService.log_and_return_error(
            error=e,
            context="Failed to get corpus chunks",
            error_type=ErrorType.INTERNAL_ERROR,
            user_message="Failed to retrieve corpus chunks. Please ensure Qdrant database is running and accessible."
        )
        # Maintain backward compatibility
        error_response["chunks"] = []
        error_response["total_count"] = 0
        error_response["database_connected"] = False
        error_response["database_error"] = str(e)
        return error_response

@app.get("/api/questions/llm")
async def get_llm_questions():
    return LLM_QUESTIONS["questions"]

@app.get("/api/questions/ragas")
async def get_ragas_questions():
    return RAGAS_QUESTIONS["questions"]

@app.get("/api/questions/ai-models")
async def get_ai_model_questions():
    return AI_MODEL_QUESTIONS["questions"]

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
    
    # Try to load experiment results if global is empty
    if not experiment_results:
        try:
            experiment_results = experiment_service.load_experiment_results()
            if experiment_results:
                logger.info(f"📂 Loaded {len(experiment_results)} experiment results for analysis")
        except Exception as e:
            logger.warning(f"⚠️ Could not load experiment results: {e}")
    
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
    per_question_results = experiment_service.convert_experiment_results_to_analysis(experiment_results)
    
    # Calculate and return analysis metrics
    return experiment_service.build_analysis_response(per_question_results)

@app.get("/api/v1/analysis/gaps")
async def get_gap_analysis():
    """Get gap analysis and recommendations based on current experiment results."""
    global experiment_results
    
    try:
        # Try to get the most recent experiment results
        results_to_analyze = None
        
        # First try the global experiment results
        if experiment_results:
            results_to_analyze = experiment_results
            logger.info(f"✅ Using global experiment results: {len(experiment_results)} questions")
        else:
            # Load from most recent saved experiment
            try:
                loaded_results = experiment_service.load_experiment_results()
                if loaded_results:
                    results_to_analyze = loaded_results
                    logger.info(f"✅ Using loaded experiment results: {len(loaded_results)} questions")
            except Exception as e:
                logger.warning(f"⚠️ Could not load experiment results: {e}")
                
        if not results_to_analyze:
            logger.warning("⚠️ No experiment results available for gap analysis, returning empty analysis")
            # Return an empty gap analysis so the frontend can show a no-data banner
            return gap_analysis_service.analyze_gaps([])
        
        logger.info(f"🔍 Performing gap analysis on {len(results_to_analyze)} experiment results")
        
        # Run gap analysis using the rule-based approach
        gap_analysis = gap_analysis_service.analyze_gaps(results_to_analyze)
        
        logger.info(f"📋 Gap analysis complete: {gap_analysis['gapSummary']['totalGaps']} gaps, {len(gap_analysis['recommendations'])} recommendations")
        
        return gap_analysis
        
    except Exception as e:
        logger.error(f"❌ Gap analysis failed: {str(e)}")
        return ErrorResponseService.log_and_return_error(
            ErrorType.INTERNAL_SERVER_ERROR,
            f"Gap analysis failed: {str(e)}",
            {"error": str(e)}
        )

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
        return ErrorResponseService.create_success_response("Experiment results cleared")
        
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e,
            context="Failed to clear experiment results",
            error_type=ErrorType.INTERNAL_ERROR,
            user_message="Failed to clear experiment results"
        )

@app.post("/api/results/test")
async def set_test_results():
    """Set test results for debugging (development only)."""
    global experiment_results
    
    # Create some test results with role data (keeping similarity format for internal processing)
    test_results = [
        {
            "question_id": "llm_q_001",
            "question": "How much can I borrow for my degree program?",
            "source": "llm",
            "role_name": "Current Student",
            "avg_similarity": 0.75,
            "retrieved_docs": [
                {"doc_id": "doc_1", "chunk_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "similarity": 0.8, "title": "Student Loan Limits"},
                {"doc_id": "doc_2", "chunk_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "similarity": 0.7, "title": "Borrowing Guidelines"}
            ]
        },
        {
            "question_id": "ragas_q_001", 
            "question": "What is the issue with Aidvantage in the borrower's complaint?",
            "source": "ragas",
            "role_name": "Borrower in Repayment",
            "avg_similarity": 0.65,
            "retrieved_docs": [
                {"doc_id": "doc_3", "chunk_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "similarity": 0.7, "title": "Servicer Complaints"},
                {"doc_id": "doc_4", "chunk_id": "d4e5f6a7-b8c9-0123-def1-234567890123", "similarity": 0.6, "title": "Aidvantage Issues"}
            ]
        },
        {
            "question_id": "llm_q_002",
            "question": "What are my repayment options after graduation?",
            "source": "llm",
            "role_name": "Recent Graduate",
            "avg_similarity": 0.85,
            "retrieved_docs": [
                {"doc_id": "doc_5", "chunk_id": "e5f6a7b8-c9d0-1234-ef12-345678901234", "similarity": 0.9, "title": "Repayment Plans"},
                {"doc_id": "doc_6", "chunk_id": "f6a7b8c9-d0e1-2345-f123-456789012345", "similarity": 0.8, "title": "Graduation Options"}
            ]
        },
        {
            "question_id": "ragas_q_002",
            "question": "What happens if I default on my student loans?",
            "source": "ragas",
            "role_name": "Borrower in Default",
            "avg_similarity": 0.72,
            "retrieved_docs": [
                {"doc_id": "doc_7", "chunk_id": "g7h8i9j0-k1l2-3456-mno7-890123456789", "similarity": 0.75, "title": "Default Consequences"},
                {"doc_id": "doc_8", "chunk_id": "h8i9j0k1-l2m3-4567-nop8-901234567890", "similarity": 0.69, "title": "Recovery Options"}
            ]
        }
    ]
    
    experiment_results = test_results
    experiment_service.save_experiment_results(experiment_results)
    
    logger.info("🧪 Set test experiment results")
    return {"success": True, "message": "Test results set", "count": len(test_results)}

@app.get("/api/experiments/list")
async def list_experiments():
    """List all available experiment files."""
    try:
        experiment_files = experiment_service.list_experiment_files()
        logger.info(f"📋 Listed {len(experiment_files)} experiment files")
        return {
            "success": True,
            "experiments": experiment_files
        }
    except Exception as e:
        error_response = ErrorResponseService.log_and_return_error(
            error=e,
            context="Failed to list experiments",
            error_type=ErrorType.INTERNAL_ERROR,
            user_message="Failed to retrieve experiment list"
        )
        error_response["experiments"] = []  # Maintain backward compatibility
        return error_response

@app.post("/api/experiments/load")
async def load_experiment(filename: str):
    """Load a specific experiment file."""
    global experiment_results
    
    try:
        results = experiment_service.load_experiment_results(filename)
        if results:
            experiment_results = results
            logger.info(f"📂 Loaded experiment {filename} with {len(results)} results")
            return ErrorResponseService.create_success_response(
                message=f"Loaded experiment {filename}",
                data={"count": len(results)}
            )
        else:
            return ErrorResponseService.not_found_error(
                resource="Experiment results",
                identifier=filename
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e,
            context=f"Failed to load experiment {filename}",
            error_type=ErrorType.INTERNAL_ERROR,
            user_message="Failed to load experiment"
        )

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
            return ErrorResponseService.not_found_error(
                resource="Experiment file",
                identifier=filename
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e,
            context=f"Failed to delete experiment {filename}",
            error_type=ErrorType.INTERNAL_ERROR,
            user_message="Failed to delete experiment"
        )

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
        experiment_service.save_experiment_results(experiment_results)
        
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
                    "role_name": group["role"]
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
                    "role_name": group["role"]
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
                "avg_quality_score": QualityScoreService.similarity_to_quality_score(result["avg_similarity"])
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
    Process a single question using enhanced RAG retrieval.
    
    Args:
        question: Question dictionary
        config: Experiment configuration
        
    Returns:
        Result dictionary with real similarity scores and retrieved docs
    """
    try:
        query = question["question"]
        
        # Use Advanced RAG v2 if enabled
        if config.use_advanced_v2:
            search_results, avg_similarity, diagnostics = advanced_rag_v2.advanced_retrieve(
                query=query,
                top_k=config.top_k
            )
            
            # Log diagnostics for monitoring
            logger.info(f"🚀 Advanced RAG v2 - Query type: {diagnostics.get('query_type')}, "
                       f"Sub-queries: {len(diagnostics.get('sub_queries', []))}, "
                       f"Final score: {avg_similarity:.3f}")
            
            retrieval_method = "advanced_v2"
            
        # Use enhanced RAG manager for better retrieval accuracy
        elif config.use_enhanced_retrieval:
            search_results, avg_similarity = enhanced_rag_manager.enhanced_retrieve(
                query=query,
                top_k=config.top_k
            )
            
            # Analyze retrieval quality for diagnostics
            quality_analysis = enhanced_rag_manager.analyze_retrieval_quality(query, search_results)
            logger.info(f"📊 Retrieval quality for '{query[:50]}...': {quality_analysis['quality']}")
            
            retrieval_method = "enhanced"
            
        else:
            # Fallback to standard search
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
            
            retrieval_method = "standard"
        
        # Format retrieved documents
        retrieved_docs = []
        for result in search_results:
            retrieved_docs.append({
                "doc_id": result["doc_id"],
                "chunk_id": result.get("chunk_id", "unknown"),
                "content": result.get("content", ""),
                "similarity": result["similarity"],
                "title": result["title"],
                "scoring_method": result.get("scoring_method", "standard")
            })
        
        return {
            **question,
            "avg_similarity": round(avg_similarity, 3),
            "retrieved_docs": retrieved_docs,
            "retrieval_method": retrieval_method
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

@app.post("/api/rag/configure")
async def configure_rag(config: Dict[str, Any]):
    """Configure enhanced RAG retrieval settings."""
    try:
        enhanced_rag_manager.update_config(**config)
        return {
            "status": "success",
            "message": "RAG configuration updated",
            "config": enhanced_rag_manager.config
        }
    except Exception as e:
        logger.error(f"❌ Failed to update RAG config: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/api/rag/compare")
async def compare_rag_methods(query: str = "What is GPT-5's performance?", top_k: int = 5):
    """Compare different RAG methods for a given query."""
    try:
        results = {}
        
        # Standard RAG
        standard_results = search_manager.vector_search(query, top_k)
        standard_score = sum(r.get('similarity', 0) for r in standard_results) / len(standard_results) if standard_results else 0
        results['standard'] = {
            'avg_score': round(standard_score, 3),
            'num_docs': len(standard_results),
            'method': 'Cosine similarity only'
        }
        
        # Enhanced RAG v1
        enhanced_results, enhanced_score = enhanced_rag_manager.enhanced_retrieve(query, top_k)
        results['enhanced_v1'] = {
            'avg_score': round(enhanced_score, 3),
            'num_docs': len(enhanced_results),
            'method': 'Query expansion + Hybrid scoring + Reranking',
            'improvement': round(((enhanced_score - standard_score) / standard_score * 100) if standard_score > 0 else 0, 1)
        }
        
        # Advanced RAG v2
        advanced_results, advanced_score, diagnostics = advanced_rag_v2.advanced_retrieve(query, top_k)
        results['advanced_v2'] = {
            'avg_score': round(advanced_score, 3),
            'num_docs': len(advanced_results),
            'method': 'Multi-stage + Contextual expansion + Answer-aware reranking',
            'improvement_vs_standard': round(((advanced_score - standard_score) / standard_score * 100) if standard_score > 0 else 0, 1),
            'improvement_vs_enhanced': round(((advanced_score - enhanced_score) / enhanced_score * 100) if enhanced_score > 0 else 0, 1),
            'diagnostics': {
                'query_type': diagnostics.get('query_type'),
                'sub_queries': diagnostics.get('sub_queries', []),
                'stages': len(diagnostics.get('stages', []))
            }
        }
        
        return {
            'query': query,
            'results': results,
            'recommendation': 'Advanced RAG v2' if advanced_score > enhanced_score else 'Enhanced RAG v1'
        }
        
    except Exception as e:
        logger.error(f"❌ RAG comparison failed: {e}")
        return {
            'error': str(e),
            'query': query
        }

@app.get("/api/rag/config")
async def get_rag_config():
    """Get current enhanced RAG configuration."""
    return {
        "config": enhanced_rag_manager.config,
        "description": {
            "use_query_expansion": "Expands queries with related terms",
            "use_reranking": "Reranks results for better relevance",
            "use_hybrid_search": "Combines semantic and keyword matching",
            "semantic_weight": "Weight for semantic similarity (0-1)",
            "keyword_weight": "Weight for keyword matching (0-1)",
            "min_similarity_threshold": "Minimum similarity score to include results"
        }
    }

@app.post("/api/corpus/reload")
async def reload_corpus(force_reindex: bool = False):
    """Reload the corpus data and optionally force re-indexing in vector store."""
    global documents_loaded
    
    try:
        logger.info("🔄 Reloading corpus data...")
        
        # Force reload of documents from disk
        doc_processor.__init__()  # Reinitialize to clear cache
        stats = doc_processor.get_corpus_stats()
        
        if stats["corpus_loaded"]:
            documents_loaded = True
            logger.info(f"✅ Found {stats['document_count']} documents")
            
            # If force_reindex is true, rebuild the vector store
            if force_reindex:
                logger.info("🔄 Force re-indexing documents in vector store...")
                try:
                    # Clear existing collection
                    qdrant_manager.client.delete_collection(qdrant_manager.collection_name)
                    logger.info("🗑️ Cleared existing vector store collection")
                    
                    # Reinitialize collection
                    qdrant_manager.initialize_collection()
                    logger.info("✨ Created new vector store collection")
                    
                    # Load and index all documents
                    combined_docs = data_manager.load_all_documents()
                    if combined_docs:
                        # Force re-creation of vector store with documents
                        doc_processor.vector_store_manager.initialize_vector_store_if_needed(combined_docs, force_rebuild=True)
                        search_manager.vector_store = None
                        search_manager.get_vector_store()
                        logger.info(f"✅ Re-indexed {len(combined_docs)} documents in vector store")
                    
                    return {
                        "success": True,
                        "message": "Corpus reloaded and re-indexed successfully",
                        "documents_loaded": stats["document_count"],
                        "chunks_created": stats.get("chunk_count", 0),
                        "vector_store_rebuilt": True,
                        "processor_ready": True
                    }
                except Exception as e:
                    logger.error(f"❌ Vector store re-indexing failed: {str(e)}")
                    return {
                        "success": True,
                        "message": f"Corpus reloaded but vector store re-indexing failed: {str(e)}",
                        "documents_loaded": stats["document_count"],
                        "vector_store_rebuilt": False,
                        "processor_ready": True
                    }
            else:
                return {
                    "success": True,
                    "message": "Corpus reloaded successfully (use force_reindex=true to rebuild vector store)",
                    "documents_loaded": stats["document_count"],
                    "chunks_created": stats.get("chunk_count", 0),
                    "vector_store_rebuilt": False,
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

@app.post("/api/corpus/rebuild")
async def rebuild_corpus():
    """Rebuild the corpus with enhanced metadata (for testing enhanced chunking)."""
    global documents_loaded
    
    try:
        logger.info("🔄 Rebuilding corpus with enhanced metadata...")
        
        # Load documents
        combined_docs = data_manager.load_all_documents()
        if not combined_docs:
            return {
                "success": False,
                "message": "No documents found to rebuild corpus",
                "documents_loaded": 0
            }
        
        # Force rebuild with enhanced metadata
        doc_processor.vector_store_manager.initialize_vector_store_if_needed(
            combined_docs, 
            force_rebuild=True
        )
        
        # Update document loaded status
        documents_loaded = True
        
        # Get final stats
        stats = doc_processor.get_corpus_stats()
        
        logger.info("✅ Corpus rebuilt successfully with enhanced metadata")
        return {
            "success": True,
            "message": "Corpus rebuilt successfully with enhanced metadata",
            "documents_loaded": stats["document_count"],
            "processor_ready": True,
            "enhanced_metadata": True
        }
            
    except Exception as e:
        logger.error(f"❌ Corpus rebuild failed: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": f"Rebuild failed: {str(e)}",
            "documents_loaded": 0,
            "processor_ready": False
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)