require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/db');
const blockchainService = require('./services/blockchain');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import models
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const Listing = require('./models/Listing');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const listingRoutes = require('./routes/listings');
const transactionRoutes = require('./routes/transactions');
const analyticsRoutes = require('./routes/analytics');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Initialize blockchain service and event listeners
blockchainService.initialize()
    .then(() => {
        // Set up blockchain event listeners to auto-create transaction records
        blockchainService.setupEventListeners({
            // Handle token minting events
            onTokensMinted: async (data) => {
                try {
                    const user = await User.findOne({ walletAddress: data.to.toLowerCase() });

                    await Transaction.create({
                        transactionHash: data.transactionHash,
                        blockNumber: data.blockNumber,
                        blockTimestamp: new Date(),
                        type: 'mint',
                        from: process.env.PLATFORM_WALLET_ADDRESS?.toLowerCase() || '0x0',
                        to: data.to.toLowerCase(),
                        fromUser: null,
                        toUser: user?._id || null,
                        amount: parseFloat(data.amount),
                        amountInETH: 0,
                        status: 'confirmed',
                        contractAddress: process.env.ENERGY_TOKEN_ADDRESS?.toLowerCase(),
                        methodName: 'mintForDemo',
                        metadata: { reason: data.reason }
                    });

                    logger.info(`Transaction record created for mint: ${data.transactionHash}`);
                } catch (error) {
                    logger.error('Error creating transaction record for mint:', error.message);
                }
            },

            // Handle listing creation events
            onListingCreated: async (data) => {
                try {
                    const user = await User.findOne({ walletAddress: data.seller.toLowerCase() });

                    await Transaction.create({
                        transactionHash: data.transactionHash,
                        blockNumber: data.blockNumber,
                        blockTimestamp: new Date(),
                        type: 'listing_created',
                        from: data.seller.toLowerCase(),
                        to: process.env.ENERGY_MARKETPLACE_ADDRESS?.toLowerCase() || '0x0',
                        fromUser: user?._id || null,
                        toUser: null,
                        amount: parseFloat(data.amountInTokens),
                        amountInETH: parseFloat(data.totalPriceInWei),
                        pricePerToken: parseFloat(data.pricePerTokenInWei),
                        status: 'confirmed',
                        listingId: data.listingId,
                        contractAddress: process.env.ENERGY_MARKETPLACE_ADDRESS?.toLowerCase(),
                        methodName: 'createListing'
                    });

                    logger.info(`Transaction record created for listing: ${data.transactionHash}`);
                } catch (error) {
                    logger.error('Error creating transaction record for listing:', error.message);
                }
            },

            // Handle energy purchase events
            onEnergyPurchased: async (data) => {
                try {
                    const [buyer, seller, listing] = await Promise.all([
                        User.findOne({ walletAddress: data.buyer.toLowerCase() }),
                        User.findOne({ walletAddress: data.seller.toLowerCase() }),
                        Listing.findOne({ listingId: parseInt(data.listingId) })
                    ]);

                    await Transaction.create({
                        transactionHash: data.transactionHash,
                        blockNumber: data.blockNumber,
                        blockTimestamp: new Date(),
                        type: 'energy_purchased',
                        from: data.buyer.toLowerCase(),
                        to: data.seller.toLowerCase(),
                        fromUser: buyer?._id || null,
                        toUser: seller?._id || null,
                        amount: parseFloat(data.amountInTokens),
                        amountInETH: parseFloat(data.totalPriceInWei),
                        platformFee: parseFloat(data.platformFee),
                        status: 'confirmed',
                        listing: listing?._id || null,
                        listingId: data.listingId,
                        contractAddress: process.env.ENERGY_MARKETPLACE_ADDRESS?.toLowerCase(),
                        methodName: 'purchaseEnergy'
                    });

                    logger.info(`Transaction record created for purchase: ${data.transactionHash}`);
                } catch (error) {
                    logger.error('Error creating transaction record for purchase:', error.message);
                }
            },

            // Handle listing cancellation events
            onListingCancelled: async (data) => {
                try {
                    const [user, listing] = await Promise.all([
                        User.findOne({ walletAddress: data.seller.toLowerCase() }),
                        Listing.findOne({ listingId: parseInt(data.listingId) })
                    ]);

                    await Transaction.create({
                        transactionHash: data.transactionHash,
                        blockNumber: data.blockNumber,
                        blockTimestamp: new Date(),
                        type: 'listing_cancelled',
                        from: data.seller.toLowerCase(),
                        to: process.env.ENERGY_MARKETPLACE_ADDRESS?.toLowerCase() || '0x0',
                        fromUser: user?._id || null,
                        toUser: null,
                        amount: 0,
                        amountInETH: 0,
                        status: 'confirmed',
                        listing: listing?._id || null,
                        listingId: data.listingId,
                        contractAddress: process.env.ENERGY_MARKETPLACE_ADDRESS?.toLowerCase(),
                        methodName: 'cancelListing'
                    });

                    logger.info(`Transaction record created for cancellation: ${data.transactionHash}`);
                } catch (error) {
                    logger.error('Error creating transaction record for cancellation:', error.message);
                }
            }
        });

        logger.info('✓ Blockchain event listeners initialized');
    })
    .catch((err) => {
        logger.error('Failed to initialize blockchain service:', err);
        process.exit(1);
    });

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/listings`, listingRoutes);
app.use(`${API_PREFIX}/transactions`, transactionRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info(`API available at http://localhost:${PORT}${API_PREFIX}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

module.exports = app;
