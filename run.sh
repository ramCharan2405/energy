#!/bin/bash

# Energy Trading Platform - Startup Script
# This script helps run all components of the platform

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        ⚡ Energy Trading Platform - Startup Script ⚡        ║
║                                                               ║
║     Blockchain-Based Renewable Energy Credit Marketplace     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Function to print section headers
print_header() {
    echo -e "\n${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}\n"
}

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        return 0
    else
        echo -e "${RED}✗ $1${NC}"
        return 1
    fi
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

print_header "Step 1: Prerequisites Check"

# Check Node.js
echo -n "Checking Node.js installation... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_status "Node.js $NODE_VERSION installed"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js v16 or higher from https://nodejs.org/"
    exit 1
fi

# Check npm
echo -n "Checking npm installation... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_status "npm $NPM_VERSION installed"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check MongoDB
echo -n "Checking MongoDB installation... "
if command -v mongod &> /dev/null; then
    check_status "MongoDB installed"
    MONGODB_INSTALLED=true
else
    echo -e "${YELLOW}⚠ MongoDB not found${NC}"
    echo -e "${YELLOW}The backend requires MongoDB for full functionality.${NC}"
    echo -e "${YELLOW}You can install it from: https://www.mongodb.com/try/download/community${NC}"
    MONGODB_INSTALLED=false
fi

print_header "Step 2: Project Setup"

# Check if dependencies are installed
echo "Checking dependencies..."

if [ ! -d "contracts/node_modules" ]; then
    echo -e "${YELLOW}Installing contracts dependencies...${NC}"
    (cd contracts && npm install) || exit 1
    check_status "Contracts dependencies installed"
else
    check_status "Contracts dependencies already installed"
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    (cd backend && npm install) || exit 1
    check_status "Backend dependencies installed"
else
    check_status "Backend dependencies already installed"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    (cd frontend && npm install) || exit 1
    check_status "Frontend dependencies installed"
else
    check_status "Frontend dependencies already installed"
fi

# Check environment files
echo -e "\nChecking environment configuration..."

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        check_status "Backend .env created (please edit with your values)"
    else
        echo -e "${RED}✗ backend/.env.example not found${NC}"
        echo "Please create backend/.env manually"
    fi
else
    check_status "Backend .env exists"
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}Creating frontend .env file...${NC}"
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        check_status "Frontend .env created"
    else
        echo -e "${RED}✗ frontend/.env.example not found${NC}"
    fi
else
    check_status "Frontend .env exists"
fi

print_header "Step 3: Starting Services"

# Function to start MongoDB if not running
start_mongodb() {
    if [ "$MONGODB_INSTALLED" = true ]; then
        if ! pgrep -x mongod > /dev/null; then
            echo -e "${YELLOW}Starting MongoDB...${NC}"
            
            # Try to start with systemctl first (most common on Linux)
            if command -v systemctl &> /dev/null; then
                echo -e "${YELLOW}Attempting to start MongoDB via systemctl (may require sudo)...${NC}"
                sudo systemctl start mongod 2>/dev/null && {
                    sleep 2
                    check_status "MongoDB started via systemctl"
                    return 0
                }
            fi
            
            # Try homebrew services on macOS
            if command -v brew &> /dev/null; then
                brew services start mongodb-community 2>/dev/null && {
                    sleep 2
                    check_status "MongoDB started via brew"
                    return 0
                }
            fi
            
            # Try user-space MongoDB with persistent data
            echo -e "${YELLOW}Trying to start MongoDB in user space...${NC}"
            MONGO_DATA_DIR="$HOME/.mongodb-data"
            mkdir -p "$MONGO_DATA_DIR"
            mongod --dbpath "$MONGO_DATA_DIR" --logpath "$MONGO_DATA_DIR/mongodb.log" --bind_ip localhost --fork 2>/dev/null && {
                sleep 2
                check_status "MongoDB started (data stored in $MONGO_DATA_DIR)"
                echo -e "${CYAN}Note: MongoDB is running on localhost only for security${NC}"
                return 0
            }
            
            # If all else fails
            echo -e "${RED}✗ Could not start MongoDB automatically${NC}"
            echo -e "${YELLOW}Please start MongoDB manually:${NC}"
            echo "  • Linux: sudo systemctl start mongod"
            echo "  • macOS: brew services start mongodb-community"
            echo "  • Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas"
            return 1
        else
            check_status "MongoDB already running"
        fi
    else
        echo -e "${YELLOW}⚠ MongoDB not installed - backend may have limited functionality${NC}"
        echo -e "${YELLOW}Install from: https://www.mongodb.com/try/download/community${NC}"
    fi
}

