# Backend - RagCheck

FastAPI backend with real document processing, vector embeddings, and persistent storage using Qdrant.

> **📖 Main Documentation**: See the [main README](../README.md) for complete setup instructions and project overview.

## Architecture

### Document Processing Pipeline
1. **Document Discovery**: Automatic file discovery (CSV, PDF, MD, TXT, JSON) with subdirectory scanning
2. **Generic Document Loading**: Conditional processing with domain-specific handling and generic fallbacks
3. **Phase-Based Management**: Discovery → Ingestion → Selection with precise status tracking
4. **Text Chunking**: Documents split into configurable chunks (default: 750-char chunks with 100-char overlap)
5. **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions) with metadata tracking
6. **Vector Storage**: Qdrant database with selection-aware storage and real-time connectivity monitoring
7. **Caching**: Advanced caching system prevents expensive reprocessing with TTL and size management

### Key Components
- **`main.py`**: FastAPI application with REST API and WebSocket endpoints with enhanced experiment streaming
- **`unified_document_processor.py`**: Unified document processing with phase-based management and selection tracking
- **`managers/`**: Directory for business logic managers with service layer architecture:
  - `enhanced_qdrant_manager.py`: Enhanced vector database operations with selection-aware storage
  - `document_selection_manager.py`: Document selection status tracking and configuration management  
  - `corpus_statistics_manager.py`: Corpus analysis with real-time chunk counting
  - `search_manager.py`: Vector similarity search with caching (5min TTL)
  - `data_manager.py`: Generic document loading with conditional processing
  - `vector_store_manager.py`: Vector embedding and storage orchestration
- **`services/`**: Business logic services:
  - `quality_score_service.py`: Centralized quality score calculations and normalization
  - `experiment_service.py`: Enhanced experiment orchestration with memorable naming and metadata tracking
  - `gap_analysis_service.py`: Non-ML rule-based gap detection and recommendations engine
  - `error_response_service.py`: Standardized error handling and responses
- **`utils/`**: Utility modules:
  - `name_generator.py`: Docker-style experiment name generation with AI/ML themes
- **`test_qdrant.py`**: Qdrant connection testing utility with health checks
- **`logging_config.py`**: Centralized logging configuration with structured output

## Setup

### Docker Setup (Recommended)
See the [main README](../README.md) for service startup with `./start-services.sh`

### Manual Setup
```bash
cd backend

# Create virtual environment
uv venv
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Test Qdrant connection
uv run python test_qdrant.py

# Start development server
uvicorn main:app --reload
```

## API Endpoints

### REST Endpoints
- `GET /api/corpus/status` - Get corpus metadata and statistics with real-time chunk counts from Qdrant
- `GET /api/corpus/chunks` - Get all chunks from Qdrant database with pagination support
- `GET /api/questions/llm` - Get client-provided/approved queries (LLM support available when necessary) by role and category
- `GET /api/questions/ragas` - Get client-provided/approved queries (RAGAS support available when necessary) with metadata
- `POST /api/experiment/run` - Start vector similarity experiment with configurable parameters
- `GET /api/results/analysis` - Get comprehensive experiment analysis results with quality scoring
- `GET /api/v1/analysis/gaps` - NEW! Get gap analysis and actionable recommendations based on experiment results
- `GET /api/v1/experiment/config` - Get experiment configuration and chunking strategies

### WebSocket Endpoints
- `WS /ws/experiment/stream` - Real-time experiment progress streaming with error handling and reconnection

## Configuration

See [main README](../README.md) for environment setup. Key variables:
- `OPENAI_API_KEY` - Required
- `QDRANT_URL` - Vector database URL (default: http://localhost:6333)

### Data Folder Structure
```
./backend/data/
├── complaints.csv          # Domain-specific CSV data (special processing)
├── generic_data.csv        # Generic CSV files (content field extraction)
├── document1.pdf          # PDF documents
├── document2.md           # Markdown files
├── document3.txt          # Text files  
├── subdirectory/          # Subdirectories are automatically scanned
│   ├── more_docs.pdf
│   └── additional.csv
└── document_selection.json # Auto-generated selection tracking
```

## Performance Features

### Advanced Caching System
- **Search result caching**: 5-minute TTL cache with MD5-based query keys and LRU eviction
- **Cache statistics**: Automatic cleanup with size limits (100 entries) and performance monitoring  
- **Corpus statistics** cached to avoid recomputation with real-time database integration
- **Vector store** reuses existing Qdrant collections with health checks

### Vector Database Integration
- **Persistent storage** in Qdrant database with real-time connectivity monitoring
- **Efficient similarity search** with cosine distance and query optimization
- **Collection management** with automatic creation and health status reporting
- **Real-time chunk counting**: Actual database counts vs estimated calculations
- **Connection resilience**: Comprehensive error handling with fallback mechanisms

### Service Layer Architecture  
- **Manager Pattern**: Clear separation of concerns with dedicated managers for each domain
- **Service Extraction**: Business logic centralized in QualityScoreService and ExperimentService
- **Error Standardization**: Unified error responses via ErrorResponseService
- **Quality Score Normalization**: Consistent 0-10 scale with threshold-based categorization

## Development

### Adding New Document Types
1. Add loader in `DataManager._load_*()` methods in `managers/data_manager.py`
2. Update file discovery patterns in `UnifiedDocumentProcessor`
3. Add file type handling to document selection manager
4. Test with `test_qdrant.py` and verify auto-discovery

### Logging
- Comprehensive logging with context
- User-friendly messages for frontend
- Development vs production modes

## Dependencies

### Core
- **FastAPI**: Modern Python web framework
- **Qdrant Client**: Vector database client
- **LangChain**: Document processing framework
- **OpenAI**: Text embeddings API

### Document Processing
- **PyMuPDF**: PDF document loading
- **CSV Loader**: Structured data loading
- **Text Splitter**: Document chunking

### Utilities

- **Uvicorn**: ASGI server
- **Python-dotenv**: Environment management