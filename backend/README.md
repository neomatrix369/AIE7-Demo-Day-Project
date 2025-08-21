# Backend - RagCheck

FastAPI backend with real document processing, vector embeddings, and persistent storage using Qdrant.

> **📖 Main Documentation**: See the [main README](../README.md) for complete setup instructions and project overview.

## Architecture

### Document Processing Pipeline
1. **Document Loading**: CSV and PDF files loaded using LangChain
2. **Text Chunking**: Documents split into 750-char chunks with 100-char overlap
3. **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
4. **Vector Storage**: Qdrant database with cosine similarity search
5. **Caching**: Caching prevents expensive reprocessing

### Key Components
- **`main.py`**: FastAPI application with REST API and WebSocket endpoints (855 lines, comprehensive routing)
- **`simple_document_processor.py`**: Document processing orchestrator with manager integration
- **`managers/`**: Directory for business logic managers with service layer architecture:
  - `qdrant_manager.py`: Vector database operations and collection management
  - `corpus_statistics_manager.py`: Corpus analysis with real-time chunk counting
  - `search_manager.py`: Vector similarity search with caching (5min TTL)
  - `data_manager.py`: Document loading and preprocessing
  - `vector_store_manager.py`: Vector embedding and storage orchestration
- **`services/`**: Business logic services:
  - `quality_score_service.py`: Centralized quality score calculations and normalization
  - `experiment_service.py`: Experiment orchestration and result processing
  - `error_response_service.py`: Standardized error handling and responses
- **`test_qdrant.py`**: Qdrant connection testing utility with health checks
- **`logging_config.py`**: Centralized logging configuration with structured output

## Setup

### Prerequisites
- Python 3.8+
- Qdrant database running on `http://localhost:6333`
- OpenAI API key for embeddings

### Installation
```bash
cd backend

# Create virtual environment
uv venv
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Environment variables are automatically loaded from root .env file
# No manual export needed - the application reads from ../env
# Make sure you have copied .env.example to .env in the project root:
# cp .env.example .env (from project root)
```

### Testing
```bash
# Test Qdrant connection
uv run python test_qdrant.py

# Start development server
uvicorn main:app --reload
```

## API Endpoints

### REST Endpoints
- `GET /api/corpus/status` - Get corpus metadata and statistics with real-time chunk counts from Qdrant
- `GET /api/corpus/chunks` - Get all chunks from Qdrant database with pagination support
- `GET /api/questions/llm` - Get LLM-generated questions by role and category
- `GET /api/questions/ragas` - Get RAGAS-generated questions with metadata
- `POST /api/experiment/run` - Start vector similarity experiment with configurable parameters
- `GET /api/results/analysis` - Get comprehensive experiment analysis results with quality scoring
- `GET /api/v1/experiment/config` - Get experiment configuration and chunking strategies

### WebSocket Endpoints
- `WS /ws/experiment/stream` - Real-time experiment progress streaming with error handling and reconnection

## Configuration

### Environment Variables
Environment variables are loaded from the project root `.env` file. Copy `.env.example` to `.env` and configure:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Qdrant Configuration (with defaults)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=                              # Optional for local instances
QDRANT_COLLECTION_NAME=student_loan_corpus

# Logging
LOG_LEVEL=INFO

# Development (Optional)
FRONTEND_URL=http://localhost:3000
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
DEBUG=false
```

### Data Folder Structure
```
./backend/data/
├── complaints.csv          # Consumer complaint data  
├── document1.pdf          # PDF documents
├── document2.pdf
└── ...
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
1. Add loader in `SimpleDocumentProcessor.load_*_data()` methods
2. Update corpus statistics calculation
3. Test with `test_qdrant.py`

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