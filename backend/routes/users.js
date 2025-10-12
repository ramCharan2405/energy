const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getUsers,
    getUser,
    getUserByWallet,
    updateUser,
    deleteUser,
    getUserStats,
    getWalletBalance,
    getUserReferrals,
    getLeaderboard,
    searchUsers
} = require('../controllers/userController');

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/leaderboard', getLeaderboard);
router.get('/wallet/:address', getUserByWallet);

// Protected routes for current user (must be before /:id routes)
router.get('/stats', protect, (req, res, next) => {
    // Call getUserStats with current user's ID from token
    req.params.id = req.user._id;
    next(); // Pass to the actual controller
}, getUserStats);

router.get('/balance', protect, (req, res, next) => {
    // Call getWalletBalance with current user's ID from token
    req.params.id = req.user._id;
    next(); // Pass to the actual controller
}, getWalletBalance);

// Routes with ID parameter
router.get('/:id', getUser);
router.get('/:id/stats', getUserStats);
router.get('/:id/balance', getWalletBalance);
router.get('/:id/referrals', protect, getUserReferrals);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;
