const prisma = require('../config/database');
const logger = require('./logger');

// Notification Types
const NOTIFICATION_TYPES = {
  ARTICLE_APPROVED: 'ARTICLE_APPROVED',
  ARTICLE_REJECTED: 'ARTICLE_REJECTED',
  ARTICLE_PUBLISHED: 'ARTICLE_PUBLISHED',
  ARTICLE_CHANGES_REQUESTED: 'ARTICLE_CHANGES_REQUESTED',
  ARTICLE_SUBMITTED: 'ARTICLE_SUBMITTED',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  ACCOUNT_UPDATE: 'ACCOUNT_UPDATE',
  PROMOTIONAL: 'PROMOTIONAL',
  SECURITY_ALERT: 'SECURITY_ALERT',
  WELCOME: 'WELCOME',
  AD_CAMPAIGN_STATUS: 'AD_CAMPAIGN_STATUS',
  COMMENT_REPLY: 'COMMENT_REPLY',
  MILESTONE_ACHIEVED: 'MILESTONE_ACHIEVED'
};

/**
 * Create a notification for a user or multiple users
 * @param {Object} params - Notification parameters
 * @param {string|Array} params.userId - User ID or array of user IDs
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {Object} params.data - Additional data (optional)
 * @param {string} params.createdBy - ID of user who created the notification (optional)
 * @returns {Promise} - Created notification(s)
 */
async function createNotification({
  userId,
  userIds,
  type,
  title,
  message,
  data = {},
  createdBy = null
}) {
  try {
    // Validate notification type
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    let targetUserIds = [];

    if (userId) {
      targetUserIds = [userId];
    } else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else {
      throw new Error('Either userId or userIds array must be provided');
    }

    // Validate users exist and are active
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: targetUserIds },
        isActive: true
      },
      select: { id: true }
    });

    const validUserIds = validUsers.map(user => user.id);

    if (validUserIds.length === 0) {
      logger.warn('No valid users found for notification creation');
      return null;
    }

    // Create notifications for all valid users
    const notificationData = validUserIds.map(userId => ({
      userId,
      type,
      title,
      message,
      data: typeof data === 'object' ? data : {},
      createdBy
    }));

    const result = await prisma.notification.createMany({
      data: notificationData
    });

    logger.info(`Created ${result.count} notifications of type: ${type}`);
    return result;
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
}

/**
 * Create notification for article approval
 */
async function notifyArticleApproved(articleId, authorId, approvedBy) {
  try {
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { headline: true }
    });

    if (!article) {
      throw new Error('Article not found');
    }

    return await createNotification({
      userId: authorId,
      type: NOTIFICATION_TYPES.ARTICLE_APPROVED,
      title: 'Article Approved! 🎉',
      message: `Your article "${article.headline}" has been approved and published.`,
      data: {
        articleId,
        articleTitle: article.headline,
        action: 'approved'
      },
      createdBy: approvedBy
    });
  } catch (error) {
    logger.error('Notify article approved error:', error);
  }
}

/**
 * Create notification for article rejection
 */
async function notifyArticleRejected(articleId, authorId, rejectedBy, comments = '') {
  try {
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { headline: true }
    });

    if (!article) {
      throw new Error('Article not found');
    }

    return await createNotification({
      userId: authorId,
      type: NOTIFICATION_TYPES.ARTICLE_REJECTED,
      title: 'Article Needs Revision',
      message: `Your article "${article.headline}" requires changes before publication.`,
      data: {
        articleId,
        articleTitle: article.headline,
        action: 'rejected',
        comments,
        feedback: comments
      },
      createdBy: rejectedBy
    });
  } catch (error) {
    logger.error('Notify article rejected error:', error);
  }
}

/**
 * Create notification for article submission (to AD_MANAGERS)
 */
async function notifyArticleSubmitted(articleId, authorId) {
  try {
    const [article, adManagers] = await Promise.all([
      prisma.newsArticle.findUnique({
        where: { id: articleId },
        select: { 
          headline: true,
          author: {
            select: { fullName: true }
          }
        }
      }),
      prisma.user.findMany({
        where: { 
          role: { in: ['AD_MANAGER', 'ADMIN'] },
          isActive: true 
        },
        select: { id: true }
      })
    ]);

    if (!article || adManagers.length === 0) {
      return;
    }

    const managerIds = adManagers.map(manager => manager.id);

    return await createNotification({
      userIds: managerIds,
      type: NOTIFICATION_TYPES.ARTICLE_SUBMITTED,
      title: 'New Article Submitted',
      message: `${article.author.fullName} submitted "${article.headline}" for review.`,
      data: {
        articleId,
        articleTitle: article.headline,
        authorName: article.author.fullName,
        action: 'submitted'
      },
      createdBy: authorId
    });
  } catch (error) {
    logger.error('Notify article submitted error:', error);
  }
}

/**
 * Create welcome notification for new users
 */
