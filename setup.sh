#!/bin/bash

echo "🏗️ Setting up RagCheck..."
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

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
echo "🎉 Setup complete! ✅ AUTO-MANAGED"
echo ""
echo "Versions auto-switched: Python 3.12.2, Node.js v22.16.0"
echo ""
echo "Services available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Docs:     http://localhost:8000/docs"