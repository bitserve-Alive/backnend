const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['BID_PLACED', 'BID_OUTBID', 'AUCTION_WON', 'AUCTION_ENDED', 'AUCTION_STARTING', 'GENERAL', 'SYSTEM', 'ANNOUNCEMENT'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction'
  }
}, {
  timestamps: true
});

// Add indexes for better performance
notificationSchema.index({ userId: 1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ auctionId: 1 });

module.exports = mongoose.model('Notification', notificationSchema); 