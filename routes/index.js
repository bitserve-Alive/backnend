const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const mobileAuthRoutes = require('./mobileAuth');
const auctionRoutes = require('./auctions');
const categoryRoutes = require('./categories');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const imageRoutes = require('./images');
const paymentRoutes = require('./payments');
const notificationRoutes = require('./notifications');
const contactRoutes = require('./contact');
const aboutRoutes = require('./about');
const homepageRoutes = require('./homepage');
const productSubmissionRoutes = require('./productSubmissions');
const whatsappRoutes = require('./whatsapp');
const settingsController = require('../controllers/settingsController');

// Public routes
router.get('/settings', settingsController.getPublicSettings);

// Use route modules
router.use('/auth', authRoutes);
router.use('/auth/mobile', mobileAuthRoutes);
router.use('/auctions', auctionRoutes);
router.use('/categories', categoryRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/images', imageRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/contact', contactRoutes);
router.use('/about', aboutRoutes);
router.use('/homepage', homepageRoutes);
router.use('/product-submissions', productSubmissionRoutes);
router.use('/whatsapp', whatsappRoutes);

// Remove automatic category creation to avoid MongoDB replica set issues
// Categories can be created manually via API endpoints

// Default route
router.get('/', (req, res) => {
  res.json({
    message: 'PakAuction API',
    version: '1.0.0',
    status: 'Server running successfully',
    availableRoutes: [
      'GET /api/',
      'GET /api/health',
      'GET /api/settings',
      
      // Auth routes
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/refresh-token',
      'POST /api/auth/logout',
      'GET /api/auth/verify-email',
      'POST /api/auth/resend-verification',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
      'POST /api/auth/change-password',
      'GET /api/auth/profile',
      
      // Mobile Auth OTP routes
      'POST /api/auth/mobile/send-otp',
      'POST /api/auth/mobile/verify-otp',
      'POST /api/auth/mobile/forgot-password-otp',
      'POST /api/auth/mobile/reset-password-otp',
      
      // Auction routes
      'GET /api/auctions',
      'GET /api/auctions/:id',
      'POST /api/auctions',
      'PUT /api/auctions/:id',
      'DELETE /api/auctions/:id',
      'POST /api/auctions/:id/bids',
      'GET /api/auctions/:id/bids',
      'POST /api/auctions/:id/watchlist',
      
      // Category routes
      'GET /api/categories',
      'GET /api/categories/:id',
      'POST /api/categories',
      'PUT /api/categories/:id',
      'DELETE /api/categories/:id',
      'POST /api/categories/initialize-defaults',
      
      // User routes
      'GET /api/users/dashboard',
      'GET /api/users/bids',
      'GET /api/users/watchlist',
      'GET /api/users/auctions',
      'PUT /api/users/profile',
      'GET /api/users/notifications',
      'PUT /api/users/notifications/:id/read',
      'PUT /api/users/notifications/read-all',
      
      // Admin routes
      'GET /api/admin/dashboard-stats',
      'GET /api/admin/revenue',
      'GET /api/admin/category-stats',
      'GET /api/admin/recent-activity',
      'GET /api/admin/ending-soon',
      'GET /api/admin/users',
      'PUT /api/admin/users/:id/status',
      'DELETE /api/admin/users/:id',
      'GET /api/admin/bids',
      'DELETE /api/admin/bids/:id',
      'POST /api/admin/notifications',
      'GET /api/admin/notifications',
      
      // Image routes
      'POST /api/images/upload',
      'GET /api/images/:id',
      'DELETE /api/images/:id',
      
      // Payment routes
      'GET /api/payments/stripe-key',
      'POST /api/payments/create-payment-intent',
      'POST /api/payments/verify-payment',
      'GET /api/payments/status/:auctionId',
      'GET /api/payments/history',
      'GET /api/payments/auction/:auctionId',
      
      // Notification routes
      'GET /api/notifications',
      'PATCH /api/notifications/:id/read',
      'PATCH /api/notifications/read-all',
      'DELETE /api/notifications/:id',
      'GET /api/notifications/unread-count',
      
      // Product Submission routes
      'POST /api/product-submissions/submit',
      'GET /api/product-submissions/status/:identifier',
      'GET /api/product-submissions/admin/all',
      'PUT /api/product-submissions/admin/:id/status',
      'POST /api/product-submissions/admin/:id/convert-to-auction',
      'DELETE /api/product-submissions/admin/:id',
      
      // WhatsApp routes
      'GET /api/whatsapp/status',
      'POST /api/whatsapp/test',
      'POST /api/whatsapp/notify',
      'GET /api/whatsapp/setup-guide',
      'GET /api/whatsapp/webhook',
      'POST /api/whatsapp/webhook'
    ]
  });
});

module.exports = router; 