# RagCheck

A 5-screen wizard application for comprehensive RAG system quality assessment using AI-generated and RAGAS-generated questions with real document processing, vector similarity search, and interactive data visualization.

## Visuals

*Screenshots of the 5-screen wizard application will be added here soon.*

## Quick Start

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 2. Start Qdrant database
./scripts/setup_qdrant.sh

# 3. Start backend
cd backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --reload

# 4. Start frontend (in new terminal)
cd frontend
npm install && npm run dev
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000  
- Qdrant Database: http://localhost:6333

## Documentation

| Documentation | Description |
|---------------|-------------|
| 📋 [Setup Guide](docs/setup.md) | Prerequisites, installation, and configuration |
| 🏗️ [Architecture](docs/architecture.md) | Technical architecture and system design |
| ⭐ [Features](docs/features.md) | Complete feature overview and capabilities |
| 🔌 [API Reference](docs/api.md) | REST endpoints, WebSocket API, and technologies |
| 🚀 [Cloud Deployment](docs/deployment.md) | Vercel, Railway deployment guides |
| 🔧 [Troubleshooting](docs/troubleshooting.md) | Common issues and debugging tips |
| 📁 [Project Structure](docs/project-structure.md) | Codebase organization and file structure |

## Prerequisites

1. **Docker & Docker Compose** - Required for Qdrant vector database
2. **Node.js 18+ or 22+** - For frontend development (with nvm recommended)
3. **Python 3.8+** - For backend development (uv package manager recommended)
4. **OpenAI API Key** - Required for document embeddings ([Get API key](https://platform.openai.com/api-keys))
5. **Data Files** - CSV and PDF files in `./backend/data/` folder for document processing

## Key Features

- **🎯 5-Screen Wizard**: Dashboard → Questions → Experiment → Results → Heatmap
- **🗺️ Interactive Visualizations**: D3.js hexagonal heatmaps with multi-perspective analytics
- **📊 Real-time Analytics**: Coverage statistics, orphaned chunk detection, performance insights
- **🗃️ Vector Storage**: Persistent Qdrant database with similarity search
- **📡 Live Updates**: WebSocket streaming for experiment progress
- **🎯 Quality Scoring**: Normalized 0-10 scale with consistent thresholds and color coding

## Components

### Backend (FastAPI)
- **Document Processing**: CSV/PDF loading with LangChain chunking
- **Vector Operations**: Qdrant database integration with OpenAI embeddings
- **Real-time Streaming**: WebSocket experiment progress updates
- **Comprehensive Logging**: User-friendly logging with development/production modes

### Frontend (Next.js)
- **TypeScript Application**: Type-safe React components and API integration
- **Interactive Visualizations**: D3.js scatter plots and analytics dashboards
- **Responsive Design**: Mobile-friendly CSS Grid and Flexbox layouts
- **Cross-platform Storage**: Adapters for local development and cloud deployment

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.