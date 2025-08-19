# API Documentation

## REST Endpoints

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