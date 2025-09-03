# Architecture Overview

## Application Structure
This is **RagCheck** - a **6-screen wizard application** for RAG quality assessment using client-provided/approved queries (with support for LLM-generated vs RAGAS-generated questions when necessary) against a corpus:

1. **Screen 1 (Dashboard)**: Corpus overview with metadata and health metrics
2. **Screen 2 (Questions)**: Side-by-side comparison of question groups 
3. **Screen 3 (Experiment)**: Interactive experiment configuration with real-time WebSocket streaming
4. **Screen 4 (Results)**: 3-level analysis dashboard with sorting/filtering, collapsible sections, and quick actions
5. **Screen 5 (Gap Analysis)**: Domain-agnostic content gap detection with practical improvement strategies and role-specific recommendations
6. **Screen 6 (Heatmap)**: Interactive data visualization with multiple perspectives, coverage analytics, and smart insights

## Backend (FastAPI)
- **Modular Architecture**: Organized using manager pattern for separation of concerns
- **Document Processing Architecture**: Uses real document loading from CSV and PDF files
- **Persistent Vector Storage**: Qdrant vector database for document embeddings and similarity search
- **WebSocket Integration**: Real-time experiment streaming via `/ws/experiment/stream`
- **Caching System**: Joblib-based caching to prevent expensive recomputation
- **CORS Configuration**: Configured for `http://localhost:3000` frontend
- **Manager Components**:
  - `QdrantManager`: Vector database operations and collection management
  - `DataManager`: Document loading and preprocessing (CSV/PDF)
  - `CorpusStatisticsManager`: Corpus analysis and statistics generation
  - `VectorStoreManager`: Vector embedding and storage orchestration
  - `SearchManager`: Vector similarity search operations

## Frontend (Next.js)
- **Page Router**: Uses Next.js pages directory structure with 6-screen wizard flow
- **State Management**: React hooks with local state (no external state library)
- **Real-time Features**: WebSocket connection for experiment streaming
- **API Layer**: Axios-based service layer in `src/services/api.ts` with logging interceptors
- **Comprehensive Logging**: User-friendly logging system with development/production modes
- **TypeScript Interfaces**: Centralized in `src/types/index.ts`
- **Interactive Visualization**: D3.js-powered scatter plot heatmaps with multiple perspectives
- **Advanced Analytics**: Coverage statistics, unretrieved chunk detection, and performance insights
- **Enhanced UX**: Collapsible sections, quick actions, role-based analysis, and context-aware statistics

## Data Flow
1. **Document Loading**: Backend loads CSV/PDF documents from `../data/` folder and processes with LangChain
2. **Vector Storage**: Documents are chunked (750 chars, 100 overlap) and embedded using OpenAI text-embedding-3-small
3. **Persistent Storage**: Vectors stored in Qdrant database for fast similarity search
4. **Experiment Flow**: Frontend triggers experiment → Backend performs real vector searches → Results streamed via WebSocket
5. **Analysis**: Backend generates analysis based on actual similarity scores from vector searches

## Key Technical Details
- **Environment Configuration**: Centralized .env file at project root with comprehensive variable documentation
- **Vector Database**: Qdrant server on `http://localhost:6333` with persistent Docker volume storage and TCP-based health monitoring
- **Document Processing**: LangChain loaders for CSV (complaints.csv) and PDF files with intelligent filtering
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions, cosine similarity)
- **Quality Score System**: 
  - Normalized 0-10 scale with consistent thresholds: GOOD (≥7.0), DEVELOPING (≥5.0), POOR (<5.0)
  - Color-coded indicators across all interfaces
  - Unified terminology replacing inconsistent similarity score references
- **Chunk Traceability**: 
  - Qdrant UUID capture for each document chunk in search results
  - Enhanced debugging with clickable chunk IDs in results table
  - Hybrid search approach combining LangChain convenience with raw Qdrant data access
- **Performance Optimization**: 
  - Joblib-based caching prevents expensive document reprocessing
  - Vector store reuses existing Qdrant collections
  - Cached corpus statistics computation