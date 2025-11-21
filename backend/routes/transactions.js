const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getTransactions,
    getTransaction,
    getUserTransactions,
    getTransactionsByWallet,
    getListingTransactions,
    createTransaction,
    getTransactionStats,
    getDailyVolume,
    getTransactionsByType,
    verifyTransaction,
    getRecentTransactions,
    getPlatformStats
} = require('../controllers/transactionController');

// Public routes
router.get('/recent', getRecentTransactions);
router.get('/stats/daily', getDailyVolume);
router.get('/stats/by-type', getTransactionsByType);
router.get('/stats/platform', getPlatformStats);

// Stats route - returns user-specific stats if authenticated, platform-wide if not
router.get('/stats/overview', getTransactionStats);
router.get('/stats', getTransactionStats);

// Protected routes - My transactions
router.get('/my/all', protect, async (req, res, next) => {
    req.params.userId = req.user.id;
    return getUserTransactions(req, res, next);
});

router.get('/my/purchases', protect, async (req, res, next) => {
    req.params.userId = req.user.id;
    req.query.type = 'energy_purchased';
    return getUserTransactions(req, res, next);
});

router.get('/my/sales', protect, async (req, res, next) => {
    req.params.userId = req.user.id;
    req.query.type = 'energy_purchased'; // Sales from seller perspective
    return getUserTransactions(req, res, next);
});

router.get('/history', protect, async (req, res, next) => {
    req.params.userId = req.user.id;
    return getUserTransactions(req, res, next);
});

// Other routes
router.get('/user/:userId', getUserTransactions);
router.get('/wallet/:address', getTransactionsByWallet);
router.get('/listing/:listingId', getListingTransactions);
router.get('/:hash/verify', verifyTransaction);
router.get('/:hash', getTransaction);
router.get('/', protect, authorize('admin'), getTransactions);
router.post('/', protect, authorize('admin'), createTransaction);

module.exports = router;
