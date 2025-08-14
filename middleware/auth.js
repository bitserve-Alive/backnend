const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId).select(
      'email username firstName lastName role isActive isEmailVerified'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Verify refresh token
const verifyRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    console.log('🔍 Middleware - Refresh token check:', {
      hasBodyToken: !!req.body.refreshToken,
      hasCookieToken: !!req.cookies.refreshToken,
      tokenExists: !!refreshToken,
      tokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'none'
    });

    if (!refreshToken) {
      console.log('❌ Middleware - No refresh token found');
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.'
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    console.log('🔍 Middleware - Token decoded successfully, userId:', decoded.userId);
    
    const user = await User.findOne({ 
      _id: decoded.userId,
      refreshToken: refreshToken
    });

    if (!user) {
      console.log('❌ Middleware - User not found or refresh token mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.'
      });
    }
    
    console.log('✅ Middleware - Refresh token validation successful');

    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified
    };
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    console.log('❌ Middleware - Refresh token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token.'
    });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId).select(
        'email username firstName lastName role isActive isEmailVerified'
      );

      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified
        };
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  
  next();
};

module.exports = {
  verifyToken,
  verifyRefreshToken,
  requireAdmin,
  optionalAuth
}; 