// routes/time-saver.js - Enhanced version with new content categories
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
      contentGroup, // New parameter for content grouping
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

      prisma.breakingNews.count({
        where: { timestamp: { gte: today } }
      }),

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
    const take = Math.min(parseInt(limit), 50); // Max 50 items per request
    
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

// @desc    Create enhanced time saver content with category grouping (Admin only)
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
      contentType = 'DIGEST',
      contentGroup, // New field
      tags = [] // New field
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
        publishedAt: new Date()
      }
    });

    logger.info(`Enhanced time saver content created: ${title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Time saver content created successfully',
      data: { content }
    });
  } catch (error) {
    logger.error('Create enhanced time saver content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create time saver content'
    });
  }
});

// @desc    Bulk create sample content for testing categories
// @route   POST /api/time-saver/seed-sample-data
// @access  Private (ADMIN)
router.post('/seed-sample-data', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const sampleContent = [
      // Today's New (5 items)
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
        publishedAt: new Date()
      },
      {
        title: "Market Update: Stocks Reach New Heights",
        summary: "Major indices hit record levels amid economic optimism",
        category: "BUSINESS",
        contentType: "QUICK_UPDATE", 
        isPriority: false,
        readTimeSeconds: 45,
        keyPoints: "Stock markets|Record highs|Economic growth",
        tags: "business,stocks,market,today",
        contentGroup: "today_new",
        publishedAt: new Date()
      },
      
      // Breaking Critical (7 items)
      {
        title: "URGENT: Emergency Response to Global Crisis",
        summary: "Critical situation requires immediate international attention",
        category: "POLITICS",
        contentType: "DIGEST",
        isPriority: true,
        readTimeSeconds: 180,
        keyPoints: "Global crisis|Emergency response|International cooperation",
        tags: "critical,urgent,global,crisis",
        contentGroup: "breaking_critical",
        publishedAt: new Date()
      },
      {
        title: "Critical Infrastructure Alert Issued",
        summary: "Major systems require immediate security updates",
        category: "TECHNOLOGY",
        contentType: "DIGEST",
        isPriority: true,
        readTimeSeconds: 90,
        keyPoints: "Infrastructure|Security|Critical update",
        tags: "critical,security,infrastructure",
        contentGroup: "breaking_critical",
        publishedAt: new Date()
      },
      
      // Viral Buzz (10 items)
      {
        title: "Viral Video Takes Internet by Storm",
        summary: "Unexpected clip garners millions of views in hours",
        category: "ENTERTAINMENT", 
        contentType: "VIRAL",
        isPriority: false,
        readTimeSeconds: 30,
        keyPoints: "Viral content|Social media|Internet sensation",
        tags: "viral,trending,social,entertainment",
        contentGroup: "viral_buzz",
        viewCount: 1500000,
        publishedAt: new Date()
      },
      {
        title: "Online Challenge Sparks Global Movement",
        summary: "Simple challenge becomes worldwide phenomenon",
        category: "SOCIAL",
        contentType: "VIRAL",
        isPriority: false,
        readTimeSeconds: 60,
        keyPoints: "Viral challenge|Global participation|Social impact",
        tags: "viral,challenge,global,trending",
        contentGroup: "viral_buzz", 
        viewCount: 2000000,
        publishedAt: new Date()
      },
      
      // Changing Norms (10 items)
      {
        title: "Society Shifts: New Cultural Paradigm Emerges",
        summary: "Generational changes reshape societal norms and values",
        category: "SOCIETY",
        contentType: "SOCIAL",
        isPriority: false,
        readTimeSeconds: 150,
        keyPoints: "Cultural shift|Generational change|New norms",
        tags: "society,culture,change,norms,social",
        contentGroup: "changing_norms",
        publishedAt: new Date()
      },
      {
        title: "Digital Transformation Changes Human Behavior",
        summary: "Technology reshapes how we interact and communicate",
        category: "CULTURE",
        contentType: "SOCIAL",
        isPriority: false,
        readTimeSeconds: 120,
        keyPoints: "Digital transformation|Behavior change|Communication",
        tags: "digital,behavior,social,culture",
        contentGroup: "changing_norms",
        publishedAt: new Date()
      }
    ];

    // Add dates for weekly and monthly content
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 3);
    
    const monthAgo = new Date(); 
    monthAgo.setDate(monthAgo.getDate() - 15);

    // Weekly highlights
    sampleContent.push(
      {
        title: "Week in Review: Key Developments",
        summary: "Major stories that shaped this week's headlines", 
        category: "GENERAL",
        contentType: "HIGHLIGHTS",
        isPriority: false,
        readTimeSeconds: 180,
        keyPoints: "Weekly summary|Key developments|Major stories",
        tags: "weekly,highlights,review",
        contentGroup: "weekly_highlights",
        publishedAt: weekAgo
      }
    );

    // Monthly content
    sampleContent.push(
      {
        title: "Monthly Overview: Trending Topics",
        summary: "Most significant developments from the past month",
        category: "GENERAL", 
        contentType: "SUMMARY",
        isPriority: false,
        readTimeSeconds: 300,
        keyPoints: "Monthly overview|Trending topics|Significant developments",
        tags: "monthly,overview,trending",
        contentGroup: "monthly_top", 
        publishedAt: monthAgo
      }
    );

    // Create all content
    const createdContent = await Promise.all(
      sampleContent.map(item => 
        prisma.timeSaverContent.create({
          data: {
            ...item,
            viewCount: item.viewCount || Math.floor(Math.random() * 500) + 100
          }
        })
      )
    );

    logger.info(`Sample data seeded: ${createdContent.length} items by ${req.user.email}`);

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

module.exports = router;