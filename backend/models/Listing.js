const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
    {
        // Blockchain data
        listingId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        transactionHash: {
            type: String,
            required: true,
            index: true,
        },

        blockNumber: {
            type: Number,
            required: true,
        },

        // Seller information
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        sellerWalletAddress: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },

        // Listing details
        amountInTokens: {
            type: Number,
            required: true,
            min: [0, 'Amount must be positive'],
        },

        pricePerTokenInETH: {
            type: Number,
            required: true,
            min: [0, 'Price must be positive'],
        },

        totalPriceInETH: {
            type: Number,
            required: true,
            min: [0, 'Total price must be positive'],
        },

        // Status
        status: {
            type: String,
            enum: ['active', 'sold', 'cancelled', 'expired'],
            default: 'active',
            index: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        // Additional information
        title: {
            type: String,
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },

        energySource: {
            type: String,
            enum: ['solar', 'wind', 'hydro', 'geothermal', 'biomass', 'mixed', 'other'],
            default: 'other',
        },

        location: {
            country: String,
            state: String,
            city: String,
            coordinates: {
                latitude: Number,
                longitude: Number,
            },
        },

        // Dates
        listedAt: {
            type: Date,
            default: Date.now,
        },

        expiresAt: {
            type: Date,
            default: null,
        },

        soldAt: {
            type: Date,
            default: null,
        },

        cancelledAt: {
            type: Date,
            default: null,
        },

        // Purchase tracking (when sold)
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        buyerWalletAddress: {
            type: String,
            lowercase: true,
            default: null,
        },

        purchaseTransactionHash: {
            type: String,
            default: null,
        },

        // Analytics
        views: {
            type: Number,
            default: 0,
        },

        favorites: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],

        // Metadata
        metadata: {
            generationDate: Date,
            certificateNumber: String,
            verificationStatus: {
                type: String,
                enum: ['verified', 'pending', 'unverified'],
                default: 'unverified',
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for performance
listingSchema.index({ status: 1, isActive: 1 });
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ pricePerTokenInETH: 1 });
listingSchema.index({ energySource: 1, status: 1 });

// Virtual for favorite count
listingSchema.virtual('favoriteCount').get(function () {
    return this.favorites ? this.favorites.length : 0;
});

// Virtual for time remaining
listingSchema.virtual('timeRemaining').get(function () {
    if (!this.expiresAt) return null;
    const now = Date.now();
    const expiry = this.expiresAt.getTime();
    return expiry > now ? expiry - now : 0;
});

// Method to increment views
listingSchema.methods.incrementViews = function () {
    this.views += 1;
    return this.save();
};

// Method to toggle favorite
listingSchema.methods.toggleFavorite = function (userId) {
    const index = this.favorites.indexOf(userId);
    if (index === -1) {
        this.favorites.push(userId);
    } else {
        this.favorites.splice(index, 1);
    }
    return this.save();
};

// Method to mark as sold
listingSchema.methods.markAsSold = function (buyerId, buyerAddress, txHash) {
    this.status = 'sold';
    this.isActive = false;
    this.buyer = buyerId;
    this.buyerWalletAddress = buyerAddress;
    this.purchaseTransactionHash = txHash;
    this.soldAt = Date.now();
    return this.save();
};

// Method to cancel listing
listingSchema.methods.cancelListing = function () {
    this.status = 'cancelled';
    this.isActive = false;
    this.cancelledAt = Date.now();
    return this.save();
};

// Static method to get active listings
listingSchema.statics.getActiveListings = function (filters = {}) {
    return this.find({ status: 'active', isActive: true, ...filters })
        .populate('seller', 'username walletAddress avatar stats.reputation')
        .sort({ createdAt: -1 });
};

// Static method to get trending listings
listingSchema.statics.getTrendingListings = function (limit = 10) {
    return this.find({ status: 'active', isActive: true })
        .sort({ views: -1, favoriteCount: -1 })
        .limit(limit)
        .populate('seller', 'username walletAddress avatar stats.reputation');
};

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;
