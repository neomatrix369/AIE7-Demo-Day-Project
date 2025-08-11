#!/bin/bash

echo "🎨 Setting up Corpus Quality Assessment Frontend..."

# Check if Node.js version is compatible
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 14 ]; then
    echo "❌ Node.js version 14 or higher is required. Current version: $(node --version)"
    echo "Please update Node.js and try again."
    exit 1
fi

echo "✅ Node.js version check passed: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "✅ Frontend setup complete!"
echo ""
echo "To start the frontend development server:"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "The application will be available at: http://localhost:3000"