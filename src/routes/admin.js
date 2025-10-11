// routes/admin.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const adminController = require('../controllers/adminController');

const router = express.Router();

// System Settings Routes
router.get('/settings', authenticate, authorize('ADMIN'), adminController.getSettings);
router.put('/settings/:key', authenticate, authorize('ADMIN'), adminController.updateSetting);

// Platform Statistics Routes
router.get('/stats', authenticate, authorize('ADMIN'), adminController.getStats);

// System Health Routes
router.get('/health', authenticate, authorize('ADMIN'), adminController.getHealth);

// Audit Logs Routes
router.get('/logs', authenticate, authorize('ADMIN'), genericValidation.pagination, adminController.getLogs);

// System Maintenance Routes
router.post('/cleanup/tokens', authenticate, authorize('ADMIN'), adminController.cleanupTokens);

// User Management Routes
router.post('/users/bulk', authenticate, authorize('ADMIN'), adminController.bulkUserManagement);

// System Backup Routes
router.post('/backup', authenticate, authorize('ADMIN'), adminController.createBackup);

// Content Moderation Routes
router.get('/moderation', authenticate, authorize('ADMIN'), genericValidation.pagination, adminController.getModerationQueue);

// System Reports Routes
router.post('/reports', authenticate, authorize('ADMIN'), adminController.generateReport);

module.exports = router;