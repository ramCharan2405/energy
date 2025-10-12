const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getListings,
    getListing,
    getListingByBlockchainId,
    createListing,
    updateListing,
    cancelListing,
    getUserListings,
    toggleFavorite,
    getFavoriteListings,
    getTrendingListings,
    syncListings,
    getListingsByEnergySource,
    completePurchase
} = require('../controllers/listingController');

router.get('/', getListings);
router.get('/trending', getTrendingListings);
router.get('/energy-source/:source', getListingsByEnergySource);
router.get('/blockchain/:listingId', getListingByBlockchainId);
router.get('/user/:userId', getUserListings);
router.get('/:id', getListing);
router.post('/', protect, createListing);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, cancelListing);
router.post('/:id/purchase', protect, completePurchase);
router.post('/:id/favorite', protect, toggleFavorite);
router.get('/favorites/me', protect, getFavoriteListings);
router.get('/admin/sync', protect, syncListings);

module.exports = router;
