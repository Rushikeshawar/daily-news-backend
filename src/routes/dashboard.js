const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// Admin Dashboard Routes
router.get('/admin', authenticate, authorize(['ADMIN']), dashboardController.getAdminDashboard);
router.get('/system-stats', authenticate, authorize(['ADMIN']), dashboardController.getSystemStats);

// Analytics Routes
router.get('/analytics', authenticate, dashboardController.getAnalytics);
router.get('/summary', authenticate, dashboardController.getDashboardSummary);

// Role-specific Dashboard Routes
router.get('/ad-manager', authenticate, authorize(['AD_MANAGER', 'ADMIN']), dashboardController.getAdManagerDashboard);
router.get('/editor', authenticate, authorize(['EDITOR', 'AD_MANAGER', 'ADMIN']), dashboardController.getEditorDashboard);
router.get('/user', authenticate, dashboardController.getUserDashboard);

// Content Performance Routes
router.get('/content-performance', authenticate, authorize(['EDITOR', 'AD_MANAGER', 'ADMIN']), dashboardController.getContentPerformance);

// Quick Actions and Notifications
router.get('/quick-actions', authenticate, dashboardController.getQuickActions);
router.get('/notifications', authenticate, dashboardController.getNotifications);

// Revenue Analytics
router.get('/revenue', authenticate, authorize(['AD_MANAGER', 'ADMIN']), dashboardController.getRevenueAnalytics);

module.exports = router;