#!/bin/bash

# Docker Cleanup Utility
# Shared cleanup function for removing dangling images, exited containers, and unused resources

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to perform standard Docker cleanup
docker_cleanup() {
    local cleanup_type="${1:-standard}"  # standard, aggressive, or silent
    
    if [[ "$cleanup_type" != "silent" ]]; then
        echo -e "${BLUE}🧹 Cleaning up Docker resources...${NC}"
    fi
    
    # Remove exited containers
    local EXITED_CONTAINERS
    EXITED_CONTAINERS=$(docker ps -aq --filter "status=exited" 2>/dev/null)
    if [ -n "$EXITED_CONTAINERS" ]; then
        if [[ "$cleanup_type" != "silent" ]]; then
            echo "  🗑️ Removing exited containers..."
        fi
        docker rm $EXITED_CONTAINERS > /dev/null 2>&1 || true
        if [[ "$cleanup_type" != "silent" ]]; then
            echo -e "  ${GREEN}✅ Cleaned up exited containers${NC}"
        fi
    elif [[ "$cleanup_type" == "standard" ]]; then
        echo "  ✅ No exited containers to clean"
    fi
    
    # Remove dangling images
    local DANGLING_IMAGES
    DANGLING_IMAGES=$(docker images --filter "dangling=true" -q 2>/dev/null)
    if [ -n "$DANGLING_IMAGES" ]; then
        if [[ "$cleanup_type" != "silent" ]]; then
            echo "  🗑️ Removing dangling images..."
        fi
        docker rmi $DANGLING_IMAGES > /dev/null 2>&1 || true
        if [[ "$cleanup_type" != "silent" ]]; then
            echo -e "  ${GREEN}✅ Cleaned up dangling images${NC}"
        fi
    elif [[ "$cleanup_type" == "standard" ]]; then
        echo "  ✅ No dangling images to clean"
    fi
    
    # Prune unused networks
    if [[ "$cleanup_type" != "silent" ]]; then
        echo "  🗑️ Pruning unused networks..."
    fi
    docker network prune -f > /dev/null 2>&1 || true
    if [[ "$cleanup_type" != "silent" ]]; then
        echo -e "  ${GREEN}✅ Cleaned up unused networks${NC}"
    fi
    
    # Additional cleanup for aggressive mode
    if [[ "$cleanup_type" == "aggressive" ]]; then
        # Remove unused volumes (but preserve named volumes)
        echo "  🗑️ Pruning unused anonymous volumes..."
        docker volume prune -f > /dev/null 2>&1 || true
        echo -e "  ${GREEN}✅ Cleaned up unused volumes${NC}"
        
        # Remove unused images (not just dangling ones)
        local UNUSED_IMAGES
        UNUSED_IMAGES=$(docker images --filter "dangling=false" --format "table {{.ID}}" | tail -n +2 2>/dev/null)
        if [ -n "$UNUSED_IMAGES" ]; then
            echo "  🗑️ Pruning unused images..."
            docker image prune -a -f > /dev/null 2>&1 || true
            echo -e "  ${GREEN}✅ Cleaned up unused images${NC}"
        fi
    fi
    
    if [[ "$cleanup_type" != "silent" ]]; then
        echo ""
    fi
}

# Function to get cleanup size impact (optional - for reporting)
get_cleanup_stats() {
    local exited_containers dangling_images unused_networks
    
    exited_containers=$(docker ps -aq --filter "status=exited" 2>/dev/null | wc -l | tr -d ' ')
    dangling_images=$(docker images --filter "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')
    unused_networks=$(docker network ls --filter "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')
    
    echo "Cleanup stats: $exited_containers exited containers, $dangling_images dangling images, $unused_networks unused networks"
}

# If script is executed directly (not sourced), run cleanup
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker is not installed. Skipping cleanup.${NC}"
        exit 0
    fi
    
    if ! docker info > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker daemon is not running. Skipping cleanup.${NC}"
        exit 0
    fi
    
    # Run standard cleanup when executed directly
    docker_cleanup "standard"
    echo -e "${GREEN}✅ Docker cleanup completed!${NC}"
fi