# -*- coding: utf-8 -*-
from fastapi import FastAPI, WebSocket, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import traceback
import asyncio
import random
import logging
import os
from logging_config import setup_logging
# Legacy imports removed - using unified processor instead
from services.quality_score_service import QualityScoreService
from services.experiment_service import ExperimentService
from services.gap_analysis_service import GapAnalysisService
from services.error_response_service import ErrorResponseService, ErrorType
from dotenv import load_dotenv
from config.settings import (
    SERVER_CONFIG, 
    CORS_CONFIG, 
    COLLECTION_NAMES, 
    FILE_CONFIG, 
    EXPERIMENT_CONFIG,
    MOCK_DATA_CONFIG,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    LOG_MESSAGES,
    ENV_DEFAULTS,
    CHUNK_STRATEGY,
    RETRIEVAL_METHOD,
    CHUNK_SIZE,
    CHUNK_OVERLAP
)
from datetime import datetime

# Add new imports for document management
from unified_document_processor import UnifiedDocumentProcessor

# Initialize unified document processor (replaces both simple and enhanced)
unified_doc_processor = UnifiedDocumentProcessor()

# Note: Legacy processors removed to prevent duplicate initialization
# All functionality now uses unified_doc_processor

# Load environment variables from root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

data_folder = os.getenv("DATA_FOLDER", ENV_DEFAULTS['DATA_FOLDER'])

app = FastAPI(title=SERVER_CONFIG['APP_TITLE'], version=SERVER_CONFIG['APP_VERSION'])

# Set up logging
logger = setup_logging(__name__)

# Initialize managers and services
# Note: doc_processor removed - using unified_doc_processor instead
# Note: qdrant_manager, data_manager, search_manager removed - using unified_doc_processor instead
experiment_service = ExperimentService()
gap_analysis_service = GapAnalysisService()
documents_loaded = False

# Global variables for experiment state
experiment_results = []
current_loaded_experiment = None
current_selected_documents = []  # Store selected documents for chunk coverage calculation
current_total_selected_chunks = 0  # Store total chunks count for selected documents

# Progress tracking for long-running operations
ingestion_progress = {}

# Don't automatically load experiment on startup - let users explicitly load what they want
# experiment_results = experiment_service.load_experiment_results()

# Try to load documents on startup using unified processor
try:
    logger.info(LOG_MESSAGES['INIT_DOC_PROCESSING'])
    
    # Use unified processor to check status and initialize if needed
    unified_status = unified_doc_processor.get_unified_status()
    
    if unified_status.get("corpus_loaded", False):
        documents_loaded = True
        logger.info(LOG_MESSAGES['DOC_PROCESSING_SUCCESS'])
        
        # Check if vector store is already populated
        if unified_status.get("chunk_count", 0) > 0:
            logger.info(f"📦 Vector store already populated with {unified_status.get('chunk_count', 0)} chunks, skipping document reload")
            logger.info(LOG_MESSAGES['VECTOR_STORE_SUCCESS'])
        else:
            logger.info("📥 Vector store empty, but unified processor will handle initialization when needed")
            logger.info(LOG_MESSAGES['VECTOR_STORE_SUCCESS'])
    else:
        logger.warning(LOG_MESSAGES['MOCK_DATA_FALLBACK'])
except Exception as e:
    logger.error(f"❌ {ERROR_MESSAGES['DOCUMENT_PROCESSING_FAILED']}: {str(e)}")
    logger.error(traceback.format_exc())
    logger.info(LOG_MESSAGES['DOC_PROCESSING_FALLBACK'])

# Configure CORS for both local and Vercel deployments
cors_origins = CORS_CONFIG['DEFAULT_ORIGINS'].copy()

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

