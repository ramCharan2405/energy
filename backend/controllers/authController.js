const User = require('../models/User');
const blockchainService = require('../services/blockchain');
const { sendTokenResponse } = require('../middleware/auth');
const { successResponse, errorResponse, asyncHandler } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
    const { walletAddress, username, email, password } = req.body;

    // Validate required fields
    if (!walletAddress || !username || !email || !password) {
        const errResponse = errorResponse('Please provide all required fields');
        return res.status(400).json(errResponse);
    }

    // Validate wallet address format
    if (!blockchainService.isValidAddress(walletAddress)) {
        const errResponse = errorResponse('Invalid wallet address format');
        return res.status(400).json(errResponse);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [
            { walletAddress: walletAddress.toLowerCase() },
            { email: email.toLowerCase() },
            { username },
        ],
    });

    if (existingUser) {
        let errMsg = '';
        if (existingUser.walletAddress === walletAddress.toLowerCase()) {
            errMsg = 'Wallet address already registered';
        } else if (existingUser.email === email.toLowerCase()) {
            errMsg = 'Email already registered';
        } else if (existingUser.username === username) {
            errMsg = 'Username already taken';
        }
        const errResponse = errorResponse(errMsg);
        return res.status(400).json(errResponse);
    }

    // Create user
    const user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        username,
        email: email.toLowerCase(),
        password,
    });

    // Generate referral code
    user.generateReferralCode();
    await user.save();

    logger.info(`New user registered: ${user.username} (${user.walletAddress})`);

    // Mint signup bonus tokens
    try {
        const signupBonus = parseInt(process.env.SIGNUP_BONUS_TOKENS) || 50;
        const mintResult = await blockchainService.mintSignupBonus(
            user.walletAddress,
            signupBonus
        );

        user.signupBonusClaimed = true;
        user.signupBonusTransaction = mintResult.transactionHash;
        await user.save();

        logger.info(`Signup bonus minted: ${signupBonus} ENGC to ${user.walletAddress}`);
    } catch (error) {
        logger.error(`Failed to mint signup bonus for ${user.walletAddress}:`, error);
        // Don't fail registration if minting fails
    }

    // Send token response
    sendTokenResponse(user, 201, res, 'Registration successful');
});

/**
 * @desc    Login user with MetaMask (wallet signature)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
    const { walletAddress, signature, message } = req.body;

    // Validate input
    if (!walletAddress || !signature || !message) {
        const errResponse = errorResponse('Please provide wallet address, signature, and message');
        return res.status(400).json(errResponse);
    }

    // Validate wallet address format
    if (!blockchainService.isValidAddress(walletAddress)) {
        const errResponse = errorResponse('Invalid wallet address format');
        return res.status(400).json(errResponse);
    }

    // Find user by wallet address
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    // If user doesn't exist, create new user (auto-registration)
    if (!user) {
        user = await User.create({
            walletAddress: walletAddress.toLowerCase(),
            username: `user_${walletAddress.slice(2, 8)}`,
            email: `${walletAddress.toLowerCase()}@energytrading.com`,
            password: signature.slice(0, 20), // Dummy password (not used)
        });

        // Generate referral code
        user.generateReferralCode();
        await user.save();

        logger.info(`New user auto-registered: ${user.username} (${user.walletAddress})`);

        // Mint signup bonus tokens
        try {
            const signupBonus = parseInt(process.env.SIGNUP_BONUS_TOKENS) || 50;
            const mintResult = await blockchainService.mintSignupBonus(
                user.walletAddress,
                signupBonus
            );

            user.signupBonusClaimed = true;
            user.signupBonusTransaction = mintResult.transactionHash;
            await user.save();

            logger.info(`Signup bonus minted: ${signupBonus} ENGC to ${user.walletAddress}`);
        } catch (error) {
            logger.error(`Failed to mint signup bonus for ${user.walletAddress}:`, error);
        }
    }

    // Verify signature
    try {
        const ethers = require('ethers');
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            const errResponse = errorResponse('Invalid signature');
            return res.status(401).json(errResponse);
        }
    } catch (error) {
        logger.error('Signature verification failed:', error);
        const errResponse = errorResponse('Invalid signature');
        return res.status(401).json(errResponse);
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    logger.info(`User logged in: ${user.username} (${user.walletAddress})`);

    // Send token response
    sendTokenResponse(user, 200, res, 'Login successful');
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    // Get blockchain balances
    try {
        const [ethBalance, tokenBalance] = await Promise.all([
            blockchainService.getEthBalance(user.walletAddress),
            blockchainService.getTokenBalance(user.walletAddress),
        ]);

        return successResponse(res, 200, 'User retrieved successfully', {
            user,
            balances: {
                eth: ethBalance,
                engc: tokenBalance,
            },
        });
    } catch (error) {
        logger.error('Error fetching balances:', error);
        return successResponse(res, 200, 'User retrieved successfully', { user });
    }
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    const response = successResponse('Logged out successfully');
    res.status(200).json(response);
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Private
 */
exports.refreshToken = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        const errResponse = errorResponse('User not found');
        return res.status(404).json(errResponse);
    }

    sendTokenResponse(user, 200, res, 'Token refreshed successfully');
});

/**
 * @desc    Get nonce for MetaMask signature
 * @route   GET /api/v1/auth/nonce/:walletAddress
 * @access  Public
 */
exports.getNonce = asyncHandler(async (req, res) => {
    const { walletAddress } = req.params;

    // Validate wallet address
    if (!blockchainService.isValidAddress(walletAddress)) {
        const errResponse = errorResponse('Invalid wallet address format');
        return res.status(400).json(errResponse);
    }

    // Generate nonce message
    const nonce = Math.floor(Math.random() * 1000000);
    const message = `Welcome to Energy Trading Platform!\n\nSign this message to authenticate.\n\nNonce: ${nonce}`;

    const response = successResponse('Nonce generated successfully', {
        message,
        nonce
    });

    res.status(200).json(response);
});

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/updatepassword
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        const errResponse = errorResponse('Please provide current and new password');
        return res.status(400).json(errResponse);
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
        const errResponse = errorResponse('Current password is incorrect');
        return res.status(401).json(errResponse);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password updated for user: ${user.username}`);

    sendTokenResponse(user, 200, res, 'Password updated successfully');
});
