#!/bin/bash

# Setup and start Qdrant for Corpus Quality Assessment Tool
# This script starts Qdrant via Docker Compose and waits for it to be ready

echo "🚀 Starting Qdrant Vector Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start Qdrant using Docker Compose
echo "📦 Starting Qdrant container..."
docker-compose up -d qdrant

# Wait for Qdrant to be ready
echo "⏳ Waiting for Qdrant to be ready..."
TIMEOUT=60
COUNTER=0

while [ $COUNTER -lt $TIMEOUT ]; do
    if curl -f http://localhost:6333/ > /dev/null 2>&1; then
        echo "✅ Qdrant is ready!"
        break
    fi
    
    echo "⏳ Waiting... (${COUNTER}s/${TIMEOUT}s)"
    sleep 2
    COUNTER=$((COUNTER + 2))
done

if [ $COUNTER -ge $TIMEOUT ]; then
    echo "❌ Timeout waiting for Qdrant to start"
    echo "📋 Checking container logs:"
    docker-compose logs qdrant
    exit 1
fi

# Show Qdrant status
echo "📊 Qdrant Status:"
curl -s http://localhost:6333/collections | jq '.' || echo "Collections: []"

echo ""
echo "🎉 Qdrant is ready!"
echo "📍 Web UI: http://localhost:6333/dashboard"
echo "🔗 API URL: http://localhost:6333"
echo ""
echo "💡 Next steps:"
echo "   1. Copy environment template: cp .env.example .env"
echo "   2. Edit .env and add your OPENAI_API_KEY"
echo "   3. Start the backend: cd backend && uvicorn main:app --reload"
echo ""
echo "To stop Qdrant later, run: docker-compose down"