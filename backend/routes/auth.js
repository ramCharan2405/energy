const express = require('express');
const {
    register,
    login,
    getMe,
    logout,
    refreshToken,
    updatePassword,
    getNonce,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/nonce/:walletAddress', getNonce);
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/refresh', protect, refreshToken);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
