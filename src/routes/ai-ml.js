// AI/ML Routes - /routes/ai-ml.js (Updated permissions)
const express = require('express');
const prisma = require('../config/database');
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get AI/ML news articles with filtering and pagination
// @route   GET /api/ai-ml/news
// @access  Public
router.get('/news', optionalAuth, genericValidation.pagination, async (req, res) => {
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

    const [articles, totalCount] = await Promise.all([
      prisma.aiArticle.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          featuredImage: true,
          tags: true,
          aiModel: true,
          aiApplication: true,
          companyMentioned: true,
          technologyType: true,
          viewCount: true,
          shareCount: true,
          relevanceScore: true,
          isTrending: true,
          publishedAt: true
        }
      }),
      prisma.aiArticle.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        articles,
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
    logger.error('Get AI/ML news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI/ML news'
    });
  }
});

// @desc    Get single AI/ML article by ID
// @route   GET /api/ai-ml/news/:id
// @access  Public
router.get('/news/:id', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { trackView = 'true' } = req.query;

    const article = await prisma.aiArticle.findUnique({
      where: { id },
      select: {
        id: true,
        headline: true,
        briefContent: true,
        fullContent: true,
        category: true,
        featuredImage: true,
        tags: true,
        aiModel: true,
        aiApplication: true,
        companyMentioned: true,
        technologyType: true,
        viewCount: true,
        shareCount: true,
        relevanceScore: true,
        isTrending: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'AI/ML article not found'
      });
    }

    // Track view if requested
    if (trackView === 'true') {
      await Promise.all([
        prisma.aiArticle.update({
          where: { id },
          data: { viewCount: { increment: 1 } }
        }),
        req.user && prisma.aiArticleView.create({
          data: {
            articleId: id,
            userId: req.user.id
          }
        }).catch(() => {}) // Ignore errors for anonymous tracking
      ]);
      article.viewCount += 1;
    }

    res.json({
      success: true,
      data: { article }
    });
  } catch (error) {
    logger.error('Get AI/ML article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI/ML article'
    });
  }
});

// @desc    Get trending AI/ML news
// @route   GET /api/ai-ml/trending
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, timeframe = '7d' } = req.query;

    const timeframes = {
      '24h': 1,
      '7d': 7,
      '30d': 30
    };

    const days = timeframes[timeframe] || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const articles = await prisma.aiArticle.findMany({
      where: {
        publishedAt: { gte: fromDate },
        OR: [
          { isTrending: true },
          { viewCount: { gte: 100 } },
          { relevanceScore: { gte: 8.0 } }
        ]
      },
      take: parseInt(limit),
      orderBy: [
        { viewCount: 'desc' },
        { relevanceScore: 'desc' },
        { publishedAt: 'desc' }
      ],
      select: {
        id: true,
        headline: true,
        briefContent: true,
        category: true,
        featuredImage: true,
        aiModel: true,
        aiApplication: true,
        viewCount: true,
        shareCount: true,
        relevanceScore: true,
        publishedAt: true
      }
    });

    res.json({
      success: true,
      data: { articles }
    });
  } catch (error) {
    logger.error('Get trending AI/ML news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending AI/ML news'
    });
  }
});

// @desc    Search AI/ML content
// @route   GET /api/ai-ml/search
// @access  Public
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const {
      q: query,
      page = 1,
      limit = 10,
      category,
      sortBy = 'relevance',
      order = 'desc'
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
        { headline: { contains: query } },
        { briefContent: { contains: query } },
        { fullContent: { contains: query } },
        { tags: { contains: query } },
        { aiModel: { contains: query } },
        { aiApplication: { contains: query } },
        { companyMentioned: { contains: query } }
      ]
    };

    if (category) {
      where.category = category;
    }

    let orderBy = {};
    switch (sortBy) {
      case 'relevance':
        orderBy = [
          { relevanceScore: 'desc' },
          { viewCount: 'desc' },
          { publishedAt: 'desc' }
        ];
        break;
      case 'date':
        orderBy = { publishedAt: order };
        break;
      default:
        orderBy = { [sortBy]: order };
    }

    const [articles, totalCount] = await Promise.all([
      prisma.aiArticle.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          featuredImage: true,
          aiModel: true,
          aiApplication: true,
          viewCount: true,
          shareCount: true,
          relevanceScore: true,
          publishedAt: true
        }
      }),
      prisma.aiArticle.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        articles,
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
    logger.error('Search AI/ML content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search AI/ML content'
    });
  }
});

// @desc    Get AI/ML categories
// @route   GET /api/ai-ml/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.aiCategory.findMany({
      orderBy: [
        { isHot: 'desc' },
        { articleCount: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    logger.error('Get AI/ML categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI/ML categories'
    });
  }
});

