const mongoose = require('mongoose');

const productSubmissionSchema = new mongoose.Schema({
  // Personal Information
  sellerName: {
    type: String,
    required: [true, 'Seller name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  sellerEmail: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  sellerPhone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^03\d{2}-?\d{7}$/, 'Please enter a valid Pakistani phone number (03xx-xxxxxxx)']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    minlength: [2, 'City name must be at least 2 characters'],
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  
  // Product Information
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Electronics', 'Computers', 'Phones & Tablets', 'Furniture', 'Clothing', 'Books', 'Vehicles', 'Antiques', 'Art', 'Jewelry', 'Collectibles', 'Art & Collectibles', 'Other'],
      message: 'Please select a valid category'
    }
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: {
      values: ['Brand New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'],
      message: 'Please select a valid condition'
    }
  },
  expectedPrice: {
    type: Number,
    required: [true, 'Expected price is required'],
    min: [1, 'Price must be at least 1 PKR'],
    max: [99999999, 'Price cannot exceed 99,999,999 PKR'],
    validate: {
      validator: function(value) {
        return Number.isInteger(value) && value > 0;
      },
      message: 'Price must be a positive whole number'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Images
  images: {
    type: [{
      url: {
        type: String,
        required: true
      },
      filename: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true,
        max: [5 * 1024 * 1024, 'Image size cannot exceed 5MB']
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    validate: {
      validator: function(images) {
        return images && images.length >= 1 && images.length <= 5;
      },
      message: 'Please upload between 1 and 5 images'
    }
  },
  
  // Submission Status
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED_TO_AUCTION'],
    default: 'PENDING'
  },
  
  // Admin Review
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  
  // If converted to auction
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction'
  },
  
  // User Association (if user is logged in)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    maxlength: [45, 'Invalid IP address'] // IPv6 max length
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent too long']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
productSubmissionSchema.index({ status: 1, submittedAt: -1 });
productSubmissionSchema.index({ sellerEmail: 1 });
productSubmissionSchema.index({ category: 1 });

// Virtual for time since submission
productSubmissionSchema.virtual('timeSinceSubmission').get(function() {
  const now = new Date();
  const diff = now - this.submittedAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
});

// Pre-save middleware
productSubmissionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'PENDING') {
    this.reviewedAt = new Date();
  }
  next();
});

// Static methods
productSubmissionSchema.statics.getStatusCounts = async function() {
  const counts = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    PENDING: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    CONVERTED_TO_AUCTION: 0
  };
  
  counts.forEach(item => {
    result[item._id] = item.count;
  });
  
  return result;
};

// Instance methods
productSubmissionSchema.methods.approve = function(adminId, notes) {
  this.status = 'APPROVED';
  this.reviewedBy = adminId;
  this.adminNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

productSubmissionSchema.methods.reject = function(adminId, notes) {
  this.status = 'REJECTED';
  this.reviewedBy = adminId;
  this.adminNotes = notes;
  this.reviewedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('ProductSubmission', productSubmissionSchema); 