# Start MongoDB if available
start_mongodb

# Ask user what to start
echo -e "\n${CYAN}What would you like to run?${NC}\n"
echo "  1) Backend only (API server on port 5000)"
echo "  2) Frontend only (React app on port 5173)"
echo "  3) Both Backend and Frontend (recommended)"
echo "  4) Test smart contracts"
echo "  5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        print_header "Starting Backend Server"
        
        # Check if port 5000 is in use
        if check_port 5000; then
            echo -e "${YELLOW}⚠ Port 5000 is already in use${NC}"
            echo "Please stop the existing process or use a different port"
            exit 1
        fi
        
        echo -e "${GREEN}Starting backend server...${NC}"
        echo "Server will be available at: ${CYAN}http://localhost:5000${NC}"
        echo "API endpoints at: ${CYAN}http://localhost:5000/api/v1${NC}"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        cd backend && npm run dev
        ;;
        
    2)
        print_header "Starting Frontend Application"
        
        # Check if port 5173 is in use
        if check_port 5173; then
            echo -e "${YELLOW}⚠ Port 5173 is already in use${NC}"
            echo "Please stop the existing process or use a different port"
            exit 1
        fi
        
        echo -e "${GREEN}Starting frontend application...${NC}"
        echo "App will be available at: ${CYAN}http://localhost:5173${NC}"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        cd frontend && npm run dev
        ;;
        
    3)
        print_header "Starting Both Backend and Frontend"
        
        # Check ports
        if check_port 5000; then
            echo -e "${YELLOW}⚠ Port 5000 is already in use (backend)${NC}"
            exit 1
        fi
        
        if check_port 5173; then
            echo -e "${YELLOW}⚠ Port 5173 is already in use (frontend)${NC}"
            exit 1
        fi
        
        # Get absolute path to project root
        PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        
        # Create logs directory if it doesn't exist (using absolute path)
        mkdir -p "$PROJECT_ROOT/logs"
        
        echo -e "${GREEN}Starting backend server in background...${NC}"
        cd "$PROJECT_ROOT/backend" && npm run dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
        BACKEND_PID=$!
        echo "Backend PID: $BACKEND_PID"
        
        # Wait for backend to start
        echo "Waiting for backend to start..."
        sleep 5
        
        if ps -p $BACKEND_PID > /dev/null; then
            echo -e "${GREEN}✓ Backend started successfully${NC}"
        else
            echo -e "${RED}✗ Backend failed to start. Check logs/backend.log${NC}"
            exit 1
        fi
        
        echo -e "\n${GREEN}Starting frontend application...${NC}"
        cd ../frontend
        
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
        echo "  • Contracts are already deployed on Sepolia"
        echo "  • Check logs/backend.log for backend logs"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"
        echo ""
        
        # Trap to kill backend on exit
        trap "echo 'Stopping backend...'; kill $BACKEND_PID 2>/dev/null; exit" INT TERM
        
        npm run dev
        
        # Cleanup
        kill $BACKEND_PID 2>/dev/null
        ;;
        
    4)
        print_header "Testing Smart Contracts"
        
        echo -e "${GREEN}Running smart contract tests...${NC}"
        echo ""
        cd contracts && npm test
        ;;
        
    5)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
