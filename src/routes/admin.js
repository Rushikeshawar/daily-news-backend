 
const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private (ADMIN)
router.get('/settings', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { category } = req.query;

    const where = category ? { category } : {};

    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      const cat = setting.category || 'general';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push({
        key: setting.key,
        value: setting.value,
        type: setting.type
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: { settings: groupedSettings }
    });
  } catch (error) {
    logger.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings'
    });
  }
});

// @desc    Update system setting
// @route   PUT /api/admin/settings/:key
// @access  Private (ADMIN)
router.put('/settings/:key', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type = 'string', category = 'general' } = req.body;

    if (!value && value !== '') {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value, type, category },
      create: { key, value, type, category }
    });

    logger.info(`System setting updated: ${key} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: { setting }
    });
  } catch (error) {
    logger.error('Update system setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
});

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private (ADMIN)
router.get('/stats', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const [
      userStats,
      articleStats,
      engagementStats,
      systemStats
    ] = await Promise.all([
      // User statistics
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'USER' THEN 1 ELSE 0 END) as regular_users,
          SUM(CASE WHEN role = 'EDITOR' THEN 1 ELSE 0 END) as editors,
          SUM(CASE WHEN role = 'AD_MANAGER' THEN 1 ELSE 0 END) as ad_managers,
          SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as new_today,
          SUM(CASE WHEN DATE(last_login) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as active_week
        FROM users
      `,

      // Article statistics
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_articles,
          SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) as published,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as drafts,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as created_today,
          SUM(CASE WHEN DATE(published_at) = CURDATE() THEN 1 ELSE 0 END) as published_today
        FROM news_articles
      `,

      // Engagement statistics
      prisma.$queryRaw`
        SELECT 
          SUM(view_count) as total_views,
          SUM(share_count) as total_shares,
          AVG(view_count) as avg_views_per_article,
          (SELECT COUNT(*) FROM user_favorites) as total_favorites,
          (SELECT COUNT(*) FROM search_history WHERE DATE(created_at) = CURDATE()) as searches_today,
          (SELECT COUNT(*) FROM reading_history WHERE DATE(updated_at) = CURDATE()) as reading_sessions_today
        FROM news_articles WHERE status = 'PUBLISHED'
      `,

      // System statistics
      prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*) FROM advertisements WHERE is_active = true) as active_ads,
          (SELECT SUM(impressions) FROM advertisements) as total_impressions,
          (SELECT SUM(click_count) FROM advertisements) as total_clicks,
          (SELECT COUNT(*) FROM refresh_tokens) as active_sessions
      `
    ]);

    const stats = {
      users: userStats[0],
      articles: articleStats[0],
      engagement: engagementStats[0],
      system: systemStats[0],
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get platform statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform statistics'
    });
  }
});

// @desc    Get system health check
// @route   GET /api/admin/health
// @access  Private (ADMIN)
router.get('/health', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const healthChecks = {
      database: { status: 'healthy', responseTime: 0 },
      server: { status: 'healthy', uptime: process.uptime() },
      memory: {
        status: 'healthy',
        usage: process.memoryUsage(),
        free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024)
      }
    };

    // Test database connection
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthChecks.database.responseTime = Date.now() - dbStart;
    } catch (dbError) {
      healthChecks.database.status = 'unhealthy';
      healthChecks.database.error = dbError.message;
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      healthChecks.memory.status = 'warning';
    }

    const overallStatus = Object.values(healthChecks).every(check => check.status === 'healthy') 
      ? 'healthy' : 'degraded';

    res.json({
      success: true,
      data: {
        status: overallStatus,
        checks: healthChecks,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      data: {
        status: 'unhealthy',
        error: error.message
      }
    });
  }
});

// @desc    Get audit logs
// @route   GET /api/admin/logs
// @access  Private (ADMIN)
router.get('/logs', authenticate, authorize('ADMIN'), genericValidation.pagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, level = 'info', timeframe = '7d' } = req.query;

    // This is a simplified implementation
    // In a real system, you'd read from log files or a dedicated logging service
    
    const logs = {
      entries: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'System health check completed',
          source: 'admin'
        }
      ],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount: 1,
        totalPages: 1
      }
    };

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// @desc    Cleanup expired tokens
// @route   POST /api/admin/cleanup/tokens
// @access  Private (ADMIN)
router.post('/cleanup/tokens', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const expiredTokens = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    logger.info(`Cleanup completed: ${expiredTokens.count} expired tokens removed by ${req.user.email}`);

    res.json({
      success: true,
      message: `Cleaned up ${expiredTokens.count} expired tokens`
    });
  } catch (error) {
    logger.error('Token cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired tokens'
    });
  }
});

