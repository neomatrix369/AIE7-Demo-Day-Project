# ==============================================================================
# BACKEND DOCKERFILE - FastAPI Application
# ==============================================================================
# Builds a containerized Python backend for the RAG application
# Base image: Python 3.12 slim (smaller than standard Python image)
# Final size: ~500MB (vs ~1GB for standard Python image)
# ==============================================================================

# Base image - Python 3.12 slim variant (Debian-based, smaller footprint)
FROM python:3.12-slim

# Set working directory inside container (all subsequent commands run here)
WORKDIR /app

# Install system-level dependencies required for Python packages
# - build-essential: Compilers for packages with C extensions (e.g., numpy)
# - curl: Required for Docker health checks
# Clean up apt cache after install to reduce image size
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*  # Remove package lists to save ~30MB

# Copy requirements.txt FIRST (before code) for better layer caching
# Docker caches this layer - only rebuilds if requirements.txt changes
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir: Don't store pip cache (saves ~100MB)
# --upgrade pip: Ensure latest pip version for best compatibility
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code into container
# This layer rebuilds whenever code changes (that's why requirements come first)
COPY . .

# Create data directory for storing documents
# Ensures directory exists even if not mounted as volume
RUN mkdir -p /app/data

# Document that container listens on port 8000 (informational only)
# Actual port mapping happens in docker-compose.yml
EXPOSE 8000

# Health check - Docker periodically runs this to verify service is healthy
# --interval=30s: Check every 30 seconds
# --timeout=10s: Fail if check takes longer than 10 seconds
# --start-period=10s: Grace period during startup (don't fail checks immediately)
# --retries=3: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Default command when container starts
# uvicorn: ASGI server for FastAPI
# main:app: Import app from main.py
# --host 0.0.0.0: Listen on all network interfaces (required for Docker)
# --port 8000: Port to listen on inside container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]