async function notifyWelcome(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, role: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    let welcomeMessage = `Welcome to Daily News Dashboard, ${user.fullName}! `;
    
    switch (user.role) {
      case 'USER':
        welcomeMessage += 'Start exploring the latest news and save your favorites.';
        break;
      case 'EDITOR':
        welcomeMessage += 'You can now create and submit articles for review.';
        break;
      case 'AD_MANAGER':
        welcomeMessage += 'Manage content approvals and advertisement campaigns.';
        break;
      case 'ADMIN':
        welcomeMessage += 'You have full access to system administration features.';
        break;
    }

    return await createNotification({
      userId,
      type: NOTIFICATION_TYPES.WELCOME,
      title: 'Welcome to Daily News! 👋',
      message: welcomeMessage,
      data: {
        userRole: user.role,
        isWelcome: true
      }
    });
  } catch (error) {
    logger.error('Notify welcome error:', error);
  }
}

/**
 * Create system announcement for all users or specific roles
 */
async function notifySystemAnnouncement({
  title,
  message,
  roles = null,
  data = {},
  createdBy
}) {
  try {
    const where = { isActive: true };
    if (roles && Array.isArray(roles)) {
      where.role = { in: roles };
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true }
    });

    if (users.length === 0) {
      return;
    }

    const userIds = users.map(user => user.id);

    return await createNotification({
      userIds,
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title,
      message,
      data: {
        ...data,
        isAnnouncement: true
      },
      createdBy
    });
  } catch (error) {
    logger.error('Notify system announcement error:', error);
  }
}

/**
 * Create milestone achievement notification
 */
async function notifyMilestoneAchieved(userId, milestone, data = {}) {
  try {
    const milestones = {
      first_article: {
        title: 'First Article Published! 🎉',
        message: 'Congratulations on publishing your first article!'
      },
      article_100_views: {
        title: 'Popular Article! 👀',
        message: 'Your article reached 100 views!'
      },
      article_1000_views: {
        title: 'Viral Content! 🚀',
        message: 'Amazing! Your article hit 1,000 views!'
      },
      editor_promotion: {
        title: 'Role Upgraded! ⭐',
        message: 'You have been promoted to Editor role!'
      },
      reading_streak_7: {
        title: 'Reading Streak! 📚',
        message: 'You\'ve read articles for 7 days straight!'
      },
      reading_streak_30: {
        title: 'Reading Champion! 🏆',
        message: 'Incredible! 30-day reading streak achieved!'
      }
    };

    const milestoneConfig = milestones[milestone];
    if (!milestoneConfig) {
      throw new Error(`Unknown milestone: ${milestone}`);
    }

    return await createNotification({
      userId,
      type: NOTIFICATION_TYPES.MILESTONE_ACHIEVED,
      title: milestoneConfig.title,
      message: milestoneConfig.message,
      data: {
        milestone,
        ...data,
        isMilestone: true
      }
    });
  } catch (error) {
    logger.error('Notify milestone achieved error:', error);
  }
}

/**
 * Create ad campaign status notification
 */
async function notifyAdCampaignStatus(userId, campaignId, status, campaignTitle) {
  try {
    const statusMessages = {
      activated: `Your campaign "${campaignTitle}" is now active and running.`,
      paused: `Your campaign "${campaignTitle}" has been paused.`,
      completed: `Your campaign "${campaignTitle}" has completed successfully.`,
      budget_exhausted: `Your campaign "${campaignTitle}" has exhausted its budget.`,
      low_performance: `Your campaign "${campaignTitle}" may need optimization.`
    };

    const statusTitles = {
      activated: 'Campaign Activated! ✅',
      paused: 'Campaign Paused',
      completed: 'Campaign Completed! 🎯',
      budget_exhausted: 'Budget Exhausted',
      low_performance: 'Performance Alert'
    };

    return await createNotification({
      userId,
      type: NOTIFICATION_TYPES.AD_CAMPAIGN_STATUS,
      title: statusTitles[status] || 'Campaign Update',
      message: statusMessages[status] || `Campaign "${campaignTitle}" status updated.`,
      data: {
        campaignId,
        campaignTitle,
        status,
        isCampaignUpdate: true
      }
    });
  } catch (error) {
    logger.error('Notify ad campaign status error:', error);
  }
}

/**
 * Mark multiple notifications as read
 */
async function markNotificationsAsRead(userId, notificationIds) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    logger.info(`Marked ${result.count} notifications as read for user: ${userId}`);
    return result;
  } catch (error) {
    logger.error('Mark notifications as read error:', error);
    throw error;
  }
}

/**
 * Get unread notification count for user
 */
async function getUnreadCount(userId) {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    return 0;
  }
}

/**
 * Clean up old notifications
 */
async function cleanupOldNotifications(olderThanDays = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true
      }
    });

    logger.info(`Cleaned up ${result.count} old notifications`);
    return result.count;
  } catch (error) {
    logger.error('Cleanup old notifications error:', error);
    throw error;
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  notifyArticleApproved,
  notifyArticleRejected,
  notifyArticleSubmitted,
  notifyWelcome,
  notifySystemAnnouncement,
  notifyMilestoneAchieved,
  notifyAdCampaignStatus,
  markNotificationsAsRead,
  getUnreadCount,
  cleanupOldNotifications
};