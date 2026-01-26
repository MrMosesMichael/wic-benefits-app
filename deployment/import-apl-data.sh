#!/bin/bash
# Import Michigan APL data to production database

set -e

echo "📦 Michigan APL Data Import"
echo "============================"
echo ""

# Check if michigan-apl.json exists
if [ ! -f "michigan-apl.json" ]; then
    echo "❌ Error: michigan-apl.json not found in current directory"
    echo ""
    echo "Please ensure michigan-apl.json is in: $(pwd)"
    echo ""
    echo "If the file is elsewhere, run from that directory or:"
    echo "  cp /path/to/michigan-apl.json ."
    exit 1
fi

echo "✅ Found michigan-apl.json"
echo ""

# Check if containers are running
if ! docker compose ps | grep -q "wic-backend.*Up"; then
    echo "❌ Error: wic-backend container is not running"
    echo "Start it with: docker compose up -d"
    exit 1
fi

echo "✅ Backend container is running"
echo ""

# Copy JSON file into backend container
echo "📁 Copying JSON file to container..."
docker cp michigan-apl.json wic-backend:/tmp/michigan-apl.json

# Run import script inside container
echo "🚀 Starting import..."
echo ""
docker compose exec backend node /app/scripts/import-apl-to-db.js /tmp/michigan-apl.json

# Cleanup
echo "🧹 Cleaning up..."
docker compose exec backend rm /tmp/michigan-apl.json

echo ""
echo "✅ All done!"