// @desc    Get articles by specific AI category
// @route   GET /api/ai-ml/categories/:category/articles
// @access  Public
router.get('/categories/:category/articles', optionalAuth, genericValidation.pagination, async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'publishedAt',
      order = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const orderBy = {};
    orderBy[sortBy] = order;

    const [articles, totalCount] = await Promise.all([
      prisma.aiArticle.findMany({
        where: { category },
        skip,
        take,
        orderBy,
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          featuredImage: true,
          aiModel: true,
          aiApplication: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true
        }
      }),
      prisma.aiArticle.count({ where: { category } })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        category,
        articles,
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
    logger.error('Get articles by AI/ML category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles by category'
    });
  }
});

// @desc    Get popular AI topics/keywords
// @route   GET /api/ai-ml/popular-topics
// @access  Public
router.get('/popular-topics', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get articles with tags and analyze them
    const articles = await prisma.aiArticle.findMany({
      where: {
        tags: { not: null },
        publishedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: { tags: true, viewCount: true }
    });

    const topicCounts = {};
    
    articles.forEach(article => {
      if (article.tags) {
        const tags = article.tags.split(',').map(tag => tag.trim().toLowerCase());
        tags.forEach(tag => {
          if (tag) {
            topicCounts[tag] = (topicCounts[tag] || 0) + (article.viewCount || 1);
          }
        });
      }
    });

    const popularTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([topic, score]) => ({ topic, score }));

    res.json({
      success: true,
      data: { topics: popularTopics }
    });
  } catch (error) {
    logger.error('Get popular AI topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular topics'
    });
  }
});

// @desc    Track AI article view
// @route   POST /api/ai-ml/articles/:id/view
// @access  Public
router.post('/articles/:id/view', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { timestamp = new Date() } = req.body;

    const article = await prisma.aiArticle.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    await Promise.all([
      prisma.aiArticle.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      }),
      req.user && prisma.aiArticleView.create({
        data: {
          articleId: id,
          userId: req.user.id,
          timestamp: new Date(timestamp)
        }
      }).catch(() => {}) // Ignore duplicate errors
    ]);

    logger.info(`AI article view tracked: ${id}`);

    res.json({
      success: true,
      message: 'View tracked successfully'
    });
  } catch (error) {
    logger.error('Track AI article view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view'
    });
  }
});

// @desc    Track AI article interaction
// @route   POST /api/ai-ml/articles/:id/interaction
// @access  Public
router.post('/articles/:id/interaction', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { interactionType, timestamp = new Date() } = req.body;

    const validTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'COMMENT', 'DOWNLOAD'];
    if (!validTypes.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interaction type'
      });
    }

    const article = await prisma.aiArticle.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Update share count if interaction is share
    const updates = [];
    if (interactionType === 'SHARE') {
      updates.push(
        prisma.aiArticle.update({
          where: { id },
          data: { shareCount: { increment: 1 } }
        })
      );
    }

    // Track interaction
    updates.push(
      prisma.aiArticleInteraction.create({
        data: {
          articleId: id,
          userId: req.user?.id || null,
          interactionType,
          timestamp: new Date(timestamp)
        }
      })
    );

    await Promise.all(updates);

    logger.info(`AI article interaction tracked: ${id} - ${interactionType}`);

    res.json({
      success: true,
      message: 'Interaction tracked successfully'
    });
  } catch (error) {
    logger.error('Track AI article interaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track interaction'
    });
  }
});

// @desc    Get AI insights and analytics
// @route   GET /api/ai-ml/insights
// @access  Private (ADMIN view-only, AD_MANAGER can view)
router.get('/insights', authenticate, authorize('ADMIN', 'AD_MANAGER'), async (req, res) => {
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
      totalArticles,
      totalViews,
      totalShares,
      trendingArticles,
      topCategories,
      topAiModels,
      engagementMetrics
    ] = await Promise.all([
      // Total articles
      prisma.aiArticle.count({
        where: { publishedAt: { gte: fromDate } }
      }),

      // Total views
      prisma.aiArticle.aggregate({
        where: { publishedAt: { gte: fromDate } },
        _sum: { viewCount: true }
      }),

      // Total shares
      prisma.aiArticle.aggregate({
        where: { publishedAt: { gte: fromDate } },
        _sum: { shareCount: true }
      }),

      // Trending articles
      prisma.aiArticle.findMany({
        where: {
          publishedAt: { gte: fromDate },
          isTrending: true
        },
        take: 5,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          headline: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true
        }
      }),

      // Top categories
      prisma.aiArticle.groupBy({
        by: ['category'],
        where: { publishedAt: { gte: fromDate } },
        _count: { id: true },
        _sum: { viewCount: true },
        orderBy: { _sum: { viewCount: 'desc' } },
        take: 10
      }),

      // Top AI models mentioned
      prisma.aiArticle.groupBy({
        by: ['aiModel'],
        where: {
          publishedAt: { gte: fromDate },
          aiModel: { not: null }
        },
        _count: { id: true },
        _sum: { viewCount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),

      // Engagement metrics
      prisma.aiArticleInteraction.groupBy({
        by: ['interactionType'],
        where: { timestamp: { gte: fromDate } },
        _count: { id: true }
      })
    ]);

    const insights = {
      overview: {
        totalArticles,
        totalViews: totalViews._sum.viewCount || 0,
        totalShares: totalShares._sum.shareCount || 0,
        averageViews: totalArticles > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalArticles) : 0
      },
      trendingArticles,
      topCategories: topCategories.map(cat => ({
        category: cat.category,
        articleCount: cat._count.id,
        totalViews: cat._sum.viewCount || 0
      })),
      topAiModels: topAiModels.map(model => ({
        aiModel: model.aiModel,
        articleCount: model._count.id,
        totalViews: model._sum.viewCount || 0
      })),
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
      data: { insights }
    });
  } catch (error) {
    logger.error('Get AI insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI insights'
    });
  }
});

