#!/bin/bash

# Common Utility Functions for RagCheck Service Scripts
# Shared functions for start-services.sh and stop-services.sh

# Colors for output (shared across all scripts)
export GREEN='\033[0;32m'
export BLUE='\033[0;34m'
export YELLOW='\033[1;33m'
export RED='\033[0;31m'
export NC='\033[0m' # No Color

# Global variable for docker-compose command
export DOCKER_COMPOSE_COMMAND=""

# Function to check if Docker is installed and running
check_docker() {
    local script_type="${1:-start}"  # start or stop
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        if [[ "$script_type" == "start" ]]; then
            echo "❌ Docker is not installed. Please install Docker Desktop first."
            echo "   Download from: https://www.docker.com/products/docker-desktop/"
        else
            echo -e "${RED}❌ Docker is not installed${NC}"
        fi
        exit 1
    fi
    
    # For stop script, also check if Docker daemon is running
    if [[ "$script_type" == "stop" ]]; then
        if ! docker info > /dev/null 2>&1; then
            echo -e "${RED}❌ Docker daemon is not running${NC}"
            exit 1
        fi
    fi
}

# Function to determine docker-compose command availability
setup_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_COMMAND="docker-compose"
    elif command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE_COMMAND="docker compose"
    else
        echo -e "${RED}❌ Neither 'docker-compose' nor 'docker compose' is available${NC}"
        exit 1
    fi
    
    # Export for use in calling scripts
    export DOCKER_COMPOSE_COMMAND
}

# Function to show current container status
show_container_status() {
    echo -e "${BLUE}📦 Current container status:${NC}"
    ${DOCKER_COMPOSE_COMMAND} ps
    echo ""
}

# Function to check and setup .env file (for start script)
setup_env_file() {
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
}

# Function to check for port conflicts (for start script)
check_port_conflicts() {
    echo -e "${BLUE}🔍 Checking for port conflicts...${NC}"
    local PORTS_TO_CHECK=(3000 8000 6333 6334)
    local CONFLICTS_FOUND=()
    
    for port in "${PORTS_TO_CHECK[@]}"; do
        if lsof -ti:$port > /dev/null 2>&1; then
            CONFLICTS_FOUND+=($port)
            local PROCESSES=$(lsof -ti:$port | head -5 | xargs ps -p 2>/dev/null | tail -n +2 | awk '{print $1, $4}' || echo "unknown")
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
}

# Function to run health check
run_health_check() {
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
}

# Function to show startup completion message
show_startup_complete() {
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
}

# Function to show stop completion message
show_stop_complete() {
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
}

# Function to validate service startup
validate_service_startup() {
    local PORTS_TO_CHECK=(3000 8000 6333 6334)
    
    # Check if docker-compose started successfully
    if ! ${DOCKER_COMPOSE_COMMAND} ps | grep -q "Up"; then
        echo -e "${YELLOW}⚠️  Some services may not have started. Checking for remaining conflicts...${NC}"
        
        # Check for any remaining port conflicts
        for port in "${PORTS_TO_CHECK[@]}"; do
            if lsof -ti:$port > /dev/null 2>&1; then
                local CONFLICTING_PIDS=$(lsof -ti:$port)
                if ! docker ps --format "table {{.Names}}" | grep -q "ragcheck\|qdrant"; then
                    echo -e "${YELLOW}⚠️  Port $port still has conflicts. You may need to stop these processes manually:${NC}"
                    echo "   sudo lsof -ti:$port | xargs kill -9"
                fi
            fi
        done
    fi
}

# Function to display stop menu options
show_stop_menu() {
    echo -e "${YELLOW}Choose stop method:${NC}"
    echo "1. 🛑 Stop and remove containers (default - recommended)"
    echo "2. ⏸️  Stop containers but keep them (faster restart)"
    echo "3. 🧹 Force stop and clean up everything (nuclear option)"
    echo "4. 🔧 Stop + cleanup (removes containers, dangling images, and unused resources)"
    echo ""
}

# Function to handle stop choice execution
execute_stop_choice() {
    local choice="$1"
    
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
            docker_cleanup "silent"
            ;;
    esac
}

# Initialize common setup (call this first in both scripts)
common_init() {
    local script_type="${1:-start}"
    
    # Check Docker
    check_docker "$script_type"
    
    # Setup docker-compose command
    setup_docker_compose
    
    if [[ "$script_type" == "start" ]]; then
        echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
    fi
}