const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Listing = require('../models/Listing');
const blockchainService = require('../services/blockchain');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Helper function to transform transactions for frontend compatibility
 * Uses listing data if available, falls back to transaction data
 */
const transformTransaction = (tx) => {
    return {
        ...tx,
        listing: tx.listing ? {
            ...tx.listing,
            energyAmount: tx.listing.amountInTokens,
            pricePerUnit: tx.listing.pricePerTokenInETH,
            location: tx.listing.location?.country || tx.listing.location?.city || 'Unknown'
        } : {
            // Fallback to transaction data if listing not populated
            energyAmount: tx.amount || 0,
            pricePerUnit: tx.pricePerToken || 0,
            location: 'Unknown',
            title: `Transaction #${tx.transactionHash?.substring(0, 8)}...`
        }
    };
};

/**
 * @desc    Get all transactions with filters and pagination
 * @route   GET /api/v1/transactions
 * @access  Private (Admin only)
 */
exports.getTransactions = asyncHandler(async (req, res) => {
    // Admin only
    if (req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized'));
    }

    const {
        page = 1,
        limit = 20,
        type,
        status,
        from,
        to,
        sortBy = 'blockTimestamp',
        order = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (from) query.from = from.toLowerCase();
    if (to) query.to = to.toLowerCase();

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const [transactions, total] = await Promise.all([
        Transaction.find(query)
            .populate('fromUser', 'username walletAddress avatar')
            .populate('toUser', 'username walletAddress avatar')
            .populate('listing', 'title amountInTokens pricePerTokenInETH totalPriceInETH location energySource')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Transaction.countDocuments(query)
    ]);

    // Transform transactions to match frontend expectations
    const transformedTransactions = transactions.map(transformTransaction);

    res.json(successResponse('Transactions retrieved successfully', {
        transactions: transformedTransactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Get single transaction by hash
 * @route   GET /api/v1/transactions/:hash
 * @access  Public
 */
exports.getTransaction = asyncHandler(async (req, res) => {
    const { hash } = req.params;

    const transaction = await Transaction.findOne({ transactionHash: hash })
        .populate('fromUser', 'username walletAddress avatar')
        .populate('toUser', 'username walletAddress avatar')
        .populate('listing', 'title amountInTokens pricePerTokenInETH')
        .lean();

    if (!transaction) {
        return res.status(404).json(errorResponse('Transaction not found'));
    }

    res.json(successResponse('Transaction retrieved successfully', { transaction }));
});

/**
 * @desc    Get user's transactions
 * @route   GET /api/v1/transactions/user/:userId
 * @access  Public
 */
exports.getUserTransactions = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const user = await User.findById(userId).select('walletAddress');
    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - find transactions where user is sender or receiver
    const query = {
        $or: [
            { fromUser: userId },
            { toUser: userId }
        ]
    };

    if (type) query.type = type;

    const [transactions, total] = await Promise.all([
        Transaction.find(query)
            .populate('fromUser', 'username walletAddress')
            .populate('toUser', 'username walletAddress')
            .populate('listing', 'title amountInTokens pricePerTokenInETH totalPriceInETH location energySource')
            .sort({ blockTimestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Transaction.countDocuments(query)
    ]);

    // Transform transactions to match frontend expectations
    const transformedTransactions = transactions.map(transformTransaction);

    res.json(successResponse('User transactions retrieved successfully', {
        transactions: transformedTransactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Get transactions by wallet address
 * @route   GET /api/v1/transactions/wallet/:address
 * @access  Public
 */
exports.getTransactionsByWallet = asyncHandler(async (req, res) => {
    const { address } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - find transactions where wallet is sender or receiver
    const query = {
        $or: [
            { from: address.toLowerCase() },
            { to: address.toLowerCase() }
        ]
    };

    if (type) query.type = type;

    const [transactions, total] = await Promise.all([
        Transaction.find(query)
            .populate('fromUser', 'username walletAddress')
            .populate('toUser', 'username walletAddress')
            .populate('listing', 'title amountInTokens pricePerTokenInETH totalPriceInETH location energySource')
            .sort({ blockTimestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Transaction.countDocuments(query)
    ]);

    // Transform transactions to match frontend expectations
    const transformedTransactions = transactions.map(transformTransaction);

    res.json(successResponse('Wallet transactions retrieved successfully', {
        walletAddress: address,
        transactions: transformedTransactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Get transactions for a specific listing
 * @route   GET /api/v1/transactions/listing/:listingId
 * @access  Public
 */
exports.getListingTransactions = asyncHandler(async (req, res) => {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId);
    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    const transactions = await Transaction.find({ listing: listingId })
        .populate('fromUser', 'username walletAddress')
        .populate('toUser', 'username walletAddress')
        .populate('listing', 'title amountInTokens pricePerTokenInETH totalPriceInETH location energySource')
        .sort({ blockTimestamp: -1 })
        .lean();

    // Transform transactions to match frontend expectations
    const transformedTransactions = transactions.map(transformTransaction);

    res.json(successResponse('Listing transactions retrieved successfully', {
        listingId,
        transactions: transformedTransactions
    }));
});

/**
 * @desc    Create transaction record (called by event listener)
 * @route   POST /api/v1/transactions
 * @access  Private (Admin/System only)
 */
exports.createTransaction = asyncHandler(async (req, res) => {
    // Only admin or system can create transaction records
    if (req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized'));
    }

    const {
        transactionHash,
        blockNumber,
        blockTimestamp,
        type,
        from,
        to,
        amount,
        amountInETH,
        pricePerToken,
        platformFee,
        gasUsed,
        gasPrice,
        status,
        listingId,
        contractAddress,
        methodName
    } = req.body;

    // Check if transaction already exists
    const existingTx = await Transaction.findOne({ transactionHash });
    if (existingTx) {
        return res.status(400).json(errorResponse('Transaction already recorded'));
    }

    // Find users by wallet addresses
    const [fromUser, toUser] = await Promise.all([
        from ? User.findOne({ walletAddress: from.toLowerCase() }) : null,
        to ? User.findOne({ walletAddress: to.toLowerCase() }) : null
    ]);

    // Find listing if listingId provided
    let listing = null;
    if (listingId) {
        listing = await Listing.findOne({ listingId: parseInt(listingId) });
    }

    // Calculate transaction fee
    const transactionFee = gasUsed && gasPrice ? (gasUsed * gasPrice).toString() : '0';

    // Create transaction
    const transaction = await Transaction.create({
        transactionHash,
        blockNumber,
        blockTimestamp: blockTimestamp || new Date(),
        type,
        from: from ? from.toLowerCase() : null,
        to: to ? to.toLowerCase() : null,
        fromUser: fromUser ? fromUser._id : null,
        toUser: toUser ? toUser._id : null,
        amount,
        amountInETH,
        pricePerToken,
        platformFee,
        gasUsed,
        gasPrice,
        transactionFee,
        status: status || 'confirmed',
        listing: listing ? listing._id : null,
        listingId,
        contractAddress,
        methodName
    });

    logger.info(`Transaction recorded: ${transactionHash}`);

    res.status(201).json(successResponse('Transaction created successfully', { transaction }));
});

/**
 * @desc    Get transaction statistics
 * @route   GET /api/v1/transactions/stats/overview
 * @access  Public
 */
exports.getTransactionStats = asyncHandler(async (req, res) => {
    // If user is authenticated, get user-specific stats
    if (req.user) {
        const userId = req.user.id;
        const walletAddress = req.user.walletAddress.toLowerCase();

        const stats = await Transaction.aggregate([
            {
                $match: {
                    $or: [
                        { fromUser: mongoose.Types.ObjectId(userId) },
                        { toUser: mongoose.Types.ObjectId(userId) },
                        { from: walletAddress },
                        { to: walletAddress }
                    ],
                    status: 'confirmed'
                }
            },
            {
                $facet: {
                    overall: [
                        {
                            $group: {
                                _id: null,
                                totalTransactions: { $sum: 1 },
                                totalVolume: { $sum: '$amount' }
                            }
                        }
                    ],
                    spent: [
                        {
                            $match: {
                                $or: [
                                    { fromUser: mongoose.Types.ObjectId(userId) },
                                    { from: walletAddress }
                                ],
                                type: 'energy_purchased'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalSpent: { $sum: '$amountInETH' }
                            }
                        }
                    ],
                    earned: [
                        {
                            $match: {
                                $or: [
                                    { toUser: mongoose.Types.ObjectId(userId) },
                                    { to: walletAddress }
                                ],
                                type: 'energy_purchased'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalEarned: { $sum: '$amountInETH' }
                            }
                        }
                    ]
                }
            }
        ]);

        const result = {
            totalTransactions: stats[0]?.overall[0]?.totalTransactions || 0,
            totalVolume: stats[0]?.overall[0]?.totalVolume || 0,
            totalSpent: stats[0]?.spent[0]?.totalSpent || 0,
            totalEarned: stats[0]?.earned[0]?.totalEarned || 0
        };

        return res.json(successResponse('User transaction statistics retrieved successfully', result));
    }

    // Otherwise get platform-wide stats
    const stats = await Transaction.getStatistics();
    res.json(successResponse('Transaction statistics retrieved successfully', { stats }));
});

/**
 * @desc    Get daily transaction volume
 * @route   GET /api/v1/transactions/stats/daily
 * @access  Public
 */
exports.getDailyVolume = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    const dailyVolume = await Transaction.getDailyVolume(parseInt(days));

    res.json(successResponse('Daily volume retrieved successfully', { dailyVolume }));
});

/**
 * @desc    Get transaction by type statistics
 * @route   GET /api/v1/transactions/stats/by-type
 * @access  Public
 */
exports.getTransactionsByType = asyncHandler(async (req, res) => {
    const stats = await Transaction.aggregate([
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: { $toDouble: '$amount' } },
                totalETH: { $sum: { $toDouble: '$amountInETH' } }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    res.json(successResponse('Transaction type statistics retrieved successfully', { stats }));
});

/**
 * @desc    Verify transaction on blockchain
 * @route   GET /api/v1/transactions/:hash/verify
 * @access  Public
 */
exports.verifyTransaction = asyncHandler(async (req, res) => {
    const { hash } = req.params;

    try {
        const receipt = await blockchainService.getTransactionReceipt(hash);

        if (!receipt) {
            return res.status(404).json(errorResponse('Transaction not found on blockchain'));
        }

        // Check if transaction exists in database
        let dbTransaction = await Transaction.findOne({ transactionHash: hash });

        const verification = {
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? 'confirmed' : 'failed',
            gasUsed: receipt.gasUsed.toString(),
            from: receipt.from,
            to: receipt.to,
            existsInDatabase: !!dbTransaction
        };

        res.json(successResponse('Transaction verified on blockchain', verification));
    } catch (error) {
        logger.error('Failed to verify transaction:', error);
        return res.status(500).json(errorResponse('Failed to verify transaction'));
    }
});

/**
 * @desc    Get recent transactions (for activity feed)
 * @route   GET /api/v1/transactions/recent
 * @access  Public
 */
exports.getRecentTransactions = asyncHandler(async (req, res) => {
    const { limit = 10, type } = req.query;

    const query = {};
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
        .populate('fromUser', 'username walletAddress avatar')
        .populate('toUser', 'username walletAddress avatar')
        .populate('listing', 'title amountInTokens pricePerTokenInETH totalPriceInETH location energySource')
        .sort({ blockTimestamp: -1 })
        .limit(parseInt(limit))
        .lean();

    // Transform transactions to match frontend expectations
    const transformedTransactions = transactions.map(transformTransaction);

    res.json(successResponse('Recent transactions retrieved successfully', { transactions: transformedTransactions }));
});

/**
 * @desc    Get platform transaction statistics
 * @route   GET /api/v1/transactions/stats/platform
 * @access  Public
 */
exports.getPlatformStats = asyncHandler(async (req, res) => {
    const stats = await Transaction.getPlatformStats();

    res.json(successResponse('Platform statistics retrieved successfully', { stats }));
});
