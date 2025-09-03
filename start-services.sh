#!/bin/bash

# RagCheck Service Startup Script  
# Start all RagCheck services (Docker-based by default)

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting RagCheck Services${NC}"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    if ! command -v docker compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    else
        DOCKER_COMPOSE_COMMAND="docker compose"
    fi
else
    DOCKER_COMPOSE_COMMAND="docker-compose"
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Check if .env file exists
if [[ ! -f .env ]]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo "📝 Please edit .env and add your OPENAI_API_KEY"
    echo "   Example: OPENAI_API_KEY=sk-your-actual-key-here"
    echo ""
    echo "Press Enter after you've updated the .env file..."
    read
fi

# Verify OpenAI API key
if grep -q "your_openai_api_key_here" .env; then
    echo -e "${YELLOW}⚠️  Please update OPENAI_API_KEY in .env file${NC}"
    echo "   Current value appears to be the placeholder"
    echo ""
    echo "Press Enter after you've updated the API key..."
    read
fi

# Clean up Docker before starting
echo -e "${BLUE}🧹 Cleaning up Docker resources...${NC}"

# Remove exited containers
EXITED_CONTAINERS=$(docker ps -aq --filter "status=exited" 2>/dev/null)
if [ -n "$EXITED_CONTAINERS" ]; then
    echo "  🗑️ Removing exited containers..."
    docker rm $EXITED_CONTAINERS > /dev/null 2>&1 || true
    echo -e "  ${GREEN}✅ Cleaned up exited containers${NC}"
else
    echo "  ✅ No exited containers to clean"
fi

# Remove dangling images
DANGLING_IMAGES=$(docker images --filter "dangling=true" -q 2>/dev/null)
if [ -n "$DANGLING_IMAGES" ]; then
    echo "  🗑️ Removing dangling images..."
    docker rmi $DANGLING_IMAGES > /dev/null 2>&1 || true
    echo -e "  ${GREEN}✅ Cleaned up dangling images${NC}"
else
    echo "  ✅ No dangling images to clean"
fi

# Prune unused networks
echo "  🗑️ Pruning unused networks..."
docker network prune -f > /dev/null 2>&1 || true
echo -e "  ${GREEN}✅ Cleaned up unused networks${NC}"

echo ""

# Check for port conflicts
echo -e "${BLUE}🔍 Checking for port conflicts...${NC}"
PORTS_TO_CHECK=(3000 8000 6333 6334)
CONFLICTS_FOUND=()

for port in "${PORTS_TO_CHECK[@]}"; do
    if lsof -ti:$port > /dev/null 2>&1; then
        CONFLICTS_FOUND+=($port)
        PROCESSES=$(lsof -ti:$port | head -5 | xargs ps -p 2>/dev/null | tail -n +2 | awk '{print $1, $4}' || echo "unknown")
        echo -e "${YELLOW}⚠️  Port $port is in use by:${NC}"
        echo "   $PROCESSES"
    fi
done

if [ ${#CONFLICTS_FOUND[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}🔧 Port conflicts detected on ports: ${CONFLICTS_FOUND[*]}${NC}"
    echo ""
    echo "Choose an option:"
    echo "1. 🛑 Stop conflicting processes automatically (recommended)"
    echo "2. 📋 Show commands to stop them manually"
    echo "3. ❌ Exit and handle conflicts yourself"
    echo ""
    
    read -p "Enter choice (1-3) [1]: " conflict_choice
    conflict_choice=${conflict_choice:-1}
    
    case $conflict_choice in
        1)
            echo -e "${BLUE}🛑 Stopping conflicting processes...${NC}"
            for port in "${CONFLICTS_FOUND[@]}"; do
                echo "Stopping processes on port $port..."
                if lsof -ti:$port | xargs kill 2>/dev/null; then
                    echo -e "${GREEN}✅ Stopped processes on port $port${NC}"
                else
                    echo -e "${YELLOW}⚠️  Some processes on port $port may require manual intervention${NC}"
                fi
                sleep 1
            done
            echo ""
            ;;
        2)
            echo -e "${BLUE}📋 Manual commands to stop conflicting processes:${NC}"
            for port in "${CONFLICTS_FOUND[@]}"; do
                echo "  Port $port: sudo lsof -ti:$port | xargs kill -9"
            done
            echo ""
            echo "Run these commands, then restart this script."
            exit 1
            ;;
        3)
            echo -e "${YELLOW}❌ Exiting. Please handle port conflicts and retry.${NC}"
            exit 1
            ;;
    esac
fi

# Start services
echo -e "${BLUE}🚀 Starting RagCheck services...${NC}"
echo "   This may take a few minutes on first run (downloading images)"
echo ""

# Build and start services
echo "On your system, to invoke the docker compose services you run this command between single quotes: '${DOCKER_COMPOSE_COMMAND}'"
${DOCKER_COMPOSE_COMMAND} up --build -d

# Wait a moment for services to initialize
echo -e "${BLUE}⏳ Waiting for services to initialize...${NC}"
sleep 10

# Check if docker-compose started successfully
if ! ${DOCKER_COMPOSE_COMMAND} ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Some services may not have started. Checking for remaining conflicts...${NC}"
    
    # Check for any remaining port conflicts
    for port in "${PORTS_TO_CHECK[@]}"; do
        if lsof -ti:$port > /dev/null 2>&1; then
            CONFLICTING_PIDS=$(lsof -ti:$port)
            if ! docker ps --format "table {{.Names}}" | grep -q "ragcheck\|qdrant"; then
                echo -e "${YELLOW}⚠️  Port $port still has conflicts. You may need to stop these processes manually:${NC}"
                echo "   sudo lsof -ti:$port | xargs kill -9"
            fi
        fi
    done
fi

# Run health check
echo -e "${BLUE}🏥 Checking service health...${NC}"
if [[ -x "./scripts/health-check.sh" ]]; then
    ./scripts/health-check.sh
else
    echo "Health check script not found or not executable"
    echo "Checking basic connectivity..."
    
    # Basic connectivity tests
    for port in 6333 8000 3000; do
        if curl -s --max-time 5 "http://localhost:$port" > /dev/null 2>&1; then
            echo "✅ Port $port: Accessible"
        else
            echo "❌ Port $port: Not accessible"
        fi
    done
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "🌐 Open your browser and navigate to:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   Qdrant Dashboard: http://localhost:6333/dashboard"
echo ""
echo "📊 To monitor services:"
echo "   ./scripts/health-check.sh    # Detailed health report"
echo "   ${DOCKER_COMPOSE_COMMAND} logs -f       # Follow all logs"
echo "   ${DOCKER_COMPOSE_COMMAND} ps            # Service status"
echo ""
echo "🛑 To stop services:"
echo "   ./stop-services.sh           # Interactive stop script"
echo "   ${DOCKER_COMPOSE_COMMAND} down          # Direct stop command"
echo ""