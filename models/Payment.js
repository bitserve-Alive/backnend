const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Payment identification
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  
  // User and auction info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true // Amount in cents
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  
  // Payment type
  type: {
    type: String,
    enum: ['ENTRY_FEE', 'WINNING_PAYMENT', 'REFUND'],
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'COMPLETED'],
    default: 'PENDING'
  },
  
  // Stripe details
  stripeDetails: {
    paymentIntentId: String,
    paymentMethodId: String,
    clientSecret: String,
    receiptUrl: String
  },
  
  // Shipping information (for winning payments)
  shippingInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    deliveryInstructions: String
  },
  
  // Billing information (for winning payments)
  billingInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  
  // Additional info
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  
  // Timestamps
  paidAt: Date,
  failedAt: Date,
  refundedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
paymentSchema.index({ userId: 1, auctionId: 1, type: 1 });
paymentSchema.index({ paymentIntentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for amount in dollars
paymentSchema.virtual('amountInDollars').get(function() {
  return this.amount / 100;
});

// Instance methods
paymentSchema.methods.markAsSucceeded = function() {
  this.status = 'SUCCEEDED';
  this.paidAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsFailed = function() {
  this.status = 'FAILED';
  this.failedAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsRefunded = function() {
  this.status = 'REFUNDED';
  this.refundedAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsCompleted = function(shippingInfo, billingInfo) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  if (shippingInfo) this.shippingInfo = shippingInfo;
  if (billingInfo) this.billingInfo = billingInfo;
  return this.save();
};

// Static methods
paymentSchema.statics.findByUserAndAuction = function(userId, auctionId, type = 'ENTRY_FEE') {
  return this.findOne({ userId, auctionId, type, status: 'SUCCEEDED' });
};

paymentSchema.statics.getUserPaymentHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('auctionId', 'title images basePrice')
    .sort({ createdAt: -1 })
    .limit(limit);
};

paymentSchema.statics.getAuctionPayments = function(auctionId) {
  return this.find({ auctionId, status: 'SUCCEEDED' })
    .populate('userId', 'firstName lastName email username');
};

module.exports = mongoose.model('Payment', paymentSchema); 