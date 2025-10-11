// ===============================================
// routes/favorites.js
// ===============================================
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const favoritesController = require('../controllers/favoritesController');

const router = express.Router();

// Favorites Routes
router.get('/', authenticate, genericValidation.pagination, favoritesController.getFavorites);
router.post('/:articleId', authenticate, favoritesController.addFavorite);
router.delete('/:articleId', authenticate, favoritesController.removeFavorite);
router.get('/:articleId/status', authenticate, favoritesController.checkFavoriteStatus);
router.get('/stats', authenticate, favoritesController.getFavoritesStats);

module.exports = router;