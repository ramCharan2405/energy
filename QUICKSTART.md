# 🚀 Quick Start Guide - Running the Energy Trading Platform

This guide will help you get the Energy Trading Platform up and running on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

### Required
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MetaMask** browser extension - [Install here](https://metamask.io/)

### Optional but Recommended
- **MongoDB** (for full backend functionality) - [Download here](https://www.mongodb.com/try/download/community)
- **Sepolia Testnet ETH** - [Get from faucet](https://sepoliafaucet.com/)

## 🎯 Quick Start (Easiest Method)

The simplest way to run the project is using the provided startup script:

```bash
# 1. Navigate to the project directory
cd energy

# 2. Run the startup script
./run.sh

# 3. Choose option 3 to start both backend and frontend
```

That's it! The script will:
- Check all prerequisites
- Install dependencies if needed
- Create environment files
- Start all services

## 🔧 Manual Setup (Alternative Method)

If you prefer to set up manually or the script doesn't work:

### Step 1: Install Dependencies

```bash
# Install contracts dependencies
cd contracts
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables

All environment files have been created with default values, but you may need to customize them:

#### Backend (.env)
Located at `backend/.env`:
- **MONGODB_URI**: MongoDB connection string (default: `mongodb://localhost:27017/energy_trading_db`)
- **JWT_SECRET**: Secret for JWT tokens (change in production!)
- **PLATFORM_PRIVATE_KEY**: Private key for minting tokens (optional for testing)
- Other values are pre-configured for Sepolia testnet

#### Frontend (.env)
Located at `frontend/.env`:
- All values are pre-configured for Sepolia testnet
- Contract addresses point to deployed contracts
- No changes needed unless you redeploy contracts

#### Contracts (.env)
Located at `contracts/.env`:
- Only needed if you want to redeploy contracts
- Contracts are already deployed on Sepolia

### Step 3: Start MongoDB (if installed)

```bash
# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
net start MongoDB
```

If MongoDB is not installed, the backend will have limited functionality but the app will still run.

### Step 4: Start the Services

#### Option A: Start everything together

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

#### Option B: Start individually

**Backend only:**
```bash
cd backend
npm run dev
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

## 🌐 Accessing the Application

Once everything is running:

1. **Frontend**: Open your browser to `http://localhost:5173`
2. **Backend API**: Available at `http://localhost:5000/api/v1`
3. **API Health Check**: Visit `http://localhost:5000/api/v1/health`

## 🔌 Setting Up MetaMask

To use the platform, you need to configure MetaMask:

### 1. Add Sepolia Network (if not already added)

- Network Name: `Sepolia`
- RPC URL: `https://rpc.sepolia.org`
- Chain ID: `11155111`
- Currency Symbol: `ETH`
- Block Explorer: `https://sepolia.etherscan.io`

### 2. Get Sepolia ETH

You need test ETH to interact with the platform. Get some from these faucets:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

### 3. Connect to the Platform

1. Open the frontend at `http://localhost:5173`
2. Click "Connect Wallet"
3. Approve the connection in MetaMask
4. You're ready to start trading!

## 🎮 Using the Platform

### For First-Time Users

1. **Connect Wallet**: Click the "Connect Wallet" button
2. **Get Bonus Tokens**: You'll receive 50 ENGC tokens automatically
3. **Browse Listings**: Check out available energy credits
4. **Make a Purchase**: Buy energy credits using Sepolia ETH

### Creating a Listing

1. Navigate to "Create Listing"
2. Enter energy amount (in kWh)
3. Set price per kWh (in ETH)
4. Add details (energy source, location, etc.)
5. Submit the transaction in MetaMask

### Buying Energy

1. Browse available listings
2. Click on a listing to view details
3. Click "Buy Now"
4. Confirm the transaction in MetaMask
5. Wait for confirmation (~15 seconds)

## 📊 Contract Addresses

The platform uses these contracts deployed on Sepolia:

- **Energy Credit Token (ENGC)**: `0x9faEA50ed06Ca785221Eb153A2683663f7AF6579`
- **Energy Marketplace**: `0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA`

View them on Etherscan:
- [Token Contract](https://sepolia.etherscan.io/address/0x9faEA50ed06Ca785221Eb153A2683663f7AF6579)
- [Marketplace Contract](https://sepolia.etherscan.io/address/0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA)

## 🐛 Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### MongoDB Connection Failed

If backend can't connect to MongoDB:
- Make sure MongoDB is running: `sudo systemctl status mongod`
- Check connection string in `backend/.env`
- Verify MongoDB is accessible on port 27017

The app can run without MongoDB but with limited features.

### MetaMask Not Connecting

- Make sure you're on Sepolia network
- Try refreshing the page
- Check if MetaMask is unlocked
- Clear browser cache and reload

### Transaction Failed

Common reasons and solutions:
- **Insufficient funds**: Get more Sepolia ETH from faucets
- **Gas too low**: Increase gas limit in MetaMask
- **Network congestion**: Wait and try again
- **Contract error**: Check console for specific error messages

### Backend API Errors

Check backend logs:
```bash
tail -f logs/backend.log
```

Or if running in terminal, check the console output.

### Frontend Not Loading

- Make sure backend is running on port 5000
- Check browser console for errors
- Verify `.env` file has correct API URL
- Try clearing browser cache

## 📝 Environment Variables Reference

### Backend Environment Variables

| Variable | Description | Default/Example |
|----------|-------------|-----------------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/energy_trading_db` |
| `JWT_SECRET` | JWT secret key | Generate random string |
| `RPC_URL` | Ethereum RPC URL | `https://rpc.sepolia.org` |
| `ENERGY_TOKEN_ADDRESS` | Token contract | `0x9faEA50ed06Ca785221Eb153A2683663f7AF6579` |
| `ENERGY_MARKETPLACE_ADDRESS` | Marketplace contract | `0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

### Frontend Environment Variables

| Variable | Description | Value |
|----------|-------------|-------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api/v1` |
| `VITE_CHAIN_ID` | Network chain ID | `11155111` (Sepolia) |
| `VITE_TOKEN_ADDRESS` | Token contract | `0x9faEA50ed06Ca785221Eb153A2683663f7AF6579` |
| `VITE_MARKETPLACE_ADDRESS` | Marketplace | `0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA` |

## 🧪 Testing

### Test Smart Contracts

```bash
cd contracts
npm test
```

### Test Backend

```bash
cd backend
npm test
```

### Test Frontend

```bash
cd frontend
npm test
```

## 🔍 Viewing Logs

### Backend Logs

If running with the startup script:
```bash
tail -f logs/backend.log
```

If running manually, logs appear in the terminal.

### Frontend Logs

Check browser console (F12 or right-click > Inspect > Console)

## 🛠️ Development Mode Features

When running in development mode (`npm run dev`):

- **Hot Reload**: Changes to code automatically refresh the app
- **Source Maps**: Easier debugging with readable stack traces
- **Detailed Logging**: More verbose console output
- **CORS Enabled**: No cross-origin issues between frontend and backend

## 📱 System Requirements

**Minimum:**
- CPU: Dual-core processor
- RAM: 4 GB
- Storage: 2 GB free space
- OS: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)

**Recommended:**
- CPU: Quad-core processor
- RAM: 8 GB or more
- Storage: 5 GB free space
- Fast internet connection

## 🌟 Next Steps

Now that you have the platform running:

1. **Explore the Dashboard**: Check out your balance and stats
2. **Create a Listing**: Try selling some energy credits
3. **Make a Purchase**: Buy energy from other users
4. **View Analytics**: See trading volume and platform statistics
5. **Check Transactions**: View your transaction history on Etherscan

## 📚 Additional Resources

- **Main README**: `/README.md` - Comprehensive project documentation
- **Backend README**: `/backend/README.md` - API documentation
- **Frontend README**: `/frontend/README.md` - Frontend details
- **Contracts README**: `/contracts/README.md` - Smart contract info

## ❓ Getting Help

If you run into issues:

1. Check this guide's troubleshooting section
2. Review the error messages carefully
3. Check backend and frontend logs
4. Verify all environment variables are set correctly
5. Make sure you're on Sepolia network with test ETH

## 🎉 Success!

If you can see the frontend, connect your wallet, and browse listings, you're all set! The Energy Trading Platform is now running locally.

Enjoy trading renewable energy credits! ⚡🌱
