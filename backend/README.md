# Energy Trading Platform - Backend API

## 🏗️ Architecture Overview

Production-ready Node.js + Express backend for the Virtual Energy Credit Marketplace with comprehensive features including:

- **Authentication & Authorization** (JWT-based)
- **Blockchain Integration** (ethers.js with Sepolia testnet)
- **MongoDB Database** (user data, listings, transactions)
- **Real-time Features** (WebSocket support ready)
- **Advanced Analytics** (trading stats, user metrics)
- **Rate Limiting & Security** (Helmet, CORS, input validation)
- **Comprehensive Logging** (Winston)
- **API Documentation** (RESTful endpoints)

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js                  # MongoDB connection
├── contracts/
│   ├── EnergyCredit.json      # Token contract ABI
│   └── EnergyMarketplace.json # Marketplace contract ABI
├── controllers/               # Business logic
│   ├── authController.js
│   ├── userController.js
│   ├── listingController.js
│   ├── transactionController.js
│   └── analyticsController.js
├── middleware/
│   ├── auth.js               # JWT authentication
│   ├── errorHandler.js       # Global error handler
│   ├── validator.js          # Input validation
│   └── rateLimiter.js        # Rate limiting
├── models/
│   ├── User.js               # User schema
│   ├── Listing.js            # Listing schema
│   └── Transaction.js        # Transaction schema
├── routes/
│   ├── auth.js               # Auth routes
│   ├── users.js              # User routes
│   ├── listings.js           # Listing routes
│   ├── transactions.js       # Transaction routes
│   └── analytics.js          # Analytics routes
├── services/
│   ├── blockchain.js         # Blockchain interaction
│   ├── eventListener.js      # Contract event listeners
│   └── notification.js       # Notification service
├── utils/
│   ├── logger.js             # Winston logger
│   ├── helpers.js            # Helper functions
│   └── validators.js         # Validation functions
├── scripts/
│   └── seedData.js           # Database seeding
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
├── server.js                 # Main server file
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js v16+ installed
- MongoDB running (local or cloud)
- Contracts deployed on Sepolia testnet

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` and add your values:
- MongoDB URI
- JWT secrets
- Sepolia RPC URL
- Contract addresses (from deployment)
- Platform wallet private key

3. **Start the server:**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| POST | `/api/v1/auth/refresh` | Refresh token | Yes |
| POST | `/api/v1/auth/logout` | Logout user | Yes |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users` | Get all users | Yes (Admin) |
| GET | `/api/v1/users/:id` | Get user by ID | Yes |
| PUT | `/api/v1/users/:id` | Update user | Yes (Owner) |
| DELETE | `/api/v1/users/:id` | Delete user | Yes (Admin) |
| GET | `/api/v1/users/:id/stats` | Get user statistics | Yes |
| GET | `/api/v1/users/:walletAddress/balance` | Get wallet balances | Yes |

### Listings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/listings` | Get all active listings | No |
| GET | `/api/v1/listings/:id` | Get listing by ID | No |
| POST | `/api/v1/listings` | Create listing | Yes |
| PUT | `/api/v1/listings/:id` | Update listing | Yes (Owner) |
| DELETE | `/api/v1/listings/:id` | Cancel listing | Yes (Owner) |
| POST | `/api/v1/listings/:id/favorite` | Toggle favorite | Yes |
| GET | `/api/v1/listings/user/:walletAddress` | Get user listings | No |
| GET | `/api/v1/listings/trending` | Get trending listings | No |

### Transactions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/transactions` | Get all transactions | Yes (Admin) |
| GET | `/api/v1/transactions/:hash` | Get transaction by hash | No |
| GET | `/api/v1/transactions/user/:walletAddress` | Get user transactions | Yes |
| GET | `/api/v1/transactions/listing/:listingId` | Get listing transactions | No |

### Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/analytics/platform` | Get platform statistics | No |
| GET | `/api/v1/analytics/volume` | Get trading volume | No |
| GET | `/api/v1/analytics/users` | Get user statistics | Yes (Admin) |
| GET | `/api/v1/analytics/listings` | Get listing statistics | Yes (Admin) |

