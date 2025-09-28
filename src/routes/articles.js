 
const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { articleValidation, genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to generate slug
const generateSlug = (headline) => {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
    .substring(0, 100);
};

// @desc    Get all published articles (public)
// @route   GET /api/articles
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = 'publishedAt',
      order = 'desc',
      featured = false
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() }
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (featured === 'true') {
      where.priorityLevel = { gte: 5 };
    }

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = order;

    // Get articles
    const [articles, totalCount] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          priorityLevel: true,
          featuredImage: true,
          tags: true,
          slug: true,
          metaTitle: true,
          metaDescription: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true,
          author: {
            select: {
              id: true,
              fullName: true,
              avatar: true
            }
          }
        }
      }),
      prisma.newsArticle.count({ where })
    ]);

    // Add favorite status if user is authenticated
    let articlesWithFavorites = articles;
    if (req.user) {
      const favoriteArticleIds = await prisma.userFavorite.findMany({
        where: {
          userId: req.user.id,
          newsId: { in: articles.map(article => article.id) }
        },
        select: { newsId: true }
      });

      const favoriteIds = new Set(favoriteArticleIds.map(fav => fav.newsId));
      articlesWithFavorites = articles.map(article => ({
        ...article,
        isFavorite: favoriteIds.has(article.id)
      }));
    }

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        articles: articlesWithFavorites,
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
    logger.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles'
    });
  }
});

// @desc    Get article by ID or slug
// @route   GET /api/articles/:identifier
// @access  Public
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { trackView = true } = req.query;

    // Determine if identifier is ID or slug
    const where = identifier.length === 25 && identifier.startsWith('c')
      ? { id: identifier }
      : { slug: identifier };

    const article = await prisma.newsArticle.findUnique({
      where,
      select: {
        id: true,
        headline: true,
        briefContent: true,
        fullContent: true,
        category: true,
        status: true,
        priorityLevel: true,
        featuredImage: true,
        tags: true,
        slug: true,
        metaTitle: true,
        metaDescription: true,
        viewCount: true,
        shareCount: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check if user has permission to view unpublished articles
    if (article.status !== 'PUBLISHED') {
      if (!req.user) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      // Only author, approver, admin, or ad_manager can view unpublished articles
      const canView = req.user.role === 'ADMIN'
        || req.user.role === 'AD_MANAGER'
        || req.user.id === article.author.id
        || (article.approver && req.user.id === article.approver.id);

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Track view if requested and article is published
    if (trackView === 'true' && article.status === 'PUBLISHED') {
      await prisma.newsArticle.update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } }
      });
      article.viewCount += 1;

      // Track reading history if user is authenticated
      if (req.user) {
        await prisma.readingHistory.upsert({
          where: {
            userId_articleId: {
              userId: req.user.id,
              articleId: article.id
            }
          },
          update: {
            updatedAt: new Date()
          },
          create: {
            userId: req.user.id,
            articleId: article.id
          }
        });
      }
    }

    // Check if article is favorited by user
    let isFavorite = false;
    if (req.user) {
      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_newsId: {
            userId: req.user.id,
            newsId: article.id
          }
        }
      });
      isFavorite = !!favorite;
    }

    res.json({
      success: true,
      data: {
        article: {
          ...article,
          isFavorite
        }
      }
    });
  } catch (error) {
    logger.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article'
    });
  }
});

