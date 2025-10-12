/**
 * Quick Start Guide for Energy Trading Platform Contracts
 * 
 * This guide will help you get started with the smart contracts
 */

// STEP 1: INSTALLATION
console.log(`
╔════════════════════════════════════════════════════════════╗
║  ENERGY TRADING PLATFORM - SMART CONTRACTS QUICK START    ║
╚════════════════════════════════════════════════════════════╝

📦 STEP 1: Install Dependencies
   Run: npm install

⚙️  STEP 2: Configure Environment
   - Copy .env.example to .env
   - Add your PRIVATE_KEY (for Sepolia deployment)
   - Add SEPOLIA_RPC_URL (optional, defaults to public RPC)

🧪 STEP 3: Test Contracts Locally
   Run: npm test
   
   This will:
   - Start local Hardhat network
   - Deploy contracts
   - Run comprehensive tests
   - Show gas usage

🚀 STEP 4: Deploy to Local Network
   Terminal 1: npm run node (starts local blockchain)
   Terminal 2: npm run deploy (deploys contracts)

🌐 STEP 5: Deploy to Sepolia Testnet
   Prerequisites:
   - Get Sepolia ETH from faucet: https://sepoliafaucet.com/
   - Configure your .env file
   
   Run: npm run deploy:sepolia

📝 STEP 6: Try the Interaction Script
   Run: npx hardhat run scripts/interact.js --network localhost
   
   This demonstrates:
   - Minting tokens
   - Creating listings
   - Buying energy
   - Cancelling listings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 KEY CONCEPTS:

1️⃣  EnergyCredit Token (ENGC)
   - ERC-20 token
   - 1 token = 1 kWh of energy
   - Owner can mint tokens for new users

2️⃣  EnergyMarketplace
   - Sellers list energy credits for sale
   - Buyers purchase with Sepolia ETH
   - Platform takes 2% fee
   - Automatic token/ETH distribution

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 TYPICAL WORKFLOW:

Seller:
  1. Receive tokens (minted on registration)
  2. Approve marketplace: token.approve(marketplace, amount)
  3. Create listing: marketplace.createListing(amount, pricePerToken)
  4. Receive ETH when sold

Buyer:
  1. Browse active listings
  2. Purchase: marketplace.buyEnergy(listingId, {value: price})
  3. Receive energy tokens

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USEFUL COMMANDS:

Testing:
  npm test                           # Run all tests
  npm test test/EnergyCredit.test.js # Test token only
  REPORT_GAS=true npm test           # Show gas usage

Deployment:
  npm run compile                    # Compile contracts
  npm run node                       # Start local blockchain
  npm run deploy                     # Deploy locally
  npm run deploy:sepolia             # Deploy to Sepolia

Interaction:
  npx hardhat run scripts/interact.js --network localhost
  npx hardhat run scripts/interact.js --network sepolia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️  TROUBLESHOOTING:

❌ "Insufficient token allowance"
   ➜ Call approve() before creating listing

❌ "Insufficient ETH sent"
   ➜ Check listing.totalPriceInWei and send correct amount

❌ "Cannot buy your own listing"
   ➜ Use different account

❌ Deployment fails
   ➜ Check you have enough Sepolia ETH
   ➜ Verify .env configuration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 MORE HELP:

- Read README.md for detailed documentation
- Check contracts/ folder for contract source code
- Review test/ folder for usage examples
- See scripts/ folder for deployment & interaction scripts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 NEXT STEPS:

1. Run 'npm install' to get started
2. Run 'npm test' to verify everything works
3. Review the test files to understand contract behavior
4. Deploy to local network and experiment
5. When ready, deploy to Sepolia testnet

Good luck with your Energy Trading Platform! ⚡🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
