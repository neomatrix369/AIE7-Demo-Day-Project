# API Documentation

## REST Endpoints

- `GET /api/corpus/status` - Real corpus metadata from processed documents
- `GET /api/questions/llm` - Client-provided/approved queries (LLM support when necessary)
- `GET /api/questions/ragas` - Client-provided/approved queries (RAGAS support when necessary)
- `POST /api/experiment/run` - Run vector similarity experiment
- `GET /api/results/analysis` - Analysis results with similarity scores
- `GET /api/v1/analysis/gaps` - **NEW!** Domain-agnostic gap analysis with practical improvement strategies
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