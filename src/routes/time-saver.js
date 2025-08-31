// Time Saver Routes - /routes/time-saver.js
const express = require('express');
const prisma = require('../config/database');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get time saver content with filtering and pagination
// @route   GET /api/time-saver/content
// @access  Public
router.get('/content', optionalAuth, genericValidation.pagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = 'publishedAt',
      order = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }

    const orderBy = {};
    orderBy[sortBy] = order;

    const [content, totalCount] = await Promise.all([
      prisma.timeSaverContent.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          imageUrl: true,
          iconName: true,
          bgColor: true,
          keyPoints: true,
          sourceUrl: true,
          readTimeSeconds: true,
          viewCount: true,
          isPriority: true,
          contentType: true,
          publishedAt: true
        }
      }),
      prisma.timeSaverContent.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        content,
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
    logger.error('Get time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time saver content'
    });
  }
});

// @desc    Get single time saver content by ID
// @route   GET /api/time-saver/content/:id
// @access  Public
router.get('/content/:id', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    const content = await prisma.timeSaverContent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        summary: true,
        category: true,
        imageUrl: true,
        iconName: true,
        bgColor: true,
        keyPoints: true,
        sourceUrl: true,
        readTimeSeconds: true,
        viewCount: true,
        isPriority: true,
        contentType: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Time saver content not found'
      });
    }

    // Track view
    await Promise.all([
      prisma.timeSaverContent.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      }),
      req.user && prisma.timeSaverView.create({
        data: {
          contentId: id,
          userId: req.user.id
        }
      }).catch(() => {}) // Ignore duplicate errors
    ]);

    content.viewCount += 1;

    res.json({
      success: true,
      data: { content }
    });
  } catch (error) {
    logger.error('Get time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time saver content'
    });
  }
});

// @desc    Get quick stats for dashboard
// @route   GET /api/time-saver/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      storiesCount,
      updatesCount,
      breakingCount,
      recentContent
    ] = await Promise.all([
      // Stories count (digest, briefing, summary)
      prisma.timeSaverContent.count({
        where: {
          contentType: { in: ['DIGEST', 'BRIEFING', 'SUMMARY'] },
          publishedAt: { gte: today }
        }
      }),

      // Updates count (quick updates, highlights)
      prisma.timeSaverContent.count({
        where: {
          contentType: { in: ['QUICK_UPDATE', 'HIGHLIGHTS'] },
          publishedAt: { gte: today }
        }
      }),

      // Breaking news count
      prisma.breakingNews.count({
        where: { timestamp: { gte: today } }
      }),

      // Most recent content
      prisma.timeSaverContent.findFirst({
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true }
      })
    ]);

    const stats = {
      storiesCount,
      updatesCount,
      breakingCount,
      lastUpdated: recentContent?.publishedAt || new Date()
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get time saver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time saver stats'
    });
  }
});

// @desc    Get trending quick updates
// @route   GET /api/time-saver/trending-updates
// @access  Public
router.get('/trending-updates', async (req, res) => {
  try {
    const { limit = 10, timeframe = '24h' } = req.query;

    const timeframes = {
      '1h': 1,
      '24h': 24,
      '7d': 24 * 7
    };

    const hours = timeframes[timeframe] || 24;
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hours);

    const updates = await prisma.quickUpdate.findMany({
      where: {
        timestamp: { gte: fromDate }
      },
      take: parseInt(limit),
      orderBy: [
        { engagementScore: 'desc' },
        { isHot: 'desc' },
        { timestamp: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        brief: true,
        category: true,
        imageUrl: true,
        tags: true,
        isHot: true,
        engagementScore: true,
        timestamp: true
      }
    });

    res.json({
      success: true,
      data: { updates }
    });
  } catch (error) {
    logger.error('Get trending updates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending updates'
    });
  }
});

