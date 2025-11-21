#!/bin/bash
# Quick start - Run this to start the Energy Trading Platform

set -e  # Exit on error

echo "🚀 Starting Energy Trading Platform..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if run.sh exists
if [ ! -f "run.sh" ]; then
    echo "❌ Error: run.sh not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Make sure run.sh is executable
chmod +x run.sh

# Color codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting both backend and frontend...${NC}"
echo ""

# Get absolute paths
PROJECT_ROOT="$SCRIPT_DIR"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Check if ports are available (with fallback for systems without lsof)
check_port() {
    local port=$1
    
    # Try lsof first (most reliable)
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            return 0
        else
            return 1
        fi
    fi
    
    # Fallback to netstat if available
    if command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 0
        else
            return 1
        fi
    fi
    
    # If neither command is available, assume port is free
    echo -e "${YELLOW}⚠ Cannot check port $port (lsof and netstat not found)${NC}"
    return 1
}

if check_port 5000; then
    echo -e "${YELLOW}⚠ Port 5000 is already in use (backend)${NC}"
    echo "Please stop the existing process first"
    exit 1
fi

if check_port 5173; then
    echo -e "${YELLOW}⚠ Port 5173 is already in use (frontend)${NC}"
    echo "Please stop the existing process first"
    exit 1
fi

# Start backend in background
echo -e "${GREEN}Starting backend server...${NC}"
cd "$PROJECT_ROOT/backend" && npm run dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${YELLOW}⚠ Backend may have failed to start. Check logs/backend.log${NC}"
fi

# Start frontend
echo -e "${GREEN}Starting frontend application...${NC}"
cd "$PROJECT_ROOT/frontend"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║  🎉 Energy Trading Platform is now running!  ║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Frontend:${NC} http://localhost:5173"
echo -e "${CYAN}Backend:${NC}  http://localhost:5000"
echo -e "${CYAN}API:${NC}      http://localhost:5000/api/v1"
echo ""
echo -e "${YELLOW}📝 Important Notes:${NC}"
echo "  • Make sure you have MetaMask installed and connected to Sepolia"
echo "  • You need Sepolia testnet ETH (get from https://sepoliafaucet.com/)"
echo "  • Backend logs are in logs/backend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo 'Stopping services...'
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID 2>/dev/null
        echo "Backend stopped."
    fi
}

# Trap to kill backend on exit (handles all exit scenarios)
trap cleanup INT TERM EXIT

# Start frontend (foreground)
npm run dev

