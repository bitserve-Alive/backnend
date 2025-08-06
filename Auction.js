const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    trim: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentBid: {
    type: Number,
    default: 0,
    min: 0
  },
  bidIncrement: {
    type: Number,
    default: 10,
    min: 1
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  reservePrice: {
    type: Number,
    min: 0
  },
  buyNowPrice: {
    type: Number,
    min: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED', 'SOLD'],
    default: 'DRAFT'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  bidCount: {
    type: Number,
    default: 0,
    min: 0
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for better performance
auctionSchema.index({ sellerId: 1 });
auctionSchema.index({ categoryId: 1 });
auctionSchema.index({ status: 1 });
auctionSchema.index({ endTime: 1 });
auctionSchema.index({ startTime: 1 });
auctionSchema.index({ isActive: 1 });
auctionSchema.index({ isFeatured: 1 });
auctionSchema.index({ isFeatured: 1, status: 1 });
auctionSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Auction', auctionSchema); 