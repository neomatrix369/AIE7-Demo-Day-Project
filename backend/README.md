# Backend - Corpus Quality Assessment Tool

FastAPI backend with real document processing, vector embeddings, and persistent storage using Qdrant.

## Architecture

### Document Processing Pipeline
1. **Document Loading**: CSV and PDF files loaded using LangChain
2. **Text Chunking**: Documents split into 750-char chunks with 100-char overlap
3. **Vector Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
4. **Vector Storage**: Qdrant database with cosine similarity search
5. **Caching**: Joblib caching prevents expensive reprocessing

### Key Components
- **`main.py`**: FastAPI application with REST API and WebSocket endpoints
- **`simple_document_processor.py`**: Document processing and Qdrant integration
- **`test_qdrant.py`**: Qdrant connection testing utility
- **`logging_config.py`**: Centralized logging configuration

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
- `GET /api/corpus/status` - Get corpus metadata and statistics
- `GET /api/questions/llm` - Get LLM-generated questions
- `GET /api/questions/ragas` - Get RAGAS-generated questions  
- `POST /api/experiment/run` - Start vector similarity experiment
- `GET /api/results/analysis` - Get experiment analysis results

### WebSocket Endpoints
- `WS /ws/experiment/stream` - Real-time experiment progress streaming

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

# Data and Cache Configuration  
DATA_FOLDER=../data/                         # Relative to backend directory
CACHE_FOLDER=./cache                         # Relative to backend directory

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
../data/
├── complaints.csv          # Consumer complaint data  
├── document1.pdf          # PDF documents
├── document2.pdf
└── ...
```

## Performance Features

### Caching System
- **Joblib caching** prevents expensive document reprocessing
- **Corpus statistics** cached to avoid recomputation
- **Vector store** reuses existing Qdrant collections

### Vector Database
- **Persistent storage** in Qdrant database
- **Efficient similarity search** with cosine distance
- **Collection management** with automatic creation

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
- **Joblib**: Caching and persistence
- **Uvicorn**: ASGI server
- **Python-dotenv**: Environment management