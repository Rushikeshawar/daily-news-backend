// controllers/articlesController.js - COMPLETE FIXED VERSION
const prisma = require('../config/database');
const logger = require('../utils/logger');

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

const articlesController = {
  // Get all published articles (public) - FIXED CATEGORY FILTER
  getAllArticles: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        sortBy = 'publishedAt',
        order = 'desc',
        featured = false,
        includeTimeSaver = 'false'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      const where = {
        status: { in: ['PUBLISHED', 'APPROVED'] },
        publishedAt: { lte: new Date() }
      };

      // FIXED: Only add category filter if category is provided AND it's not 'ALL'
      if (category && category.toUpperCase() !== 'ALL') {
        where.category = category.toUpperCase();
      }

      if (featured === 'true' || featured === true) {
        where.priorityLevel = { gte: 5 };
      }

      const orderBy = {};
      orderBy[sortBy] = order;

      // Build select object
      const selectObj = {
        id: true,
        headline: true,
        briefContent: true,
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
        author: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      };

      // Include TimeSaver references if requested
      if (includeTimeSaver === 'true') {
        selectObj.timeSaverReferences = {
          select: {
            id: true,
            title: true,
            summary: true,
            contentType: true,
            publishedAt: true
          },
          take: 5,
          orderBy: { publishedAt: 'desc' }
        };
      }

      logger.info(`Fetching articles with filter: ${JSON.stringify(where)}`);

      const [articles, totalCount] = await Promise.all([
        prisma.newsArticle.findMany({
          where,
          skip,
          take,
          orderBy,
          select: selectObj
        }),
        prisma.newsArticle.count({ where })
      ]);

      logger.info(`Found ${articles.length} articles, total count: ${totalCount}`);

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
          isFavorite: favoriteIds.has(article.id),
          timeSaverCount: article.timeSaverReferences?.length || 0
        }));
      } else {
        articlesWithFavorites = articles.map(article => ({
          ...article,
          timeSaverCount: article.timeSaverReferences?.length || 0
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
          },
          filter: {
            category: category ? category.toUpperCase() : 'ALL',
            featured: featured === 'true' || featured === true
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
  },

  // Get article by ID or slug - ENHANCED
  getArticleById: async (req, res) => {
    try {
      const { identifier } = req.params;
      const { trackView = true, includeTimeSaver = 'true' } = req.query;

      const where = identifier.length === 25 && identifier.startsWith('c')
        ? { id: identifier }
        : { slug: identifier };

      // Build select object
      const selectObj = {
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
      };

      // Include TimeSaver references
      if (includeTimeSaver === 'true') {
        selectObj.timeSaverReferences = {
          select: {
            id: true,
            title: true,
            summary: true,
            category: true,
            contentType: true,
            imageUrl: true,
            iconName: true,
            bgColor: true,
            keyPoints: true,
            readTimeSeconds: true,
            viewCount: true,
            publishedAt: true
          },
          orderBy: { publishedAt: 'desc' }
        };
      }

      const article = await prisma.newsArticle.findUnique({
        where,
        select: selectObj
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      // Check permissions for unpublished articles
      if (article.status !== 'PUBLISHED' && article.status !== 'APPROVED') {
        if (!req.user) {
          return res.status(404).json({
            success: false,
            message: 'Article not found'
          });
        }

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
      if (trackView === 'true' && (article.status === 'PUBLISHED' || article.status === 'APPROVED')) {
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
            isFavorite,
            timeSaverCount: article.timeSaverReferences?.length || 0
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
  },

  // Get TimeSaver content linked to an article
  getArticleTimeSavers: async (req, res) => {
    try {
      const { id } = req.params;

      // Verify article exists
      const article = await prisma.newsArticle.findUnique({
        where: { id },
        select: { id: true, headline: true, status: true }
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      // Get all TimeSaver content linked to this article
      const timeSavers = await prisma.timeSaverContent.findMany({
        where: { linkedArticleId: id },
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          imageUrl: true,
          iconName: true,
          bgColor: true,
          keyPoints: true,
          contentType: true,
          viewCount: true,
          isPriority: true,
          publishedAt: true
        }
      });

      res.json({
        success: true,
        data: {
          article: {
            id: article.id,
            headline: article.headline
          },
          timeSavers,
          count: timeSavers.length
        }
      });
    } catch (error) {
      logger.error('Get article TimeSavers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch article TimeSavers'
      });
    }
  },

  // Create new article - FIXED
  createArticle: async (req, res) => {
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

      let slug = generateSlug(headline);
      
      const existingSlug = await prisma.newsArticle.findUnique({
        where: { slug }
      });

      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      // Determine status based on role
      let status = 'DRAFT';
      let publishedAt = null;
      
      if (req.user.role === 'AD_MANAGER' || req.user.role === 'ADMIN') {
        status = 'PUBLISHED';
        publishedAt = scheduledAt ? new Date(scheduledAt) : new Date();
      } else {
        status = 'PENDING';
      }

      const article = await prisma.newsArticle.create({
        data: {
          headline,
          briefContent,
          fullContent,
          category: category.toUpperCase(), // Ensure category is uppercase
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
          publishedAt
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

      logger.info(`Article created: ${article.headline} by ${req.user.email} with status ${status}, category: ${article.category}`);

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
  },

  // Update article
  updateArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const existingArticle = await prisma.newsArticle.findUnique({
        where: { id },
        select: {
          id: true,
          authorId: true,
          status: true,
          headline: true,
          category: true
        }
      });

      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      const canEdit = req.user.role === 'ADMIN'
        || req.user.role === 'AD_MANAGER'
        || req.user.id === existingArticle.authorId;

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Ensure category is uppercase if provided
      if (updateData.category) {
        updateData.category = updateData.category.toUpperCase();
      }

      if (updateData.headline && updateData.headline !== existingArticle.headline) {
        let newSlug = generateSlug(updateData.headline);
        
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

      if (updateData.status) {
        if (updateData.status === 'PUBLISHED' && existingArticle.status !== 'PUBLISHED') {
          updateData.publishedAt = new Date();
        }
        
        if (['PUBLISHED', 'APPROVED'].includes(updateData.status) && 
            !['AD_MANAGER', 'ADMIN'].includes(req.user.role)) {
          delete updateData.status;
        }
      }

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

      logger.info(`Article updated: ${article.headline} by ${req.user.email}, category: ${article.category}`);

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
  },

  // Delete article
  deleteArticle: async (req, res) => {
    try {
      const { id } = req.params;

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
  },

  // Get articles by author
  getArticlesByAuthor: async (req, res) => {
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
      if (category && category.toUpperCase() !== 'ALL') {
        where.category = category.toUpperCase();
      }

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
  },

  // Approve/Reject article - FIXED
  approveRejectArticle: async (req, res) => {
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

      const statusMap = {
        'APPROVED': 'PUBLISHED',
        'REJECTED': 'REJECTED',
        'CHANGES_REQUESTED': 'DRAFT'
      };

      const newStatus = statusMap[action];
      const updateData = {
        status: newStatus,
        approvedBy: req.user.id
      };

      if (action === 'APPROVED') {
        updateData.publishedAt = new Date();
      }

      await Promise.all([
        prisma.newsArticle.update({
          where: { id },
          data: updateData
        }),
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
  },

  // Get pending articles - FIXED
  getPendingArticles: async (req, res) => {
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
      if (category && category.toUpperCase() !== 'ALL') {
        where.category = category.toUpperCase();
      }

      const orderBy = {};
      orderBy[sortBy] = order;

      logger.info(`Fetching pending articles with where: ${JSON.stringify(where)}`);

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
            tags: true,
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

      logger.info(`Found ${articles.length} pending articles out of ${totalCount} total`);

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
  },

  // Get approval history
  getApprovalHistory: async (req, res) => {
    try {
      const { id } = req.params;

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
  },

  // Update share count
  updateShareCount: async (req, res) => {
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
  },

  // Track article view
  trackArticleView: async (req, res) => {
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

      if (article.status === 'PUBLISHED' || article.status === 'APPROVED') {
        await prisma.newsArticle.update({
          where: { id },
          data: { viewCount: { increment: 1 } }
        });

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
  },

  // Get trending articles
  getTrendingArticles: async (req, res) => {
    try {
      const { limit = 10, timeframe = '7d' } = req.query;

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
          status: { in: ['PUBLISHED', 'APPROVED'] },
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
          status: true,
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
  }
};

module.exports = articlesController;