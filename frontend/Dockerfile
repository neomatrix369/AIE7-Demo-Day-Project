# ==============================================================================
# FRONTEND DOCKERFILE - Next.js Application
# ==============================================================================
# Builds a containerized Next.js frontend for the RAG application
# Base image: Node.js 22.16.0 Alpine (minimal Linux, much smaller than standard)
# Final size: ~200MB (vs ~900MB for standard Node image)
# ==============================================================================

# Base image - Node.js 22.16.0 Alpine variant (lightweight Linux distribution)
FROM node:22.16.0-alpine

# Set working directory inside container (all subsequent commands run here)
WORKDIR /app

# Install curl for Docker health checks (Alpine uses apk package manager)
# --no-cache: Don't store package index locally (saves space)
RUN apk add --no-cache curl

# Copy package.json and package-lock.json FIRST (before code) for better caching
# Docker caches this layer - only rebuilds if package files change
COPY package*.json ./

# Install Node.js dependencies
# npm ci: Clean install from package-lock.json (faster and more reliable than npm install)
# --only=production: Skip devDependencies (saves space and time)
# npm cache clean: Remove npm cache to reduce image size (~50MB savings)
RUN npm ci --only=production && npm cache clean --force

# Copy application source code into container
# This layer rebuilds whenever code changes (that's why package files come first)
COPY . .

# Build Next.js production bundle
# Compiles TypeScript, optimizes assets, generates static pages
# Output goes to .next/ directory
RUN npm run build

# Document that container listens on port 3000 (informational only)
# Actual port mapping happens in docker-compose.yml
EXPOSE 3000

# Health check - Docker periodically runs this to verify service is healthy
# --interval=30s: Check every 30 seconds
# --timeout=10s: Fail if check takes longer than 10 seconds
# --start-period=15s: Grace period during startup (Next.js needs time to start)
# --retries=3: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Default command when container starts
# npm start: Runs Next.js production server (serves pre-built .next/ bundle)
CMD ["npm", "start"]