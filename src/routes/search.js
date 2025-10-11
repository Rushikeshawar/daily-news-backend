
// ===============================================
// routes/search.js
// ===============================================
const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { searchValidation } = require('../middleware/validation');
const searchController = require('../controllers/searchController');

const router = express.Router();

// Public Search Routes
router.get('/', optionalAuth, searchValidation.search, searchController.searchArticles);
router.get('/suggestions', searchController.getSearchSuggestions);
router.get('/popular', searchController.getPopularSearchTerms);

// User Search History Routes
router.get('/history', optionalAuth, searchController.getUserSearchHistory);
router.delete('/history', optionalAuth, searchController.clearSearchHistory);

// Advanced Search Routes
router.post('/advanced', optionalAuth, searchController.advancedSearch);

// Admin Search Analytics Routes
router.get('/analytics', optionalAuth, searchController.getSearchAnalytics);

module.exports = router;