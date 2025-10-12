const User = require('../models/User');
const blockchainService = require('../services/blockchain');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Get all users (with pagination and filters)
 * @route   GET /api/v1/users
 * @access  Public
 */
exports.getUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        role,
        isActive,
        isVerified,
        sortBy = 'createdAt',
        order = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password -loginAttempts -lockUntil')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        User.countDocuments(query)
    ]);

    res.json(successResponse('Users retrieved successfully', {
        users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/users/:id
 * @access  Public
 */
exports.getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .select('-password -loginAttempts -lockUntil')
        .lean();

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    // Get blockchain balances
    let balances = { eth: '0', engc: '0' };
    try {
        const [ethBalance, engcBalance] = await Promise.all([
            blockchainService.getEthBalance(user.walletAddress),
            blockchainService.getTokenBalance(user.walletAddress)
        ]);
        balances = { eth: ethBalance, engc: engcBalance };
    } catch (error) {
        logger.warn(`Failed to fetch balances for user ${user._id}:`, error.message);
    }

    res.json(successResponse('User retrieved successfully', {
        user: { ...user, balances }
    }));
});

/**
 * @desc    Get user by wallet address
 * @route   GET /api/v1/users/wallet/:address
 * @access  Public
 */
exports.getUserByWallet = asyncHandler(async (req, res) => {
    const { address } = req.params;

    const user = await User.findOne({ walletAddress: address.toLowerCase() })
        .select('-password -loginAttempts -lockUntil')
        .lean();

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    // Get blockchain balances
    let balances = { eth: '0', engc: '0' };
    try {
        const [ethBalance, engcBalance] = await Promise.all([
            blockchainService.getEthBalance(user.walletAddress),
            blockchainService.getTokenBalance(user.walletAddress)
        ]);
        balances = { eth: ethBalance, engc: engcBalance };
    } catch (error) {
        logger.warn(`Failed to fetch balances for wallet ${address}:`, error.message);
    }

    res.json(successResponse('User retrieved successfully', {
        user: { ...user, balances }
    }));
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/:id
 * @access  Private (User must own the account or be admin)
 */
exports.updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    // Check authorization
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized to update this user'));
    }

    // Fields that can be updated
    const allowedFields = ['username', 'email', 'fullName', 'avatar', 'bio', 'preferences'];

    // Admin can update additional fields
    if (req.user.role === 'admin') {
        allowedFields.push('role', 'isActive', 'isVerified');
    }

    // Update only allowed fields
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });

    await user.save();

    res.json(successResponse('User updated successfully', {
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            walletAddress: user.walletAddress,
            fullName: user.fullName,
            avatar: user.avatar,
            bio: user.bio,
            role: user.role,
            isActive: user.isActive,
            isVerified: user.isVerified
        }
    }));
});

/**
 * @desc    Delete/Deactivate user
 * @route   DELETE /api/v1/users/:id
 * @access  Private (User must own the account or be admin)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    // Check authorization
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized to delete this user'));
    }

    // Soft delete - deactivate instead of removing
    user.isActive = false;
    await user.save();

    res.json(successResponse('User deactivated successfully'));
});

/**
 * @desc    Get user statistics
 * @route   GET /api/v1/users/:id/stats
 * @access  Public
 */
exports.getUserStats = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('stats').lean();

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    res.json(successResponse('User statistics retrieved successfully', {
        stats: user.stats
    }));
});

/**
 * @desc    Get user wallet balances from blockchain
 * @route   GET /api/v1/users/:id/balance
 * @access  Public
 */
exports.getWalletBalance = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('walletAddress').lean();

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    try {
        const [ethBalance, engcBalance] = await Promise.all([
            blockchainService.getEthBalance(user.walletAddress),
            blockchainService.getTokenBalance(user.walletAddress)
        ]);

        res.json(successResponse('Wallet balance retrieved successfully', {
            walletAddress: user.walletAddress,
            balances: {
                eth: ethBalance,
                engc: engcBalance
            }
        }));
    } catch (error) {
        logger.error('Failed to fetch wallet balance:', error);
        return res.status(500).json(errorResponse('Failed to fetch wallet balance'));
    }
});

/**
 * @desc    Get user's referrals
 * @route   GET /api/v1/users/:id/referrals
 * @access  Private
 */
exports.getUserReferrals = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('referralCode').lean();

    if (!user) {
        return res.status(404).json(errorResponse('User not found'));
    }

    // Check authorization
    if (user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized'));
    }

    const referrals = await User.find({ referredBy: user.referralCode })
        .select('username walletAddress createdAt')
        .lean();

    res.json(successResponse('Referrals retrieved successfully', {
        referralCode: user.referralCode,
        referralCount: referrals.length,
        referrals
    }));
});

/**
 * @desc    Get top traders (leaderboard)
 * @route   GET /api/v1/users/leaderboard
 * @access  Public
 */
exports.getLeaderboard = asyncHandler(async (req, res) => {
    const { limit = 10, sortBy = 'totalVolumeInETH' } = req.query;

    const validSortFields = ['totalVolumeInETH', 'totalEnergyTraded', 'reputation'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'totalVolumeInETH';

    const users = await User.find({ isActive: true })
        .select('username walletAddress avatar stats')
        .sort({ [`stats.${sortField}`]: -1 })
        .limit(parseInt(limit))
        .lean();

    res.json(successResponse('Leaderboard retrieved successfully', {
        users: users.map((user, index) => ({
            rank: index + 1,
            username: user.username,
            walletAddress: user.walletAddress,
            avatar: user.avatar,
            stats: user.stats
        }))
    }));
});

/**
 * @desc    Search users
 * @route   GET /api/v1/users/search
 * @access  Public
 */
exports.searchUsers = asyncHandler(async (req, res) => {
    const { query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
        return res.status(400).json(errorResponse('Search query must be at least 2 characters'));
    }

    const searchRegex = new RegExp(query, 'i');

    const users = await User.find({
        $or: [
            { username: searchRegex },
            { walletAddress: searchRegex },
            { email: searchRegex }
        ],
        isActive: true
    })
        .select('username walletAddress avatar stats.reputation')
        .limit(parseInt(limit))
        .lean();

    res.json(successResponse('Search results retrieved successfully', {
        query,
        count: users.length,
        users
    }));
});
