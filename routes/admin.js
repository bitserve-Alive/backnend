const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(verifyToken);
router.use(requireAdmin);

// Dashboard Statistics
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/revenue', adminController.getRevenueData);
router.get('/category-stats', adminController.getCategoryStats);
router.get('/recent-activity', adminController.getRecentActivity);
router.get('/ending-soon', adminController.getEndingSoonAuctions);

// User Management
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Auction Management
router.put('/auctions/:id/featured', adminController.toggleAuctionFeatured);
router.put('/auctions/bulk-featured', adminController.bulkUpdateFeatured);

// Bid Management
router.get('/bids', adminController.getBids);
router.delete('/bids/:id', adminController.deleteBid);

// Settings Management
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateAllSettings);
router.put('/settings/payment', settingsController.updatePaymentSettings);
router.put('/settings/website', settingsController.updateWebsiteSettings);
router.post('/settings/reset', settingsController.resetSettings);

// Notification Management
router.post('/notifications', adminController.sendNotification);
router.get('/notifications', adminController.getSystemNotifications);

module.exports = router; 