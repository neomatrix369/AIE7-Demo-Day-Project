# Setup Guide

> **🚀 Quick Start**: See the [main README](../README.md) for service startup with `./start-services.sh`

## Docker vs Manual Setup

### Docker (Recommended)
- **Simple**: One command setup
- **Consistent**: Works on all platforms
- **Fast**: Pre-configured with dependencies
- **Service Management**: Interactive scripts with safety confirmations

### Manual Setup
- **Flexible**: Individual component control
- **Development**: Direct code access
- **Debugging**: Easier to troubleshoot individual services

## Service Lifecycle Management

### Starting Services
```bash
./start-services.sh
```
- Automatically checks for port conflicts
- Offers interactive resolution (auto-kill, manual, or exit)
- Verifies Docker and Docker Compose installation
- Creates `.env` from template if missing
- Runs health checks after startup

### Stopping Services
```bash
./stop-services.sh
```
**Interactive menu with 4 options:**

1. **Standard stop** (recommended) - Daily use, preserves data
2. **Quick pause** - Fastest restart, no cleanup
3. **Deep cleanup** - Reclaim disk space, requires confirmation
4. **Nuclear reset** - ⚠️ Deletes all data, requires typed confirmation

> **Safety**: Options 3 and 4 require explicit confirmation to prevent accidental data loss

### Health Monitoring
```bash
./scripts/health-check.sh
```
- Checks all service status and connectivity
- Verifies Qdrant database health
- Reports port availability
- Provides troubleshooting suggestions

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