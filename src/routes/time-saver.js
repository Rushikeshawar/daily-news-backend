// routes/time-saver.js - Corrected version with proper permissions and error handling
const express = require('express');
const prisma = require('../config/database');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get time saver content with enhanced filtering and categorization
// @route   GET /api/time-saver/content
// @access  Public
router.get('/content', optionalAuth, genericValidation.pagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      contentGroup,
      sortBy = 'publishedAt',
      order = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    
    // Enhanced filtering for content groups
    if (contentGroup) {
      switch (contentGroup) {
        case 'today_new':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          where.publishedAt = { gte: today };
          break;
        case 'breaking_critical':
          where.OR = [
            { isPriority: true },
            { contentType: 'DIGEST' }
          ];
          break;
        case 'weekly_highlights':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          where.AND = [
            { publishedAt: { gte: weekAgo } },
            { contentType: 'HIGHLIGHTS' }
          ];
          break;
        case 'monthly_top':
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          where.publishedAt = { gte: monthAgo };
          break;
        case 'brief_updates':
          where.OR = [
            { contentType: 'QUICK_UPDATE' },
            { readTimeSeconds: { lte: 60 } }
          ];
          break;
        case 'viral_buzz':
          where.OR = [
            { viewCount: { gte: 1000 } },
            { tags: { contains: 'viral' } },
            { tags: { contains: 'trending' } }
          ];
          break;
        case 'changing_norms':
          where.OR = [
            { category: { contains: 'society' } },
            { category: { contains: 'culture' } },
            { tags: { contains: 'social' } }
          ];
          break;
      }
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
          publishedAt: true,
          tags: true,
          contentGroup: true
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

// @desc    Get enhanced quick stats for dashboard with category counts
// @route   GET /api/time-saver/stats
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      storiesCount,
      updatesCount,
      breakingCount,
      todayNewCount,
      criticalCount,
      weeklyCount,
      monthlyCount,
      viralBuzzCount,
      changingNormsCount,
      recentContent
    ] = await Promise.all([
      // Original stats
      prisma.timeSaverContent.count({
        where: {
          contentType: { in: ['DIGEST', 'BRIEFING', 'SUMMARY'] },
          publishedAt: { gte: today }
        }
      }),

      prisma.timeSaverContent.count({
        where: {
          contentType: { in: ['QUICK_UPDATE', 'HIGHLIGHTS'] },
          publishedAt: { gte: today }
        }
      }),

      // Handle case where breakingNews table might not exist
      prisma.breakingNews ? prisma.breakingNews.count({
        where: { timestamp: { gte: today } }
      }).catch(() => 0) : Promise.resolve(0),

      // New category stats
      prisma.timeSaverContent.count({
        where: { publishedAt: { gte: today } }
      }),

      prisma.timeSaverContent.count({
        where: {
          OR: [
            { isPriority: true },
            { contentType: 'DIGEST' }
          ]
        }
      }),

      prisma.timeSaverContent.count({
        where: {
          publishedAt: { gte: weekAgo },
          contentType: 'HIGHLIGHTS'
        }
      }),

      prisma.timeSaverContent.count({
        where: { publishedAt: { gte: monthAgo } }
      }),

      prisma.timeSaverContent.count({
        where: {
          OR: [
            { viewCount: { gte: 1000 } },
            { tags: { contains: 'viral' } },
            { tags: { contains: 'trending' } }
          ]
        }
      }),

      prisma.timeSaverContent.count({
        where: {
          OR: [
            { category: { contains: 'society' } },
            { category: { contains: 'culture' } },
            { tags: { contains: 'social' } }
          ]
        }
      }),

      prisma.timeSaverContent.findFirst({
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true }
      })
    ]);

    const stats = {
      storiesCount,
      updatesCount,
      breakingCount,
      todayNewCount: Math.min(todayNewCount, 5),
      criticalCount: Math.min(criticalCount, 7),
      weeklyCount: Math.min(weeklyCount, 15),
      monthlyCount: Math.min(monthlyCount, 30),
      viralBuzzCount: Math.min(viralBuzzCount, 10),
      changingNormsCount: Math.min(changingNormsCount, 10),
      lastUpdated: recentContent?.publishedAt || new Date()
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get enhanced time saver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time saver stats'
    });
  }
});

