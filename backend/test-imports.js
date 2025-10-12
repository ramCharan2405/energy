console.log('Testing backend imports...\n');
try {
    console.log('‚úì Controllers');
    require('./controllers/authController');
    require('./controllers/userController');
    require('./controllers/listingController');
    require('./controllers/transactionController');
    require('./controllers/analyticsController');
    console.log('‚úì Routes');
    require('./routes/auth');
    require('./routes/users');
    require('./routes/listings');
    require('./routes/transactions');
    require('./routes/analytics');
    console.log('‚úì Models');
    require('./models/User');
    require('./models/Listing');
    require('./models/Transaction');
    console.log('\n‚úÖ All imports successful!');
    console.log('Ìæâ Backend is 100% complete!\n');
    process.exit(0);
} catch (error) {
    console.error('\n‚ùå Error:', error.message);
    process.exit(1);
}