// @desc    Create new article
// @route   POST /api/articles
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.post('/', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), articleValidation.create, async (req, res) => {
  try {
    const {
      headline,
      briefContent,
      fullContent,
      category,
      tags,
      priorityLevel = 0,
      featuredImage,
      metaTitle,
      metaDescription,
      scheduledAt
    } = req.body;

    // Generate slug from headline
    let slug = generateSlug(headline);
    
    // Ensure slug is unique
    const existingSlug = await prisma.newsArticle.findUnique({
      where: { slug }
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Set initial status based on user role
    let status = 'DRAFT';
    if (req.user.role === 'AD_MANAGER' || req.user.role === 'ADMIN') {
      status = 'APPROVED'; // AD_MANAGER and ADMIN can directly approve
    } else {
      status = 'PENDING'; // EDITOR needs approval
    }

    const article = await prisma.newsArticle.create({
      data: {
        headline,
        briefContent,
        fullContent,
        category,
        tags,
        priorityLevel,
        featuredImage,
        metaTitle: metaTitle || headline,
        metaDescription,
        slug,
        status,
        authorId: req.user.id,
        approvedBy: (req.user.role === 'AD_MANAGER' || req.user.role === 'ADMIN') ? req.user.id : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: status === 'APPROVED' && !scheduledAt ? new Date() : null
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      }
    });

    logger.info(`Article created: ${article.headline} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: { article }
    });
  } catch (error) {
    logger.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create article'
    });
  }
});

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private (Author, AD_MANAGER, ADMIN)
router.put('/:id', authenticate, genericValidation.id, articleValidation.update, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get existing article
    const existingArticle = await prisma.newsArticle.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        headline: true
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check permissions
    const canEdit = req.user.role === 'ADMIN'
      || req.user.role === 'AD_MANAGER'
      || req.user.id === existingArticle.authorId;

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update slug if headline changed
    if (updateData.headline && updateData.headline !== existingArticle.headline) {
      let newSlug = generateSlug(updateData.headline);
      
      // Ensure slug is unique
      const existingSlug = await prisma.newsArticle.findFirst({
        where: {
          slug: newSlug,
          NOT: { id }
        }
      });

      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      
      updateData.slug = newSlug;
    }

    // Handle status changes
    if (updateData.status) {
      if (updateData.status === 'PUBLISHED' && existingArticle.status !== 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }
      
      // Only AD_MANAGER and ADMIN can change status to PUBLISHED or APPROVED
      if (['PUBLISHED', 'APPROVED'].includes(updateData.status) && 
          !['AD_MANAGER', 'ADMIN'].includes(req.user.role)) {
        delete updateData.status;
      }
    }

    // Update metaTitle if not provided but headline changed
    if (updateData.headline && !updateData.metaTitle) {
      updateData.metaTitle = updateData.headline;
    }

    const article = await prisma.newsArticle.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        },
        approver: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    logger.info(`Article updated: ${article.headline} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: { article }
    });
  } catch (error) {
    logger.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update article'
    });
  }
});

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private (Author, AD_MANAGER, ADMIN)
router.delete('/:id', authenticate, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing article
    const existingArticle = await prisma.newsArticle.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        headline: true
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check permissions
    const canDelete = req.user.role === 'ADMIN'
      || req.user.role === 'AD_MANAGER'
      || req.user.id === existingArticle.authorId;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await prisma.newsArticle.delete({
      where: { id }
    });

    logger.info(`Article deleted: ${existingArticle.headline} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    logger.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete article'
    });
  }
});

// @desc    Get articles by author
// @route   GET /api/articles/author/:authorId
// @access  Private
router.get('/author/:authorId', authenticate, async (req, res) => {
  try {
    const { authorId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      category,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Check permissions
    if (req.user.id !== authorId && !['AD_MANAGER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { authorId };
    if (status) where.status = status;
    if (category) where.category = category;

    const orderBy = {};
    orderBy[sortBy] = order;

    const [articles, totalCount] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          status: true,
          priorityLevel: true,
          featuredImage: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.newsArticle.count({ where })
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
    logger.error('Get articles by author error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles'
    });
  }
});

// @desc    Approve/Reject article
// @route   POST /api/articles/:id/approval
// @access  Private (AD_MANAGER, ADMIN)
router.post('/:id/approval', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, articleValidation.approval, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;

    const article = await prisma.newsArticle.findUnique({
      where: { id },
      select: {
        id: true,
        headline: true,
        status: true,
        authorId: true
      }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Update article status based on action
    const statusMap = {
      'APPROVED': 'APPROVED',
      'REJECTED': 'REJECTED',
      'CHANGES_REQUESTED': 'DRAFT'
    };

    const newStatus = statusMap[action];
    const updateData = {
      status: newStatus,
      approvedBy: req.user.id
    };

    // Set published date if approved
    if (action === 'APPROVED') {
      updateData.publishedAt = new Date();
    }

    await Promise.all([
      // Update article
      prisma.newsArticle.update({
        where: { id },
        data: updateData
      }),
      // Create approval history record
      prisma.approvalHistory.create({
        data: {
          newsId: id,
          approverId: req.user.id,
          action,
          comments
        }
      })
    ]);

    logger.info(`Article ${action.toLowerCase()}: ${article.headline} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Article ${action.toLowerCase()} successfully`
    });
  } catch (error) {
    logger.error('Article approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process article approval'
    });
  }
});

// @desc    Get pending articles for approval
// @route   GET /api/articles/pending/approval
// @access  Private (AD_MANAGER, ADMIN)
router.get('/pending/approval', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = 'createdAt',
      order = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { status: 'PENDING' };
    if (category) where.category = category;

    const orderBy = {};
    orderBy[sortBy] = order;

    const [articles, totalCount] = await Promise.all([
      prisma.newsArticle.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          priorityLevel: true,
          featuredImage: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              fullName: true,
              avatar: true
            }
          }
        }
      }),
      prisma.newsArticle.count({ where })
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
    logger.error('Get pending articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending articles'
    });
  }
});

// @desc    Get article approval history
// @route   GET /api/articles/:id/approval-history
// @access  Private (Author, AD_MANAGER, ADMIN)
router.get('/:id/approval-history', authenticate, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    // Get article to check permissions
    const article = await prisma.newsArticle.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check permissions
    const canView = req.user.role === 'ADMIN'
      || req.user.role === 'AD_MANAGER'
      || req.user.id === article.authorId;

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const approvalHistory = await prisma.approvalHistory.findMany({
      where: { newsId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        approver: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { approvalHistory }
    });
  } catch (error) {
    logger.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history'
    });
  }
});

// @desc    Update article share count
// @route   POST /api/articles/:id/share
// @access  Public
router.post('/:id/share', genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.newsArticle.update({
      where: { id },
      data: { shareCount: { increment: 1 } }
    });

    res.json({
      success: true,
      message: 'Share count updated'
    });
  } catch (error) {
    logger.error('Update share count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update share count'
    });
  }
});

// @desc    Track article view (explicit endpoint)
// @route   POST /api/articles/:id/view
// @access  Public
router.post('/:id/view', optionalAuth, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { timestamp = new Date() } = req.body || {};

    const article = await prisma.newsArticle.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        viewCount: true
      }
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Only increment views for published articles (matches GET behavior)
    if (article.status === 'PUBLISHED') {
      await prisma.newsArticle.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });

      // Track reading history if user is authenticated
      if (req.user) {
        await prisma.readingHistory.upsert({
          where: {
            userId_articleId: {
              userId: req.user.id,
              articleId: id
            }
          },
          update: { updatedAt: new Date(timestamp) },
          create: {
            userId: req.user.id,
            articleId: id
          }
        }).catch(() => {});
      }
    }

    res.json({
      success: true,
      message: 'View tracked successfully'
    });
  } catch (error) {
    logger.error('Track article view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view'
    });
  }
});

// @desc    Get trending articles
// @route   GET /api/articles/trending/list
// @access  Public
router.get('/trending/list', async (req, res) => {
  try {
    const { limit = 10, timeframe = '7d' } = req.query;

    // Calculate date based on timeframe
    const timeframes = {
      '1d': 1,
      '7d': 7,
      '30d': 30
    };

    const days = timeframes[timeframe] || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const articles = await prisma.newsArticle.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: {
          gte: fromDate,
          lte: new Date()
        }
      },
      take: parseInt(limit),
      orderBy: [
        { viewCount: 'desc' },
        { shareCount: 'desc' },
        { publishedAt: 'desc' }
      ],
      select: {
        id: true,
        headline: true,
        briefContent: true,
        category: true,
        featuredImage: true,
        viewCount: true,
        shareCount: true,
        publishedAt: true,
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: { articles }
    });
  } catch (error) {
    logger.error('Get trending articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending articles'
    });
  }
});

module.exports = router;