#!/bin/bash

# start-wic-services.sh
# Starts all WIC Benefits App backend services
# Companion script to stop-wic-services.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WIC Project - Start Services Script          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Start PostgreSQL
echo -e "${BLUE}[1/3] PostgreSQL Database${NC}"
if ! pgrep -x postgres > /dev/null; then
    echo -e "${GREEN}⊙  Starting PostgreSQL...${NC}"
    brew services start postgresql@16 && \
        echo -e "${GREEN}✓ PostgreSQL started${NC}" || \
        echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    sleep 2
else
    echo -e "${YELLOW}⊘  PostgreSQL already running${NC}"
fi

# 2. Start Backend
echo -e "\n${BLUE}[2/3] Backend Node.js Service${NC}"
if [ -d "backend" ]; then
    if ! pgrep -f "wic_project/backend.*nodemon" > /dev/null; then
        echo -e "${GREEN}⊙  Starting backend server...${NC}"
        cd backend
        npm run dev > ../.orchestrator-logs/backend.log 2>&1 &
        backend_pid=$!
        cd ..
        echo -e "${GREEN}✓ Backend started (PID: $backend_pid)${NC}"
        echo -e "   ${BLUE}Logs:${NC} tail -f .orchestrator-logs/backend.log"
    else
        echo -e "${YELLOW}⊘  Backend already running${NC}"
    fi
else
    echo -e "${RED}✗ Backend directory not found${NC}"
fi

# 3. Start Expo Metro Bundler
echo -e "\n${BLUE}[3/3] Expo Metro Bundler${NC}"
if [ -d "app" ]; then
    if ! pgrep -f "wic_project/app.*expo start" > /dev/null; then
        echo -e "${GREEN}⊙  Starting Expo...${NC}"
        cd app
        npm start > ../.orchestrator-logs/expo.log 2>&1 &
        expo_pid=$!
        cd ..
        echo -e "${GREEN}✓ Expo started (PID: $expo_pid)${NC}"
        echo -e "   ${BLUE}Logs:${NC} tail -f .orchestrator-logs/expo.log"
        echo -e "   ${BLUE}Open in browser:${NC} http://localhost:8081"
    else
        echo -e "${YELLOW}⊘  Expo already running${NC}"
    fi
else
    echo -e "${RED}✗ App directory not found${NC}"
fi

# Optional: Start Orchestrator
echo -e "\n${BLUE}[Optional] Orchestrator Daemon${NC}"
read -p "Start orchestrator daemon? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ ! -f ".orchestrator-logs/orchestrator.lock" ]; then
        echo -e "${GREEN}⊙  Starting orchestrator...${NC}"
        ./orchestrator.sh --daemon --phase 2 --interval 10 --duration 6 &
        echo -e "${GREEN}✓ Orchestrator started${NC}"
    else
        echo -e "${YELLOW}⊘  Orchestrator already running${NC}"
    fi
else
    echo -e "${YELLOW}⊘  Skipped orchestrator${NC}"
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Service Status                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"

postgres_status=$(pgrep -x postgres > /dev/null && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Stopped${NC}")
backend_status=$(pgrep -f "wic_project/backend.*nodemon" > /dev/null && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Stopped${NC}")
expo_status=$(pgrep -f "wic_project/app.*expo start" > /dev/null && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Stopped${NC}")
orchestrator_status=$([ -f ".orchestrator-logs/orchestrator.lock" ] && echo -e "${GREEN}Running${NC}" || echo -e "${RED}Stopped${NC}")

echo -e "PostgreSQL:   $postgres_status"
echo -e "Backend:      $backend_status"
echo -e "Expo:         $expo_status"
echo -e "Orchestrator: $orchestrator_status"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  • Check processes: ${GREEN}ps aux | grep -i wic_project | grep -v grep${NC}"
echo -e "  • Stop services: ${GREEN}./stop-wic-services.sh${NC}"
echo -e "  • View backend logs: ${GREEN}tail -f .orchestrator-logs/backend.log${NC}"
echo -e "  • View expo logs: ${GREEN}tail -f .orchestrator-logs/expo.log${NC}"
echo ""
