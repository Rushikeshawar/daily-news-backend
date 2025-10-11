// controllers/notificationsController.js
const prisma = require('../config/database');
const logger = require('../utils/logger');

const notificationsController = {
  // Get user notifications
  getNotifications: async (req, res) => {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = { userId: req.user.id };
      if (unreadOnly === 'true') where.isRead = false;
      if (type) where.type = type;

      const [notifications, totalCount, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            data: true,
            isRead: true,
            createdAt: true
          }
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId: req.user.id, isRead: false }
        })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount,
          pagination: {
            page: parseInt(page),
            limit: take,
            totalPages,
            totalCount,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  },

  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
        select: { userId: true, isRead: true }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (notification.isRead) {
        return res.json({
          success: true,
          message: 'Notification already marked as read'
        });
      }

      await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date() }
      });

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (req, res) => {
    try {
      const result = await prisma.notification.updateMany({
        where: { 
          userId: req.user.id,
          isRead: false 
        },
        data: { isRead: true, readAt: new Date() }
      });

      res.json({
        success: true,
        message: `${result.count} notifications marked as read`
      });
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
  },

  // Delete notification
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await prisma.notification.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  },

  // Clear all notifications
  clearAllNotifications: async (req, res) => {
    try {
      const { confirm, olderThan } = req.body;

      if (!confirm) {
        return res.status(400).json({
          success: false,
          message: 'Please confirm that you want to clear notifications by sending { "confirm": true }'
        });
      }

      const where = { userId: req.user.id };
      
      // If olderThan is specified, only delete notifications older than X days
      if (olderThan) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
        where.createdAt = { lt: cutoffDate };
      }

      const result = await prisma.notification.deleteMany({ where });

      logger.info(`${result.count} notifications cleared for user: ${req.user.email}`);

      res.json({
        success: true,
        message: `${result.count} notifications cleared successfully`
      });
    } catch (error) {
      logger.error('Clear notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear notifications'
      });
    }
  },

  // Create notification (Admin/System use)
  createNotification: async (req, res) => {
    try {
      const { 
        userId, 
        userIds, 
        role, 
        type, 
        title, 
        message, 
        data = {},
        broadcast = false 
      } = req.body;

      if (!type || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Type, title, and message are required'
        });
      }

      const validTypes = [
        'ARTICLE_APPROVED',
        'ARTICLE_REJECTED',
        'ARTICLE_PUBLISHED',
        'ARTICLE_CHANGES_REQUESTED',
        'SYSTEM_ANNOUNCEMENT',
        'ACCOUNT_UPDATE',
        'PROMOTIONAL',
        'SECURITY_ALERT'
      ];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
      }

      let targetUsers = [];

      if (broadcast) {
        // Send to all users or users with specific role
        const where = role ? { role } : {};
        targetUsers = await prisma.user.findMany({
          where: { ...where, isActive: true },
          select: { id: true }
        });
      } else if (userIds && Array.isArray(userIds)) {
        // Send to specific users
        targetUsers = userIds.map(id => ({ id }));
      } else if (userId) {
        // Send to single user
        targetUsers = [{ id: userId }];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Please specify userId, userIds array, or set broadcast to true'
        });
      }

      // Create notifications for all target users
      const notificationData = targetUsers.map(user => ({
        userId: user.id,
        type,
        title,
        message,
        data,
        createdBy: req.user.id
      }));

      await prisma.notification.createMany({
        data: notificationData
      });

      logger.info(`${notificationData.length} notifications created by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: `${notificationData.length} notifications sent successfully`,
        data: { count: notificationData.length }
      });
    } catch (error) {
      logger.error('Create notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notifications'
      });
    }
  },

  // Get notification statistics (Admin/AD_Manager)
  getNotificationStats: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;

      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        notificationsTrends,
        topRecipients
      ] = await Promise.all([
        // Total notifications sent
        prisma.notification.count({
          where: { createdAt: { gte: fromDate } }
        }),

        // Unread notifications
        prisma.notification.count({
          where: { 
            createdAt: { gte: fromDate },
            isRead: false 
          }
        }),

        // Notifications by type
        prisma.notification.groupBy({
          by: ['type'],
          where: { createdAt: { gte: fromDate } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        }),

        // Daily notification trends
        prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as notifications_sent,
            COUNT(CASE WHEN is_read = true THEN 1 END) as notifications_read
          FROM notifications 
          WHERE created_at >= ${fromDate}
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `,

        // Top notification recipients
        prisma.notification.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: fromDate } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        })
      ]);

      // Get user details for top recipients
      const userIds = topRecipients.map(item => item.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true, role: true }
      });

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      const recipientsWithDetails = topRecipients.map(item => ({
        user: userMap[item.userId],
        notificationCount: item._count.id
      }));

      const stats = {
        overview: {
          totalSent: totalNotifications,
          totalUnread: unreadNotifications,
          readRate: totalNotifications > 0 ? ((totalNotifications - unreadNotifications) / totalNotifications * 100).toFixed(2) : 0
        },
        byType: notificationsByType.map(item => ({
          type: item.type,
          count: item._count.id
        })),
        trends: notificationsTrends,
        topRecipients: recipientsWithDetails,
        timeframe: {
          period: timeframe,
          fromDate,
          toDate: new Date()
        }
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification statistics'
      });
    }
  },

  // Get unread count for current user
  getUnreadCount: async (req, res) => {
    try {
      const unreadCount = await prisma.notification.count({
        where: { 
          userId: req.user.id,
          isRead: false 
        }
      });

      res.json({
        success: true,
        data: { unreadCount }
      });
    } catch (error) {
      logger.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count'
      });
    }
  }
};

module.exports = notificationsController;

