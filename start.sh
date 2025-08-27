#!/bin/bash

echo "🚀 Starting Tracker Pro - Web Scraping Workflow System"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/tracker_db

# Server Configuration
PORT=3000
NODE_ENV=development

# Session Security
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Scraping Configuration
SCRAPER_TIMEOUT=30000
SCRAPER_HEADLESS=true
SCRAPER_RATE_LIMIT=1000

# Logging
LOG_LEVEL=info

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
EOF
    echo "✅ .env file created. Please update the DATABASE_URL with your PostgreSQL credentials."
    echo "⚠️  IMPORTANT: Update the DATABASE_URL in .env before continuing!"
    read -p "Press Enter after updating .env file..."
fi

# Check database connection
echo "🔍 Checking database connection..."
npm run db:push > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Database connection failed. Please check your DATABASE_URL in .env file."
    echo "   Make sure PostgreSQL is running and accessible."
    exit 1
fi
echo "✅ Database connection successful"

# Build the client
echo "🏗️  Building client application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Client build failed"
    exit 1
fi
echo "✅ Client built successfully"

# Start the server
echo "🚀 Starting server..."
echo "   The application will be available at: http://localhost:3000"
echo "   Press Ctrl+C to stop the server"
echo ""

npm start
