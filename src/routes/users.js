// routes/users.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { userValidation, genericValidation } = require('../middleware/validation');
const UserController = require('../controllers/userController');

const router = express.Router();

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', authenticate, UserController.getProfile);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', authenticate, userValidation.update, UserController.updateProfile);

// @desc    Get user's reading history
// @route   GET /api/users/reading-history
// @access  Private
router.get('/reading-history', authenticate, genericValidation.pagination, UserController.getReadingHistory);

// @desc    Update reading progress
// @route   PUT /api/users/reading-progress/:articleId
// @access  Private
router.put('/reading-progress/:articleId', authenticate, UserController.updateReadingProgress);

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
router.get('/dashboard', authenticate, UserController.getDashboard);

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (ADMIN)
router.get('/', authenticate, authorize('ADMIN'), genericValidation.pagination, UserController.getAllUsers);

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (ADMIN)
router.get('/:id', authenticate, authorize('ADMIN'), genericValidation.id, UserController.getUserById);

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (ADMIN)
router.put('/:id', authenticate, authorize('ADMIN'), genericValidation.id, UserController.updateUser);

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), genericValidation.id, UserController.deleteUser);

// @desc    Get user activity summary
// @route   GET /api/users/:id/activity
// @access  Private (ADMIN or own profile)
router.get('/:id/activity', authenticate, genericValidation.id, UserController.getUserActivity);

module.exports = router;