## 📊 Key Features

### 1. **User Management**
- Wallet-based authentication
- JWT tokens with refresh tokens
- Account locking after failed login attempts
- User statistics and reputation system
- Referral system

### 2. **Blockchain Integration**
- Real-time contract interaction via ethers.js
- Automatic token minting on signup (50 ENGC bonus)
- Event listeners for blockchain events
- Transaction monitoring and confirmation
- Gas price optimization

### 3. **Listing Management**
- Create, update, cancel listings
- Advanced filtering and search
- Trending listings algorithm
- Favorite/bookmark functionality
- View tracking

### 4. **Transaction History**
- Complete transaction logs
- Transaction status tracking
- Gas fee tracking
- Daily/monthly volume statistics

### 5. **Analytics Dashboard**
- Platform-wide statistics
- User trading metrics
- Volume charts
- Top traders leaderboard

### 6. **Security**
- JWT authentication
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration
- Helmet.js security headers

## 🔐 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1

# Database
MONGODB_URI=mongodb://localhost:27017/energy_trading_db

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=30d

# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ENERGY_TOKEN_ADDRESS=0x9faEA50ed06Ca785221Eb153A2683663f7AF6579
ENERGY_MARKETPLACE_ADDRESS=0xFE78F2DD9c145A5C7fa81BE7c77Ac1Bce154FaCA
PLATFORM_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
SIGNUP_BONUS_TOKENS=50

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_LOGIN_ATTEMPTS=5

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📝 Database Models

### User Model
- Wallet address (unique)
- Email & password
- Profile information
- Statistics (trades, volume, reputation)
- Preferences
- Security (login attempts, account lock)

### Listing Model
- Blockchain listing ID
- Seller information
- Energy amount and price
- Status (active, sold, cancelled)
- Metadata (energy source, location)
- Analytics (views, favorites)

### Transaction Model
- Transaction hash (unique)
- Type (mint, transfer, purchase, etc.)
- Participants (from, to)
- Amounts and prices
- Gas information
- Status

## 🔄 Event Listeners

The backend automatically listens to smart contract events:

- **TokensMinted**: Updates user balance when tokens are minted
- **ListingCreated**: Creates listing record in database
- **EnergyPurchased**: Updates listing status, creates transaction
- **ListingCancelled**: Updates listing status

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📈 Performance Optimization

- Database indexing for faster queries
- Connection pooling
- Response compression
- Query optimization
- Caching ready (Redis integration prepared)

## 🐛 Debugging

View logs:
```bash
tail -f logs/combined.log
tail -f logs/error.log
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Configure proper CORS origins
- [ ] Set up MongoDB Atlas or production database
- [ ] Configure rate limiting
- [ ] Set up logging service
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up SSL certificates
- [ ] Configure environment variables
- [ ] Set up monitoring (PM2, New Relic, etc.)

### Deploy with PM2

```bash
npm install -g pm2
pm2 start server.js --name energy-trading-api
pm2 save
pm2 startup
```

## 📖 API Documentation

Access Postman collection: [Coming soon]

## 🤝 Integration with Frontend

The backend provides RESTful APIs for the React frontend:

1. **Authentication**: Login/Register with wallet
2. **User Management**: Profile, stats, balances
3. **Trading**: Create listings, buy energy
4. **Transactions**: View history, track status
5. **Analytics**: Charts, statistics

## 🔧 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Check MongoDB is running
- Verify connection string
- Check network/firewall

**Blockchain Connection Failed**
- Verify RPC URL is correct
- Check contract addresses
- Ensure platform wallet has ETH

**Authentication Errors**
- Check JWT_SECRET is set
- Verify token in headers
- Check token expiration

## 📚 Learn More

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [JWT Best Practices](https://jwt.io/)

## 📄 License

MIT

---

**Backend built with ❤️ for the Energy Trading Platform**
