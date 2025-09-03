#!/bin/bash

echo "🏗️ Setting up RagCheck..."
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check for Docker and prefer it
if command -v docker &> /dev/null && [[ "$1" != "--manual" ]]; then
    echo "🐳 Docker detected - using service startup (faster and more reliable)"
    echo "💡 Use './setup.sh --manual' if you prefer manual setup"
    echo ""
    exec ./start-services.sh
fi

echo "🔧 Using manual setup..."
echo "⚠️  Note: Docker setup is recommended for easier management"
echo ""

# Setup backend
echo "🔧 Setting up backend..."
cd backend
if [ -f "setup.sh" ]; then
    ./setup.sh
else
    echo "❌ Backend setup script not found"
    exit 1
fi
cd ..

echo ""
echo "=================================================="
echo ""

# Setup frontend
echo "🔍 Setting up RagCheck Next.js Frontend..."
cd frontend
if [ -f "setup.sh" ]; then
    ./setup.sh
else
    echo "❌ Frontend setup script not found"
    exit 1
fi
cd ..

echo ""
echo "=================================================="
echo ""
echo "🎉 Manual setup complete! ✅"
echo ""
echo "⚠️  Remember to start Qdrant separately:"
echo "   docker-compose up -d qdrant"
echo ""
echo "Services available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Docs:     http://localhost:8000/docs"
echo ""
echo "💡 For easier management, try service startup next time:"
echo "   ./start-services.sh"