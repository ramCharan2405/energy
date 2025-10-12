# Energy Trading Platform - Smart Contracts

This folder contains the Solidity smart contracts for the Virtual Energy Credit Marketplace.

## 📋 Overview

The platform consists of two main smart contracts:

1. **EnergyCredit (ENGC)** - ERC-20 token representing energy credits (1 token = 1 kWh)
2. **EnergyMarketplace** - Marketplace contract for buying/selling energy credits with Sepolia ETH

## 🏗️ Project Structure

```
contracts/
├── contracts/
│   ├── EnergyCredit.sol          # ERC-20 token contract
│   └── EnergyMarketplace.sol     # Marketplace contract
├── scripts/
│   └── deploy.js                 # Deployment script
├── test/
│   ├── EnergyCredit.test.js      # Token tests
│   └── EnergyMarketplace.test.js # Marketplace tests
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Dependencies
├── .env.example                  # Environment variables template
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask wallet with Sepolia ETH

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the template:

```bash
cp .env.example .env
```

3. Fill in your environment variables in `.env`:

```
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

⚠️ **Never commit your `.env` file!**

## 🧪 Testing

Run tests on local Hardhat network:

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run specific test file
npx hardhat test test/EnergyCredit.test.js
```

## 📦 Compilation

Compile the smart contracts:

```bash
npm run compile
```

Compiled artifacts will be in the `artifacts/` directory.

## 🌐 Deployment

### Local Hardhat Network

1. Start a local Hardhat node:

```bash
npm run node
```

2. In another terminal, deploy contracts:

```bash
npm run deploy
```

### Sepolia Testnet

1. Make sure you have Sepolia ETH in your wallet
2. Configure your `.env` file with your private key and RPC URL
3. Deploy to Sepolia:

```bash
npm run deploy:sepolia
```

Deployment info will be saved in `deployments/sepolia-deployment.json`

## 📝 Contract Features

### EnergyCredit Token (ENGC)

- **Standard**: ERC-20
- **Name**: EnergyCredit
- **Symbol**: ENGC
- **Decimals**: 18
- **Features**:
  - Minting (owner only)
  - Burning (any holder)
  - Demo minting for new users
  - Balance tracking in tokens and wei

### EnergyMarketplace

- **Features**:

  - Create sell listings (amount + price per token)
  - Buy energy with Sepolia ETH
  - Cancel listings
  - Platform fee (default 2%)
  - Query active listings
  - Query user listings
  - Automatic ETH distribution to sellers
  - Token transfer to buyers

- **Platform Fee**: 2% (200 basis points) - configurable by owner

## 🔐 Security Features

- ReentrancyGuard on critical functions
- Ownership controls
- Input validation
- Safe ETH transfers
- ERC-20 approval checks

## 📊 Gas Estimates

Approximate gas costs on Sepolia:

- Deploy EnergyCredit: ~1,500,000 gas
- Deploy EnergyMarketplace: ~2,000,000 gas
- Create Listing: ~100,000 gas
- Buy Energy: ~150,000 gas
- Cancel Listing: ~50,000 gas

## 🔍 Verification

After deploying to Sepolia, verify your contracts on Etherscan:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

Example:

```bash
# Verify EnergyCredit (initial supply: 1000000)
npx hardhat verify --network sepolia 0x123... 1000000

# Verify EnergyMarketplace (token address)
npx hardhat verify --network sepolia 0x456... 0x123...
```

## 🎯 Usage Flow

1. **Deploy contracts** to Sepolia testnet
2. **Mint tokens** to users (for demo: 50 ENGC per user)
3. **Seller creates listing**: Approves tokens → Creates listing with amount & price
4. **Buyer purchases**: Sends ETH → Receives tokens, seller receives ETH
5. **Platform collects fee**: 2% of each transaction

## 📞 Contract Interactions

### For Sellers

```javascript
// 1. Approve marketplace to spend tokens
await energyCredit.approve(marketplaceAddress, amount);

// 2. Create listing (10 tokens at 0.01 ETH each)
await marketplace.createListing(10, ethers.parseEther("0.01"));

// 3. Cancel listing if needed
await marketplace.cancelListing(listingId);
```

### For Buyers

```javascript
// Buy energy (send ETH with transaction)
await marketplace.buyEnergy(listingId, { value: totalPrice });
```

### For Admin

```javascript
// Mint tokens to user
await energyCredit.mintForDemo(userAddress, 50, "Registration bonus");

// Update platform fee
await marketplace.updatePlatformFee(300); // 3%

// Withdraw collected fees
await marketplace.withdrawFees();
```

## 🛠️ Troubleshooting

**Issue**: "Insufficient token allowance"

- **Solution**: Call `approve()` on the token contract before creating a listing

**Issue**: "Insufficient ETH sent"

- **Solution**: Make sure you're sending enough ETH to cover the total price

**Issue**: "Cannot buy your own listing"

- **Solution**: Use a different account to purchase the listing

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Sepolia Faucet](https://sepoliafaucet.com/)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This is a project contract system. For issues or improvements, please contact the project maintainer.

---

**Happy Trading! ⚡**
