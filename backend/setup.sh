#!/bin/bash

echo "🚀 Setting up Corpus Quality Assessment Backend..."

# Create virtual environment using uv
echo "📦 Creating virtual environment..."
uv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "📋 Installing dependencies..."
uv pip install -r requirements.txt

echo "✅ Backend setup complete!"
echo ""
echo "To start the backend server:"
echo "  cd backend"
echo "  source .venv/bin/activate"
echo "  uvicorn main:app --reload"
echo ""
echo "The API will be available at: http://localhost:8000"
echo "API documentation will be available at: http://localhost:8000/docs"