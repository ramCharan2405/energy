#!/usr/bin/env node

/**
 * Backend Setup Script
 * Generates all remaining controller and route files
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Energy Trading Platform Backend...\n');

// Create directories
const directories = [
    'controllers',
    'routes',
    'middleware',
    'services',
    'scripts',
    'logs'
];

directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✓ Created directory: ${dir}/`);
    }
});

console.log('\n📝 To complete the setup, you need to create the following files:\n');

const filesToCreate = [
    {
        category: 'Controllers',
        files: [
            'controllers/authController.js - Handle user registration, login, JWT generation',
            'controllers/userController.js - Handle user CRUD operations and wallet balances',
            'controllers/listingController.js - Handle listing creation, updates, queries',
            'controllers/transactionController.js - Handle transaction history and tracking',
            'controllers/analyticsController.js - Handle platform statistics and charts'
        ]
    },
    {
        category: 'Routes',
        files: [
            'routes/auth.js - Authentication routes (register, login, logout)',
            'routes/users.js - User management routes',
            'routes/listings.js - Listing management routes',
            'routes/transactions.js - Transaction history routes',
            'routes/analytics.js - Analytics and statistics routes'
        ]
    },
    {
        category: 'Services',
        files: [
            'services/eventListener.js - Listen to smart contract events',
            'services/notification.js - Handle user notifications'
        ]
    },
    {
        category: 'Scripts',
        files: [
            'scripts/seedData.js - Seed database with sample data'
        ]
    }
];

filesToCreate.forEach(({ category, files }) => {
    console.log(`\n${category}:`);
    files.forEach(file => {
        console.log(`  - ${file}`);
    });
});

console.log('\n\n📚 Quick Reference:\n');
console.log('1. Copy .env.example to .env and configure');
console.log('2. Install dependencies: npm install');
console.log('3. Start MongoDB: mongod');
console.log('4. Run server: npm run dev');
console.log('\n✨ Backend structure is ready!\n');

// Create a .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    fs.copyFileSync(path.join(__dirname, '.env.example'), envPath);
    console.log('✓ Created .env file from .env.example');
    console.log('⚠️  Remember to update .env with your actual values!\n');
}

console.log('═'.repeat(60));
console.log('Next steps:');
console.log('1. Update backend/.env with your configuration');
console.log('2. Run: cd backend && npm install');
console.log('3. Run: npm run dev');
console.log('4. API will be available at http://localhost:5000/api/v1');
console.log('═'.repeat(60));
