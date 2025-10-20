const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const categoriesController = require('../controllers/categoriesController');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// Get all categories
router.get('/', optionalAuth, categoriesController.getAllCategories);

// Get single category
router.get('/:id', optionalAuth, categoriesController.getCategoryById);

// Get articles by category
router.get('/:id/articles', optionalAuth, categoriesController.getArticlesByCategory);

// Get category stats
router.get('/:id/stats', categoriesController.getCategoryStats);

// ==================== ADMIN ROUTES ====================
// Create category
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'AD_MANAGER'),
  categoriesController.createCategory
);

// Update category
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'AD_MANAGER'),
  categoriesController.updateCategory
);

// Delete category
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  categoriesController.deleteCategory
);

// Toggle category status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('ADMIN', 'AD_MANAGER'),
  categoriesController.toggleCategoryStatus
);

module.exports = router;