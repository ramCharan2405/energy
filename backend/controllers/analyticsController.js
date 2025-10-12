const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Get platform overview statistics
 * @route   GET /api/v1/analytics/platform
 * @access  Public
 */
exports.getPlatformStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        activeUsers,
        totalListings,
        activeListings,
        totalTransactions,
        platformStats
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Listing.countDocuments(),
        Listing.countDocuments({ status: 'active' }),
        Transaction.countDocuments(),
        Transaction.getPlatformStats()
    ]);

    const stats = {
        users: {
            total: totalUsers,
            active: activeUsers
        },
        listings: {
            total: totalListings,
            active: activeListings
        },
        transactions: {
            total: totalTransactions,
            ...platformStats
        }
    };

    res.json(successResponse('Platform statistics retrieved successfully', { stats }));
});

/**
 * @desc    Get trading volume statistics (daily, weekly, monthly)
 * @route   GET /api/v1/analytics/volume
 * @access  Public
 */
exports.getTradingVolume = asyncHandler(async (req, res) => {
    const { period = 'daily', days = 30 } = req.query;

    let groupBy;
    switch (period) {
        case 'hourly':
            groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$blockTimestamp' } };
            break;
        case 'weekly':
            groupBy = { $dateToString: { format: '%Y-W%V', date: '$blockTimestamp' } };
            break;
        case 'monthly':
            groupBy = { $dateToString: { format: '%Y-%m', date: '$blockTimestamp' } };
            break;
        default: // daily
            groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$blockTimestamp' } };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const volumeData = await Transaction.aggregate([
        {
            $match: {
                blockTimestamp: { $gte: startDate },
                type: { $in: ['energy_purchased', 'transfer'] }
            }
        },
        {
            $group: {
                _id: groupBy,
                totalVolume: { $sum: { $toDouble: '$amountInETH' } },
                totalTransactions: { $sum: 1 },
                averageTransactionValue: { $avg: { $toDouble: '$amountInETH' } }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    res.json(successResponse('Trading volume retrieved successfully', {
        period,
        days: parseInt(days),
        data: volumeData
    }));
});

/**
 * @desc    Get user-specific analytics
 * @route   GET /api/v1/analytics/user/:userId
 * @access  Public
 */
exports.getUserAnalytics = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select('walletAddress stats');
    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    // Get user's transaction statistics
    const userTransactions = await Transaction.getUserTransactions(user.walletAddress);

    // Get user's listings statistics
    const [totalListings, activeListings, soldListings] = await Promise.all([
        Listing.countDocuments({ seller: userId }),
        Listing.countDocuments({ seller: userId, status: 'active' }),
        Listing.countDocuments({ seller: userId, status: 'sold' })
    ]);

    // Get monthly activity
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const monthlyActivity = await Transaction.aggregate([
        {
            $match: {
                blockTimestamp: { $gte: startDate },
                $or: [{ fromUser: userId }, { toUser: userId }]
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$blockTimestamp' } },
                transactions: { $sum: 1 },
                volume: { $sum: { $toDouble: '$amountInETH' } }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    const analytics = {
        user: {
            id: user._id,
            walletAddress: user.walletAddress,
            stats: user.stats
        },
        listings: {
            total: totalListings,
            active: activeListings,
            sold: soldListings,
            conversionRate: totalListings > 0 ? (soldListings / totalListings) * 100 : 0
        },
        transactions: userTransactions,
        monthlyActivity
    };

    res.json(successResponse('User analytics retrieved successfully', { analytics }));
});

/**
 * @desc    Get listing performance analytics
 * @route   GET /api/v1/analytics/listing/:listingId
 * @access  Public
 */
exports.getListingAnalytics = asyncHandler(async (req, res) => {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId)
        .populate('seller', 'username walletAddress')
        .lean();

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    // Get listing transactions
    const transactions = await Transaction.find({ listing: listingId }).lean();

    // Calculate analytics
    const analytics = {
        listing: {
            id: listing._id,
            title: listing.title,
            status: listing.status,
            createdAt: listing.createdAt
        },
        performance: {
            views: listing.views,
            favorites: listing.favorites.length,
            transactions: transactions.length,
            viewToFavoriteRate: listing.views > 0 ? (listing.favorites.length / listing.views) * 100 : 0
        },
        timing: {
            listedAt: listing.listedAt,
            soldAt: listing.soldAt,
            timeToSell: listing.soldAt
                ? Math.round((new Date(listing.soldAt) - new Date(listing.listedAt)) / (1000 * 60 * 60))
                : null // hours
        }
    };

    res.json(successResponse('Listing analytics retrieved successfully', { analytics }));
});

/**
 * @desc    Get top traders leaderboard
 * @route   GET /api/v1/analytics/leaderboard
 * @access  Public
 */
exports.getTopTraders = asyncHandler(async (req, res) => {
    const { limit = 10, sortBy = 'totalVolumeInETH' } = req.query;

    const validSortFields = ['totalVolumeInETH', 'totalEnergyTraded', 'totalListingsSold', 'reputation'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'totalVolumeInETH';

    const traders = await User.find({ isActive: true })
        .select('username walletAddress avatar stats')
        .sort({ [`stats.${sortField}`]: -1 })
        .limit(parseInt(limit))
        .lean();

    const leaderboard = traders.map((trader, index) => ({
        rank: index + 1,
        userId: trader._id,
        username: trader.username,
        walletAddress: trader.walletAddress,
        avatar: trader.avatar,
        stats: trader.stats
    }));

    res.json(successResponse('Leaderboard retrieved successfully', {
        sortBy: sortField,
        leaderboard
    }));
});

/**
 * @desc    Get energy source distribution
 * @route   GET /api/v1/analytics/energy-sources
 * @access  Public
 */
exports.getEnergySourceDistribution = asyncHandler(async (req, res) => {
    const distribution = await Listing.aggregate([
        {
            $match: { status: 'active' }
        },
        {
            $group: {
                _id: '$energySource',
                count: { $sum: 1 },
                totalTokens: { $sum: '$amountInTokens' },
                averagePrice: { $avg: '$pricePerTokenInETH' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    res.json(successResponse('Energy source distribution retrieved successfully', { distribution }));
});

/**
 * @desc    Get price trends over time
 * @route   GET /api/v1/analytics/price-trends
 * @access  Public
 */
exports.getPriceTrends = asyncHandler(async (req, res) => {
    const { days = 30, energySource } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const match = {
        listedAt: { $gte: startDate }
    };

    if (energySource) {
        match.energySource = energySource;
    }

    const priceTrends = await Listing.aggregate([
        {
            $match: match
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$listedAt' } },
                averagePrice: { $avg: '$pricePerTokenInETH' },
                minPrice: { $min: '$pricePerTokenInETH' },
                maxPrice: { $max: '$pricePerTokenInETH' },
                listings: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    res.json(successResponse('Price trends retrieved successfully', {
        days: parseInt(days),
        energySource: energySource || 'all',
        trends: priceTrends
    }));
});

/**
 * @desc    Get market overview (supply/demand)
 * @route   GET /api/v1/analytics/market-overview
 * @access  Public
 */
exports.getMarketOverview = asyncHandler(async (req, res) => {
    const [
        activeListingsCount,
        totalSupply,
        averagePrice,
        last24hTransactions,
        last24hVolume
    ] = await Promise.all([
        Listing.countDocuments({ status: 'active' }),
        Listing.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: null, total: { $sum: '$amountInTokens' } } }
        ]),
        Listing.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: null, avgPrice: { $avg: '$pricePerTokenInETH' } } }
        ]),
        Transaction.countDocuments({
            blockTimestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            type: 'energy_purchased'
        }),
        Transaction.aggregate([
            {
                $match: {
                    blockTimestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    type: 'energy_purchased'
                }
            },
            {
                $group: {
                    _id: null,
                    volume: { $sum: { $toDouble: '$amountInETH' } }
                }
            }
        ])
    ]);

    const marketOverview = {
        supply: {
            activeListings: activeListingsCount,
            totalTokensAvailable: totalSupply[0]?.total || 0
        },
        pricing: {
            averagePricePerToken: averagePrice[0]?.avgPrice || 0
        },
        activity: {
            last24hTransactions: last24hTransactions,
            last24hVolume: last24hVolume[0]?.volume || 0
        }
    };

    res.json(successResponse('Market overview retrieved successfully', { marketOverview }));
});

/**
 * @desc    Get geographic distribution of listings
 * @route   GET /api/v1/analytics/geographic
 * @access  Public
 */
exports.getGeographicDistribution = asyncHandler(async (req, res) => {
    const distribution = await Listing.aggregate([
        {
            $match: { status: 'active' }
        },
        {
            $group: {
                _id: {
                    country: '$location.country',
                    state: '$location.state'
                },
                count: { $sum: 1 },
                totalTokens: { $sum: '$amountInTokens' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    res.json(successResponse('Geographic distribution retrieved successfully', { distribution }));
});

/**
 * @desc    Get transaction timeline (recent activity)
 * @route   GET /api/v1/analytics/timeline
 * @access  Public
 */
exports.getTransactionTimeline = asyncHandler(async (req, res) => {
    const { limit = 20, type } = req.query;

    const query = {};
    if (type) query.type = type;

    const timeline = await Transaction.find(query)
        .populate('fromUser', 'username walletAddress avatar')
        .populate('toUser', 'username walletAddress avatar')
        .populate('listing', 'title amountInTokens energySource')
        .sort({ blockTimestamp: -1 })
        .limit(parseInt(limit))
        .lean();

    res.json(successResponse('Transaction timeline retrieved successfully', { timeline }));
});

/**
 * @desc    Get comprehensive dashboard statistics
 * @route   GET /api/v1/analytics/dashboard
 * @access  Public
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const [
        platformStats,
        marketOverview,
        recentTransactions,
        topTraders,
        energyDistribution
    ] = await Promise.all([
        // Platform stats
        (async () => {
            const [totalUsers, activeListings, totalTransactions, platformTxStats] = await Promise.all([
                User.countDocuments(),
                Listing.countDocuments({ status: 'active' }),
                Transaction.countDocuments(),
                Transaction.getPlatformStats()
            ]);
            return { totalUsers, activeListings, totalTransactions, ...platformTxStats };
        })(),

        // Market overview
        (async () => {
            const [activeListingsCount, totalSupply, averagePrice] = await Promise.all([
                Listing.countDocuments({ status: 'active' }),
                Listing.aggregate([
                    { $match: { status: 'active' } },
                    { $group: { _id: null, total: { $sum: '$amountInTokens' } } }
                ]),
                Listing.aggregate([
                    { $match: { status: 'active' } },
                    { $group: { _id: null, avgPrice: { $avg: '$pricePerTokenInETH' } } }
                ])
            ]);
            return {
                activeListings: activeListingsCount,
                totalTokensAvailable: totalSupply[0]?.total || 0,
                averagePrice: averagePrice[0]?.avgPrice || 0
            };
        })(),

        // Recent transactions
        Transaction.find()
            .populate('fromUser', 'username walletAddress')
            .populate('toUser', 'username walletAddress')
            .sort({ blockTimestamp: -1 })
            .limit(5)
            .lean(),

        // Top traders
        User.find({ isActive: true })
            .select('username walletAddress stats.totalVolumeInETH')
            .sort({ 'stats.totalVolumeInETH': -1 })
            .limit(5)
            .lean(),

        // Energy distribution
        Listing.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$energySource',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const dashboard = {
        platform: platformStats,
        market: marketOverview,
        recentActivity: recentTransactions,
        topTraders: topTraders.map((trader, index) => ({
            rank: index + 1,
            username: trader.username,
            walletAddress: trader.walletAddress,
            volume: trader.stats.totalVolumeInETH
        })),
        energyDistribution
    };

    res.json(successResponse('Dashboard statistics retrieved successfully', { dashboard }));
});
