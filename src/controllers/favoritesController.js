// controllers/favoritesController.js
const prisma = require('../config/database');
const logger = require('../utils/logger');

const favoritesController = {
  // Get user's favorite articles
  getFavorites: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        sortBy = 'savedAt',
        order = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      const where = { userId: req.user.id };
      
      // Add category filter if specified
      if (category && category !== 'ALL') {
        where.article = {
          category: category,
          status: 'PUBLISHED'
        };
      } else {
        where.article = {
          status: 'PUBLISHED'
        };
      }

      // Build orderBy clause
      const orderBy = {};
      if (sortBy === 'savedAt') {
        orderBy.savedAt = order;
      } else {
        orderBy.article = { [sortBy]: order };
      }

      const [favorites, totalCount] = await Promise.all([
        prisma.userFavorite.findMany({
          where,
          skip,
          take,
          orderBy,
          select: {
            savedAt: true,
            article: {
              select: {
                id: true,
                headline: true,
                briefContent: true,
                category: true,
                priorityLevel: true,
                featuredImage: true,
                tags: true,
                slug: true,
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
            }
          }
        }),
        prisma.userFavorite.count({
          where: {
            userId: req.user.id,
            ...(category && category !== 'ALL' && {
              article: {
                category: category,
                status: 'PUBLISHED'
              }
            })
          }
        })
      ]);

      // Transform the response to include savedAt with article data
      const articlesWithFavoriteInfo = favorites.map(favorite => ({
        ...favorite.article,
        savedAt: favorite.savedAt,
        isFavorite: true
      }));

      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: {
          articles: articlesWithFavoriteInfo,
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
      logger.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch favorite articles'
      });
    }
  },

  // Add article to favorites
  addFavorite: async (req, res) => {
    try {
      const { articleId } = req.params;

      // Check if article exists and is published
      const article = await prisma.newsArticle.findUnique({
        where: { id: articleId },
        select: {
          id: true,
          headline: true,
          status: true
        }
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      if (article.status !== 'PUBLISHED') {
        return res.status(400).json({
          success: false,
          message: 'Only published articles can be favorited'
        });
      }

      // Check if already favorited
      const existingFavorite = await prisma.userFavorite.findUnique({
        where: {
          userId_newsId: {
            userId: req.user.id,
            newsId: articleId
          }
        }
      });

      if (existingFavorite) {
        return res.status(400).json({
          success: false,
          message: 'Article is already in favorites'
        });
      }

      // Add to favorites
      await prisma.userFavorite.create({
        data: {
          userId: req.user.id,
          newsId: articleId
        }
      });

      logger.info(`Article favorited: ${article.headline} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Article added to favorites successfully'
      });
    } catch (error) {
      logger.error('Add to favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add article to favorites'
      });
    }
  },

  // Remove article from favorites
  removeFavorite: async (req, res) => {
    try {
      const { articleId } = req.params;

      // Check if favorite exists
      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_newsId: {
            userId: req.user.id,
            newsId: articleId
          }
        },
        include: {
          article: {
            select: { headline: true }
          }
        }
      });

      if (!favorite) {
        return res.status(404).json({
          success: false,
          message: 'Article is not in favorites'
        });
      }

      // Remove from favorites
      await prisma.userFavorite.delete({
        where: {
          userId_newsId: {
            userId: req.user.id,
            newsId: articleId
          }
        }
      });

      logger.info(`Article unfavorited: ${favorite.article.headline} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Article removed from favorites successfully'
      });
    } catch (error) {
      logger.error('Remove from favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove article from favorites'
      });
    }
  },

  // Check if article is favorited
  checkFavoriteStatus: async (req, res) => {
    try {
      const { articleId } = req.params;

      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_newsId: {
            userId: req.user.id,
            newsId: articleId
          }
        },
        select: {
          savedAt: true
        }
      });

      res.json({
        success: true,
        data: {
          isFavorite: !!favorite,
          savedAt: favorite?.savedAt || null
        }
      });
    } catch (error) {
      logger.error('Check favorite status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check favorite status'
      });
    }
  },

  // Get favorites statistics
  getFavoritesStats: async (req, res) => {
    try {
      const userId = req.user.id;

      // Get various statistics
      const [
        totalFavorites,
        favoritesByCategory,
        recentFavorites,
        topAuthors
      ] = await Promise.all([
        // Total favorites count
        prisma.userFavorite.count({
          where: { userId }
        }),

        // Favorites grouped by category
        prisma.userFavorite.findMany({
          where: { userId },
          include: {
            article: {
              select: { category: true }
            }
          }
        }),

        // Recent favorites (last 7 days)
        prisma.userFavorite.count({
          where: {
            userId,
            savedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        // Top authors in favorites
        prisma.userFavorite.findMany({
          where: { userId },
          select: {
            article: {
              select: {
                author: {
                  select: {
                    id: true,
                    fullName: true,
                    avatar: true
                  }
                }
              }
            }
          },
          take: 100 // Limit to prevent performance issues
        })
      ]);

      // Process category statistics
      const categoryStats = {};
      favoritesByCategory.forEach(fav => {
        const category = fav.article.category;
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      });

      const categoryArray = Object.entries(categoryStats).map(([category, count]) => ({
        category,
        count
      }));

      // Process top authors
      const authorCounts = {};
      topAuthors.forEach(fav => {
        const author = fav.article.author;
        if (authorCounts[author.id]) {
          authorCounts[author.id].count++;
        } else {
          authorCounts[author.id] = {
            ...author,
            count: 1
          };
        }
      });

      const topAuthorsList = Object.values(authorCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const stats = {
        totalFavorites,
        recentFavorites,
        favoritesByCategory: categoryArray,
        topAuthors: topAuthorsList
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get favorites stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get favorites statistics'
      });
    }
  }
};

module.exports = favoritesController;

