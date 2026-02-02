#!/bin/bash
# WIC Backend Deployment Script (B4.1)
# Deploys backend to VPS using rsync and restarts Docker services
# Usage: ./scripts/deploy-backend.sh

set -e  # Exit on error

# Configuration
SSH_HOST="tatertot.work"
REMOTE_DIR="~/wic-app"
LOCAL_DIR="/Users/moses/projects/wic_project"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}WIC Backend Deployment Script${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Safety check - confirm deployment
echo -e "${YELLOW}This will deploy backend code to: ${SSH_HOST}${NC}"
echo -e "${YELLOW}Remote directory: ${REMOTE_DIR}${NC}"
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 1: Testing SSH connection...${NC}"
if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 ${SSH_HOST} exit; then
    echo -e "${RED}❌ Cannot connect to ${SSH_HOST}${NC}"
    echo -e "${YELLOW}Make sure SSH alias is configured in ~/.ssh/config${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"

echo ""
echo -e "${BLUE}Step 2: Syncing backend code...${NC}"
echo -e "${YELLOW}Syncing: backend/ directory${NC}"
rsync -arvz \
    --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.env' \
    --exclude 'backend.log' \
    --exclude '*.log' \
    "${LOCAL_DIR}/backend/" \
    "${SSH_HOST}:${REMOTE_DIR}/backend/"

echo ""
echo -e "${YELLOW}Syncing: docker-compose.yml${NC}"
rsync -arvz \
    "${LOCAL_DIR}/docker-compose.yml" \
    "${SSH_HOST}:${REMOTE_DIR}/"

echo ""
echo -e "${YELLOW}Syncing: deployment files${NC}"
rsync -arvz \
    "${LOCAL_DIR}/deployment/" \
    "${SSH_HOST}:${REMOTE_DIR}/deployment/"

echo -e "${GREEN}✅ Files synced successfully${NC}"

echo ""
echo -e "${BLUE}Step 3: Building and restarting backend...${NC}"
ssh ${SSH_HOST} "cd ${REMOTE_DIR} && docker compose build backend && docker compose up -d backend"

echo ""
echo -e "${BLUE}Step 4: Waiting for backend to be healthy...${NC}"
sleep 5

echo ""
echo -e "${BLUE}Step 5: Checking deployment status...${NC}"
ssh ${SSH_HOST} "cd ${REMOTE_DIR} && docker compose ps"

echo ""
echo -e "${BLUE}Step 6: Testing backend health endpoint...${NC}"
if ssh ${SSH_HOST} "curl -sf http://localhost:3000/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend health check failed. Checking logs...${NC}"
    ssh ${SSH_HOST} "cd ${REMOTE_DIR} && docker compose logs --tail 50 backend"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 7: Displaying recent logs...${NC}"
ssh ${SSH_HOST} "cd ${REMOTE_DIR} && docker compose logs --tail 20 backend"

echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}Backend URL:${NC} https://mdmichael.com/wic/api/v1/"
echo -e "${BLUE}Health Check:${NC} https://mdmichael.com/wic/health"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:    ssh ${SSH_HOST} 'cd ${REMOTE_DIR} && docker compose logs -f backend'"
echo -e "  Restart:      ssh ${SSH_HOST} 'cd ${REMOTE_DIR} && docker compose restart backend'"
echo -e "  Stop:         ssh ${SSH_HOST} 'cd ${REMOTE_DIR} && docker compose down'"
echo -e "  Shell access: ssh ${SSH_HOST} 'cd ${REMOTE_DIR} && docker compose exec backend sh'"
echo ""
