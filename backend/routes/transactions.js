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

router.get('/recent', getRecentTransactions);
router.get('/stats/overview', getTransactionStats);
router.get('/stats/daily', getDailyVolume);
router.get('/stats/by-type', getTransactionsByType);
router.get('/stats/platform', getPlatformStats);
router.get('/user/:userId', getUserTransactions);
router.get('/wallet/:address', getTransactionsByWallet);
router.get('/listing/:listingId', getListingTransactions);
router.get('/:hash/verify', verifyTransaction);
router.get('/:hash', getTransaction);
router.get('/', protect, authorize('admin'), getTransactions);
router.post('/', protect, authorize('admin'), createTransaction);

module.exports = router;
