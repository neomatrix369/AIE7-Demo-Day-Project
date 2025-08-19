# Setup Guide

## Prerequisites
1. **Docker & Docker Compose** - Required for Qdrant vector database
2. **Node.js 18+ or 22+** - For frontend development (with nvm recommended)
3. **Python 3.8+** - For backend development (uv package manager recommended)
4. **OpenAI API Key** - Required for document embeddings ([Get API key](https://platform.openai.com/api-keys))
5. **Data Files** - CSV and PDF files in `./backend/data/` folder for document processing

## Quick Start
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

## Manual Setup

### Qdrant Database
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

### Backend
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

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Qdrant Database**: http://localhost:6333
- **Qdrant Web UI**: http://localhost:6333/dashboard