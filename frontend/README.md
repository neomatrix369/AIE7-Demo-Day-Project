# Frontend - RagCheck

Next.js frontend with comprehensive logging, real-time WebSocket communication, and user-friendly interface for corpus/data quality analysis.

> **📖 Main Documentation**: See the [main README](../README.md) for complete setup instructions and project overview.

## Architecture

### Component Structure
- **6-Screen Wizard Flow**: Dashboard → Questions → Experiment → Results → Gap Analysis → Heatmap
- **TypeScript**: Full type safety throughout the application
- **Real-time Updates**: WebSocket integration for experiment streaming
- **Responsive Design**: Mobile-friendly CSS Grid and Flexbox layouts

### Key Features
- **Enhanced Heatmap Visualization**: Universal coverage statistics and perspective-specific metrics
  - Chunk Coverage and Unretrieved Chunks cards shown on all perspectives
  - Perspective-specific count cards (Questions, User Roles, Documents)
  - Streamlined UI with removed cluttered insight cards for cleaner interface
- **TypeScript Safety**: Enhanced null safety with proper optional field handling
  - Fixed critical TypeScript errors in heatmap tooltips
  - Improved defensive programming with graceful fallbacks
- **Advanced Gap Analysis Dashboard**: Domain-agnostic content gap detection with practical improvement strategies
- **Smart Recommendations Engine**: Role-specific recommendations with rich text formatting and implementation tracking
- **Rule-Based Analysis Badge**: Feature-flagged indicator showing "Rule-Based Analysis (non-ML)" with tooltip
- **Cross-Page Navigation**: Enhanced navigation flow between Gap Analysis and other screens
- **UI Consistency & Polish**: Standardized button text, tooltips, and "No data available" messaging
- **Comprehensive Logging**: User-friendly messages with development context
- **API Logging**: Request/response interceptors with timeout handling  
- **Performance Caching**: API request caching with TTL (10min) and size limits
- **Custom UI Components**: Reusable BalloonTooltip with smart positioning and cursor indicators
- **Real-time Streaming**: WebSocket-based experiment progress with connection monitoring
- **Error Handling**: User-friendly error messages and retry mechanisms with fallback displays
- **Database Integration**: Real-time connectivity checks with loading states and error recovery

### Shared Modules

- **Shared Utilities** (`src/utils/`)
  - `qualityScore.ts`: Centralized quality score calculations and threshold logic
  - `constants.ts`: Shared constants, feature flags, and text formatting utilities (markdown bold support)
  - `heatmapData.ts`: Data processing utilities for multiple visualization perspectives
- **Heatmap Utilities** (`src/components/heatmap/` and `src/utils/`)
  - `ScatterHeatmap.tsx`: D3.js hexagonal scatter plots with optimized rendering and concentric layouts
  - `HeatmapControls.tsx`, `HeatmapLegend.tsx`: Reusable UI for perspectives, legends, and perspective switching
  - `HeatmapTooltip.tsx`: Enhanced tooltips with improved null safety and conditional rendering
  - `heatmapCore.ts`: Core positioning algorithms including circular trigonometry and collision detection
  - `heatmapProcessors.ts`: Perspective-specific processors with custom positioning strategies
  - `positionUtils.ts`, `renderUtils.ts`: Shared utilities for hexagon rendering and position calculations
- **Navigation Helper** (`src/hooks/usePageNavigation.ts`)
  - `goTo(path, label?, context?)`, `replace(path, label?, context?)`, `back(context?)`
  - Emits structured navigation logs via `utils/logger.ts` for consistent user flow tracking
  - Centralized navigation patterns eliminating duplication across pages
- **Gap Analysis Components** (`src/components/gap-analysis/`)
  - `GapAnalysisDashboard.tsx`: Main container with comprehensive gap insights and real-time data loading
  - `GapAnalysisOverview.tsx`: Interactive statistics cards with visual severity indicators
  - `DevelopingCoverageAreas.tsx`: Topic-based gap visualization with expandable details and developing coverage area classification
  - `RecommendationCards.tsx`: Prioritized actionable recommendations with implementation workflow

