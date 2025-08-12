# Frontend - Corpus Quality Assessment Tool

Next.js frontend with comprehensive logging, real-time WebSocket communication, and user-friendly interface for corpus quality analysis.

## Architecture

### Component Structure
- **4-Screen Wizard Flow**: Dashboard → Questions → Experiment → Results
- **TypeScript**: Full type safety throughout the application
- **Real-time Updates**: WebSocket integration for experiment streaming
- **Responsive Design**: Mobile-friendly CSS Grid and Flexbox layouts

### Key Features
- **Comprehensive Logging**: User-friendly messages with development context
- **API Logging**: Request/response interceptors with timeout handling
- **Real-time Streaming**: WebSocket-based experiment progress
- **Error Handling**: User-friendly error messages and retry mechanisms

## File Structure

```
src/
├── components/           # Reusable React components (future)
├── pages/               # Next.js page router
│   ├── _app.tsx         # App configuration and global styles
│   ├── index.tsx        # Landing page (redirects to dashboard)
│   ├── dashboard.tsx    # Screen 1: Corpus overview
│   ├── questions.tsx    # Screen 2: Question groups comparison
│   ├── experiment.tsx   # Screen 3: Experiment configuration
│   └── results.tsx      # Screen 4: Analysis results
├── services/
│   └── api.ts           # API client with logging interceptors
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   └── logger.ts        # Comprehensive logging system
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
- **Corpus Overview**: Real-time statistics from persistent Qdrant vector database
- **Health Metrics**: Document count, chunk count, size, embedding model, corpus health
- **Document Types**: Breakdown of PDF and CSV document counts
- **Error Handling**: User-friendly error messages with retry mechanism for slow corpus loading
- **Loading States**: Progress indicators for slow operations with helpful context messages

### 2. Questions (Screen 2)  
- **Side-by-side Comparison**: LLM vs RAGAS questions
- **Category Breakdown**: Question types and sample previews
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
- **Detailed Inspection**: Full question text, retrieved document details, similarity scores per document
- **Navigation**: Easy navigation to restart experiments or return to previous screens

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
- **Request deduplication** via React hooks
- **Caching** via browser and service worker (future)

### UI Optimization  
- **Responsive design** with mobile-first approach
- **Progressive enhancement** with loading states
- **Efficient re-renders** with proper React patterns

### Real-time Features
- **WebSocket connection management** with reconnection
- **Progress tracking** without UI blocking
- **Memory management** for large result sets