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
echo ""
echo "1. 🛑 Standard stop (recommended for daily use)"
echo "   • Stops and removes containers"
echo "   • Cleans up: exited containers, dangling images, unused networks"
echo "   • Preserves: volumes (your data), built images, project-specific resources"
echo ""
echo "2. ⏸️  Quick pause (fastest restart)"
echo "   • Stops containers but keeps everything else"
echo "   • No cleanup - ideal for temporary pause"
echo "   • Next startup will be faster"
echo ""
echo "3. 🔧 Deep cleanup (reclaim disk space)"
echo "   • Stops and removes containers"
echo "   • Removes: ALL unused images (not just dangling), anonymous volumes, networks"
echo "   • Preserves: named volumes (your data), currently used resources"
echo ""
echo "4. 💣 Nuclear reset (⚠️  DATA LOSS WARNING)"
echo "   • Stops and removes containers, orphans, AND ALL VOLUMES"
echo "   • ⚠️  DELETES: Database data, ingested documents, all persistent data"
echo "   • Use only when starting completely fresh or troubleshooting"
echo ""

read -p "Enter choice (1-4) or press Enter for default [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        echo -e "${BLUE}🛑 Performing standard stop and cleanup...${NC}"
        ${DOCKER_COMPOSE_COMMAND} down
        # Run standard cleanup after stopping
        docker_cleanup "silent"
        echo -e "${GREEN}✅ Containers stopped. Your data is preserved.${NC}"
        ;;
    2)
        echo -e "${BLUE}⏸️  Pausing containers (quick restart mode)...${NC}"
        ${DOCKER_COMPOSE_COMMAND} stop
        echo -e "${GREEN}✅ Containers paused. No cleanup performed.${NC}"
        ;;
    3)
        echo -e "${BLUE}🔧 Performing deep cleanup (removing unused resources)...${NC}"
        echo -e "${YELLOW}This will remove ALL unused Docker images and anonymous volumes.${NC}"
        read -p "Continue? (y/N): " confirm_cleanup
        if [[ "$confirm_cleanup" =~ ^[Yy]$ ]]; then
            ${DOCKER_COMPOSE_COMMAND} down
            # Run aggressive cleanup after stopping
            docker_cleanup "aggressive"
            echo -e "${GREEN}✅ Deep cleanup completed. Named volumes preserved.${NC}"
        else
            echo -e "${YELLOW}Cancelled. Falling back to standard stop...${NC}"
            ${DOCKER_COMPOSE_COMMAND} down
            docker_cleanup "silent"
        fi
        ;;
    4)
        echo -e "${RED}💣 NUCLEAR RESET - THIS WILL DELETE ALL YOUR DATA${NC}"
        echo -e "${RED}   • All ingested documents will be lost${NC}"
        echo -e "${RED}   • All experiment results will be lost${NC}"
        echo -e "${RED}   • Database will be wiped clean${NC}"
        echo ""
        read -p "Are you ABSOLUTELY SURE? Type 'DELETE ALL DATA' to confirm: " confirm_nuclear
        if [[ "$confirm_nuclear" == "DELETE ALL DATA" ]]; then
            echo -e "${RED}🧹 Performing nuclear reset...${NC}"
            ${DOCKER_COMPOSE_COMMAND} down --remove-orphans --volumes
            # Run aggressive cleanup after force stop
            docker_cleanup "aggressive"
            echo -e "${YELLOW}⚠️  All data has been deleted. You're starting from scratch.${NC}"
        else
            echo -e "${GREEN}✅ Nuclear reset cancelled. Your data is safe.${NC}"
            echo -e "${YELLOW}Falling back to standard stop...${NC}"
            ${DOCKER_COMPOSE_COMMAND} down
            docker_cleanup "silent"
        fi
        ;;
    *)
        echo -e "${RED}❌ Invalid choice. Using standard stop.${NC}"
        ${DOCKER_COMPOSE_COMMAND} down
        docker_cleanup "silent"
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