#!/bin/bash

# stop-wic-services.sh
# Stops all heavy backend processes for the WIC Benefits App
# Use this to free up local processing power when working on other tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WIC Project - Stop Heavy Services Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to kill processes by pattern
kill_processes() {
    local pattern=$1
    local description=$2

    pids=$(ps aux | grep -i "$pattern" | grep -v grep | grep -v "stop-wic-services" | awk '{print $2}')

    if [ -z "$pids" ]; then
        echo -e "${YELLOW}⊘  No $description processes found${NC}"
    else
        echo -e "${GREEN}⊗  Stopping $description processes...${NC}"
        for pid in $pids; do
            kill -9 $pid 2>/dev/null && echo -e "   ${GREEN}✓${NC} Killed PID: $pid" || echo -e "   ${RED}✗${NC} Failed to kill PID: $pid"
        done
    fi
}

# 1. Stop Orchestrator Daemon
echo -e "\n${BLUE}[1/5] Orchestrator Daemon${NC}"
if [ -f ".orchestrator-logs/orchestrator.lock" ]; then
    orchestrator_pid=$(cat .orchestrator-logs/orchestrator.lock)
    if ps -p $orchestrator_pid > /dev/null 2>&1; then
        kill -9 $orchestrator_pid 2>/dev/null && \
            echo -e "${GREEN}✓ Stopped orchestrator daemon (PID: $orchestrator_pid)${NC}" || \
            echo -e "${RED}✗ Failed to stop orchestrator${NC}"
        rm -f .orchestrator-logs/orchestrator.lock
    else
        echo -e "${YELLOW}⊘  Orchestrator not running (stale lock file)${NC}"
        rm -f .orchestrator-logs/orchestrator.lock
    fi
else
    kill_processes "orchestrator.sh" "Orchestrator"
fi

# 2. Stop Expo Metro Bundler and Workers
echo -e "\n${BLUE}[2/5] Expo Metro Bundler${NC}"
kill_processes "expo start" "Expo Metro Bundler"

echo -e "\n${BLUE}[3/5] Metro Worker Processes${NC}"
kill_processes "jest-worker" "Jest/Metro Worker"

# 3. Stop Backend Node.js Processes
echo -e "\n${BLUE}[4/5] Backend Node.js Services${NC}"
# Stop nodemon processes
kill_processes "nodemon.*wic_project" "Nodemon"

# Stop ts-node processes
kill_processes "ts-node.*wic_project" "TS-Node Backend"

# Catch any remaining backend processes
backend_pids=$(ps aux | grep "wic_project/backend" | grep node | grep -v grep | grep -v "stop-wic-services" | awk '{print $2}')
if [ ! -z "$backend_pids" ]; then
    echo -e "${GREEN}⊗  Stopping remaining backend processes...${NC}"
    for pid in $backend_pids; do
        kill -9 $pid 2>/dev/null && echo -e "   ${GREEN}✓${NC} Killed PID: $pid" || echo -e "   ${RED}✗${NC} Failed to kill PID: $pid"
    done
fi

# 4. Stop PostgreSQL (if it's running for this project)
echo -e "\n${BLUE}[5/5] PostgreSQL Database${NC}"
if command -v pg_ctl &> /dev/null; then
    # Check if PostgreSQL is running
    if pgrep -x postgres > /dev/null; then
        echo -e "${YELLOW}⚠  PostgreSQL is running${NC}"
        read -p "Stop PostgreSQL? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pg_ctl -D /usr/local/var/postgresql@16 stop -m fast 2>/dev/null && \
                echo -e "${GREEN}✓ Stopped PostgreSQL${NC}" || \
                echo -e "${RED}✗ Failed to stop PostgreSQL (trying brew services)${NC}"

            # Try brew services as fallback
            if pgrep -x postgres > /dev/null; then
                brew services stop postgresql@16 2>/dev/null && \
                    echo -e "${GREEN}✓ Stopped PostgreSQL via brew services${NC}" || \
                    echo -e "${RED}✗ Failed to stop PostgreSQL${NC}"
            fi
        else
            echo -e "${YELLOW}⊘  Skipped PostgreSQL shutdown${NC}"
        fi
    else
        echo -e "${YELLOW}⊘  PostgreSQL not running${NC}"
    fi
else
    echo -e "${YELLOW}⊘  pg_ctl not found, skipping PostgreSQL${NC}"
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Process Summary                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"

# Check remaining WIC processes
remaining=$(ps aux | grep -i wic_project | grep -v grep | grep -v "stop-wic-services" | grep -v " vi " | wc -l | xargs)
postgres_running=$(pgrep -x postgres > /dev/null && echo "Running" || echo "Stopped")

echo -e "WIC Processes Remaining: ${remaining}"
echo -e "PostgreSQL Status: ${postgres_running}"

if [ "$remaining" -eq "0" ] && [ "$postgres_running" == "Stopped" ]; then
    echo -e "\n${GREEN}✓ All WIC services successfully stopped!${NC}"
    echo -e "${GREEN}  Your system resources are now available for other tasks.${NC}"
elif [ "$remaining" -eq "0" ]; then
    echo -e "\n${GREEN}✓ All WIC Node.js services stopped!${NC}"
    echo -e "${YELLOW}⚠ PostgreSQL still running (by choice)${NC}"
else
    echo -e "\n${YELLOW}⚠ Some processes may still be running${NC}"
    echo -e "Run this to check: ${BLUE}ps aux | grep -i wic_project | grep -v grep${NC}"
fi

echo ""
echo -e "${BLUE}To restart services later:${NC}"
echo -e "  • Expo: ${GREEN}cd app && npm start${NC}"
echo -e "  • Backend: ${GREEN}cd backend && npm run dev${NC}"
echo -e "  • PostgreSQL: ${GREEN}brew services start postgresql@16${NC}"
echo -e "  • Orchestrator: ${GREEN}./orchestrator.sh --daemon --phase 2${NC}"
echo ""
