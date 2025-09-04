# Features

## 🎯 6-Screen Wizard Application
1. **📊 Data Loading Dashboard**: Real-time corpus overview with document statistics, health metrics, and vector database status
2. **❓ Question Groups Overview**: Side-by-side comparison of client-provided/approved queries (with support for LLM-generated vs RAGAS-generated questions when necessary) with role breakdown
3. **⚙️ Experiment Configuration**: Interactive experiment setup with real-time WebSocket streaming and progress tracking
4. **📈 Analysis Results Dashboard**: Enhanced 3-level analysis with collapsible sections, quick actions, role-based insights, and comprehensive filtering
5. **🔍 Gap Analysis Dashboard**: **NEW!** Domain-agnostic content gap detection with practical improvement strategies, role-specific recommendations, and implementation tracking
6. **🗺️ Interactive Data Visualization**: Multi-perspective hexagonal heatmaps with coverage analytics, unretrieved chunk detection, and smart performance insights

## 🏗️ Technical Architecture
- **🔍 Real Document Processing**: Loads CSV and PDF files using LangChain with intelligent chunking (750 chars, 100 overlap)
- **🗃️ Persistent Vector Storage**: Qdrant database with cosine similarity search, automatic collection management, and health monitoring
- **📏 Quality Score System**: Normalized 0-10 scale with consistent thresholds (GOOD ≥7.0, DEVELOPING ≥5.0, POOR <5.0) and color-coded indicators
- **🆔 Chunk Traceability**: Qdrant UUID capture for enhanced debugging and search result analysis with clickable chunk IDs
- **🗺️ Interactive Visualization**: D3.js-powered hexagonal heatmaps with multiple perspectives (Chunks-to-Questions, Chunks-to-Roles), advanced analytics, and improved layout.
- **📊 Coverage Analytics**: Comprehensive chunk utilization tracking with Unretrieved chunk detection and impactful stats on coverage and performance.
- **👥 Role-Based Analysis**: Complete role integration across visualization and analysis workflows
- **⚡ Performance Optimization**: Caching, memoization, and optimized rendering for smooth user experience
- **📡 Real-time Communication**: WebSocket streaming for live experiment progress updates
- **🧠 Domain-Agnostic Gap Analysis**: Rule-based content gap detection that works with any dataset without modification
- **💡 Practical Improvement Strategies**: Role-specific recommendations with internal knowledge mining, external research, and LLM-generated content approaches
- **🔤 Rich Text Formatting**: Markdown bold formatting support in improvement strategies with HTML rendering
- **🏷️ Feature Flags**: Rule-based analysis badges and toggleable UI components
- **📋 Comprehensive Logging**: User-friendly logging system with development/production modes
- **🎨 Enhanced UX**: Collapsible sections, quick actions, smart insights, cross-screen navigation, and context-aware statistics
- **🎯 Responsive Design**: Mobile-friendly interface with CSS Grid and Flexbox layouts