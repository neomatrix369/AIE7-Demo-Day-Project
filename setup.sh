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
echo "🎨 Setting up frontend..."
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
echo "🎉 Setup complete! Here's how to run the application:"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   cd backend"
echo "   source .venv/bin/activate"
echo "   uvicorn main:app --reload"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd frontend" 
echo "   npm run dev"
echo ""
echo "3. Open your browser and navigate to:"
echo "   http://localhost:3000"
echo ""
echo "📚 API documentation available at:"
echo "   http://localhost:8000/docs"
echo ""
echo "🔧 Need help? Check the README.md file for more details."