// @desc    Bulk user management
// @route   POST /api/admin/users/bulk
// @access  Private (ADMIN)
router.post('/users/bulk', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userIds, action, data } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs'
      });
    }

    if (userIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 100 users at once'
      });
    }

    let result = { success: 0, failed: 0 };

    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        });
        break;
      
      case 'deactivate':
        // Prevent admin from deactivating themselves
        const filteredIds = userIds.filter(id => id !== req.user.id);
        result = await prisma.user.updateMany({
          where: { id: { in: filteredIds } },
          data: { isActive: false }
        });
        break;
      
      case 'update_role':
        if (!data.role || !['USER', 'EDITOR', 'AD_MANAGER', 'ADMIN'].includes(data.role)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role specified'
          });
        }
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: data.role }
        });
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action specified'
        });
    }

    logger.info(`Bulk user ${action}: ${result.count} users affected by ${req.user.email}`);

    res.json({
      success: true,
      message: `Successfully ${action.replace('_', ' ')}d ${result.count} users`,
      data: { updatedCount: result.count }
    });
  } catch (error) {
    logger.error('Bulk user management error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk user operation'
    });
  }
});

// @desc    System backup trigger
// @route   POST /api/admin/backup
// @access  Private (ADMIN)
router.post('/backup', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { type = 'full' } = req.body;

    // In a real implementation, you would:
    // 1. Create database backup
    // 2. Backup uploaded files
    // 3. Store backup metadata
    
    const backupId = `backup_${Date.now()}`;
    
    // Simulated backup process
    logger.info(`Backup initiated: ${backupId} (${type}) by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Backup initiated successfully',
      data: {
        backupId,
        type,
        status: 'in_progress',
        startedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Backup initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate backup'
    });
  }
});

// @desc    Content moderation queue
// @route   GET /api/admin/moderation
// @access  Private (ADMIN)
router.get('/moderation', authenticate, authorize('ADMIN'), genericValidation.pagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'articles' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let moderationItems = [];
    let totalCount = 0;

    switch (type) {
      case 'articles':
        [moderationItems, totalCount] = await Promise.all([
          prisma.newsArticle.findMany({
            where: {
              OR: [
                { status: 'PENDING' },
                { status: 'REJECTED' }
              ]
            },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              headline: true,
              category: true,
              status: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              },
              approvalHistory: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  action: true,
                  comments: true,
                  createdAt: true,
                  approver: {
                    select: {
                      fullName: true
                    }
                  }
                }
              }
            }
          }),
          prisma.newsArticle.count({
            where: {
              OR: [
                { status: 'PENDING' },
                { status: 'REJECTED' }
              ]
            }
          })
        ]);
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid moderation type'
        });
    }

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        type,
        items: moderationItems,
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
    logger.error('Get moderation queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch moderation queue'
    });
  }
});

// @desc    Generate system report
// @route   POST /api/admin/reports
// @access  Private (ADMIN)
router.post('/reports', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { type, timeframe = '30d', format = 'json' } = req.body;

    const validTypes = ['users', 'content', 'engagement', 'system'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
    }

    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Generate report based on type
    let reportData = {};
    
    switch (type) {
      case 'users':
        reportData = await generateUserReport(fromDate);
        break;
      case 'content':
        reportData = await generateContentReport(fromDate);
        break;
      case 'engagement':
        reportData = await generateEngagementReport(fromDate);
        break;
      case 'system':
        reportData = await generateSystemReport(fromDate);
        break;
    }

    const report = {
      id: `report_${Date.now()}`,
      type,
      timeframe,
      generatedAt: new Date(),
      generatedBy: {
        id: req.user.id,
        name: req.user.fullName,
        email: req.user.email
      },
      dateRange: {
        from: fromDate,
        to: new Date()
      },
      data: reportData
    };

    logger.info(`System report generated: ${type} by ${req.user.email}`);

    if (format === 'json') {
      res.json({
        success: true,
        data: { report }
      });
    } else {
      // For other formats, you could generate PDF, CSV, etc.
      res.json({
        success: true,
        message: 'Report generated successfully',
        data: { reportId: report.id }
      });
    }
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// Helper functions for report generation
async function generateUserReport(fromDate) {
  const userStats = await prisma.user.groupBy({
    by: ['role'],
    where: { createdAt: { gte: fromDate } },
    _count: { id: true }
  });

  return {
    newUsers: userStats,
    summary: 'User registration and activity report'
  };
}

async function generateContentReport(fromDate) {
  const contentStats = await prisma.newsArticle.groupBy({
    by: ['category', 'status'],
    where: { createdAt: { gte: fromDate } },
    _count: { id: true }
  });

  return {
    contentByCategory: contentStats,
    summary: 'Content creation and publishing report'
  };
}

async function generateEngagementReport(fromDate) {
  const engagementStats = await prisma.newsArticle.aggregate({
    where: { publishedAt: { gte: fromDate } },
    _sum: { viewCount: true, shareCount: true },
    _avg: { viewCount: true, shareCount: true }
  });

  return {
    engagement: engagementStats,
    summary: 'User engagement and interaction report'
  };
}

async function generateSystemReport(fromDate) {
  const systemStats = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date()
  };

  return {
    system: systemStats,
    summary: 'System performance and health report'
  };
}

module.exports = router;