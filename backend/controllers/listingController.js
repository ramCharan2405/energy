const Listing = require('../models/Listing');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const blockchainService = require('../services/blockchain');
const { asyncHandler, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * @desc    Get all listings with filters and pagination
 * @route   GET /api/v1/listings
 * @access  Public
 */
exports.getListings = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        status,
        energySource,
        minPrice,
        maxPrice,
        seller,
        country,
        sortBy = 'createdAt',
        order = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (energySource) query.energySource = energySource;
    if (seller) query.seller = seller;
    if (country) query['location.country'] = country;

    // Price range filter
    if (minPrice || maxPrice) {
        query.pricePerTokenInETH = {};
        if (minPrice) query.pricePerTokenInETH.$gte = parseFloat(minPrice);
        if (maxPrice) query.pricePerTokenInETH.$lte = parseFloat(maxPrice);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const [listings, total] = await Promise.all([
        Listing.find(query)
            .populate('seller', 'username walletAddress avatar stats.reputation')
            .populate('buyer', 'username walletAddress avatar')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Listing.countDocuments(query)
    ]);

    res.json(successResponse('Listings retrieved successfully', {
        listings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Get single listing by ID
 * @route   GET /api/v1/listings/:id
 * @access  Public
 */
exports.getListing = asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id)
        .populate('seller', 'username walletAddress avatar stats.reputation')
        .populate('buyer', 'username walletAddress avatar');

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    // Increment views
    await listing.incrementViews();

    res.json(successResponse('Listing retrieved successfully', { listing }));
});

/**
 * @desc    Get listing by blockchain listing ID
 * @route   GET /api/v1/listings/blockchain/:listingId
 * @access  Public
 */
exports.getListingByBlockchainId = asyncHandler(async (req, res) => {
    const { listingId } = req.params;

    const listing = await Listing.findOne({ listingId: parseInt(listingId) })
        .populate('seller', 'username walletAddress avatar stats.reputation')
        .populate('buyer', 'username walletAddress avatar');

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    res.json(successResponse('Listing retrieved successfully', { listing }));
});

/**
 * @desc    Create new listing
 * @route   POST /api/v1/listings
 * @access  Private
 */
exports.createListing = asyncHandler(async (req, res) => {
    const {
        amountInTokens,
        pricePerTokenInETH,
        title,
        description,
        energySource,
        location,
        listingId,
        transactionHash,
        blockNumber
    } = req.body;

    // Validate required fields
    if (!amountInTokens || !pricePerTokenInETH || !title || !energySource) {
        return res.status(400).json(errorResponse('Missing required fields'));
    }

    // Validate blockchain data if provided
    if (!listingId || !transactionHash) {
        return res.status(400).json(errorResponse('Missing blockchain data: listingId and transactionHash required'));
    }

    // Check if user has enough tokens
    try {
        const balance = await blockchainService.getTokenBalance(req.user.walletAddress);
        if (parseFloat(balance) < parseFloat(amountInTokens)) {
            return res.status(400).json(errorResponse('Insufficient token balance'));
        }
    } catch (error) {
        logger.error('Failed to check token balance:', error);
        return res.status(500).json(errorResponse('Failed to verify token balance'));
    }

    // Calculate total price
    const totalPrice = parseFloat(amountInTokens) * parseFloat(pricePerTokenInETH);

    // If blockNumber not provided, try to fetch from blockchain
    let finalBlockNumber = blockNumber;
    if (!finalBlockNumber && transactionHash) {
        try {
            const provider = blockchainService.getProvider();
            const receipt = await provider.getTransactionReceipt(transactionHash);
            finalBlockNumber = receipt ? receipt.blockNumber : 0;
        } catch (error) {
            logger.warn('Failed to fetch block number from transaction:', error);
            finalBlockNumber = 0; // Default if unable to fetch
        }
    }

    const listing = await Listing.create({
        listingId: listingId,
        transactionHash: transactionHash,
        blockNumber: finalBlockNumber || 0,
        seller: req.user.id,
        sellerWalletAddress: req.user.walletAddress,
        amountInTokens: parseFloat(amountInTokens),
        pricePerTokenInETH: parseFloat(pricePerTokenInETH),
        totalPriceInETH: totalPrice,
        title,
        description,
        energySource,
        location,
        status: 'active',
        isActive: true
    });

    // Populate seller info
    await listing.populate('seller', 'username walletAddress avatar');

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'stats.totalListingsCreated': 1 }
    });

    logger.info(`Listing created by user ${req.user.id}: ${listing._id}`);

    res.status(201).json(successResponse('Listing created successfully', { listing }));
});

/**
 * @desc    Update listing (only before it's sold)
 * @route   PUT /api/v1/listings/:id
 * @access  Private (must be listing owner)
 */
exports.updateListing = asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    // Check ownership
    if (listing.seller.toString() !== req.user.id) {
        return res.status(403).json(errorResponse('Not authorized to update this listing'));
    }

    // Can only update active listings
    if (listing.status !== 'active') {
        return res.status(400).json(errorResponse('Cannot update inactive listing'));
    }

    // Fields that can be updated
    const allowedFields = ['title', 'description', 'location', 'metadata'];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            listing[field] = req.body[field];
        }
    });

    await listing.save();

    res.json(successResponse('Listing updated successfully', { listing }));
});

/**
 * @desc    Cancel listing
 * @route   DELETE /api/v1/listings/:id
 * @access  Private (must be listing owner or admin)
 */