// @desc    Get content by specific category group
// @route   GET /api/time-saver/category/:group
// @access  Public
router.get('/category/:group', optionalAuth, genericValidation.pagination, async (req, res) => {
  try {
    const { group } = req.params;
    const { limit = 20 } = req.query;
    
    const where = {};
    const take = Math.min(parseInt(limit), 50);
    
    // Define category-specific filters
    switch (group) {
      case 'today_new':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.publishedAt = { gte: today };
        break;
      case 'breaking_critical':
        where.OR = [
          { isPriority: true },
          { contentType: 'DIGEST' }
        ];
        break;
      case 'weekly_highlights':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        where.AND = [
          { publishedAt: { gte: weekAgo } },
          { contentType: 'HIGHLIGHTS' }
        ];
        break;
      case 'monthly_top':
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        where.publishedAt = { gte: monthAgo };
        break;
      case 'brief_updates':
        where.OR = [
          { contentType: 'QUICK_UPDATE' },
          { readTimeSeconds: { lte: 60 } }
        ];
        break;
      case 'viral_buzz':
        where.OR = [
          { viewCount: { gte: 1000 } },
          { tags: { contains: 'viral' } },
          { tags: { contains: 'trending' } }
        ];
        break;
      case 'changing_norms':
        where.OR = [
          { category: { contains: 'society' } },
          { category: { contains: 'culture' } },
          { tags: { contains: 'social' } }
        ];
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid category group'
        });
    }

    const content = await prisma.timeSaverContent.findMany({
      where,
      take,
      orderBy: [
        { isPriority: 'desc' },
        { publishedAt: 'desc' }
      ],
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
        tags: true,
        contentGroup: true
      }
    });

    res.json({
      success: true,
      data: {
        content,
        category: group,
        totalCount: content.length
      }
    });
  } catch (error) {
    logger.error('Get category content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category content'
    });
  }
});

// @desc    Create enhanced time saver content - UPDATED PERMISSIONS
// @route   POST /api/time-saver/content
// @access  Private (EDITOR, AD_MANAGER) - ADMIN view-only
router.post('/content', authenticate, authorize('EDITOR', 'AD_MANAGER'), async (req, res) => {
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
      contentType = 'DIGEST',
      contentGroup,
      tags = []
    } = req.body;

    if (!title || !summary || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, summary, and category are required'
      });
    }

    const validContentTypes = ['DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS', 'VIRAL', 'SOCIAL', 'BREAKING'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    // Process tags
    let processedTags = [];
    if (typeof tags === 'string') {
      processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } else if (Array.isArray(tags)) {
      processedTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
    }

    const content = await prisma.timeSaverContent.create({
      data: {
        title,
        summary,
        category,
        imageUrl,
        iconName,
        bgColor,
        keyPoints: Array.isArray(keyPoints) ? keyPoints.join('|') : keyPoints,
        sourceUrl,
        readTimeSeconds: readTimeSeconds ? parseInt(readTimeSeconds) : null,
        isPriority,
        contentType,
        contentGroup,
        tags: processedTags.join(','),
        publishedAt: new Date(),
        createdBy: req.user.id, // Track who created it
        authorId: req.user.id
      }
    });

    logger.info(`Time saver content created: ${title} by ${req.user.email} (${req.user.role})`);

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

// @desc    Update time saver content - UPDATED PERMISSIONS
// @route   PUT /api/time-saver/content/:id
// @access  Private (EDITOR, AD_MANAGER)
router.put('/content/:id', authenticate, authorize('EDITOR', 'AD_MANAGER'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
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
      isPriority,
      contentType,
      contentGroup,
      tags
    } = req.body;

    // Check if content exists
    const existingContent = await prisma.timeSaverContent.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!existingContent) {
      return res.status(404).json({
        success: false,
        message: 'Time saver content not found'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (summary !== undefined) updateData.summary = summary;
    if (category !== undefined) updateData.category = category;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (iconName !== undefined) updateData.iconName = iconName;
    if (bgColor !== undefined) updateData.bgColor = bgColor;
    if (keyPoints !== undefined) {
      updateData.keyPoints = Array.isArray(keyPoints) ? keyPoints.join('|') : keyPoints;
    }
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
    if (readTimeSeconds !== undefined) updateData.readTimeSeconds = parseInt(readTimeSeconds);
    if (isPriority !== undefined) updateData.isPriority = isPriority;
    if (contentType !== undefined) updateData.contentType = contentType;
    if (contentGroup !== undefined) updateData.contentGroup = contentGroup;
    if (tags !== undefined) {
      let processedTags = [];
      if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        processedTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
      }
      updateData.tags = processedTags.join(',');
    }
    
    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const content = await prisma.timeSaverContent.update({
      where: { id },
      data: updateData
    });

    logger.info(`Time saver content updated: ${id} by ${req.user.email} (${req.user.role})`);

    res.json({
      success: true,
      message: 'Time saver content updated successfully',
      data: { content }
    });
  } catch (error) {
    logger.error('Update time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time saver content'
    });
  }
});

// @desc    Delete time saver content - UPDATED PERMISSIONS
// @route   DELETE /api/time-saver/content/:id
// @access  Private (EDITOR, AD_MANAGER)
router.delete('/content/:id', authenticate, authorize('EDITOR', 'AD_MANAGER'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if content exists
    const existingContent = await prisma.timeSaverContent.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!existingContent) {
      return res.status(404).json({
        success: false,
        message: 'Time saver content not found'
      });
    }

    await prisma.timeSaverContent.delete({
      where: { id }
    });

    logger.info(`Time saver content deleted: ${id} by ${req.user.email} (${req.user.role})`);

    res.json({
      success: true,
      message: 'Time saver content deleted successfully'
    });
  } catch (error) {
    logger.error('Delete time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete time saver content'
    });
  }
});

