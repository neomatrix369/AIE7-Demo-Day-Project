# -*- coding: utf-8 -*-
"""
Backend Configuration Settings

Centralized configuration for all hardcoded values and constants.
This provides a single source of truth for all configuration values.
"""

import os
from typing import Dict, List

# =============================================================================
# CHUNKING AND RETRIEVAL CONFIGURATION
# =============================================================================

CHUNK_STRATEGY = {
    "recursive": "Recursive Character Text Splitting"
}

RETRIEVAL_METHOD = {
    "naive": "Naive Retrieval"
}

CHUNK_SIZE = 750
CHUNK_OVERLAP = 100

# =============================================================================
# QUALITY SCORE THRESHOLDS
# =============================================================================

QUALITY_THRESHOLDS = {
    'GOOD': 7.0,    # High quality threshold
    'DEVELOPING': 5.0,    # Minimum acceptable threshold
    'POOR': 0.0     # Below minimum threshold
}



# =============================================================================
# GAP ANALYSIS THRESHOLDS
# =============================================================================

GAP_ANALYSIS_THRESHOLDS = {
    'CRITICAL': 3.0,      # Critical performance issues
    'POOR': 4.0,          # Poor performance
    'DEVELOPING': 5.0,          # Developing performance
    'MINIMUM_ACCEPTABLE': 6.0,  # Minimum acceptable performance
    'MAX_SCORE': 10.0     # Maximum possible score
}

GAP_ANALYSIS_PERCENTAGES = {
    'IMPROVEMENT_POTENTIAL': 0.6,  # 60% improvement potential
    'REALISTIC_BOOST': 0.8,        # 80% of target as realistic boost
    'CRITICAL_IMPROVEMENT': 5.0    # Significant improvement for critical fixes
}

GAP_ANALYSIS_PRIORITY_SCORES = {
    'HIGH': 2.0,    # High priority threshold
    'MEDIUM': 1.0,  # Medium priority threshold
    'CRITICAL': 3.0 # Critical priority score
}

# =============================================================================
# VECTOR DATABASE CONFIGURATION
# =============================================================================

VECTOR_DB_CONFIG = {
    'VECTOR_SIZE': 1536,  # OpenAI text-embedding-3-small dimensions
    'TIMEOUT_SECONDS': 30,  # Connection timeout
    'HEALTH_CHECK_THRESHOLD': 0.8,  # 80% of expected documents for health check
    'INGESTION_TIMEOUT_SECONDS': 300  # 5 minutes timeout for ingestion operations
}

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

SERVER_CONFIG = {
    'HOST': '0.0.0.0',
    'PORT': 8000,
    'APP_TITLE': 'RagCheck API',
    'APP_VERSION': '1.0.0'
}

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_CONFIG = {
    'DEFAULT_ORIGINS': ['http://localhost:3000'],
    'ALLOW_METHODS': ['*'],
    'ALLOW_HEADERS': ['*']
}

# =============================================================================
# FILE AND PATH CONFIGURATION
# =============================================================================

FILE_CONFIG = {
    'DEFAULT_DATA_FOLDER': './data/',
    'QUESTIONS_SUBFOLDER': 'questions/',
    'LLM_QUESTIONS_FILE': 'llm-generated.json',
    'RAGAS_QUESTIONS_FILE': 'ragas-generated.json',
    'EXPERIMENT_RESULTS_FILE': 'experiment_results.json',
    'DEFAULT_CSV_FILE': 'complaints.csv',
    'PDF_GLOB_PATTERN': '*.pdf'
}

# =============================================================================
# COLLECTION AND DATABASE NAMES
# =============================================================================

COLLECTION_NAMES = {
    'DEFAULT_COLLECTION': 'student_loan_corpus'
}

# =============================================================================
# EXPERIMENT CONFIGURATION
# =============================================================================

EXPERIMENT_CONFIG = {
    'DEFAULT_TOP_K': 5,
    'DEFAULT_SIMILARITY_THRESHOLD': 0.5,
    'DEFAULT_SELECTED_GROUPS': ['llm', 'ragas']
}

# =============================================================================
# MOCK DATA CONFIGURATION
# =============================================================================

MOCK_DATA_CONFIG = {
    'DEFAULT_DOCUMENT_COUNT': 152,
    'DEFAULT_CHUNK_COUNT': 1247,
    'DEFAULT_TOTAL_SIZE_MB': 45.2,
    'DEFAULT_AVG_DOC_LENGTH': 2400,
    'SAMPLE_QUESTIONS_COUNT': 3
}

# =============================================================================
# ERROR MESSAGES
# =============================================================================

ERROR_MESSAGES = {
    'CORPUS_CHUNKS_FAILED': 'Failed to retrieve corpus chunks. Please ensure Qdrant database is running and accessible.',
    'CLEAR_RESULTS_FAILED': 'Failed to clear experiment results',
    'LIST_EXPERIMENTS_FAILED': 'Failed to retrieve experiment list',
    'LOAD_EXPERIMENT_FAILED': 'Failed to load experiment',
    'DELETE_EXPERIMENT_FAILED': 'Failed to delete experiment',
    'DOCUMENTS_NOT_LOADED': 'Documents not loaded',
    'SEARCH_FAILED': 'Search failed',
    'RELOAD_CORPUS_FAILED': 'Failed to reload corpus - check data folder',
    'VECTOR_STORE_INIT_FAILED': 'Vector store initialization failed',
    'DOCUMENT_PROCESSING_FAILED': 'Document processing initialization failed'
}

SUCCESS_MESSAGES = {
    'TEST_RESULTS_SET': 'Test results set',
    'EXPERIMENT_CLEARED': 'Experiment results cleared successfully',
    'EXPERIMENT_LOADED': 'Experiment loaded successfully',
    'EXPERIMENT_DELETED': 'Experiment deleted successfully',
    'CORPUS_RELOADED': 'Corpus reloaded successfully'
}

# =============================================================================
# LOGGING MESSAGES
# =============================================================================

LOG_MESSAGES = {
    'INIT_DOC_PROCESSING': '🚀 Initializing document processing and vector store...',
    'DOC_PROCESSING_SUCCESS': '✅ Document processing initialized successfully',
    'VECTOR_STORE_SUCCESS': '✅ Vector store initialized successfully',
    'NO_DOCUMENTS_FOUND': '⚠️ No documents found for vector store',
    'VECTOR_STORE_FALLBACK': '📝 Will use keyword search fallback',
    'MOCK_DATA_FALLBACK': '⚠️ No documents found - using mock data',
    'DOC_PROCESSING_FALLBACK': '📝 Falling back to mock data mode',
    'CORS_CONFIGURED': '🌐 CORS origins configured',
    'DB_CONNECTIVITY_VERIFIED': '✅ Database connectivity verified',
    'DB_CONNECTIVITY_ISSUE': '⚠️ Database connectivity issue',
    'RETURNING_MOCK_STATUS': '📝 Returning mock corpus status (documents not loaded or database not connected)'
}

# =============================================================================
# ENVIRONMENT VARIABLE DEFAULTS
# =============================================================================

ENV_DEFAULTS = {
    'QDRANT_URL': 'http://localhost:6333',
    'QDRANT_COLLECTION_NAME': 'student_loan_corpus',
    'DATA_FOLDER': './data/',
    'LOG_LEVEL': 'INFO',
    'BACKEND_HOST': '0.0.0.0',
    'BACKEND_PORT': '8000',
    'DEBUG': 'false'
}