logger.info(f"🌐 {LOG_MESSAGES['CORS_CONFIGURED']}: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=CORS_CONFIG['ALLOW_METHODS'],
    allow_headers=CORS_CONFIG['ALLOW_HEADERS'],
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

# Load LLM questions from the JSON file
LLM_QUESTIONS = load_questions_from_file(
    os.path.join(os.path.dirname(__file__), data_folder, FILE_CONFIG['QUESTIONS_SUBFOLDER'], FILE_CONFIG['LLM_QUESTIONS_FILE'])
)

# Load RAGAS questions from the JSON file
RAGAS_QUESTIONS = load_questions_from_file(
    os.path.join(os.path.dirname(__file__), data_folder, FILE_CONFIG['QUESTIONS_SUBFOLDER'], FILE_CONFIG['RAGAS_QUESTIONS_FILE'])
)



# Pydantic models
class ExperimentConfig(BaseModel):
    selected_groups: List[str]
    top_k: int = EXPERIMENT_CONFIG['DEFAULT_TOP_K']
    similarity_threshold: float = EXPERIMENT_CONFIG['DEFAULT_SIMILARITY_THRESHOLD']  # Keep internal processing in 0-1 scale

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
    
    try:
        # Test Qdrant connection using unified processor
        database_connected = unified_doc_processor._check_database_connectivity()
        if database_connected:
            logger.info("✅ Database connectivity verified")
        else:
            database_error = "Database connectivity check failed"
            logger.warning("⚠️ Database connectivity issue")
    except Exception as e:
        database_connected = False
        database_error = str(e)
        logger.warning(f"⚠️ Database connectivity issue: {e}")
    
    if documents_loaded and database_connected:
        # Use unified document processor to get comprehensive status
        try:
            # Get unified status (includes both corpus and selection information)
            unified_status = unified_doc_processor.get_unified_status()
            
            # Return in the format expected by the frontend
            corpus_stats = {
                "corpus_loaded": unified_status.get("corpus_loaded", False),
                "document_count": unified_status.get("document_count", 0),
                "chunk_count": unified_status.get("chunk_count", 0),
                "embedding_model": unified_status.get("embedding_model", ""),
                "corpus_metadata": unified_status.get("corpus_metadata", {}),
                "selected_chunks": unified_status.get("selected_chunks", 0),
                "deselected_chunks": unified_status.get("deselected_chunks", 0),
                "database_connected": unified_status.get("database_connected", True),
                "database_error": None
            }
            
            logger.info(f"📊 Unified corpus status: {unified_status.get('selected_chunks', 0)} selected, {unified_status.get('deselected_chunks', 0)} deselected chunks")
            return corpus_stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get unified corpus status: {e}")
            # Fallback to unified processor with error handling
            try:
                corpus_stats = unified_doc_processor.get_corpus_stats()
                corpus_stats["database_connected"] = True
                corpus_stats["database_error"] = None
                return corpus_stats
            except Exception as fallback_error:
                logger.error(f"❌ Fallback also failed: {fallback_error}")
                return {
                    "corpus_loaded": False,
                    "document_count": 0,
                    "chunk_count": 0,
                    "embedding_model": "unknown",
                    "corpus_metadata": {},
                    "database_connected": False,
                    "database_error": str(e)
                }
    else:
        # Return error status instead of mock data
        logger.warning("⚠️ No documents loaded or database not connected - returning error status")
        return {
            "corpus_loaded": False,
            "document_count": 0,
            "chunk_count": 0,
            "embedding_model": "unknown",
            "corpus_metadata": {
                "error": "No documents loaded",
                "message": "Please load documents first or check database connection",
                "database_connected": database_connected,
                "database_error": database_error if database_error else None
            },
            "database_connected": database_connected,
            "database_error": database_error,
            "documents_loaded": documents_loaded,
            "status": "error",
            "error_message": "No documents loaded or database not connected"
        }

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
            # Return error instead of mock data
            logger.warning("⚠️ No documents loaded - cannot retrieve chunks")
            return {
                "chunks": [],
                "total_count": 0,
                "error": "No documents loaded",
                "message": "Please load documents first before accessing chunks",
                "status": "error"
            }
        
        # Get all points from Qdrant collection using unified processor
        qdrant_stats = unified_doc_processor.qdrant_manager.get_document_statistics()
        total_points = qdrant_stats.get("total_chunks", 0)
        
        if total_points == 0:
            logger.warning("⚠️ No chunks found in vector database")
            return {"chunks": [], "total_count": 0}
        
        # Scroll through all points in the collection
        all_chunks = []
        offset = None
        batch_size = 100
        
        while True:
            scroll_result = unified_doc_processor.qdrant_manager.client.scroll(
                collection_name=unified_doc_processor.qdrant_manager.collection_name,
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
                
                # Use descriptive chunk_id from payload instead of numeric point.id
                chunk_id = point.payload.get("chunk_id", str(point.id))
                
                chunk_data = {
                    "chunk_id": chunk_id,
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
    """Get analysis results from the currently loaded experiment."""
    global experiment_results, current_loaded_experiment, current_selected_documents, current_total_selected_chunks
    
    if not experiment_results:
        logger.warning("⚠️ No experiment loaded, returning empty analysis")
        return {
            "overall": {
                "avg_quality_score": 0.0,
                "success_rate": 0.0,
                "total_questions": 0,

                "key_insight": "No experiment loaded. Please load an experiment from the Experiments page."
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
    
    # Calculate and return analysis metrics with selected documents and chunk count for chunk coverage
    return experiment_service.build_analysis_response(per_question_results, current_selected_documents, current_total_selected_chunks)

@app.get("/api/v1/analysis/status")
async def get_analysis_status():
    """Get current analysis status and loaded experiment info."""
    global experiment_results, current_loaded_experiment
    
    return {
        "experiment_loaded": len(experiment_results) > 0 if experiment_results else False,
        "experiment_count": len(experiment_results) if experiment_results else 0,
        "experiment_sample": experiment_results[:2] if experiment_results and len(experiment_results) > 0 else None,
        "current_experiment": current_loaded_experiment,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/analysis/gaps")
async def get_gap_analysis():
    """Get gap analysis and recommendations based on current experiment results."""
    global experiment_results
    
    try:
        # Try to get the most recent experiment results
        results_to_analyze = None
        
        # Use the currently loaded experiment results
        if experiment_results:
            results_to_analyze = experiment_results
            logger.info(f"✅ Using loaded experiment results: {len(experiment_results)} questions")
            logger.debug(f"📊 Loaded experiment results sample: {experiment_results[:2] if len(experiment_results) > 0 else 'empty'}")
        else:
            logger.warning("⚠️ No experiment loaded for gap analysis")
                
        if not results_to_analyze:
            logger.warning("⚠️ No experiment results available for gap analysis, returning empty analysis")
            logger.info(f"🔍 Debug: Global experiment_results length: {len(experiment_results) if experiment_results else 0}")
            # Return an empty gap analysis so the frontend can show a no-data banner
            return gap_analysis_service.analyze_gaps([])
        
        logger.info(f"🔍 Performing gap analysis on {len(results_to_analyze)} experiment results")
        
        # Debug: Check data format
        if results_to_analyze and len(results_to_analyze) > 0:
            sample_result = results_to_analyze[0]
            logger.debug(f"📊 Sample result keys: {list(sample_result.keys())}")
            logger.debug(f"📊 Sample result has avg_quality_score: {'avg_quality_score' in sample_result}")
            logger.debug(f"📊 Sample result has role_name: {'role_name' in sample_result}")
        
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
    global experiment_results, current_loaded_experiment, current_selected_documents, current_total_selected_chunks
    
    try:
        experiment_results.clear()
        current_loaded_experiment = None
        current_selected_documents = []
        current_total_selected_chunks = 0
        
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
            "question": "How do I implement feature X in my application?",
            "source": "llm",
            "role_name": "Developer",
            "avg_similarity": 0.75,
            "retrieved_docs": [
                {"doc_id": "doc_1", "chunk_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "similarity": 0.8, "title": "Implementation Guide"},
                {"doc_id": "doc_2", "chunk_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "similarity": 0.7, "title": "Best Practices"}
            ]
        },
        {
            "question_id": "ragas_q_001", 
            "question": "What are the common issues with system Y?",
            "source": "ragas",
            "role_name": "System Administrator",
            "avg_similarity": 0.65,
            "retrieved_docs": [
                {"doc_id": "doc_3", "chunk_id": "c3d4e5f6-a7b8-9012-cdef-123456789012", "similarity": 0.7, "title": "Troubleshooting Guide"},
                {"doc_id": "doc_4", "chunk_id": "d4e5f6a7-b8c9-0123-def1-234567890123", "similarity": 0.6, "title": "Common Issues"}
            ]
        },
        {
            "question_id": "llm_q_002",
            "question": "What are the configuration options for service Z?",
            "source": "llm",
            "role_name": "DevOps Engineer",
            "avg_similarity": 0.85,
            "retrieved_docs": [
                {"doc_id": "doc_5", "chunk_id": "e5f6a7b8-c9d0-1234-ef12-345678901234", "similarity": 0.9, "title": "Configuration Guide"},
                {"doc_id": "doc_6", "chunk_id": "f6a7b8c9-d0e1-2345-f123-456789012345", "similarity": 0.8, "title": "Service Documentation"}
            ]
        },
        {
            "question_id": "ragas_q_002",
            "question": "How do I resolve critical error ABC?",
            "source": "ragas",
            "role_name": "Support Engineer",
            "avg_similarity": 0.72,
            "retrieved_docs": [
                {"doc_id": "doc_7", "chunk_id": "g7h8i9j0-k1l2-3456-mno7-890123456789", "similarity": 0.75, "title": "Error Resolution"},
                {"doc_id": "doc_8", "chunk_id": "h8i9j0k1-l2m3-4567-nop8-901234567890", "similarity": 0.69, "title": "Troubleshooting Steps"}
            ]
        }
    ]
    
    experiment_results = test_results
    experiment_service.save_experiment_results(experiment_results, {"config": {"top_k": 5, "similarity_threshold": 0.5}})
    
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
    global experiment_results, current_loaded_experiment, current_selected_documents, current_total_selected_chunks
    
    try:
        # Load the full experiment data to get metadata
        import os
        import json
        experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
        filepath = os.path.join(experiments_folder, filename)
        
        if not os.path.exists(filepath):
            return ErrorResponseService.not_found_error(
                resource="Experiment file",
                identifier=filename
            )
        
        # Load full experiment data
        with open(filepath, 'r') as f:
            experiment_data = json.load(f)
        
        # Extract question results and selected documents
        results = experiment_data.get("question_results", [])
        selected_documents = experiment_data.get("metadata", {}).get("selected_documents", [])
        total_selected_chunks = experiment_data.get("metadata", {}).get("total_selected_chunks", 0)
        
        if results:
            experiment_results = results
            current_loaded_experiment = filename
            current_selected_documents = selected_documents
            current_total_selected_chunks = total_selected_chunks
            logger.info(f"📂 Loaded experiment {filename} with {len(results)} results and {len(selected_documents)} selected documents")
            return ErrorResponseService.create_success_response(
                message=f"Loaded experiment {filename}",
                data={"count": len(results), "filename": filename, "selected_documents": selected_documents}
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

@app.get("/api/experiments/data/{filename}")
async def get_experiment_data(filename: str):
    """Get full experiment data for comparison purposes."""
    try:
        # Load the experiment file directly
        import os
        import json
        experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
        filepath = os.path.join(experiments_folder, filename)
        
        if not os.path.exists(filepath):
            return ErrorResponseService.not_found_error(
                resource="Experiment file",
                identifier=filename
            )
        
        with open(filepath, 'r') as f:
            experiment_data = json.load(f)
        
        logger.info(f"📂 Retrieved full experiment data for {filename}")
        return {
            "success": True,
            "message": f"Retrieved experiment data for {filename}",
            "data": experiment_data
        }
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e,
            context=f"Failed to get experiment data for {filename}",
            error_type=ErrorType.INTERNAL_ERROR,
            user_message="Failed to retrieve experiment data"
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
    
    # Track experiment timing
    experiment_start_time = datetime.now()
    logger.info(f"⏱️ Experiment started at: {experiment_start_time.isoformat()}")
    
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
        # Create a local list for this experiment to avoid overwriting loaded experiments
        current_experiment_results = []
        await stream_question_results(websocket, all_questions, config, current_experiment_results)
        
        # Calculate experiment timing
        experiment_end_time = datetime.now()
        experiment_duration = (experiment_end_time - experiment_start_time).total_seconds()
        logger.info(f"⏱️ Experiment completed in {experiment_duration:.2f} seconds")
        
        # Save experiment results with config and timing
        saved_filename = experiment_service.save_experiment_results(
            current_experiment_results, 
            {
                "config": config.dict(),
                "timing": {
                    "start_time": experiment_start_time.isoformat(),
                    "end_time": experiment_end_time.isoformat(),
                    "duration_seconds": experiment_duration
                }
            }
        )
        
        # Update global variables to track this as the current experiment
        global experiment_results, current_loaded_experiment, current_selected_documents, current_total_selected_chunks
        experiment_results = current_experiment_results
        current_loaded_experiment = saved_filename
        
        # Extract selected documents and chunks info from the saved experiment
        try:
            import os
            import json
            experiments_folder = os.path.join(os.path.dirname(__file__), '..', 'experiments')
            saved_filepath = os.path.join(experiments_folder, saved_filename)
            
            if os.path.exists(saved_filepath):
                with open(saved_filepath, 'r') as f:
                    experiment_data = json.load(f)
                current_selected_documents = experiment_data.get("metadata", {}).get("selected_documents", [])
                current_total_selected_chunks = experiment_data.get("metadata", {}).get("total_selected_chunks", 0)
                logger.info(f"📊 Updated current experiment tracking: {len(current_selected_documents)} documents, {current_total_selected_chunks} chunks")
        except Exception as e:
            logger.warning(f"Could not extract metadata from saved experiment: {e}")
            current_selected_documents = []
            current_total_selected_chunks = 0
        
        # Send completion signal with timing info and saved filename
        logger.info(f"🏁 Sending completion signal with saved filename: {saved_filename}")
        await websocket.send_json({
            "type": "completed", 
            "message": "Experiment completed",
            "saved_filename": saved_filename,
            "timing": {
                "start_time": experiment_start_time.isoformat(),
                "end_time": experiment_end_time.isoformat(),
                "duration_seconds": experiment_duration
            }
        })
    except Exception as e:
        experiment_end_time = datetime.now()
        experiment_duration = (experiment_end_time - experiment_start_time).total_seconds()
        logger.error(f"❌ Experiment failed after {experiment_duration:.2f} seconds: {e}")
        await websocket.send_json({
            "type": "error", 
            "message": f"Experiment failed: {str(e)}",
            "timing": {
                "start_time": experiment_start_time.isoformat(),
                "end_time": experiment_end_time.isoformat(),
                "duration_seconds": experiment_duration
            }
        })
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

async def stream_question_results(websocket: WebSocket, questions: List[Dict[str, Any]], config: ExperimentConfig, results_list: List[Dict[str, Any]]) -> None:
    """
    Stream processing results for each question using real vector search.
    
    Args:
        websocket: WebSocket connection
        questions: List of questions to process
        config: Experiment configuration
        results_list: List to store experiment results
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
            
            # Store the result in the provided list
            results_list.append(result)
            
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
        search_results = unified_doc_processor.search_documents(
            query=query,
            limit=config.top_k,
            filter_selected=True
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
                "chunk_id": result.get("chunk_id", "unknown"),
                "content": result.get("content", ""),
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
                            "documents_loaded": unified_doc_processor.get_corpus_stats()["document_count"] if documents_loaded else 0,
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
        
        # Perform vector search using unified processor
        results = unified_doc_processor.search_documents(query, top_k, filter_selected=True)
        
        logger.info(f"📚 Found {len(results)} relevant documents")
        
        return {
            "query": query,
            "results": results,
            "total_found": len(results),
            "search_method": "vector_similarity"
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
        
        # Get stats from unified processor
        stats = unified_doc_processor.get_corpus_stats()
        
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

@app.post("/api/corpus/rebuild")
async def rebuild_corpus():
    """Rebuild the corpus with enhanced metadata (for testing enhanced chunking)."""
    global documents_loaded
    
    try:
        logger.info("🔄 Rebuilding corpus with enhanced metadata...")
        
        # Use unified processor to scan and update documents
        scan_result = unified_doc_processor.scan_and_update_documents()
        if scan_result.get("new_documents_added", 0) == 0:
            return {
                "success": False,
                "message": "No documents found to rebuild corpus",
                "documents_loaded": 0
            }
        
        # Force rebuild using unified processor
        success = unified_doc_processor.force_rebuild_collection()
        if not success:
            return {
                "success": False,
                "message": "Failed to rebuild corpus",
                "documents_loaded": 0
            }
        
        # Update document loaded status
        documents_loaded = True
        
        # Get final stats
        stats = unified_doc_processor.get_corpus_stats()
        
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

@app.get("/api/documents/status")
async def get_document_status():
    """Get comprehensive document status and selection information."""
    try:
        # Use unified processor for document status
        status = unified_doc_processor.get_document_status()
        logger.info("📊 Retrieved document status from unified processor")
        return {"success": True, "data": status}
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to get document status",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to retrieve document status"
        )

@app.post("/api/documents/select/{filename}")
async def select_document(filename: str):
    """Select a document for ingestion."""
    try:
        success = unified_doc_processor.select_document(filename)
        if success:
            logger.info(f"✅ Document selected: {filename}")
            return {"success": True, "message": f"Document '{filename}' selected successfully"}
        else:
            return ErrorResponseService.log_and_return_error(
                error=None, context=f"Failed to select document {filename}",
                error_type=ErrorType.VALIDATION_ERROR, user_message=f"Failed to select document '{filename}'"
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context=f"Failed to select document {filename}",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to select document"
        )


@app.post("/api/documents/deselect/{filename}")
async def deselect_document(filename: str):
    """Deselect a document (retain vectors but exclude from search)."""
    try:
        success = unified_doc_processor.deselect_document(filename)
        if success:
            logger.info(f"✅ Document deselected: {filename}")
            return {"success": True, "message": f"Document '{filename}' deselected successfully (vectors retained)"}
        else:
            return ErrorResponseService.log_and_return_error(
                error=None, context=f"Failed to deselect document {filename}",
                error_type=ErrorType.VALIDATION_ERROR, user_message=f"Failed to deselect document '{filename}'"
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context=f"Failed to deselect document {filename}",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to deselect document"
        )

@app.websocket("/ws/progress")
async def progress_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time progress updates."""
    await websocket.accept()
    try:
        while True:
            # Only send progress if there's active progress data and it's not empty
            if ingestion_progress and len(ingestion_progress) > 0:
                active_progress = {
                    filename: progress for filename, progress in ingestion_progress.items()
                    if progress.get('stage') not in ['complete', 'error']
                }
                
                if active_progress:
                    await websocket.send_json({
                        "type": "progress_update",
                        "data": active_progress
                    })
            
            await asyncio.sleep(2)  # Update every 2 seconds instead of 1 to reduce frequency
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        await websocket.close()

def update_ingestion_progress(progress_data: dict):
    """Update ingestion progress for WebSocket clients."""
    global ingestion_progress
    filename = progress_data.get('filename', 'unknown')
    
    # Update progress
    ingestion_progress[filename] = progress_data
    logger.info(f"📊 Progress update: {progress_data.get('message', 'Unknown')}")
    
    # Clean up completed progress after a delay
    if progress_data.get('stage') in ['complete', 'error']:
        def cleanup_progress():
            global ingestion_progress
            if filename in ingestion_progress:
                del ingestion_progress[filename]
                logger.info(f"🧹 Cleaned up progress for {filename}")
        
        # Schedule cleanup after 30 seconds (longer delay for polling)
        import threading
        timer = threading.Timer(30.0, cleanup_progress)
        timer.daemon = True
        timer.start()

@app.post("/api/documents/ingest/{filename}")
async def ingest_document(filename: str):
    """Ingest a specific document into the vector store with progress tracking."""
    try:
        # Initialize progress tracking
        update_ingestion_progress({
            "filename": filename,
            "stage": "starting",
            "percentage": 0,
            "message": f"Starting ingestion for {filename}",
            "timestamp": datetime.now().isoformat()
        })
        
        # Start ingestion asynchronously with progress tracking
        def progress_callback(progress_data):
            update_ingestion_progress({
                "filename": filename,
                **progress_data,
                "timestamp": datetime.now().isoformat()
            })
        
        # Run ingestion in a thread to avoid blocking
        import threading
        def run_ingestion():
            try:
                success = unified_doc_processor.ingest_document(filename, progress_callback)
                if success:
                    update_ingestion_progress({
                        "filename": filename,
                        "stage": "complete",
                        "percentage": 100,
                        "message": f"Successfully ingested {filename}",
                        "timestamp": datetime.now().isoformat()
                    })
                else:
                    update_ingestion_progress({
                        "filename": filename,
                        "stage": "error",
                        "percentage": 0,
                        "message": f"Failed to ingest {filename}",
                        "timestamp": datetime.now().isoformat()
                    })
            except Exception as e:
                update_ingestion_progress({
                    "filename": filename,
                    "stage": "error",
                    "percentage": 0,
                    "message": f"Error during ingestion: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                })
        
        # Start the ingestion thread
        thread = threading.Thread(target=run_ingestion)
        thread.daemon = True
        thread.start()
        
        # Return immediate response
        logger.info(f"🔄 Started ingestion process for: {filename}")
        return {
            "success": True, 
            "message": f"Ingestion started for '{filename}'. Monitor progress via WebSocket.",
            "progress_websocket": "/ws/progress"
        }
        
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context=f"Failed to start ingestion for {filename}",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to start ingestion"
        )

@app.get("/api/documents/ingestion-progress")
async def get_ingestion_progress():
    """Get current ingestion progress status."""
    try:
        return {
            "success": True,
            "data": ingestion_progress,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to get ingestion progress",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to get ingestion progress"
        )

@app.post("/api/documents/ingest-pending")
async def ingest_pending_documents():
    """Ingest all documents that are selected but not yet ingested."""
    try:
        # Trigger ingestion of pending documents
        unified_doc_processor.ingest_pending_documents()
        logger.info("✅ Pending documents ingestion completed")
        return {"success": True, "message": "Pending documents ingestion completed"}
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to ingest pending documents",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to ingest pending documents"
        )

@app.post("/api/documents/reingest-changed")
async def reingest_changed_documents():
    """Re-ingest documents that have changed since last ingestion."""
    try:
        success = unified_doc_processor.reingest_changed_documents()
        if success:
            logger.info("✅ Changed documents re-ingestion completed")
            return {"success": True, "message": "Changed documents re-ingestion completed"}
        else:
            return ErrorResponseService.log_and_return_error(
                error=None, context="Failed to re-ingest changed documents",
                error_type=ErrorType.VALIDATION_ERROR, user_message="Failed to re-ingest changed documents"
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to re-ingest changed documents",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to re-ingest changed documents"
        )

@app.post("/api/documents/scan")
async def load_documents():
    """Scan data folder and add new documents to the tracked list."""
    try:
        result = unified_doc_processor.scan_and_update_documents()
        logger.info("✅ Document load completed")
        return {"success": True, "data": result, "message": f"Document load completed: {result.get('new_documents_added', 0)} new documents added"}
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to load documents",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to load documents"
        )

@app.post("/api/documents/rebuild")
async def rebuild_collection():
    """Force rebuild the entire collection (use with caution)."""
    try:
        success = unified_doc_processor.force_rebuild_collection()
        if success:
            logger.info("✅ Collection rebuild completed")
            return {"success": True, "message": "Collection rebuild completed successfully"}
        else:
            return ErrorResponseService.log_and_return_error(
                error=None, context="Failed to rebuild collection",
                error_type=ErrorType.VALIDATION_ERROR, user_message="Failed to rebuild collection"
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to rebuild collection",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to rebuild collection"
        )

@app.post("/api/documents/refresh-selection")
async def refresh_chunk_selection():
    """Force refresh the selection status of all chunks."""
    try:
        success = unified_doc_processor.refresh_chunk_selection_status()
        if success:
            logger.info("✅ Chunk selection status refreshed successfully")
            return {"success": True, "message": "Chunk selection status refreshed successfully"}
        else:
            return ErrorResponseService.log_and_return_error(
                error=None, context="Failed to refresh chunk selection status",
                error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to refresh chunk selection status"
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to refresh chunk selection status",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to refresh chunk selection status"
        )

@app.get("/api/documents/validate-metadata")
async def validate_chunk_metadata():
    """Validate that all chunks have the required metadata fields."""
    try:
        validation_results = unified_doc_processor.validate_chunk_metadata()
        if validation_results:
            logger.info("✅ Chunk metadata validation completed")
            return {"success": True, "data": validation_results}
        else:
            return ErrorResponseService.log_and_return_error(
                error=None, context="Failed to validate chunk metadata",
                error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to validate chunk metadata"
            )
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to validate chunk metadata",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to validate chunk metadata"
        )

@app.get("/api/documents/search")
async def search_documents(query: str, limit: int = 10, filter_selected: bool = True):
    """Search documents with optional selection filter."""
    try:
        results = unified_doc_processor.search_documents(query, limit, filter_selected)
        logger.info(f"🔍 Document search completed: {len(results)} results")
        return {"success": True, "data": results, "count": len(results)}
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to search documents",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to search documents"
        )

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document from the browser to the backend data folder."""
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.csv', '.txt', '.md', '.json']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            return ErrorResponseService.log_and_return_error(
                error=None, context=f"Invalid file type: {file_extension}",
                error_type=ErrorType.VALIDATION_ERROR, 
                user_message=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Create data folder if it doesn't exist
        os.makedirs(data_folder, exist_ok=True)
        
        # Save file to data folder
        file_path = os.path.join(data_folder, file.filename)
        
        # Check if file already exists
        if os.path.exists(file_path):
            return ErrorResponseService.log_and_return_error(
                error=None, context=f"File already exists: {file.filename}",
                error_type=ErrorType.VALIDATION_ERROR, 
                user_message=f"File '{file.filename}' already exists in the data folder"
            )
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Add the document to tracking (but don't auto-select it)
        success = unified_doc_processor.selection_manager.add_document_to_tracking(file.filename)
        
        if success:
            logger.info(f"✅ Document uploaded and added to tracking: {file.filename}")
            return {
                "success": True, 
                "message": f"Document '{file.filename}' uploaded successfully and added to tracking",
                "filename": file.filename,
                "size_bytes": len(content)
            }
        else:
            # File was saved but couldn't be added to tracking
            logger.warning(f"⚠️ Document uploaded but failed to add to tracking: {file.filename}")
            return {
                "success": True, 
                "message": f"Document '{file.filename}' uploaded successfully but failed to add to tracking",
                "filename": file.filename,
                "size_bytes": len(content)
            }
            
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context=f"Failed to upload document {file.filename if file else 'unknown'}",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to upload document"
        )

@app.post("/api/documents/delete/{filename}")
async def delete_document(filename: str):
    """Delete a document from the backend data folder and tracking."""
    try:
        # Check if document exists in tracking
        if not unified_doc_processor.selection_manager.document_exists_in_tracking(filename):
            return ErrorResponseService.log_and_return_error(
                error=None, context=f"Document not found in tracking: {filename}",
                error_type=ErrorType.VALIDATION_ERROR, 
                user_message=f"Document '{filename}' not found in tracking"
            )
        
        # Check if document is selected (prevent deletion of selected documents)
        if unified_doc_processor.selection_manager.is_document_selected(filename):
            return ErrorResponseService.log_and_return_error(
                error=None, context=f"Cannot delete selected document: {filename}",
                error_type=ErrorType.VALIDATION_ERROR, 
                user_message=f"Cannot delete selected document '{filename}'. Please deselect it first."
            )
        
        # Delete file from data folder
        file_path = os.path.join(data_folder, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"✅ File deleted from data folder: {filename}")
        
        # Remove document from tracking
        success = unified_doc_processor.selection_manager.remove_document_from_tracking(filename)
        
        if success:
            logger.info(f"✅ Document removed from tracking: {filename}")
            return {
                "success": True, 
                "message": f"Document '{filename}' deleted successfully"
            }
        else:
            # File was deleted but couldn't be removed from tracking
            logger.warning(f"⚠️ File deleted but failed to remove from tracking: {filename}")
            return {
                "success": True, 
                "message": f"Document '{filename}' deleted but failed to remove from tracking"
            }
            
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context=f"Failed to delete document {filename}",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to delete document"
        )

# Note: Document config APIs removed - now handled by unified storage adapter system

@app.post("/api/documents/clear-cache")
async def clear_document_cache():
    """Clear document cache and force reload from configuration."""
    try:
        # Force reload of document selection configuration
        unified_doc_processor.selection_manager.selection_config = unified_doc_processor.selection_manager._load_selection_config()
        
        logger.info("🗑️ Document cache cleared and configuration reloaded")
        return {
            "success": True,
            "message": "Document cache cleared and configuration reloaded"
        }
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to clear document cache",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to clear document cache"
        )

@app.get("/api/environment")
async def get_environment_info():
    """Get environment information for client-side adaptation."""
    try:
        from utils.environment import get_deployment_info
        
        deployment_info = get_deployment_info()
        logger.info("🌐 Retrieved environment information")
        
        return {
            "success": True,
            "environment": {
                "is_cloud": deployment_info["is_cloud"],
                "is_railway": deployment_info["is_railway"],
                "is_vercel": deployment_info["is_vercel"],
                "deployment_env": deployment_info["deployment_env"],
                "supports_file_system": not deployment_info["is_filesystem_readonly"]
            }
        }
    except Exception as e:
        return ErrorResponseService.log_and_return_error(
            error=e, context="Failed to get environment info",
            error_type=ErrorType.INTERNAL_ERROR, user_message="Failed to retrieve environment information"
        )

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources when the application shuts down."""
    try:
        logger.info("🔄 Shutting down application...")
        
        # Close Qdrant connections
        if hasattr(unified_doc_processor, 'qdrant_manager') and unified_doc_processor.qdrant_manager:
            unified_doc_processor.qdrant_manager.close_connection()
            logger.info("🔌 Closed Qdrant connection")
        
        logger.info("✅ Application shutdown complete")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

@app.get("/api/debug/globals")
async def debug_globals():
    """Debug endpoint to check global variables."""
    global experiment_results, current_loaded_experiment, current_selected_documents, current_total_selected_chunks
    
    return {
        "experiment_results_count": len(experiment_results) if experiment_results else 0,
        "current_loaded_experiment": current_loaded_experiment,
        "current_selected_documents": current_selected_documents,
        "current_total_selected_chunks": current_total_selected_chunks
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)