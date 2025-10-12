const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        // Blockchain data
        transactionHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        blockNumber: {
            type: Number,
            required: true,
            index: true,
        },

        blockTimestamp: {
            type: Date,
            required: true,
            index: true,
        },

        // Transaction type
        type: {
            type: String,
            enum: ['mint', 'transfer', 'listing_created', 'energy_purchased', 'listing_cancelled', 'approval'],
            required: true,
            index: true,
        },

        // Participants
        from: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },

        to: {
            type: String,
            required: true,
            lowercase: true,
            index: true,
        },

        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // Transaction details
        amount: {
            type: Number,
            default: 0,
        },

        amountInETH: {
            type: Number,
            default: 0,
        },

        pricePerToken: {
            type: Number,
            default: 0,
        },

        platformFee: {
            type: Number,
            default: 0,
        },

        // Gas information
        gasUsed: {
            type: String,
            default: '0',
        },

        gasPrice: {
            type: String,
            default: '0',
        },

        transactionFee: {
            type: String,
            default: '0',
        },

        // Status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'failed'],
            default: 'confirmed',
            index: true,
        },

        // Related entities
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Listing',
            default: null,
        },

        listingId: {
            type: String,
            default: null,
            index: true,
        },

        // Additional data
        metadata: {
            reason: String,
            description: String,
            energySource: String,
            location: String,
        },

        // Contract information
        contractAddress: {
            type: String,
            lowercase: true,
        },

        methodName: {
            type: String,
        },

        // Error information (for failed transactions)
        error: {
            message: String,
            code: String,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for efficient queries
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ from: 1, type: 1 });
transactionSchema.index({ to: 1, type: 1 });
transactionSchema.index({ blockTimestamp: -1 });
transactionSchema.index({ createdAt: -1 });

// Virtual for transaction age
transactionSchema.virtual('age').get(function () {
    return Date.now() - this.blockTimestamp.getTime();
});

// Static method to get user transactions
transactionSchema.statics.getUserTransactions = function (walletAddress, options = {}) {
    const { type, limit = 50, skip = 0 } = options;

    const query = {
        $or: [{ from: walletAddress.toLowerCase() }, { to: walletAddress.toLowerCase() }],
    };

    if (type) {
        query.type = type;
    }

    return this.find(query)
        .sort({ blockTimestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('fromUser', 'username avatar')
        .populate('toUser', 'username avatar')
        .populate('listing', 'listingId amountInTokens');
};

// Static method to get transaction statistics
transactionSchema.statics.getStatistics = async function (filters = {}) {
    const stats = await this.aggregate([
        { $match: { status: 'confirmed', ...filters } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalValueInETH: { $sum: '$amountInETH' },
                totalFees: { $sum: '$platformFee' },
            },
        },
    ]);

    return stats;
};

// Static method to get daily volume
transactionSchema.statics.getDailyVolume = async function (days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const volume = await this.aggregate([
        {
            $match: {
                type: 'energy_purchased',
                status: 'confirmed',
                blockTimestamp: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$blockTimestamp' },
                },
                totalTransactions: { $sum: 1 },
                totalEnergy: { $sum: '$amount' },
                totalVolumeETH: { $sum: '$amountInETH' },
                totalFees: { $sum: '$platformFee' },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return volume;
};

// Static method to get platform statistics
transactionSchema.statics.getPlatformStats = async function () {
    const [totalStats, recentStats] = await Promise.all([
        this.aggregate([
            { $match: { status: 'confirmed' } },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalEnergyTraded: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'energy_purchased'] }, '$amount', 0],
                        },
                    },
                    totalVolumeETH: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'energy_purchased'] }, '$amountInETH', 0],
                        },
                    },
                    totalPlatformFees: { $sum: '$platformFee' },
                },
            },
        ]),
        this.aggregate([
            {
                $match: {
                    status: 'confirmed',
                    blockTimestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            },
            {
                $group: {
                    _id: null,
                    last24hTransactions: { $sum: 1 },
                    last24hVolume: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'energy_purchased'] }, '$amountInETH', 0],
                        },
                    },
                },
            },
        ]),
    ]);

    return {
        ...totalStats[0],
        ...recentStats[0],
    };
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
