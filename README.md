# Energy Trading Platform

A blockchain-based marketplace where people can buy and sell renewable energy credits. Think of it like eBay, but for energy tokens on the Ethereum blockchain.

## What's This About?

Ever wondered how renewable energy could be traded like stocks or commodities? This platform makes it happen. Users can:

- Sell their excess renewable energy as digital tokens (ENGC)
- Buy energy credits from other users using Ethereum
- Track all their transactions on the blockchain
- View real-time analytics and trading history

The whole thing runs on Ethereum's Sepolia testnet, so you can try it out without spending real money.

## The Stack

**Frontend:**

- React for the UI
- Vite for fast development and building
- Tailwind CSS for styling
- MetaMask for wallet integration
- Zustand for state management

**Backend:**

- Node.js with Express
- MongoDB for storing user data and listings
- ethers.js for blockchain interactions
- JWT for authentication
- Winston for logging

**Blockchain:**

- Solidity smart contracts
- OpenZeppelin for security standards
- Hardhat for testing and deployment
- Deployed on Sepolia testnet

## How It Works

### For Sellers

1. Connect your MetaMask wallet
2. Get 50 free ENGC tokens as a welcome bonus
3. Create a listing with your energy amount and price
4. Wait for buyers to purchase
5. Receive ETH directly to your wallet (minus 2% platform fee)

### For Buyers

1. Connect your wallet
2. Browse available listings
3. Select what you want to buy
4. Pay with Sepolia ETH
5. Receive ENGC tokens instantly

The smart contracts handle everything automatically - token transfers, payments, and fees.

## Project Structure

```
energy_trading_platform/
├── frontend/          # React app
├── backend/           # Express API server
└── contracts/         # Solidity smart contracts
```

Each folder has its own README with specific setup instructions.

## Getting Started

### Prerequisites

You'll need these installed:

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- MetaMask browser extension
- Some Sepolia testnet ETH

### Quick Setup

**1. Clone the repo**

```bash
git clone https://github.com/ramCharan2405/energy.git
cd energy_trading_platform
```

**2. Set up the backend**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and contract addresses
npm run dev
```

**3. Set up the frontend**

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your contract addresses
npm run dev
```

**4. Deploy contracts (if needed)**

```bash
cd contracts
npm install
cp .env.example .env
# Add your private key and Alchemy API key
npx hardhat run scripts/deploy.js --network sepolia
```

The backend runs on `localhost:5000` and the frontend on `localhost:5173`.

## Features

### User Authentication

- Wallet-based login using MetaMask
- No passwords needed - your wallet is your identity
- Automatic account creation on first login
- 50 ENGC signup bonus

### Marketplace

- Browse all active energy listings
- Filter by energy source (solar, wind, hydro, etc.)
- Search by location
- See seller information and reputation
- Real-time price updates

### Trading

- Create listings with custom prices
- Buy energy with a single transaction
- Automatic token and ETH transfers
- 2% platform fee on sales
- Transaction history with Etherscan links

### Dashboard

- Your ETH and ENGC balances
- Recent transactions
- Market statistics
- Trading volume charts
- Quick access to all features

### Analytics

- Platform-wide trading volume
- Price trends over time
- Energy source distribution
- Top traders leaderboard
- Your personal trading stats

## Smart Contracts

### EnergyCredit Token (ENGC)

- Standard ERC-20 token
- 1 ENGC = 1 kWh of energy
- Mintable by owner
- Burnable by holders
- Contract: `0x9faEA50ed06Ca785221Eb153A2683663f7AF6579`

### EnergyMarketplace

- Create and cancel listings
- Buy energy with ETH
- Automatic token transfers
- Platform fee collection (2%)
- Event logging for transparency
- Contract: `0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA`

Both contracts are verified on Sepolia Etherscan.

## Security

We take security seriously:

- OpenZeppelin battle-tested contracts
- ReentrancyGuard on all payable functions
- JWT authentication for API
- Input validation everywhere
- Rate limiting on API endpoints
- No private keys stored anywhere
- Helmet.js for HTTP security headers

## Current Limitations

Being a testnet project, there are some things to keep in mind:

- Only works on Sepolia testnet (no real money)
- You need Sepolia ETH from faucets
- Transaction confirmations take ~15 seconds
- Gas fees can vary based on network congestion
- Platform is for demonstration purposes

## Common Issues

**"Insufficient funds" error**

- You need Sepolia ETH for transactions
- Get some from https://sepoliafaucet.com/
- You need enough for both the listing price and gas fees

**MetaMask not connecting**

- Make sure you're on Sepolia network
- Try refreshing the page
- Check if MetaMask is unlocked

**Backend connection failed**

- Check if MongoDB is running
- Verify your .env file settings
- Make sure backend is running on port 5000

**Transactions taking too long**

- Sepolia can be slow sometimes
- Check the transaction on Etherscan
- Increase gas price if needed

## Development

Want to contribute or modify the project?

### Backend Development

```bash
cd backend
npm run dev    # Starts with nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev    # Vite dev server with hot reload
```

### Smart Contracts

```bash
cd contracts
npx hardhat test              # Run tests
npx hardhat node              # Local blockchain
npx hardhat compile           # Compile contracts
```

## Testing

Each component has its own tests:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Smart contract tests
cd contracts
npx hardhat test
```

## Environment Variables

### Backend (.env)

```
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
RPC_URL=your_alchemy_or_infura_url
ENERGY_TOKEN_ADDRESS=0x9faEA50ed06Ca785221Eb153A2683663f7AF6579
ENERGY_MARKETPLACE_ADDRESS=0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA
PLATFORM_PRIVATE_KEY=your_platform_wallet_key
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:5000/api/v1
VITE_ENERGY_TOKEN_ADDRESS=0x9faEA50ed06Ca785221Eb153A2683663f7AF6579
VITE_MARKETPLACE_ADDRESS=0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA
```

### Contracts (.env)

```
SEPOLIA_RPC_URL=your_alchemy_url
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

## API Endpoints

The backend exposes these main routes:

- `POST /api/v1/auth/login` - Connect wallet
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/listings` - Get all listings
- `POST /api/v1/listings` - Create listing
- `POST /api/v1/listings/:id/purchase` - Complete purchase
- `GET /api/v1/transactions` - Get transactions
- `GET /api/v1/analytics/*` - Various analytics endpoints

Full API documentation is in the backend README.

## Deployment

This is set up for local development and Sepolia testnet. For production:

1. Deploy contracts to mainnet
2. Update all contract addresses
3. Set up production MongoDB
4. Configure proper CORS settings
5. Use environment-specific configs
6. Set up proper monitoring
7. Implement rate limiting
8. Add more comprehensive error handling


## Future Improvements

Some ideas we're thinking about:

- Mobile app version
- Real-time price notifications
- Automated trading bots
- Bulk listing creation
- Advanced filtering and search
- Social features (reviews, ratings)
- Integration with IoT devices
- Support for more blockchain networks
- Fiat currency payment gateway




