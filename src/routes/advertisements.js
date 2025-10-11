// routes/advertisements.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { advertisementValidation, genericValidation } = require('../middleware/validation');
const advertisementController = require('../controllers/advertisementController');

const router = express.Router();

// Public Advertisement Routes
router.get('/active', advertisementController.getActiveAds);
router.get('/position/:position', advertisementController.getAdsByPosition);
router.post('/:id/click', genericValidation.id, advertisementController.trackAdClick);

// Private Advertisement Management Routes
router.get('/', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.pagination, advertisementController.getAllAds);
router.get('/:id', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, advertisementController.getAdById);
router.post('/', authenticate, authorize('AD_MANAGER', 'ADMIN'), advertisementValidation.create, advertisementController.createAd);
router.put('/:id', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, advertisementValidation.update, advertisementController.updateAd);
router.delete('/:id', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, advertisementController.deleteAd);

// Advertisement Status Management Routes
router.patch('/:id/toggle', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, advertisementController.toggleAdStatus);
router.patch('/bulk/status', authenticate, authorize('AD_MANAGER', 'ADMIN'), advertisementController.bulkUpdateAdStatus);

// Advertisement Analytics Routes
router.get('/:id/analytics', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, advertisementController.getAdAnalytics);
router.get('/performance/summary', authenticate, authorize('AD_MANAGER', 'ADMIN'), advertisementController.getPerformanceSummary);

module.exports = router;