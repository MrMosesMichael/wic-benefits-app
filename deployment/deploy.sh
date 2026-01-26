#!/bin/bash
# Quick deployment script for WIC backend on VPS
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 WIC Backend Deployment Script"
echo "================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "Creating from template..."
    cp backend/.env.production .env

    # Generate strong password
    STRONG_PASSWORD=$(openssl rand -base64 32)

    # Update .env with generated password
    sed -i.bak "s/CHANGE_ME_STRONG_PASSWORD_HERE/${STRONG_PASSWORD}/" .env
    rm .env.bak

    echo "✅ Created .env with generated password"
    echo ""
    echo "⚠️  IMPORTANT: Save this password!"
    echo "Database Password: ${STRONG_PASSWORD}"
    echo ""
    read -p "Press Enter to continue..."
fi

# Check Docker
echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found! Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose not found! Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker found: $(docker --version)"
echo "✅ Docker Compose found: $(docker compose version)"
echo ""

# Build and start containers
echo "Building and starting containers..."
docker compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
sleep 5

# Check health
echo ""
echo "Checking service health..."
docker compose ps

echo ""
echo "Testing backend health endpoint..."
if curl -f http://localhost:3000/health &> /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend not responding yet. Check logs with: docker compose logs backend"
fi

echo ""
echo "================================="
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure nginx reverse proxy (see deployment/nginx-wic.conf)"
echo "2. Run database migrations (see deployment/DEPLOYMENT.md Step 4)"
echo "3. Import Michigan APL data (see deployment/DEPLOYMENT.md Step 5)"
echo "4. Test at: https://mdmichael.com/wic/health"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # View logs"
echo "  docker compose ps               # Check status"
echo "  docker compose restart backend  # Restart backend"
echo "  docker compose down             # Stop all services"
