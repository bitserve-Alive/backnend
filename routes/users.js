const express = require('express');
const userController = require('../controllers/userController');
const auctionController = require('../controllers/auctionController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// Dashboard and profile routes
router.get('/dashboard', userController.getDashboard);
router.get('/bids', userController.getUserBids);
router.get('/watchlist', userController.getUserWatchlist);
router.get('/won-auctions', userController.getUserWonAuctions);
router.get('/auctions', auctionController.getUserAuctions);
router.put('/profile', userController.updateProfile);

// Notification routes
router.get('/notifications', userController.getUserNotifications);
router.put('/notifications/:id/read', userController.markNotificationRead);
router.put('/notifications/read-all', userController.markAllNotificationsRead);

module.exports = router; 