#!/bin/bash

# Sniff Pittsburgh Docker Setup Script

echo "🐳 Setting up Sniff Pittsburgh with Docker..."
echo "============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please update Docker Desktop."
    exit 1
fi

echo "✅ Docker is installed and ready"

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker compose down

# Build and start containers
echo "🏗️  Building and starting containers..."
docker compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker compose ps

# Test the health endpoint
echo "🩺 Testing health endpoint..."
sleep 5
if curl -f http://localhost:5000/health &> /dev/null; then
    echo "✅ Flask app is healthy!"
else
    echo "⚠️  Flask app might still be starting up..."
fi

echo ""
echo "🎉 Setup complete!"
echo "==================="
echo "🌐 Flask App: http://localhost:5000"
echo "🗄️  pgAdmin:   http://localhost:8080"
echo ""
echo "📡 TTS Webhook URL: http://localhost:5000/tts-webhook"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:     docker compose logs -f app"
echo "   Stop all:      docker compose down"
echo "   Restart:       docker compose restart"
echo ""
echo "🧪 Test with:"
echo "   curl http://localhost:5000/health"
echo "   curl http://localhost:5000/data"