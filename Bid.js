const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  isWinning: {
    type: Boolean,
    default: false
  },
  bidderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for better performance
bidSchema.index({ bidderId: 1 });
bidSchema.index({ auctionId: 1 });
bidSchema.index({ amount: -1 });
bidSchema.index({ createdAt: -1 });
bidSchema.index({ auctionId: 1, amount: -1 });

module.exports = mongoose.model('Bid', bidSchema); 