// @desc    Create AI/ML article (EDITOR and AD_MANAGER can create, ADMIN view-only)
// @route   POST /api/ai-ml/news
// @access  Private (EDITOR, AD_MANAGER)
router.post('/news', authenticate, authorize('EDITOR', 'AD_MANAGER'), async (req, res) => {
  try {
    const {
      headline,
      briefContent,
      fullContent,
      category,
      featuredImage,
      tags,
      aiModel,
      aiApplication,
      companyMentioned,
      technologyType,
      relevanceScore,
      isTrending = false
    } = req.body;

    if (!headline || !category) {
      return res.status(400).json({
        success: false,
        message: 'Headline and category are required'
      });
    }

    const article = await prisma.aiArticle.create({
      data: {
        headline,
        briefContent,
        fullContent,
        category,
        featuredImage,
        tags,
        aiModel,
        aiApplication,
        companyMentioned,
        technologyType,
        relevanceScore: relevanceScore ? parseFloat(relevanceScore) : null,
        isTrending,
        publishedAt: new Date(),
        createdBy: req.user.id, // Track who created it
        authorId: req.user.id
      }
    });

    logger.info(`AI/ML article created: ${headline} by ${req.user.email} (${req.user.role})`);

    res.status(201).json({
      success: true,
      message: 'AI/ML article created successfully',
      data: { article }
    });
  } catch (error) {
    logger.error('Create AI/ML article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create AI/ML article'
    });
  }
});

// @desc    Update AI/ML article (EDITOR and AD_MANAGER can update, ADMIN view-only)
// @route   PUT /api/ai-ml/news/:id
// @access  Private (EDITOR, AD_MANAGER)
router.put('/news/:id', authenticate, authorize('EDITOR', 'AD_MANAGER'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      headline,
      briefContent,
      fullContent,
      category,
      featuredImage,
      tags,
      aiModel,
      aiApplication,
      companyMentioned,
      technologyType,
      relevanceScore,
      isTrending
    } = req.body;

    // Check if article exists
    const existingArticle = await prisma.aiArticle.findUnique({
      where: { id },
      select: { id: true, headline: true }
    });

    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'AI/ML article not found'
      });
    }

    const updateData = {};
    if (headline !== undefined) updateData.headline = headline;
    if (briefContent !== undefined) updateData.briefContent = briefContent;
    if (fullContent !== undefined) updateData.fullContent = fullContent;
    if (category !== undefined) updateData.category = category;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (tags !== undefined) updateData.tags = tags;
    if (aiModel !== undefined) updateData.aiModel = aiModel;
    if (aiApplication !== undefined) updateData.aiApplication = aiApplication;
    if (companyMentioned !== undefined) updateData.companyMentioned = companyMentioned;
    if (technologyType !== undefined) updateData.technologyType = technologyType;
    if (relevanceScore !== undefined) updateData.relevanceScore = parseFloat(relevanceScore);
    if (isTrending !== undefined) updateData.isTrending = isTrending;
    
    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const article = await prisma.aiArticle.update({
      where: { id },
      data: updateData
    });

    logger.info(`AI/ML article updated: ${id} by ${req.user.email} (${req.user.role})`);

    res.json({
      success: true,
      message: 'AI/ML article updated successfully',
      data: { article }
    });
  } catch (error) {
    logger.error('Update AI/ML article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI/ML article'
    });
  }
});

// @desc    Delete AI/ML article (EDITOR and AD_MANAGER can delete, ADMIN view-only)
// @route   DELETE /api/ai-ml/news/:id
// @access  Private (EDITOR, AD_MANAGER)
router.delete('/news/:id', authenticate, authorize('EDITOR', 'AD_MANAGER'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if article exists
    const existingArticle = await prisma.aiArticle.findUnique({
      where: { id },
      select: { id: true, headline: true }
    });

    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'AI/ML article not found'
      });
    }

    await prisma.aiArticle.delete({
      where: { id }
    });

    logger.info(`AI/ML article deleted: ${id} by ${req.user.email} (${req.user.role})`);

    res.json({
      success: true,
      message: 'AI/ML article deleted successfully'
    });
  } catch (error) {
    logger.error('Delete AI/ML article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete AI/ML article'
    });
  }
});

module.exports = router;