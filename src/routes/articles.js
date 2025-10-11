// routes/articles.js - FIXED VERSION
const express = require('express');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { articleValidation, genericValidation } = require('../middleware/validation');
const articlesController = require('../controllers/articlesController');

const router = express.Router();

// ==================== PUBLIC ARTICLE ROUTES ====================

// @desc    Get all published articles
// @route   GET /api/articles
// @access  Public
// @query   page, limit, category, sortBy, order, featured, includeTimeSaver
router.get('/', optionalAuth, articlesController.getAllArticles);

// @desc    Get trending articles
// @route   GET /api/articles/trending/list
// @access  Public
router.get('/trending/list', articlesController.getTrendingArticles);

// ==================== APPROVAL WORKFLOW ROUTES (MOVED BEFORE :identifier) ====================

// @desc    Get pending articles for approval
// @route   GET /api/articles/pending/approval
// @access  Private (AD_MANAGER, ADMIN)
router.get(
  '/pending/approval',
  authenticate,
  authorize('AD_MANAGER', 'ADMIN'),
  articlesController.getPendingArticles
);

// ==================== AUTHOR-SPECIFIC ROUTES ====================

// @desc    Get articles by author
// @route   GET /api/articles/author/:authorId
// @access  Private (Author, AD_MANAGER, ADMIN)
router.get('/author/:authorId', authenticate, articlesController.getArticlesByAuthor);

// ==================== DYNAMIC ROUTES (MUST BE AFTER STATIC ROUTES) ====================

// @desc    Get article by ID or slug
// @route   GET /api/articles/:identifier
// @access  Public
// @query   trackView, includeTimeSaver
router.get('/:identifier', optionalAuth, articlesController.getArticleById);

// @desc    Get TimeSaver content linked to a specific article
// @route   GET /api/articles/:id/timesavers
// @access  Public
router.get('/:id/timesavers', genericValidation.id, articlesController.getArticleTimeSavers);

// @desc    Get article approval history
// @route   GET /api/articles/:id/approval-history
// @access  Private (Author, AD_MANAGER, ADMIN)
router.get(
  '/:id/approval-history',
  authenticate,
  genericValidation.id,
  articlesController.getApprovalHistory
);

// ==================== ARTICLE INTERACTION ROUTES ====================

// @desc    Update article share count
// @route   POST /api/articles/:id/share
// @access  Public
router.post('/:id/share', genericValidation.id, articlesController.updateShareCount);

// @desc    Track article view
// @route   POST /api/articles/:id/view
// @access  Public
router.post('/:id/view', optionalAuth, genericValidation.id, articlesController.trackArticleView);

// @desc    Approve/Reject article
// @route   POST /api/articles/:id/approval
// @access  Private (AD_MANAGER, ADMIN)
router.post(
  '/:id/approval',
  authenticate,
  authorize('AD_MANAGER', 'ADMIN'),
  genericValidation.id,
  articleValidation.approval,
  articlesController.approveRejectArticle
);

// ==================== PRIVATE ARTICLE MANAGEMENT ROUTES ====================

// @desc    Create new article
// @route   POST /api/articles
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.post(
  '/',
  authenticate,
  authorize('EDITOR', 'AD_MANAGER', 'ADMIN'),
  articleValidation.create,
  articlesController.createArticle
);

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private (Author, AD_MANAGER, ADMIN)
router.put(
  '/:id',
  authenticate,
  genericValidation.id,
  articleValidation.update,
  articlesController.updateArticle
);

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private (Author, AD_MANAGER, ADMIN)
router.delete(
  '/:id',
  authenticate,
  genericValidation.id,
  articlesController.deleteArticle
);

module.exports = router;