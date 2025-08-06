const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId: {
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

// Add compound unique index
watchlistSchema.index({ userId: 1, auctionId: 1 }, { unique: true });

// Add individual indexes for better performance
watchlistSchema.index({ userId: 1 });
watchlistSchema.index({ auctionId: 1 });

module.exports = mongoose.model('Watchlist', watchlistSchema); 