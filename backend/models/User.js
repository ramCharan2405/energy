const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        // User identification
        walletAddress: {
            type: String,
            required: [true, 'Wallet address is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        // Profile information
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username cannot exceed 30 characters'],
        },

        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },

        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't return password by default
        },

        fullName: {
            type: String,
            trim: true,
        },

        avatar: {
            type: String,
            default: null,
        },

        bio: {
            type: String,
            maxlength: [500, 'Bio cannot exceed 500 characters'],
        },

        // User type
        role: {
            type: String,
            enum: ['user', 'admin', 'moderator'],
            default: 'user',
        },

        // Account status
        isActive: {
            type: Boolean,
            default: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        // Signup bonus tracking
        signupBonusClaimed: {
            type: Boolean,
            default: false,
        },

        signupBonusTransaction: {
            type: String,
            default: null,
        },

        // Statistics
        stats: {
            totalListingsCreated: { type: Number, default: 0 },
            totalListingsSold: { type: Number, default: 0 },
            totalPurchases: { type: Number, default: 0 },
            totalEnergyTraded: { type: Number, default: 0 },
            totalVolumeInETH: { type: Number, default: 0 },
            reputation: { type: Number, default: 0 },
        },

        // Preferences
        preferences: {
            emailNotifications: { type: Boolean, default: true },
            pushNotifications: { type: Boolean, default: true },
            newsletter: { type: Boolean, default: false },
            displayEmail: { type: Boolean, default: false },
        },

        // Security
        lastLogin: {
            type: Date,
            default: null,
        },

        loginAttempts: {
            type: Number,
            default: 0,
        },

        lockUntil: {
            type: Date,
            default: null,
        },

        // Referral system
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
        },

        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        referralCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.reputation': -1 });

// Virtual for account locked status
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function () {
    // Reset attempts if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 },
        });
    }

    // Increment attempts
    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

    // Lock account if max attempts reached
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        const lockDuration = parseInt(process.env.LOCKOUT_DURATION_MS) || 900000; // 15 minutes
        updates.$set = { lockUntil: Date.now() + lockDuration };
    }

    return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: { loginAttempts: 0, lastLogin: Date.now() },
        $unset: { lockUntil: 1 },
    });
};

// Update statistics
userSchema.methods.updateStats = function (statsUpdate) {
    return this.updateOne({ $inc: { ...statsUpdate } });
};

// Generate referral code
userSchema.methods.generateReferralCode = function () {
    const code = `ENRG${this._id.toString().slice(-8).toUpperCase()}`;
    this.referralCode = code;
    return code;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
