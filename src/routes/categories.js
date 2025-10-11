// routes/categories.js
const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const categoriesController = require('../controllers/categoriesController');

const router = express.Router();

// Public Categories Routes
router.get('/', optionalAuth, categoriesController.getAllCategories);
router.get('/trending', categoriesController.getTrendingCategories);
router.get('/:category/articles', optionalAuth, genericValidation.pagination, categoriesController.getArticlesByCategory);
router.get('/:category/stats', categoriesController.getCategoryStats);

// Category Comparison Routes
router.post('/compare', categoriesController.compareCategories);

module.exports = router;