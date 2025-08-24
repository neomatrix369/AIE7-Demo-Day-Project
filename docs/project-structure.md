# Project Structure

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
│   ├── services/              # Service layer for advanced features
│   │   ├── gap_analysis_service.py    # Domain-agnostic gap analysis
│   │   ├── quality_score_service.py   # Quality scoring utilities
│   │   └── error_response_service.py  # Error handling service
│   ├── logging_config.py      # Centralized logging configuration
│   └── requirements.txt       # Python dependencies
├── frontend/                   # Next.js frontend with comprehensive logging
│   ├── src/pages/             # 6-screen wizard application
│   │   ├── dashboard.tsx      # Screen 1: Corpus overview
│   │   ├── questions.tsx      # Screen 2: Question groups comparison
│   │   ├── experiment.tsx     # Screen 3: Experiment configuration
│   │   ├── results.tsx        # Screen 4: Analysis results
│   │   ├── gap-analysis.tsx   # Screen 5: Gap analysis and recommendations
│   │   └── heatmap.tsx        # Screen 6: Interactive data visualization
│   ├── src/components/        # Reusable React components
│   │   ├── heatmap/           # Interactive visualization components
│   │   │   ├── ScatterHeatmap.tsx     # D3.js hexagonal scatter plots
│   │   │   ├── HeatmapControls.tsx    # Perspective switching controls
│   │   │   ├── HeatmapLegend.tsx      # Dynamic legends
│   │   │   └── HeatmapTooltip.tsx     # Enhanced tooltips with role info
│   │   │   ├── heatmapTheme.ts        # Centralized heatmap color scales and thresholds
│   │   ├── gap-analysis/      # Gap analysis and recommendations
│   │   │   ├── GapAnalysisDashboard.tsx    # Main gap analysis container
│   │   │   ├── GapAnalysisOverview.tsx     # Statistics cards with indicators
│   │   │   ├── WeakCoverageAreas.tsx       # Topic visualization
│   │   │   └── RecommendationCards.tsx     # Prioritized recommendations
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── BalloonTooltip.tsx     # Smart tooltip component
│   │   │   └── RuleBasedBadge.tsx     # Rule-based analysis indicator
│   │   ├── Footer.tsx         # Application footer component
│   │   ├── NavigationHeader.tsx # Navigation header component
│   │   └── QualityScoreLegend.tsx # Quality score legend component
│   ├── src/services/          # API and storage services
│   │   ├── api.ts             # API client with logging interceptors
│   │   └── storage/           # Cross-platform storage adapters
│   │       ├── StorageAdapter.ts      # Storage interface
│   │       ├── BrowserStorage.ts      # Browser localStorage implementation
│   │       └── FileSystemStorage.ts   # Local filesystem storage
│   ├── src/utils/             # Utility functions
│   │   ├── logger.ts          # User-friendly logging system
│   │   ├── constants.ts       # App constants and text formatting utilities
│   │   ├── qualityScore.ts    # Quality score calculations and thresholds
│   │   └── heatmapData.ts     # Data processing for visualizations
│   ├── src/hooks/
│   │   └── usePageNavigation.ts # Navigation helper with structured logging
│   └── src/types/index.ts     # TypeScript interfaces
├── scripts/                    # Setup and utility scripts
│   └── setup_qdrant.sh        # Qdrant startup and health check
├── docs/                       # Documentation files
│   ├── setup.md               # Setup and installation guide
│   ├── architecture.md        # Technical architecture overview
│   ├── features.md            # Feature descriptions
│   ├── api.md                 # API documentation
│   ├── gap-analysis-feature.md # Gap analysis implementation details
│   ├── generic-system-analysis.md # Domain-agnostic system documentation
│   ├── deployment.md          # Cloud deployment guide
│   └── troubleshooting.md     # Troubleshooting guide
├── docker-compose.yml          # Qdrant database container with health monitoring
├── vercel.json                # Vercel deployment configuration
├── .env.example               # Comprehensive environment variables template
├── .env                       # Your environment configuration (gitignored)
└── README.md                  # This file
```