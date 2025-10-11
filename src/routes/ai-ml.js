// routes/ai-ml.js - ENHANCED VERSION
const express = require('express');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const aiMlController = require('../controllers/aiMlController');

const router = express.Router();

// ==================== PUBLIC AI/ML ROUTES ====================

// @desc    Get AI/ML news articles
// @route   GET /api/ai-ml/news
// @access  Public
// @query   page, limit, category, sortBy, order, includeTimeSaver
router.get('/news', optionalAuth, aiMlController.getAiMlNews);

// @desc    Get single AI/ML article by ID
// @route   GET /api/ai-ml/news/:id
// @access  Public
// @query   trackView, includeTimeSaver
router.get('/news/:id', optionalAuth, genericValidation.id, aiMlController.getAiMlArticleById);

// @desc    Get TimeSaver content linked to a specific AI article
// @route   GET /api/ai-ml/news/:id/timesavers
// @access  Public
router.get('/news/:id/timesavers', genericValidation.id, aiMlController.getAiArticleTimeSavers);

// @desc    Get trending AI/ML news
// @route   GET /api/ai-ml/trending
// @access  Public
// @query   limit, timeframe (24h, 7d, 30d)
router.get('/trending', aiMlController.getTrendingAiMl);

// @desc    Search AI/ML content
// @route   GET /api/ai-ml/search
// @access  Public
// @query   q (query), page, limit, category, sortBy, order
router.get('/search', aiMlController.searchAiMlContent);

// @desc    Get AI/ML categories
// @route   GET /api/ai-ml/categories
// @access  Public
router.get('/categories', aiMlController.getAiMlCategories);

// @desc    Get articles by specific AI category
// @route   GET /api/ai-ml/category/:category
// @access  Public
// @query   page, limit, sortBy, order
router.get('/category/:category', aiMlController.getArticlesByCategory);

// @desc    Get popular AI topics/keywords
// @route   GET /api/ai-ml/topics/popular
// @access  Public
// @query   limit
router.get('/topics/popular', aiMlController.getPopularTopics);

// ==================== AI/ML INTERACTION ROUTES ====================

// @desc    Track AI article view
// @route   POST /api/ai-ml/news/:id/view
// @access  Public
router.post('/news/:id/view', optionalAuth, genericValidation.id, aiMlController.trackAiArticleView);

// @desc    Track AI article interaction
// @route   POST /api/ai-ml/news/:id/interaction
// @access  Public
// @body    { interactionType: 'SHARE'|'BOOKMARK'|'LIKE'|'COMMENT'|'DOWNLOAD' }
router.post('/news/:id/interaction', optionalAuth, genericValidation.id, aiMlController.trackAiArticleInteraction);

// ==================== PRIVATE AI/ML MANAGEMENT ROUTES ====================

// @desc    Create AI/ML article
// @route   POST /api/ai-ml/news
// @access  Private (EDITOR, AD_MANAGER)
router.post(
  '/news',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  aiMlController.createAiMlArticle
);

// @desc    Update AI/ML article
// @route   PUT /api/ai-ml/news/:id
// @access  Private (EDITOR, AD_MANAGER)
router.put(
  '/news/:id',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  genericValidation.id,
  aiMlController.updateAiMlArticle
);

// @desc    Delete AI/ML article
// @route   DELETE /api/ai-ml/news/:id
// @access  Private (EDITOR, AD_MANAGER)
router.delete(
  '/news/:id',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER'),
  genericValidation.id,
  aiMlController.deleteAiMlArticle
);

// ==================== AI/ML ANALYTICS ROUTES ====================

// @desc    Get AI insights and analytics
// @route   GET /api/ai-ml/insights
// @access  Private (AD_MANAGER, ADMIN)
// @query   timeframe (7d, 30d, 90d)
router.get(
  '/insights',
  authenticate,
  authorize('AD_MANAGER', 'ADMIN'),
  aiMlController.getAiInsights
);

module.exports = router;