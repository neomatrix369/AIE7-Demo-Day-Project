# Corpus Quality Assessment Tool

A 4-screen wizard application for assessing corpus quality using AI-generated and RAGAS-generated questions with real document processing and vector similarity search.

## Project Structure

```
├── backend/                    # FastAPI backend with document processing
│   ├── main.py                # FastAPI application with WebSocket support
│   ├── simple_document_processor.py  # Document processing orchestrator
│   ├── managers/              # Business logic managers
│   │   ├── __init__.py
│   │   ├── qdrant_manager.py
│   │   ├── data_manager.py
│   │   ├── corpus_statistics_manager.py
│   │   ├── vector_store_manager.py
│   │   └── search_manager.py
│   ├── logging_config.py      # Centralized logging configuration
│   └── requirements.txt       # Python dependencies
├── frontend/                   # Next.js frontend with comprehensive logging
│   ├── src/pages/             # 4-screen wizard application
│   ├── src/services/api.ts    # API client with logging interceptors
│   ├── src/utils/logger.ts    # User-friendly logging system
│   └── src/types/index.ts     # TypeScript interfaces
├── scripts/                    # Setup and utility scripts
│   └── setup_qdrant.sh        # Qdrant startup and health check
├── docker-compose.yml          # Qdrant database container configuration
├── .env.example               # Comprehensive environment variables template
├── .env                       # Your environment configuration (gitignored)
└── README.md                  # This file
```

## Features

### 🎯 4-Screen Wizard Application
1. **📊 Data Loading Dashboard**: Real-time corpus overview with document statistics, health metrics, and vector database status
2. **❓ Question Groups Overview**: Side-by-side comparison of LLM-generated vs RAGAS-generated questions with category breakdown
3. **⚙️ Experiment Configuration**: Interactive experiment setup with real-time WebSocket streaming and progress tracking
4. **📈 Analysis Results Dashboard**: 3-level analysis (Overall → Group → Individual) with sorting, filtering, and detailed question inspection

### 🏗️ Technical Architecture
- **🔍 Real Document Processing**: Loads CSV and PDF files using LangChain with intelligent chunking
- **🗃️ Persistent Vector Storage**: Qdrant database with cosine similarity search and automatic collection management
- **⚡ Performance Optimization**: Caching prevents expensive document reprocessing
- **📡 Real-time Communication**: WebSocket streaming for live experiment progress updates
- **📋 Comprehensive Logging**: User-friendly logging system with development/production modes
- **🎨 Responsive Design**: Mobile-friendly interface with CSS Grid and Flexbox layouts


## Setup

### Prerequisites
1. **Docker & Docker Compose** - Required for Qdrant vector database
2. **Node.js 18+ or 22+** - For frontend development (with nvm recommended)
3. **Python 3.8+** - For backend development (uv package manager recommended)
4. **OpenAI API Key** - Required for document embeddings ([Get API key](https://platform.openai.com/api-keys))
5. **Data Files** - CSV and PDF files in `../data/` folder for document processing

### Quick Start
```bash
# 1. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 2. Start Qdrant database
./scripts/setup_qdrant.sh

# 3. Start backend
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --reload

# 4. Start frontend (in new terminal)
cd frontend
npm install  
npm run dev
```

### Manual Setup

#### Qdrant Database
```bash
# Start Qdrant container
docker-compose up -d qdrant

# Verify connection
curl http://localhost:6333/

# View web UI (optional)
open http://localhost:6333/dashboard
```

#### Backend
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Test Qdrant connection (optional)
uv run python test_qdrant.py

# Start server
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Qdrant Database**: http://localhost:6333
- **Qdrant Web UI**: http://localhost:6333/dashboard

## API Endpoints

- `GET /api/corpus/status` - Real corpus metadata from processed documents
- `GET /api/questions/llm` - LLM generated questions
- `GET /api/questions/ragas` - RAGAS generated questions
- `POST /api/experiment/run` - Run vector similarity experiment
- `GET /api/results/analysis` - Analysis results with similarity scores
- `WS /ws/experiment/stream` - Real-time experiment progress

## Technologies Used

### Backend
- **FastAPI** - Modern Python web framework
- **Qdrant** - Vector database for similarity search
- **LangChain** - Document processing and embeddings
- **OpenAI** - Text embeddings (text-embedding-3-small)


### Frontend  
- **Next.js** - React framework with TypeScript
- **Axios** - HTTP client with logging interceptors
- **WebSocket** - Real-time experiment streaming
- **Custom Logging** - User-friendly logging system

### Infrastructure
- **Docker & Docker Compose** - Qdrant database containerization and service orchestration
- **Persistent Storage** - Docker volumes for Qdrant data persistence
- **Environment Management** - Centralized configuration with comprehensive .env.example

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
