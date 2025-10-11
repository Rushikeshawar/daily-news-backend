// routes/analytics.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// Analytics Routes (AD_MANAGER, ADMIN)
router.get('/overview', authenticate, authorize('AD_MANAGER', 'ADMIN'), analyticsController.getOverview);
router.get('/content', authenticate, authorize('AD_MANAGER', 'ADMIN'), analyticsController.getContentAnalytics);
router.get('/users', authenticate, authorize('ADMIN'), analyticsController.getUserAnalytics);
router.get('/engagement', authenticate, authorize('AD_MANAGER', 'ADMIN'), analyticsController.getEngagementAnalytics);
router.get('/realtime', authenticate, authorize('AD_MANAGER', 'ADMIN'), analyticsController.getRealtimeAnalytics);

// Dashboard Analytics (All authenticated users)
router.get('/dashboard', authenticate, analyticsController.getDashboardAnalytics);

// Export Analytics (ADMIN)
router.get('/export', authenticate, authorize('ADMIN'), analyticsController.exportAnalytics);

module.exports = router;