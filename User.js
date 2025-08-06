const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  password: {
    type: String,
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  emailVerificationOTP: {
    type: String
  },
  passwordResetOTP: {
    type: String
  },
  passwordResetOTPExpires: {
    type: Date
  },
  otpExpires: {
    type: Date
  },
  refreshToken: {
    type: String
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'MODERATOR'],
    default: 'USER'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  marketingEmails: {
    type: Boolean,
    default: false
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  pushTokens: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Add indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ emailVerificationOTP: 1 });
userSchema.index({ passwordResetOTP: 1 });

module.exports = mongoose.model('User', userSchema); 