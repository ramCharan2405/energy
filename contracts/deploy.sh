#!/bin/bash

# Energy Trading Platform - Quick Deployment Script
# This script will guide you through the deployment process

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  Energy Trading Platform - Smart Contracts Deployment    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed${NC}"
        return 1
    fi
}

# Check if we're in the right directory
if [ ! -f "hardhat.config.js" ]; then
    echo -e "${RED}Error: Please run this script from the contracts directory${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"
# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
else
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
else
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    check_status || exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Compiling contracts...${NC}"
npm run compile
check_status || exit 1

echo ""
echo -e "${BLUE}Step 3: Running tests...${NC}"
echo "This will take about 30-60 seconds..."
npm test
check_status || exit 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ All tests passed! Contracts are ready for deployment.${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask user what they want to do
echo "What would you like to do next?"
echo ""
echo "1) Deploy to LOCAL network (test deployment)"
echo "2) Deploy to SEPOLIA testnet (requires Sepolia ETH)"
echo "3) Run interaction example on LOCAL network"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}Deploying to local network...${NC}"
        echo "Starting local Hardhat node..."
        echo "Please open another terminal and run: npm run deploy"
        npm run node
        ;;
    2)
        echo ""
        echo -e "${YELLOW}⚠️  Before deploying to Sepolia, make sure you have:${NC}"
        echo "   1. Sepolia ETH in your wallet (min 0.05 ETH)"
        echo "   2. Correct RPC URL in .env"
        echo "   3. Valid private key in .env"
        echo ""
        read -p "Do you have everything ready? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo ""
            echo -e "${BLUE}Deploying to Sepolia testnet...${NC}"
            npm run deploy:sepolia
            if [ $? -eq 0 ]; then
                echo ""
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo -e "${GREEN}✓ Deployment successful!${NC}"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""
                echo "📝 Deployment details saved in: deployments/sepolia-deployment.json"
                echo ""
                echo "Next steps:"
                echo "1. Save your contract addresses"
                echo "2. Verify contracts on Etherscan (see DEPLOYMENT_GUIDE.md)"
                echo "3. Export ABIs: node scripts/exportABIs.js"
                echo "4. Start building your backend!"
            fi
        else
            echo "Deployment cancelled. Get Sepolia ETH from:"
            echo "  - https://sepoliafaucet.com/"
            echo "  - https://www.alchemy.com/faucets/ethereum-sepolia"
        fi
        ;;
    3)
        echo ""
        echo -e "${BLUE}Starting local network and running interaction example...${NC}"
        echo "This will demonstrate the complete workflow."
        echo ""
        # Start node in background
        npm run node > /dev/null 2>&1 &
        NODE_PID=$!
        echo "Waiting for node to start..."
        sleep 3
        
        # Run interaction script
        npx hardhat run scripts/interact.js --network localhost
        
        # Kill background node
        kill $NODE_PID 2>/dev/null
        echo ""
        echo -e "${GREEN}✓ Interaction example completed${NC}"
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━���━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "For more information, check:"
echo "  - DEPLOYMENT_GUIDE.md (step-by-step guide)"
echo "  - README.md (comprehensive documentation)"
echo "  - ARCHITECTURE.md (system design)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