// @desc    Get breaking news
// @route   GET /api/time-saver/breaking-news
// @access  Public
router.get('/breaking-news', async (req, res) => {
  try {
    const { limit = 10, category, priority = 'HIGH' } = req.query;

    const where = {};
    if (category) {
      // Using tags field to filter by category since breaking news doesn't have category field
      where.tags = { contains: category };
    }
    
    // Filter by priority if specified
    const priorityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (priority && priorityLevels.includes(priority)) {
      where.priority = { in: priorityLevels.slice(priorityLevels.indexOf(priority)) };
    }

    const breakingNews = await prisma.breakingNews.findMany({
      where,
      take: parseInt(limit),
      orderBy: [
        { priority: 'desc' },
        { timestamp: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        brief: true,
        imageUrl: true,
        sourceUrl: true,
        priority: true,
        location: true,
        tags: true,
        timestamp: true
      }
    });

    res.json({
      success: true,
      data: { breakingNews }
    });
  } catch (error) {
    logger.error('Get breaking news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breaking news'
    });
  }
});

// @desc    Get breaking news by ID
// @route   GET /api/time-saver/breaking-news/:id
// @access  Public
router.get('/breaking-news/:id', genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    const breakingNews = await prisma.breakingNews.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        brief: true,
        imageUrl: true,
        sourceUrl: true,
        priority: true,
        location: true,
        tags: true,
        timestamp: true
      }
    });

    if (!breakingNews) {
      return res.status(404).json({
        success: false,
        message: 'Breaking news not found'
      });
    }

    res.json({
      success: true,
      data: { breakingNews }
    });
  } catch (error) {
    logger.error('Get breaking news by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breaking news'
    });
  }
});

// @desc    Get time saver analytics
// @route   GET /api/time-saver/analytics
// @access  Private (ADMIN, AD_MANAGER)
router.get('/analytics', authenticate, authorize('ADMIN', 'AD_MANAGER'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const timeframes = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = timeframes[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      totalContent,
      totalViews,
      contentByType,
      topContent,
      engagementMetrics,
      averageReadTime
    ] = await Promise.all([
      // Total content
      prisma.timeSaverContent.count({
        where: { publishedAt: { gte: fromDate } }
      }),

      // Total views
      prisma.timeSaverContent.aggregate({
        where: { publishedAt: { gte: fromDate } },
        _sum: { viewCount: true }
      }),

      // Content by type
      prisma.timeSaverContent.groupBy({
        by: ['contentType'],
        where: { publishedAt: { gte: fromDate } },
        _count: { id: true },
        _sum: { viewCount: true }
      }),

      // Top performing content
      prisma.timeSaverContent.findMany({
        where: { publishedAt: { gte: fromDate } },
        take: 10,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          contentType: true,
          viewCount: true,
          publishedAt: true
        }
      }),

      // Engagement metrics
      prisma.timeSaverInteraction.groupBy({
        by: ['interactionType'],
        where: { timestamp: { gte: fromDate } },
        _count: { id: true }
      }),

      // Average read time
      prisma.timeSaverContent.aggregate({
        where: {
          publishedAt: { gte: fromDate },
          readTimeSeconds: { not: null }
        },
        _avg: { readTimeSeconds: true }
      })
    ]);

    const analytics = {
      overview: {
        totalContent,
        totalViews: totalViews._sum.viewCount || 0,
        averageViews: totalContent > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalContent) : 0,
        averageReadTime: Math.round(averageReadTime._avg.readTimeSeconds || 0)
      },
      contentByType: contentByType.map(type => ({
        type: type.contentType,
        count: type._count.id,
        views: type._sum.viewCount || 0
      })),
      topContent,
      engagementMetrics: engagementMetrics.map(metric => ({
        type: metric.interactionType,
        count: metric._count.id
      })),
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Get time saver analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time saver analytics'
    });
  }
});

// @desc    Track content view
// @route   POST /api/time-saver/content/:id/view
// @access  Public
router.post('/content/:id/view', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { timestamp = new Date() } = req.body;

    const content = await prisma.timeSaverContent.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    await Promise.all([
      prisma.timeSaverContent.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      }),
      req.user && prisma.timeSaverView.create({
        data: {
          contentId: id,
          userId: req.user.id,
          timestamp: new Date(timestamp)
        }
      }).catch(() => {}) // Ignore duplicate errors
    ]);

    logger.info(`Time saver content view tracked: ${id}`);

    res.json({
      success: true,
      message: 'View tracked successfully'
    });
  } catch (error) {
    logger.error('Track time saver content view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view'
    });
  }
});

