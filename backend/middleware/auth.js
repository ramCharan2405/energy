const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse, asyncHandler } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Protect routes - require authentication
 */
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
        return errorResponse(res, 401, 'Not authorized to access this route');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return errorResponse(res, 404, 'User not found');
        }

        // Check if user is active
        if (!req.user.isActive) {
            return errorResponse(res, 403, 'Account has been deactivated');
        }

        // Check if account is locked
        if (req.user.isLocked) {
            return errorResponse(res, 403, 'Account is temporarily locked. Please try again later.');
        }

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return errorResponse(res, 401, 'Not authorized to access this route');
    }
});

/**
 * Authorize roles
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                `User role ${req.user.role} is not authorized to access this route`
            );
        }
        next();
    };
};

/**
 * Verify wallet ownership
 */
exports.verifyWalletOwnership = (req, res, next) => {
    const { walletAddress } = req.params;

    if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return errorResponse(res, 403, 'Not authorized to access this wallet');
    }

    next();
};

/**
 * Generate JWT token
 */
exports.generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

/**
 * Generate refresh token
 */
exports.generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE,
    });
};

/**
 * Send token response
 */
exports.sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = exports.generateToken(user._id);
    const refreshToken = exports.generateRefreshToken(user._id);

    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            message,
            token,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                avatar: user.avatar,
                stats: user.stats,
            },
        });
};
