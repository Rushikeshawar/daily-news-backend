// routes/time-saver.js
const express = require('express');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const TimeSaverController = require('../controllers/timeSaverController');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// @desc    Get time saver content with enhanced filtering and categorization
// @route   GET /api/time-saver/content
// @access  Public
router.get('/content', optionalAuth, genericValidation.pagination, TimeSaverController.getContent);

// @desc    Get single TimeSaver content by ID with full linked article details
// @route   GET /api/time-saver/content/:id
// @access  Public
router.get('/content/:id', optionalAuth, genericValidation.id, TimeSaverController.getContentById);

// @desc    Get all TimeSaver content linked to a specific article
// @route   GET /api/time-saver/by-article/:articleId
// @access  Public
// @query   type=news|ai (default: news)
router.get('/by-article/:articleId', optionalAuth, TimeSaverController.getContentByArticle);

// @desc    Get enhanced quick stats for dashboard with category counts
// @route   GET /api/time-saver/stats
// @access  Public
router.get('/stats', TimeSaverController.getStats);

// @desc    Get content by specific category group
// @route   GET /api/time-saver/category/:group
// @access  Public
router.get('/category/:group', optionalAuth, genericValidation.pagination, TimeSaverController.getCategoryContent);

// @desc    Track time saver content view
// @route   POST /api/time-saver/content/:id/view
// @access  Public
router.post('/content/:id/view', optionalAuth, genericValidation.id, TimeSaverController.trackView);

// @desc    Track time saver content interaction
// @route   POST /api/time-saver/content/:id/interaction
// @access  Public
router.post('/content/:id/interaction', optionalAuth, genericValidation.id, TimeSaverController.trackInteraction);

// ==================== PRIVATE ROUTES (EDITOR, AD_MANAGER) ====================

// @desc    Create enhanced time saver content
// @route   POST /api/time-saver/content
// @access  Private (EDITOR, AD_MANAGER)
router.post(
  '/content',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  TimeSaverController.createContent
);

// @desc    Update time saver content
// @route   PUT /api/time-saver/content/:id
// @access  Private (EDITOR, AD_MANAGER)
router.put(
  '/content/:id',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  genericValidation.id,
  TimeSaverController.updateContent
);

// @desc    Delete time saver content
// @route   DELETE /api/time-saver/content/:id
// @access  Private (EDITOR, AD_MANAGER)
router.delete(
  '/content/:id',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  genericValidation.id,
  TimeSaverController.deleteContent
);

// @desc    Link existing TimeSaver content to an article
// @route   POST /api/time-saver/content/:id/link
// @access  Private (EDITOR, AD_MANAGER)
// @body    { articleId: string, articleType: 'news'|'ai' }
router.post(
  '/content/:id/link',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  genericValidation.id,
  TimeSaverController.linkToArticle
);

// @desc    Unlink TimeSaver content from article
// @route   POST /api/time-saver/content/:id/unlink
// @access  Private (EDITOR, AD_MANAGER)
// @body    { articleType: 'news'|'ai' }
router.post(
  '/content/:id/unlink',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  genericValidation.id,
  TimeSaverController.unlinkFromArticle
);

// @desc    Bulk create sample content for testing categories
// @route   POST /api/time-saver/seed-sample-data
// @access  Private (EDITOR, AD_MANAGER)
router.post(
  '/seed-sample-data',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  TimeSaverController.seedSampleData
);

// ==================== ANALYTICS ROUTES (AD_MANAGER, ADMIN) ====================

// @desc    Get analytics
// @route   GET /api/time-saver/analytics
// @access  Private (AD_MANAGER, ADMIN)
router.get(
  '/analytics',
  authenticate,
  authorize('AD_MANAGER', 'ADMIN'),
  TimeSaverController.getAnalytics
);

module.exports = router;