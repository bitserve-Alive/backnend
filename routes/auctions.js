const express = require('express');
// const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const auctionController = require('../controllers/auctionController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auction creation - COMMENTED OUT FOR DEVELOPMENT
// const createAuctionLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 5, // limit each user to 5 auction creations per hour
//   message: {
//     success: false,
//     message: 'Too many auctions created, please try again later.'
//   }
// });

// Validation middleware
const validateCreateAuction = [
  body('title')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('basePrice')
    .isFloat({ min: 1 })
    .withMessage('Base price must be at least $1'),
  body('bidIncrement')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Bid increment must be at least $1'),
  body('entryFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Entry fee must be 0 or positive'),
  body('categoryId')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value) => {
      const endTime = new Date(value);
      const now = new Date();
      if (endTime <= now) {
        throw new Error('End time must be in the future');
      }
      return true;
    })
];

const validatePlaceBid = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Bid amount must be at least $1')
];

// Public routes (no authentication required)
router.get('/', optionalAuth, auctionController.getAuctions);
router.get('/:id', optionalAuth, auctionController.getAuctionById);
router.get('/:id/bids', auctionController.getAuctionBids);

// Protected routes (authentication required)
router.post('/', verifyToken, auctionController.createAuction);
router.put('/:id', verifyToken, auctionController.updateAuction);
router.delete('/:id', verifyToken, auctionController.deleteAuction);

// Bidding routes
router.post('/:id/bids', verifyToken, validatePlaceBid, auctionController.placeBid);
router.get('/:id/user-bid', verifyToken, auctionController.getUserBidStatus);

// Watchlist routes
router.post('/:id/watchlist', verifyToken, auctionController.toggleWatchlist);
router.get('/:id/watchlist-status', verifyToken, auctionController.getWatchlistStatus);

// Admin endpoints
router.post('/admin/process-expired', verifyToken, async (req, res) => {
  try {
    // Check if user is admin (you can implement proper admin check)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const AuctionService = require('../services/auctionService');
    const processedCount = await AuctionService.processExpiredAuctions();
    
    res.json({
      success: true,
      message: `Processed ${processedCount} expired auctions`,
      data: { processedCount }
    });
    
  } catch (error) {
    console.error('Admin process expired auctions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process expired auctions'
    });
  }
});

module.exports = router; 