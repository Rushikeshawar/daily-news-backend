// ===============================================
// routes/notifications.js
// ===============================================
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const notificationsController = require('../controllers/notificationsController');

const router = express.Router();

// User Notification Routes
router.get('/', authenticate, genericValidation.pagination, notificationsController.getNotifications);
router.put('/:id/read', authenticate, genericValidation.id, notificationsController.markAsRead);
router.put('/read-all', authenticate, notificationsController.markAllAsRead);
router.delete('/:id', authenticate, genericValidation.id, notificationsController.deleteNotification);
router.delete('/', authenticate, notificationsController.clearAllNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);

// Admin Notification Management Routes
router.post('/', authenticate, authorize('ADMIN', 'AD_MANAGER'), notificationsController.createNotification);
router.get('/stats', authenticate, authorize('ADMIN', 'AD_MANAGER'), notificationsController.getNotificationStats);

module.exports = router;