## File Structure

```
src/
├── components/           # Reusable React components
│   ├── heatmap/          # Interactive visualization components
│   │   ├── ScatterHeatmap.tsx     # D3.js hexagonal scatter plots
│   │   ├── HeatmapControls.tsx    # Perspective switching controls
│   │   ├── HeatmapLegend.tsx      # Dynamic legends
│   │   └── HeatmapTooltip.tsx     # Enhanced tooltips with role info
│   ├── gap-analysis/     # Gap analysis and recommendations components
│   │   ├── GapAnalysisDashboard.tsx    # Main gap analysis container
│   │   ├── GapAnalysisOverview.tsx     # Statistics cards with visual indicators
│   │   ├── DevelopingCoverageAreas.tsx # Topic-based developing coverage visualization
│   │   └── RecommendationCards.tsx     # Actionable recommendation cards
│   ├── ui/               # Reusable UI components
│   │   └── BalloonTooltip.tsx     # Custom balloon tooltips with smart positioning
│   ├── Footer.tsx        # Application footer component
│   ├── NavigationHeader.tsx  # Navigation header component
│   └── QualityScoreLegend.tsx  # Quality score legend component
├── pages/               # Next.js page router
│   ├── _app.tsx         # App configuration and global styles
│   ├── index.tsx        # Landing page (redirects to dashboard)
│   ├── dashboard.tsx    # Screen 1: Corpus overview
│   ├── questions.tsx    # Screen 2: Question groups comparison
│   ├── experiment.tsx   # Screen 3: Experiment configuration
│   ├── results.tsx      # Screen 4: Analysis results
│   └── heatmap.tsx      # Screen 5: Interactive data visualization
├── services/
│   └── api.ts           # API client with logging interceptors
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   ├── logger.ts        # Comprehensive logging system
│   ├── qualityScore.ts  # Centralized quality score calculations
│   ├── constants.ts     # Shared constants and thresholds
│   ├── heatmapData.ts   # Data processing for visualizations
│   ├── heatmapCore.ts   # Core heatmap utilities and positioning algorithms
│   └── heatmapProcessors.ts  # Perspective-specific data processors
├── hooks/
│   └── usePageNavigation.ts  # Centralized navigation with logging
└── styles/
    └── globals.css      # Global styles and component classes
```

## Setup

### Docker Setup (Recommended)
See the [main README](../README.md) for service startup with `./start-services.sh`

### Manual Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Features

### 1. Dashboard (Screen 1)
- **Corpus Overview**: Real-time statistics from persistent Qdrant vector database with actual chunk counts
- **Health Metrics**: Document count, consistent chunk count (2172 from vector database), size, embedding model, corpus health
- **Database Connectivity**: Real-time Qdrant connection status with error handling and recovery instructions
- **Document Types**: Breakdown of PDF and CSV document counts with metadata
- **Error Handling**: User-friendly error messages with retry mechanism for slow corpus loading
- **Loading States**: Progress indicators for slow operations with helpful context messages

### 2. Questions (Screen 2)  
- **Side-by-side Comparison**: Client-provided/approved queries (with LLM vs RAGAS question support when necessary)
- **Category Breakdown**: Role types and sample previews
- **Statistics**: Question counts and generation status
- **Navigation**: Smooth transitions between screens

### 3. Experiment (Screen 3)
- **Interactive Configuration**: Query group selection (client-provided/approved with LLM/RAGAS support) and vector search parameters
- **Real-time Streaming**: WebSocket connection for live experiment progress with detailed logging
- **Progress Tracking**: Visual progress bar with real-time question processing updates
- **Experiment Control**: Start/stop functionality with proper state management and error handling
- **Parameter Configuration**: Top-K results and similarity threshold selection

