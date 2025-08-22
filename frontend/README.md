# Frontend - RagCheck

Next.js frontend with comprehensive logging, real-time WebSocket communication, and user-friendly interface for corpus/data quality analysis.

> **📖 Main Documentation**: See the [main README](../README.md) for complete setup instructions and project overview.

## Architecture

### Component Structure
- **5-Screen Wizard Flow**: Dashboard → Questions → Experiment → Results → Heatmap
- **TypeScript**: Full type safety throughout the application
- **Real-time Updates**: WebSocket integration for experiment streaming
- **Responsive Design**: Mobile-friendly CSS Grid and Flexbox layouts

### Key Features
- **Gap Analysis Dashboard**: NEW! Intelligent content gap detection with actionable recommendations
- **Smart Recommendations Engine**: Interactive cards with priority scoring and implementation tracking
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
  - `constants.ts`: Shared constants for quality score thresholds, colors, and categorization
  - `heatmapData.ts`: Data processing utilities for multiple visualization perspectives
- **Heatmap Utilities** (`src/components/heatmap/` and `src/utils/`)
  - `ScatterHeatmap.tsx`: D3.js hexagonal scatter plots with optimized rendering and concentric layouts
  - `HeatmapControls.tsx`, `HeatmapLegend.tsx`, `HeatmapTooltip.tsx`: Reusable UI for perspectives, legends, and smart tooltips
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
  - `WeakCoverageAreas.tsx`: Topic-based gap visualization with expandable details and gap type classification
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
│   │   ├── WeakCoverageAreas.tsx       # Topic-based gap visualization
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

### Prerequisites
- Node.js 18+ or 22+ (with nvm recommended for version management)
- NPM or Yarn package manager
- Backend API running on `http://localhost:8000`
- Qdrant vector database running on `http://localhost:6333`

### Installation
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Node.js Version Management
```bash
# Ensure correct Node.js version (important!)
source ~/.zshrc  # or ~/.bashrc
nvm use default  # Run twice for proper activation
nvm use default
node --version   # Should show 18+ or 22+
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
- **Side-by-side Comparison**: LLM vs RAGAS questions
- **Category Breakdown**: Role types and sample previews
- **Statistics**: Question counts and generation status
- **Navigation**: Smooth transitions between screens

### 3. Experiment (Screen 3)
- **Interactive Configuration**: Question group selection (LLM/RAGAS) and vector search parameters
- **Real-time Streaming**: WebSocket connection for live experiment progress with detailed logging
- **Progress Tracking**: Visual progress bar with real-time question processing updates
- **Experiment Control**: Start/stop functionality with proper state management and error handling
- **Parameter Configuration**: Top-K results and similarity threshold selection

### 4. Results (Screen 4)
- **3-Level Analysis**: Overall corpus health → Group performance (LLM vs RAGAS) → Individual question analysis
- **Interactive Features**: Real-time sorting, filtering by status (good/weak/poor), question detail expansion
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

## Performance Considerations

### API Optimization
- **30-second timeout** for slow backend operations  
- **Advanced Caching**: API request caching with TTL (10min) and size limits via useApiCache hook
- **Request deduplication** via React hooks with proper dependency management
- **Cache Statistics**: Automatic cleanup and cache hit/miss tracking for performance monitoring

### UI Optimization  
- **D3.js Rendering**: Optimized data binding patterns with enter/update/exit cycles (~80% faster rendering)
- **React State Management**: Improved useCallback dependencies and auto-save timeout cleanup  
- **Responsive design** with mobile-first approach and enhanced visual indicators
- **Progressive enhancement** with loading states and database connectivity feedback
- **Efficient re-renders** with proper React patterns and memoization

### Real-time Features
- **WebSocket connection management** with reconnection and comprehensive error handling
- **Progress tracking** without UI blocking and fallback mechanisms
- **Memory management** for large result sets with automatic cleanup
- **Database Integration**: Real-time connectivity monitoring with fallback displays and recovery instructions

### Custom UI Components
- **BalloonTooltip Performance**: Smart positioning algorithms with viewport boundary detection
- **Cursor Optimization**: Context-aware cursor indicators (help vs pointer) for better UX
- **Rendering Efficiency**: Optimized tooltip positioning with requestAnimationFrame for smooth animations