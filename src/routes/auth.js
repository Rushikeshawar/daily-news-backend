// routes/auth.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { userValidation } = require('../middleware/validation');
const authController = require('../controllers/authController');

const router = express.Router();

// Public Authentication Routes
router.post('/register', userValidation.register, authController.register);
router.post('/login', userValidation.login, authController.login);
router.post('/refresh', authController.refreshToken);

// Private Authentication Routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/change-password', authenticate, userValidation.changePassword, authController.changePassword);

module.exports = router;