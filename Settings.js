const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Payment Gateway Settings
  paymentSettings: {
    stripe: {
      enabled: { type: Boolean, default: false },
      apiKey: { type: String, default: '' },
      publishableKey: { type: String, default: '' },
      webhookSecret: { type: String, default: '' }
    },
    general: {
      currency: { type: String, default: 'USD' },
      paymentMode: { type: String, enum: ['live', 'test'], default: 'test' },
      auctionDepositPercent: { type: Number, default: 10 },
      invoicePrefix: { type: String, default: 'INV-' },
      enableReceiptEmails: { type: Boolean, default: true },
      requireVerificationHighValue: { type: Boolean, default: true }
    }
  },

  // WhatsApp Settings
  whatsappSettings: {
    enabled: { type: Boolean, default: false },
    phoneNumberId: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    verifyToken: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    webhookSecret: { type: String, default: '' },
    adminPhoneNumbers: [{ type: String }], // Array of admin phone numbers
    notifications: {
      productSubmissions: { type: Boolean, default: true },
      statusUpdates: { type: Boolean, default: true },
      bidNotifications: { type: Boolean, default: false },
      auctionEndNotifications: { type: Boolean, default: false }
    }
  },

  // Website Settings  
  websiteSettings: {
    general: {
      websiteName: { type: String, default: 'Premium Auctions' },
      websiteUrl: { type: String, default: 'https://premiumauctions.com' },
      adminEmail: { type: String, default: 'admin@premiumauctions.com' },
      contactPhone: { type: String, default: '+1 (555) 123-4567' },
      websiteDescription: { type: String, default: 'Premium Auctions is your trusted platform for high-quality collectibles, antiques, and unique items.' }
    },
    logo: {
      logoUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' }
    },
    auction: {
      defaultDurationDays: { type: Number, default: 7 },
      minimumBidIncrementPercent: { type: Number, default: 5 },
      autoExtendTimeMinutes: { type: Number, default: 10 },
      featuredAuctionFee: { type: Number, default: 25 },
      enableAutoExtend: { type: Boolean, default: true },
      allowReservePrices: { type: Boolean, default: true },
      enableBuyNow: { type: Boolean, default: true }
    }
  },

  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Only allow one settings document (singleton pattern)
settingsSchema.index({}, { unique: true });

module.exports = mongoose.model('Settings', settingsSchema); 