# Setup Guide

> **🚀 Quick Start**: See the [main README](../README.md) for service startup with `./start-services.sh`

## Docker vs Manual Setup

### Docker (Recommended)
- **Simple**: One command setup
- **Consistent**: Works on all platforms
- **Fast**: Pre-configured with dependencies

### Manual Setup
- **Flexible**: Individual component control  
- **Development**: Direct code access
- **Debugging**: Easier to troubleshoot individual services

## Advanced Configuration

### Environment Variables
```bash
# Required in .env file
OPENAI_API_KEY=your_key_here

# Optional (with defaults)
QDRANT_URL=http://localhost:6333
LOG_LEVEL=INFO
```

### Data Files
Place documents in `./backend/data/`:
- CSV files (generic or domain-specific)
- PDF documents  
- Markdown/text files
- Subdirectories supported