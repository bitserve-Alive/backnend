const express = require('express');
// const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { verifyToken, verifyRefreshToken } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting for auth endpoints - COMMENTED OUT FOR DEVELOPMENT
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many authentication attempts, please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false
// });

// const passwordResetLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // limit each IP to 3 password reset requests per hour
//   message: {
//     success: false,
//     message: 'Too many password reset attempts, please try again later.'
//   }
// });

// Public routes - removed rate limiters
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh-token', verifyRefreshToken, authController.refreshToken);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// Protected routes (require authentication)
router.post('/logout', verifyToken, authController.logout);
router.post('/change-password', verifyToken, validateChangePassword, authController.changePassword);
router.get('/profile', verifyToken, authController.getProfile);
router.post('/register-push-token', verifyToken, authController.registerPushToken);

module.exports = router; 