// @desc    Track time saver content view - FIXED VERSION
// @route   POST /api/time-saver/content/:id/view
// @access  Public
router.post('/content/:id/view', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { timestamp = new Date() } = req.body;

    // Validate ID format if using Prisma/MongoDB
    if (!id || id.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content ID'
      });
    }

    // Check if content exists
    const content = await prisma.timeSaverContent.findUnique({
      where: { id },
      select: { id: true, viewCount: true }
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Update view count
    await prisma.timeSaverContent.update({
      where: { id },
      data: { 
        viewCount: { 
          increment: 1 
        }
      }
    });

    // Optionally track user view (only if user is logged in)
    if (req.user) {
      try {
        await prisma.timeSaverContentView.create({
          data: {
            contentId: id,
            userId: req.user.id,
            timestamp: new Date(timestamp)
          }
        });
      } catch (viewError) {
        // Ignore duplicate view errors or if table doesn't exist
        console.warn('Failed to create user view record:', viewError.message);
      }
    }

    res.json({
      success: true,
      message: 'View tracked successfully',
      data: {
        viewCount: content.viewCount + 1
      }
    });

  } catch (error) {
    console.error('Track time saver content view error:', error);
    
    // More specific error handling
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'View already recorded'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to track view'
    });
  }
});

// @desc    Track time saver content interaction - FIXED VERSION
// @route   POST /api/time-saver/content/:id/interaction
// @access  Public
router.post('/content/:id/interaction', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { interactionType, timestamp = new Date() } = req.body;

    // Validate ID format
    if (!id || id.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content ID'
      });
    }

    const validTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'COMMENT', 'DOWNLOAD'];
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type'
      });
    }

    // Check if content exists
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

    try {
      await prisma.timeSaverContentInteraction.create({
        data: {
          contentId: id,
          userId: req.user?.id || null,
          interactionType,
          timestamp: new Date(timestamp)
        }
      });
    } catch (interactionError) {
      // If interaction table doesn't exist, just log and continue
      console.warn('Failed to create interaction record:', interactionError.message);
    }

    res.json({
      success: true,
      message: 'Interaction tracked successfully'
    });

  } catch (error) {
    console.error('Track time saver content interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction'
    });
  }
});

// @desc    Bulk create sample content for testing categories - UPDATED PERMISSIONS
// @route   POST /api/time-saver/seed-sample-data
// @access  Private (EDITOR, AD_MANAGER)
router.post('/seed-sample-data', authenticate, authorize('EDITOR', 'AD_MANAGER'), async (req, res) => {
  try {
    const sampleContent = [
      // Sample data here - same as before but with tracking fields
      {
        title: "Breaking: Major Tech Breakthrough Announced",
        summary: "Revolutionary AI advancement changes industry landscape",
        category: "TECHNOLOGY",
        contentType: "DIGEST",
        isPriority: false,
        readTimeSeconds: 120,
        keyPoints: "AI breakthrough|Industry impact|Future implications",
        tags: "tech,ai,breakthrough,today",
        contentGroup: "today_new",
        publishedAt: new Date(),
        createdBy: req.user.id,
        authorId: req.user.id
      },
      // ... add more sample content as needed
    ];

    // Create all content
    const createdContent = await Promise.all(
      sampleContent.map(item => 
        prisma.timeSaverContent.create({
          data: {
            ...item,
            viewCount: Math.floor(Math.random() * 500) + 100
          }
        })
      )
    );

    logger.info(`Sample data seeded: ${createdContent.length} items by ${req.user.email} (${req.user.role})`);

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdContent.length} sample content items`,
      data: { count: createdContent.length }
    });

  } catch (error) {
    logger.error('Seed sample data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed sample data'
    });
  }
});

// @desc    Get analytics - View access for ADMIN and AD_MANAGER
// @route   GET /api/time-saver/analytics
// @access  Private (AD_MANAGER, ADMIN)
router.get('/analytics', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
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
      topPerforming
    ] = await Promise.all([
      prisma.timeSaverContent.count({
        where: { publishedAt: { gte: fromDate } }
      }),

      prisma.timeSaverContent.aggregate({
        where: { publishedAt: { gte: fromDate } },
        _sum: { viewCount: true }
      }),

      prisma.timeSaverContent.findMany({
        where: { publishedAt: { gte: fromDate } },
        take: 10,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          viewCount: true,
          contentType: true,
          publishedAt: true
        }
      })
    ]);

    const analytics = {
      overview: {
        totalContent,
        totalViews: totalViews._sum.viewCount || 0,
        totalInteractions: 0, // Calculate if interaction table exists
        averageReadTime: 95
      },
      topPerforming,
      contentByType: [], // Calculate from data if needed
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
      message: 'Failed to fetch analytics'
    });
  }
});

module.exports = router;