### 4. Results (Screen 4)
- **3-Level Analysis**: Overall corpus health → Group performance (client queries with LLM vs RAGAS support) → Individual query analysis
- **Interactive Features**: Real-time sorting, filtering by status (good/developing/poor), question detail expansion
- **Visual Elements**: Similarity score bars, health indicators, status badges, distribution charts
- **Custom Tooltips**: BalloonTooltip components for chunk IDs (with copy functionality) and document content
- **Enhanced Data Display**: Chunk ID columns with truncated display and full UUID tooltips
- **Detailed Inspection**: Full question text, retrieved document details, similarity scores per document
- **Navigation**: Easy navigation to restart experiments or return to previous screens

### 5. Heatmap (Screen 5)
- **Interactive Data Visualization**: Multi-perspective hexagonal heatmaps with optimized D3.js rendering
- **Multiple Perspectives**: 
  - Documents-to-Chunks: Document clustering with hexagonal visualizations
  - Chunks-to-Questions: Concentric layout with associated chunks at center and unassociated in surrounding rings
  - Roles-to-Chunks: Role-based access patterns with chunk distribution analysis
- **Advanced Analytics**: Coverage statistics, unretrieved chunk detection, performance insights
- **Smart Positioning Algorithms**:
  - Enhanced unretrieved chunk distribution across full viewport (30+ strategic positions)
  - Concentric layout for chunks-to-questions with circular trigonometry positioning
  - Improved cluster count (6-16 clusters) for better granularity and space utilization
- **Database Integration**: Real-time chunk data loading with connectivity status and error handling
- **Performance Optimization**: Representative clustering, collision detection, and efficient rendering
- **Smart Insights**: Role-based performance analysis, efficiency indicators, coverage percentage
- **Enhanced UX**: Collapsible sections, quick actions, context-aware statistics with improved terminology

## API Integration

### HTTP Client (`api.ts`)
```typescript
// Configured with logging and timeout
const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30s for slow corpus loading
});

// Automatic request/response logging
api.interceptors.request.use(logApiRequest);
api.interceptors.response.use(logApiResponse);
```

### WebSocket Integration
```typescript
// Real-time experiment streaming
const websocket = new WebSocket('ws://localhost:8000/ws/experiment/stream');
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle progress updates
};
```

## Logging System

### Logger Features (`utils/logger.ts`)
- **Development/Production Modes**: Automatic filtering
- **User-friendly Messages**: Clear, actionable feedback  
- **Structured Logging**: Component, action, and context tracking
- **API Logging**: Request/response/error tracking
- **WebSocket Logging**: Connection and message events
- **Navigation Logging**: User flow tracking

### Usage Examples
```typescript
// Success message
logSuccess('Corpus loaded: 1,100 documents, 4,500 chunks');

// API error with context
logApiError('GET', '/api/corpus/status', error);

// WebSocket event
logWebSocketEvent('connected', 'Experiment stream ready');

// Navigation tracking
logNavigation('Dashboard', 'Questions');
```

## Development

### Adding New Pages
1. Create page component in `src/pages/`
2. Add TypeScript interfaces in `src/types/`
3. Add API endpoints in `src/services/api.ts`
4. Add logging for user interactions
5. Update navigation flow

### Styling Guidelines
- Use existing CSS classes in `globals.css`
- Follow responsive design patterns
- Maintain consistent spacing and colors
- Use CSS Grid for layouts, Flexbox for alignment

### Type Safety
- All API responses typed in `src/types/index.ts`
- Props and state properly typed
- Error handling with typed error objects
- WebSocket message types defined

## Dependencies

### Core Framework
- **Next.js 14.0.0**: React framework with TypeScript
- **React 18**: UI library with hooks
- **TypeScript**: Type safety and development experience

### HTTP & Real-time
- **Axios**: HTTP client with interceptors
- **WebSocket**: Built-in browser WebSocket API

### Development
- **ESLint**: Code linting and style enforcement
- **Next Config**: Build and development configuration

## Performance Features

- **API Caching**: 10-minute TTL with automatic cleanup
- **D3.js Optimization**: Efficient data binding and rendering  
- **WebSocket Management**: Real-time updates with reconnection
- **Smart UI**: Custom tooltips and responsive design