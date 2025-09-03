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

# Source shared cleanup function
source ./scripts/docker-cleanup.sh

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
        # Run standard cleanup after stopping
        docker_cleanup "silent"
        ;;
    2)
        echo -e "${BLUE}⏸️  Stopping containers (keeping for quick restart)...${NC}"
        ${DOCKER_COMPOSE_COMMAND} stop
        ;;
    3)
        echo -e "${BLUE}🧹 Force stopping and cleaning up...${NC}"
        ${DOCKER_COMPOSE_COMMAND} down --remove-orphans --volumes
        echo -e "${YELLOW}⚠️  Note: This removed volumes too. Data might be lost.${NC}"
        # Run aggressive cleanup after force stop
        docker_cleanup "aggressive"
        ;;
    4)
        echo -e "${BLUE}🔧 Stopping containers with cleanup...${NC}"
        ${DOCKER_COMPOSE_COMMAND} down
        # Run aggressive cleanup after stopping
        docker_cleanup "aggressive"
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