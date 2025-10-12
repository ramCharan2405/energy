require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// Sample wallet addresses (test wallets)
const sampleWallets = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
    '0x3456789012345678901234567890123456789012',
    '0x4567890123456789012345678901234567890123',
    '0x5678901234567890123456789012345678901234'
];

// Energy sources
const energySources = ['solar', 'wind', 'hydro', 'geothermal', 'biomass'];

// Seed Users
async function seedUsers() {
    console.log('Seeding users...');

    const users = [];

    for (let i = 0; i < 5; i++) {
        const user = {
            walletAddress: sampleWallets[i],
            username: `user${i + 1}`,
            email: `user${i + 1}@energytrading.com`,
            password: await bcrypt.hash('Password123!', 10),
            fullName: `Test User ${i + 1}`,
            bio: `I am a test user interested in trading renewable energy credits.`,
            role: i === 0 ? 'admin' : 'user',
            isActive: true,
            isVerified: true,
            signupBonusClaimed: true,
            stats: {
                totalListingsCreated: Math.floor(Math.random() * 10),
                totalListingsSold: Math.floor(Math.random() * 5),
                totalPurchases: Math.floor(Math.random() * 5),
                totalEnergyTraded: Math.floor(Math.random() * 1000) + 100,
                totalVolumeInETH: (Math.random() * 10).toFixed(4),
                reputation: Math.floor(Math.random() * 100)
            }
        };

        users.push(user);
    }

    await User.insertMany(users);
    console.log(`✅ ${users.length} users created`);

    return await User.find();
}

// Seed Listings
async function seedListings(users) {
    console.log('Seeding listings...');

    const listings = [];

    for (let i = 0; i < 20; i++) {
        const seller = users[Math.floor(Math.random() * users.length)];
        const amountInTokens = Math.floor(Math.random() * 1000) + 10;
        const pricePerTokenInETH = (Math.random() * 0.01 + 0.001).toFixed(6);
        const totalPriceInETH = (amountInTokens * pricePerTokenInETH).toFixed(6);

        const listing = {
            listingId: i + 1,
            seller: seller._id,
            sellerWalletAddress: seller.walletAddress,
            amountInTokens,
            pricePerTokenInETH,
            totalPriceInETH,
            status: Math.random() > 0.3 ? 'active' : 'sold',
            isActive: Math.random() > 0.3,
            title: `${energySources[Math.floor(Math.random() * energySources.length)].charAt(0).toUpperCase() + energySources[Math.floor(Math.random() * energySources.length)].slice(1)} Energy Credits #${i + 1}`,
            description: `High-quality renewable energy credits from verified sources. Perfect for offsetting carbon footprint.`,
            energySource: energySources[Math.floor(Math.random() * energySources.length)],
            location: {
                country: ['USA', 'Canada', 'Germany', 'India', 'Australia'][Math.floor(Math.random() * 5)],
                state: ['California', 'Texas', 'Ontario', 'Bavaria', 'Maharashtra'][Math.floor(Math.random() * 5)],
                city: ['San Francisco', 'Austin', 'Toronto', 'Munich', 'Mumbai'][Math.floor(Math.random() * 5)]
            },
            listedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
            expiresAt: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000), // Random date within next 60 days
            views: Math.floor(Math.random() * 100),
            favorites: []
        };

        listings.push(listing);
    }

    await Listing.insertMany(listings);
    console.log(`✅ ${listings.length} listings created`);

    return await Listing.find();
}

// Seed Transactions
async function seedTransactions(users, listings) {
    console.log('Seeding transactions...');

    const transactions = [];

    // Mint transactions (signup bonus)
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        transactions.push({
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            blockNumber: 1000000 + i,
            blockTimestamp: new Date(user.createdAt),
            type: 'mint',
            from: process.env.PLATFORM_ADDRESS,
            to: user.walletAddress,
            fromUser: null,
            toUser: user._id,
            amount: '50',
            amountInETH: '0',
            status: 'confirmed',
            gasUsed: '50000',
            gasPrice: '20000000000',
            transactionFee: '0.001'
        });
    }

    // Purchase transactions
    const soldListings = listings.filter(l => l.status === 'sold');
    for (let i = 0; i < soldListings.length; i++) {
        const listing = soldListings[i];
        const buyer = users[Math.floor(Math.random() * users.length)];

        transactions.push({
            transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
            blockNumber: 1000100 + i,
            blockTimestamp: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
            type: 'energy_purchased',
            from: buyer.walletAddress,
            to: listing.sellerWalletAddress,
            fromUser: buyer._id,
            toUser: listing.seller,
            amount: listing.amountInTokens.toString(),
            amountInETH: listing.totalPriceInETH.toString(),
            pricePerToken: listing.pricePerTokenInETH.toString(),
            platformFee: (listing.totalPriceInETH * 0.02).toFixed(6),
            status: 'confirmed',
            listing: listing._id,
            listingId: listing.listingId,
            gasUsed: '150000',
            gasPrice: '25000000000',
            transactionFee: '0.00375'
        });
    }

    await Transaction.insertMany(transactions);
    console.log(`✅ ${transactions.length} transactions created`);
}

// Main seed function
async function seed() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Listing.deleteMany({});
        await Transaction.deleteMany({});
        console.log('✅ Existing data cleared');

        // Seed data
        const users = await seedUsers();
        const listings = await seedListings(users);
        await seedTransactions(users, listings);

        console.log('\n🎉 Database seeded successfully!');
        console.log(`
📊 Summary:
  - Users: ${users.length}
  - Listings: ${listings.length}
  - Transactions: ${users.length + listings.filter(l => l.status === 'sold').length}
  
🔐 Test Credentials:
  Email: user1@energytrading.com
  Password: Password123!
  Wallet: ${sampleWallets[0]}
        `);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        logger.error('Seed error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run seed
seed();
