// routes/auth.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { userValidation } = require('../middleware/validation');
const authController = require('../controllers/authController');

const router = express.Router();

// ==========================================
// OTP-BASED REGISTRATION ROUTES
// ==========================================
// Step 1: Request OTP for registration
router.post('/register/request-otp', userValidation.requestOTP, authController.requestOTP);

// Step 2: Verify OTP and complete registration
router.post('/register/verify-otp', userValidation.verifyOTP, authController.verifyOTPAndRegister);

// Resend OTP
router.post('/register/resend-otp', userValidation.resendOTP, authController.resendOTP);

// ==========================================
// PASSWORD RESET WITH OTP
// ==========================================
router.post('/password/request-reset', userValidation.requestPasswordReset, authController.requestPasswordResetOTP);
router.post('/password/verify-otp', userValidation.verifyPasswordResetOTP, authController.verifyPasswordResetOTP);
router.post('/password/reset', userValidation.resetPassword, authController.resetPassword);

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
router.post('/login', userValidation.login, authController.login);
router.post('/refresh', authController.refreshToken);

// ==========================================
// PRIVATE AUTHENTICATION ROUTES
// ==========================================
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/change-password', authenticate, userValidation.changePassword, authController.changePassword);

module.exports = router;