// @desc    Track content interaction
// @route   POST /api/time-saver/content/:id/interaction
// @access  Public
router.post('/content/:id/interaction', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { interactionType, timestamp = new Date() } = req.body;

    const validTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'SAVE_FOR_LATER', 'MARK_AS_READ'];
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type'
      });
    }

    const content = await prisma.timeSaverContent.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    await prisma.timeSaverInteraction.create({
      data: {
        contentId: id,
        userId: req.user?.id || null,
        interactionType,
        timestamp: new Date(timestamp)
      }
    });

    logger.info(`Time saver content interaction tracked: ${id} - ${interactionType}`);

    res.json({
      success: true,
      message: 'Interaction tracked successfully'
    });
  } catch (error) {
    logger.error('Track time saver content interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction'
    });
  }
});

// @desc    Search time saver content
// @route   GET /api/time-saver/search
// @access  Public
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const {
      q: query,
      page = 1,
      limit = 10,
      category
    } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      OR: [
        { title: { contains: query } },
        { summary: { contains: query } },
        { keyPoints: { contains: query } }
      ]
    };

    if (category) {
      where.category = category;
    }

    const [content, totalCount] = await Promise.all([
      prisma.timeSaverContent.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          imageUrl: true,
          iconName: true,
          bgColor: true,
          contentType: true,
          readTimeSeconds: true,
          viewCount: true,
          publishedAt: true
        }
      }),
      prisma.timeSaverContent.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        content,
        searchQuery: query,
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
    logger.error('Search time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search time saver content'
    });
  }
});

// @desc    Get time saver content categories
// @route   GET /api/time-saver/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    // Get unique categories with counts
    const categories = await prisma.timeSaverContent.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    const categoriesWithCounts = categories.map(cat => ({
      name: cat.category,
      count: cat._count.id,
      displayName: cat.category.charAt(0).toUpperCase() + cat.category.slice(1).toLowerCase()
    }));

    res.json({
      success: true,
      data: { categories: categoriesWithCounts }
    });
  } catch (error) {
    logger.error('Get time saver categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time saver categories'
    });
  }
});

// @desc    Create time saver content (Admin only)
// @route   POST /api/time-saver/content
// @access  Private (ADMIN)
router.post('/content', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      title,
      summary,
      category,
      imageUrl,
      iconName,
      bgColor,
      keyPoints,
      sourceUrl,
      readTimeSeconds,
      isPriority = false,
      contentType = 'DIGEST'
    } = req.body;

    if (!title || !summary || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, summary, and category are required'
      });
    }

    const validContentTypes = ['DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    const content = await prisma.timeSaverContent.create({
      data: {
        title,
        summary,
        category,
        imageUrl,
        iconName,
        bgColor,
        keyPoints,
        sourceUrl,
        readTimeSeconds: readTimeSeconds ? parseInt(readTimeSeconds) : null,
        isPriority,
        contentType,
        publishedAt: new Date()
      }
    });

    logger.info(`Time saver content created: ${title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Time saver content created successfully',
      data: { content }
    });
  } catch (error) {
    logger.error('Create time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create time saver content'
    });
  }
});

// @desc    Create breaking news (Admin only)
// @route   POST /api/time-saver/breaking-news
// @access  Private (ADMIN)
router.post('/breaking-news', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      title,
      brief,
      imageUrl,
      sourceUrl,
      priority = 'MEDIUM',
      location,
      tags
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority level'
      });
    }

    const breakingNews = await prisma.breakingNews.create({
      data: {
        title,
        brief,
        imageUrl,
        sourceUrl,
        priority,
        location,
        tags
      }
    });

    logger.info(`Breaking news created: ${title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Breaking news created successfully',
      data: { breakingNews }
    });
  } catch (error) {
    logger.error('Create breaking news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create breaking news'
    });
  }
});

// @desc    Create quick update (Admin only)
// @route   POST /api/time-saver/quick-update
// @access  Private (ADMIN)
router.post('/quick-update', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      title,
      brief,
      category,
      imageUrl,
      tags,
      isHot = false,
      engagementScore = 0
    } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required'
      });
    }

    const quickUpdate = await prisma.quickUpdate.create({
      data: {
        title,
        brief,
        category,
        imageUrl,
        tags,
        isHot,
        engagementScore: parseInt(engagementScore)
      }
    });

    logger.info(`Quick update created: ${title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Quick update created successfully',
      data: { quickUpdate }
    });
  } catch (error) {
    logger.error('Create quick update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quick update'
    });
  }
});

module.exports = router;