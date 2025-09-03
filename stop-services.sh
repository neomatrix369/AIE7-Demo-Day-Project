#!/bin/bash

# RagCheck Service Stop Script
# Convenient script to stop all RagCheck services

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping RagCheck Services${NC}"
echo "=================================="

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi

# Determine docker-compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_COMMAND="docker-compose"
elif command -v docker compose &> /dev/null; then
    DOCKER_COMPOSE_COMMAND="docker compose"
else
    echo -e "${RED}❌ Neither 'docker-compose' nor 'docker compose' is available${NC}"
    exit 1
fi

# Check what's currently running
echo -e "${BLUE}📦 Current container status:${NC}"
${DOCKER_COMPOSE_COMMAND} ps

echo ""

# Ask user what type of stop they want
echo -e "${YELLOW}Choose stop method:${NC}"
echo "1. 🛑 Stop and remove containers (default - recommended)"
echo "2. ⏸️  Stop containers but keep them (faster restart)"
echo "3. 🧹 Force stop and clean up everything (nuclear option)"
echo "4. 🔧 Stop + cleanup (removes containers, dangling images, and unused resources)"
echo ""

read -p "Enter choice (1-4) or press Enter for default [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        echo -e "${BLUE}🛑 Stopping and removing containers...${NC}"
        ${DOCKER_COMPOSE_COMMAND} down
        ;;
    2)
        echo -e "${BLUE}⏸️  Stopping containers (keeping for quick restart)...${NC}"
        ${DOCKER_COMPOSE_COMMAND} stop
        ;;
    3)
        echo -e "${BLUE}🧹 Force stopping and cleaning up...${NC}"
        ${DOCKER_COMPOSE_COMMAND} down --remove-orphans --volumes
        echo -e "${YELLOW}⚠️  Note: This removed volumes too. Data might be lost.${NC}"
        ;;
    4)
        echo -e "${BLUE}🔧 Stopping containers with cleanup...${NC}"
        ${DOCKER_COMPOSE_COMMAND} down
        
        echo -e "${BLUE}🧹 Cleaning up Docker resources...${NC}"
        
        # Remove exited containers
        EXITED_CONTAINERS=$(docker ps -aq --filter "status=exited" 2>/dev/null)
        if [ -n "$EXITED_CONTAINERS" ]; then
            echo "  🗑️ Removing exited containers..."
            docker rm $EXITED_CONTAINERS > /dev/null 2>&1 || true
            echo -e "  ${GREEN}✅ Cleaned up exited containers${NC}"
        fi
        
        # Remove dangling images
        DANGLING_IMAGES=$(docker images --filter "dangling=true" -q 2>/dev/null)
        if [ -n "$DANGLING_IMAGES" ]; then
            echo "  🗑️ Removing dangling images..."
            docker rmi $DANGLING_IMAGES > /dev/null 2>&1 || true
            echo -e "  ${GREEN}✅ Cleaned up dangling images${NC}"
        fi
        
        # Remove unused networks
        echo "  🗑️ Pruning unused networks..."
        docker network prune -f > /dev/null 2>&1 || true
        echo -e "  ${GREEN}✅ Cleaned up unused networks${NC}"
        
        # Remove unused volumes (but preserve named volumes)
        echo "  🗑️ Pruning unused anonymous volumes..."
        docker volume prune -f > /dev/null 2>&1 || true
        echo -e "  ${GREEN}✅ Cleaned up unused volumes${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Using default.${NC}"
        ${DOCKER_COMPOSE_COMMAND} down
        ;;
esac

echo ""
echo -e "${GREEN}✅ Stop operation completed!${NC}"
echo ""

# Show final status
echo -e "${BLUE}📊 Final container status:${NC}"
${DOCKER_COMPOSE_COMMAND} ps

echo ""
echo -e "${BLUE}💡 What's next?${NC}"
echo "   🚀 Start services again:    ./start-services.sh"
echo "   🔍 Check service health:    ./scripts/health-check.sh"
echo "   📊 View container status:   ${DOCKER_COMPOSE_COMMAND} ps"
echo ""