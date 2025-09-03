#!/bin/bash

# RagCheck Docker Health Monitoring Script
# Comprehensive service health checker for Qdrant, Backend, and Frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service URLs
QDRANT_URL="http://localhost:6333"
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

# Function to print colored status
print_status() {
    local service="$1"
    local status="$2"
    local details="$3"
    
    case $status in
        "HEALTHY")
            echo -e "${GREEN}✅ $service: $status${NC} $details"
            ;;
        "DEGRADED")
            echo -e "${YELLOW}⚠️  $service: $status${NC} $details"
            ;;
        "UNHEALTHY")
            echo -e "${RED}❌ $service: $status${NC} $details"
            ;;
        *)
            echo -e "${BLUE}ℹ️  $service: $status${NC} $details"
            ;;
    esac
}

# Function to check service accessibility
check_service() {
    local name="$1"
    local url="$2"
    local timeout="${3:-5}"
    
    if curl -s -f --max-time "$timeout" "$url" > /dev/null 2>&1; then
        return 0  # Success
    else
        return 1  # Failed
    fi
}

# Function to get JSON response
get_json_response() {
    local url="$1"
    local timeout="${2:-5}"
    
    curl -s --max-time "$timeout" "$url" 2>/dev/null || echo "{}"
}

echo -e "${BLUE}🔍 RagCheck Docker Health Check${NC}"
echo "========================================"
echo

# Check Docker daemon
if ! docker info > /dev/null 2>&1; then
    print_status "Docker" "UNHEALTHY" "Docker daemon not running"
    exit 1
else
    print_status "Docker" "HEALTHY" "Daemon running"
fi

echo

# Check Docker containers
echo -e "${BLUE}📦 Container Status:${NC}"
if command -v docker-compose > /dev/null 2>&1; then
    docker-compose ps
elif command -v docker compose > /dev/null 2>&1; then
    docker compose ps
elif command -v docker > /dev/null 2>&1; then
    docker ps --filter "name=qdrant-ragcheck" --filter "name=ragcheck-backend" --filter "name=ragcheck-frontend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

echo
echo -e "${BLUE}🏥 Service Health Checks:${NC}"

# 1. Check Qdrant Vector Database
echo "----------------------------------------"
if check_service "Qdrant" "$QDRANT_URL/collections"; then
    qdrant_response=$(get_json_response "$QDRANT_URL/collections")
    collection_count=$(echo "$qdrant_response" | grep -o '"name"' | wc -l 2>/dev/null || echo "0")
    print_status "Qdrant" "HEALTHY" "($collection_count collections)"
    
    # Check specific collection
    if check_service "Qdrant Collection" "$QDRANT_URL/collections/student_loan_corpus"; then
        collection_info=$(get_json_response "$QDRANT_URL/collections/student_loan_corpus")
        points_count=$(echo "$collection_info" | grep -o '"points_count":[0-9]*' | cut -d':' -f2 2>/dev/null || echo "0")
        print_status "Corpus Collection" "HEALTHY" "($points_count vectors)"
    else
        print_status "Corpus Collection" "UNHEALTHY" "(not found or empty)"
    fi
else
    print_status "Qdrant" "UNHEALTHY" "(port 6333 unreachable)"
fi

echo

# 2. Check Backend API
echo "----------------------------------------"
if check_service "Backend API" "$BACKEND_URL"; then
    backend_health=$(get_json_response "$BACKEND_URL/health")
    backend_status=$(echo "$backend_health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null | tr -d '\n\r' | head -n1 || echo "unknown")
    
    case "$backend_status" in
        "healthy")
            print_status "Backend API" "HEALTHY" "(status: healthy)"
            ;;
        "degraded")
            print_status "Backend API" "DEGRADED" "(some services unavailable)"
            ;;
        *)
            print_status "Backend API" "UNHEALTHY" "(status: $backend_status)"
            ;;
    esac
    
    # Check individual backend services
    qdrant_service=$(echo "$backend_health" | grep -o '"qdrant":{"status":"[^"]*"' | cut -d'"' -f6 2>/dev/null | tr -d '\n\r' | head -n1 || echo "unknown")
    openai_service=$(echo "$backend_health" | grep -o '"openai":{"status":"[^"]*"' | cut -d'"' -f6 2>/dev/null | tr -d '\n\r' | head -n1 || echo "unknown")
    
    print_status "  → Qdrant Connection" "$qdrant_service" ""
    print_status "  → OpenAI API" "$openai_service" ""
    
else
    print_status "Backend API" "UNHEALTHY" "(port 8000 unreachable)"
fi

echo

# 3. Check Frontend
echo "----------------------------------------"
if check_service "Frontend" "$FRONTEND_URL"; then
    frontend_health=$(get_json_response "$FRONTEND_URL/api/health")
    frontend_status=$(echo "$frontend_health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null | tr -d '\n\r' | head -n1 || echo "unknown")
    
    case "$frontend_status" in
        "healthy")
            print_status "Frontend" "HEALTHY" "(status: healthy)"
            ;;
        "degraded")
            print_status "Frontend" "DEGRADED" "(backend unreachable)"
            ;;
        *)
            print_status "Frontend" "UNHEALTHY" "(status: $frontend_status)"
            ;;
    esac
    
    # Check backend connectivity from frontend
    backend_conn=$(echo "$frontend_health" | grep -o '"backend":{"status":"[^"]*"' | cut -d'"' -f6 2>/dev/null | tr -d '\n\r' | head -n1 || echo "unknown")
    print_status "  → Backend Connection" "$backend_conn" ""
    
else
    print_status "Frontend" "UNHEALTHY" "(port 3000 unreachable)"
fi

echo
echo "========================================"

# Overall system status
overall_issues=0

# Count unhealthy services
for service in "Qdrant" "Backend API" "Frontend"; do
    case $service in
        "Qdrant")
            if ! check_service "$service" "$QDRANT_URL/collections"; then
                ((overall_issues++))
            fi
            ;;
        "Backend API")
            if ! check_service "$service" "$BACKEND_URL"; then
                ((overall_issues++))
            fi
            ;;
        "Frontend")
            if ! check_service "$service" "$FRONTEND_URL"; then
                ((overall_issues++))
            fi
            ;;
    esac
done

if [ $overall_issues -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    exit 0
elif [ $overall_issues -eq 1 ]; then
    echo -e "${YELLOW}⚠️  1 service has issues${NC}"
    exit 1
else
    echo -e "${RED}❌ $overall_issues services have issues${NC}"
    exit 1
fi