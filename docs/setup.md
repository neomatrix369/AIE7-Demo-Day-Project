# Setup Guide ✅ AUTO-MANAGED

## Prerequisites
1. **Docker & Docker Compose** - Qdrant vector database
2. **OpenAI API Key** - Document embeddings ([Get API key](https://platform.openai.com/api-keys))  
3. **Data Files** - CSV/PDF/MD/TXT files in `./backend/data/`

*Python 3.12.2 & Node.js v22.16.0 auto-managed via pyenv/nvm*

## Quick Start
```bash
cp .env.example .env  # Add OPENAI_API_KEY
./scripts/setup_qdrant.sh && ./setup.sh
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
# Ensure correct Node version
source ~/.zshrc && nvm use default && nvm use default
node --version  # Should show 18+ or 22+

cd frontend
npm install
npm run dev
```

## Services
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Qdrant Database**: http://localhost:6333
- **Qdrant Web UI**: http://localhost:6333/dashboard