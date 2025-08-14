const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendOTPEmail } = require('../utils/email');

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

// Set secure cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = config.nodeEnv === 'production';

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register user (supports both web token and mobile OTP)
const register = async (req, res) => {
  try {
    const {
      email,
      username,
      firstName,
      lastName,
      password,
      phone,
      dateOfBirth,
      marketingEmails,
      isMobile // Add this parameter to differentiate mobile registration
    } = req.body;

    console.log(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let user;

    if (isMobile) {
      // Mobile registration - use OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user = new User({
        email,
        username,
        firstName,
        lastName,
        password: hashedPassword,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        marketingEmails: marketingEmails || false,
        emailVerificationOTP: otp,
        otpExpires: otpExpires,
        isEmailVerified: false,
        role: 'USER',
        isActive: true
      });

      await user.save();

      // Send OTP email
      sendOTPEmail(email, firstName, otp, 'verify').catch(error => {
        console.error('Failed to send verification email:', error);
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email for the verification code.',
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified
          },
          verificationRequired: true
        }
      });
    } else {
      // Web registration - use token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      user = new User({
      email,
      username,
      firstName,
      lastName,
      password: hashedPassword,
      phone: phone || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      marketingEmails: marketingEmails || false,
      emailVerificationToken,
      isEmailVerified: false,
      role: 'USER',
      isActive: true
    });

    await user.save();

    // Send verification email (don't wait for it to complete)
    sendVerificationEmail(email, firstName, emailVerificationToken).catch(error => {
      console.error('Failed to send verification email:', error);
    });

      return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
    }

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    // Update user with refresh token and last login
    await User.findByIdAndUpdate(user._id, {
            refreshToken,
      lastLogin: new Date()
    });

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        token: accessToken,
        refreshToken: refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookies or body (consistent with middleware)
    const token = req.body.refreshToken || req.cookies.refreshToken;
console.log("token demanded check", token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    
    // Find user and verify refresh token
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: token
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString());

    // Update user with new refresh token
    await User.findByIdAndUpdate(user._id, {
      refreshToken: newRefreshToken
    });

    // Set new cookies
    setTokenCookies(res, accessToken, newRefreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear refresh token from database
    await User.findByIdAndUpdate(userId, {
      refreshToken: null
    });

    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    console.log("token", token);

    // Find user with verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      isEmailVerified: false
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user as verified
    await User.findByIdAndUpdate(user._id, {
          isEmailVerified: true,
      emailVerificationToken: null
    });

    // Send welcome email
    sendWelcomeEmail(user.email, user.firstName).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to PakAuction.'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Update user with new token
    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.firstName, emailVerificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await User.findByIdAndUpdate(user._id, {
          passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    });

    // Send reset email
    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.body;
    const { password } = req.body;
    console.log("token", token);
    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user with new password and clear reset token
    await User.findByIdAndUpdate(user._id, {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
      refreshToken: null // Clear all sessions
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(userId, {
          password: hashedPassword,
      refreshToken: null // Clear all sessions for security
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          marketingEmails: user.marketingEmails,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          profilePhoto: user.profilePhoto,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Mobile OTP Functions

// Send OTP for email verification (resend)
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists and is not verified
    const user = await User.findOne({ email });

    if (user && user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with OTP
    await User.findByIdAndUpdate(user._id, {
      emailVerificationOTP: otp,
      otpExpires: otpExpires
    });

    // Send OTP email
    await sendOTPEmail(email, user.firstName, otp, 'verify');

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
};

// Verify OTP for email verification
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user with matching email and OTP
    const user = await User.findOne({
      email,
      emailVerificationOTP: otp,
      otpExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update user as verified
    await User.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      emailVerificationOTP: null,
      otpExpires: null
    });

    // Send welcome email
    sendWelcomeEmail(user.email, user.firstName).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to PakAuction.'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
};

// Send OTP for password reset
const forgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists or not (same as web version)
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset code.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update user with password reset OTP
    await User.findByIdAndUpdate(user._id, {
      passwordResetOTP: otp,
      passwordResetOTPExpires: otpExpires
    });

    // Send OTP email
    await sendOTPEmail(user.email, user.firstName, otp, 'reset');

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset code.'
    });

  } catch (error) {
    console.error('Forgot password OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset code'
    });
  }
};

// Reset password with OTP
const resetPasswordOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Find user with valid reset OTP
    const user = await User.findOne({
      email,
      passwordResetOTP: otp,
      passwordResetOTPExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user with new password and clear reset OTP
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetOTP: null,
      passwordResetOTPExpires: null,
      refreshToken: null // Clear all sessions
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// NEW: Verify password reset OTP (without changing password)
const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user with valid reset OTP
    const user = await User.findOne({
      email,
      passwordResetOTP: otp,
      passwordResetOTPExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    res.json({
      success: true,
      message: 'Reset code verified successfully. You can now create a new password.'
    });

  } catch (error) {
    console.error('Verify password reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset code verification failed'
    });
  }
};

// Register push token
const registerPushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    // Add push token to user's tokens array (if not already exists)
    await User.findByIdAndUpdate(userId, {
      $addToSet: { pushTokens: pushToken }
    });

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during push token registration'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  // Mobile OTP functions
  sendOTP,
  verifyOTP,
  forgotPasswordOTP,
  resetPasswordOTP,
  verifyPasswordResetOTP,
  // Push notification functions
  registerPushToken
}; 