exports.cancelListing = asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    // Check authorization
    if (listing.seller.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized to cancel this listing'));
    }

    // Can only cancel active listings
    if (listing.status !== 'active') {
        return res.status(400).json(errorResponse('Listing is not active'));
    }

    // Cancel listing
    await listing.cancelListing();

    logger.info(`Listing ${listing._id} cancelled by user ${req.user.id}`);

    res.json(successResponse('Listing cancelled successfully'));
});

/**
 * @desc    Get user's listings
 * @route   GET /api/v1/listings/user/:userId
 * @access  Public
 */
exports.getUserListings = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { seller: userId };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [listings, total] = await Promise.all([
        Listing.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('buyer', 'username walletAddress')
            .lean(),
        Listing.countDocuments(query)
    ]);

    res.json(successResponse('User listings retrieved successfully', {
        listings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Toggle favorite listing
 * @route   POST /api/v1/listings/:id/favorite
 * @access  Private
 */
exports.toggleFavorite = asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    const userId = req.user.id;
    const isFavorited = await listing.toggleFavorite(userId);

    res.json(successResponse(
        isFavorited ? 'Listing added to favorites' : 'Listing removed from favorites',
        { isFavorited, favoriteCount: listing.favorites.length }
    ));
});

/**
 * @desc    Get user's favorite listings
 * @route   GET /api/v1/listings/favorites
 * @access  Private
 */
exports.getFavoriteListings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [listings, total] = await Promise.all([
        Listing.find({ favorites: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('seller', 'username walletAddress avatar')
            .lean(),
        Listing.countDocuments({ favorites: req.user.id })
    ]);

    res.json(successResponse('Favorite listings retrieved successfully', {
        listings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Get trending listings (most views, favorites)
 * @route   GET /api/v1/listings/trending
 * @access  Public
 */
exports.getTrendingListings = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const listings = await Listing.getTrendingListings(parseInt(limit));

    res.json(successResponse('Trending listings retrieved successfully', { listings }));
});

/**
 * @desc    Get active listings from blockchain and sync
 * @route   GET /api/v1/listings/sync
 * @access  Private (Admin only)
 */
exports.syncListings = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json(errorResponse('Not authorized'));
    }

    try {
        const activeListings = await blockchainService.getActiveListings();

        let synced = 0;
        let created = 0;

        for (const bcListing of activeListings) {
            const existingListing = await Listing.findOne({ listingId: bcListing.listingId });

            if (existingListing) {
                // Update existing
                existingListing.amountInTokens = bcListing.amount;
                existingListing.pricePerTokenInETH = bcListing.pricePerToken;
                existingListing.totalPriceInETH = bcListing.totalPrice;
                existingListing.isActive = bcListing.isActive;
                await existingListing.save();
                synced++;
            } else {
                // Find user by wallet address
                const user = await User.findOne({ walletAddress: bcListing.seller.toLowerCase() });

                if (user) {
                    // Create new listing
                    await Listing.create({
                        listingId: bcListing.listingId,
                        seller: user._id,
                        sellerWalletAddress: bcListing.seller.toLowerCase(),
                        amountInTokens: bcListing.amount,
                        pricePerTokenInETH: bcListing.pricePerToken,
                        totalPriceInETH: bcListing.totalPrice,
                        status: 'active',
                        isActive: bcListing.isActive,
                        title: `Energy Listing #${bcListing.listingId}`,
                        energySource: 'unknown'
                    });
                    created++;
                }
            }
        }

        logger.info(`Listings synced: ${synced} updated, ${created} created`);

        res.json(successResponse('Listings synced successfully', {
            synced,
            created,
            total: activeListings.length
        }));
    } catch (error) {
        logger.error('Failed to sync listings:', error);
        return res.status(500).json(errorResponse('Failed to sync listings'));
    }
});

/**
 * @desc    Get listings by energy source
 * @route   GET /api/v1/listings/energy-source/:source
 * @access  Public
 */
exports.getListingsByEnergySource = asyncHandler(async (req, res) => {
    const { source } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const validSources = ['solar', 'wind', 'hydro', 'geothermal', 'biomass', 'nuclear', 'other'];

    if (!validSources.includes(source)) {
        return res.status(400).json(errorResponse('Invalid energy source'));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [listings, total] = await Promise.all([
        Listing.find({ energySource: source, status: 'active' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('seller', 'username walletAddress avatar')
            .lean(),
        Listing.countDocuments({ energySource: source, status: 'active' })
    ]);

    res.json(successResponse(`${source} listings retrieved successfully`, {
        listings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    }));
});

/**
 * @desc    Complete purchase - mark listing as sold
 * @route   POST /api/v1/listings/:id/purchase
 * @access  Private
 */
exports.completePurchase = asyncHandler(async (req, res) => {
    const { transactionHash } = req.body;

    if (!transactionHash) {
        return res.status(400).json(errorResponse('Transaction hash is required'));
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        return res.status(404).json(errorResponse('Listing not found'));
    }

    if (listing.status !== 'active') {
        return res.status(400).json(errorResponse('Listing is not active'));
    }

    // Prevent buying own listing
    if (listing.seller.toString() === req.user.id) {
        return res.status(400).json(errorResponse('Cannot buy your own listing'));
    }

    // Mark as sold
    await listing.markAsSold(req.user.id, req.user.walletAddress, transactionHash);

    logger.info(`Listing ${listing._id} purchased by user ${req.user.id}, TX: ${transactionHash}`);

    res.json(successResponse('Purchase completed successfully', { listing }));
});
