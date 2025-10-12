const express = require('express');
const router = express.Router();
const {
    getPlatformStats,
    getTradingVolume,
    getUserAnalytics,
    getListingAnalytics,
    getTopTraders,
    getEnergySourceDistribution,
    getPriceTrends,
    getMarketOverview,
    getGeographicDistribution,
    getTransactionTimeline,
    getDashboardStats
} = require('../controllers/analyticsController');

router.get('/dashboard', getDashboardStats);
router.get('/platform', getPlatformStats);
router.get('/volume', getTradingVolume);
router.get('/user/:userId', getUserAnalytics);
router.get('/listing/:listingId', getListingAnalytics);
router.get('/leaderboard', getTopTraders);
router.get('/energy-sources', getEnergySourceDistribution);
router.get('/price-trends', getPriceTrends);
router.get('/market-overview', getMarketOverview);
router.get('/geographic', getGeographicDistribution);
router.get('/timeline', getTransactionTimeline);

// Aliases for frontend compatibility
router.get('/recent-activity/:limit?', getTransactionTimeline);
router.get('/market-stats', getMarketOverview);

module.exports = router;
