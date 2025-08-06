const mongoose = require('mongoose');

const auctionImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number
  },
  mimeType: {
    type: String
  },
  isMain: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
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
auctionImageSchema.index({ auctionId: 1 });
auctionImageSchema.index({ auctionId: 1, order: 1 });
auctionImageSchema.index({ auctionId: 1, isMain: 1 });

module.exports = mongoose.model('AuctionImage', auctionImageSchema); 