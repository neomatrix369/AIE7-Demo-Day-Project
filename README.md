# RagCheck

A 5-screen wizard application for comprehensive RAG system quality assessment using AI-generated and RAGAS-generated questions with real document processing, vector similarity search, and interactive data visualization.

## Visuals

*Screenshots of the 5-screen wizard application will be added here soon.*

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
│   ├── src/pages/             # 5-screen wizard application
│   ├── src/components/heatmap/ # Interactive visualization components
│   ├── src/services/api.ts    # API client with logging interceptors
│   ├── src/utils/logger.ts    # User-friendly logging system
│   ├── src/utils/heatmapData.ts # Data processing for visualizations
│   └── src/types/index.ts     # TypeScript interfaces
├── scripts/                    # Setup and utility scripts
│   └── setup_qdrant.sh        # Qdrant startup and health check
├── docker-compose.yml          # Qdrant database container with health monitoring
├── .env.example               # Comprehensive environment variables template
├── .env                       # Your environment configuration (gitignored)
└── README.md                  # This file
```

## Features

### 🎯 5-Screen Wizard Application
1. **📊 Data Loading Dashboard**: Real-time corpus overview with document statistics, health metrics, and vector database status
2. **❓ Question Groups Overview**: Side-by-side comparison of LLM-generated vs RAGAS-generated questions with role breakdown
3. **⚙️ Experiment Configuration**: Interactive experiment setup with real-time WebSocket streaming and progress tracking
4. **📈 Analysis Results Dashboard**: Enhanced 3-level analysis with collapsible sections, quick actions, role-based insights, and comprehensive filtering
5. **🗺️ Interactive Data Visualization**: Multi-perspective scatter plot heatmaps with coverage analytics, Unretrieved chunk detection, and smart performance insights

### 🏗️ Technical Architecture
- **🔍 Real Document Processing**: Loads CSV and PDF files using LangChain with intelligent chunking (750 chars, 100 overlap)
- **🗃️ Persistent Vector Storage**: Qdrant database with cosine similarity search, automatic collection management, and health monitoring
- **📏 Quality Score System**: Normalized 0-10 scale with consistent thresholds (GOOD ≥7.0, WEAK ≥5.0, POOR <5.0) and color-coded indicators
- **🆔 Chunk Traceability**: Qdrant UUID capture for enhanced debugging and search result analysis with clickable chunk IDs
- **🗺️ Interactive Visualization**: D3.js-powered scatter plot heatmaps with multiple perspectives and advanced analytics
- **📊 Coverage Analytics**: Comprehensive chunk utilization tracking with Unretrieved chunk detection
- **👥 Role-Based Analysis**: Complete role integration across visualization and analysis workflows
- **⚡ Performance Optimization**: Caching, memoization, and optimized rendering for smooth user experience
- **📡 Real-time Communication**: WebSocket streaming for live experiment progress updates
- **📋 Comprehensive Logging**: User-friendly logging system with development/production modes
- **🎨 Enhanced UX**: Collapsible sections, quick actions, smart insights, and context-aware statistics
- **🎯 Responsive Design**: Mobile-friendly interface with CSS Grid and Flexbox layouts


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

# Check container health status
docker ps  # Shows (healthy) status

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
- **D3.js** - Interactive data visualization and scatter plots
- **Axios** - HTTP client with logging interceptors
- **WebSocket** - Real-time experiment streaming
- **Custom Logging** - User-friendly logging system

### Infrastructure
- **Docker & Docker Compose** - Qdrant database containerization with health monitoring and service orchestration
- **Health Monitoring** - TCP-based health checks for container reliability
- **Persistent Storage** - Docker volumes for Qdrant data persistence
- **Environment Management** - Centralized configuration with comprehensive .env.example

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.