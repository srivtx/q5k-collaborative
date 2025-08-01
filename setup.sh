#!/bin/bash

# CodeShare Setup Script
echo "🚀 Setting up CodeShare..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "16" ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker found - secure code execution will be available"
    
    # Check if Docker is running
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker is running"
        
        # Pull required Docker images
        echo "📦 Pulling Docker images for code execution..."
        docker pull node:18-alpine &
        docker pull python:3.11-alpine &
        docker pull openjdk:17-alpine &
        docker pull gcc:latest &
        wait
        echo "✅ Docker images pulled successfully"
    else
        echo "⚠️  Docker is installed but not running. Please start Docker for secure code execution."
    fi
else
    echo "⚠️  Docker not found. The application will use fallback execution (less secure)."
    echo "   For full security features, install Docker from https://docker.com/"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create necessary directories
mkdir -p temp
chmod 755 temp

echo "✅ Setup completed successfully!"
echo ""
echo "🎉 CodeShare is ready to run!"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3000"
echo ""
echo "For development with auto-reload:"
echo "  npm run dev"
echo ""
echo "Enjoy collaborative coding! 🎯"
