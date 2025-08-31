 
const express = require('express');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get user's favorite articles
// @route   GET /api/favorites
// @access  Private
router.get('/', authenticate, genericValidation.pagination, async (req, res) => {
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
});

// @desc    Add article to favorites
// @route   POST /api/favorites/:articleId
// @access  Private
router.post('/:articleId', authenticate, async (req, res) => {
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
});

// @desc    Remove article from favorites
// @route   DELETE /api/favorites/:articleId
// @access  Private
router.delete('/:articleId', authenticate, async (req, res) => {
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
});

// @desc    Check if article is favorited
// @route   GET /api/favorites/:articleId/status
// @access  Private
router.get('/:articleId/status', authenticate, async (req, res) => {
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
});

// @desc    Get favorites statistics
// @route   GET /api/favorites/stats
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
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
      prisma.userFavorite.groupBy({
        by: ['article.category'],
        where: { userId },
        _count: { newsId: true }
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
      favoritesByCategory: favoritesByCategory.map(item => ({
        category: item.article.category,
        count: item._count.newsId
      })),
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
});

// @desc    Clear all favorites
// @route   DELETE /api/favorites
// @access  Private
router.delete('/', authenticate, async (req, res) => {
  try {
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm that you want to clear all favorites by sending { "confirm": true }'
      });
    }

    const deletedCount = await prisma.userFavorite.deleteMany({
      where: { userId: req.user.id }
    });

    logger.info(`All favorites cleared for user: ${req.user.email} (${deletedCount.count} articles)`);

    res.json({
      success: true,
      message: `Successfully cleared ${deletedCount.count} favorite articles`
    });
  } catch (error) {
    logger.error('Clear favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear favorites'
    });
  }
});

// @desc    Export favorites
// @route   GET /api/favorites/export
// @access  Private
router.get('/export', authenticate, async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const favorites = await prisma.userFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { savedAt: 'desc' },
      select: {
        savedAt: true,
        article: {
          select: {
            id: true,
            headline: true,
            briefContent: true,
            category: true,
            slug: true,
            publishedAt: true,
            author: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    const exportData = favorites.map(fav => ({
      articleId: fav.article.id,
      headline: fav.article.headline,
      briefContent: fav.article.briefContent,
      category: fav.article.category,
      slug: fav.article.slug,
      author: fav.article.author.fullName,
      publishedAt: fav.article.publishedAt,
      savedAt: fav.savedAt
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Article ID,Headline,Brief Content,Category,Slug,Author,Published At,Saved At\n';
      const csvRows = exportData.map(item => 
        `"${item.articleId}","${item.headline?.replace(/"/g, '""') || ''}","${item.briefContent?.replace(/"/g, '""') || ''}","${item.category}","${item.slug || ''}","${item.author}","${item.publishedAt}","${item.savedAt}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="favorites.csv"');
      res.send(csvHeader + csvRows);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="favorites.json"');
      res.json({
        exportedAt: new Date(),
        totalFavorites: exportData.length,
        user: {
          id: req.user.id,
          email: req.user.email,
          fullName: req.user.fullName
        },
        favorites: exportData
      });
    }

    logger.info(`Favorites exported by user: ${req.user.email} (format: ${format})`);
  } catch (error) {
    logger.error('Export favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export favorites'
    });
  }
});

// @desc    Bulk favorite/unfavorite articles
// @route   POST /api/favorites/bulk
// @access  Private
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { articleIds, action } = req.body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of article IDs'
      });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "add" or "remove"'
      });
    }

    if (articleIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 100 articles at once'
      });
    }

    let result = { success: 0, failed: 0, errors: [] };

    if (action === 'add') {
      // Check which articles exist and are published
      const validArticles = await prisma.newsArticle.findMany({
        where: {
          id: { in: articleIds },
          status: 'PUBLISHED'
        },
        select: { id: true }
      });

      const validArticleIds = validArticles.map(a => a.id);

      // Check which ones are already favorited
      const existingFavorites = await prisma.userFavorite.findMany({
        where: {
          userId: req.user.id,
          newsId: { in: validArticleIds }
        },
        select: { newsId: true }
      });

      const existingIds = new Set(existingFavorites.map(f => f.newsId));
      const newFavoriteIds = validArticleIds.filter(id => !existingIds.has(id));

      if (newFavoriteIds.length > 0) {
        // Add new favorites
        const favoriteData = newFavoriteIds.map(id => ({
          userId: req.user.id,
          newsId: id
        }));

        await prisma.userFavorite.createMany({
          data: favoriteData,
          skipDuplicates: true
        });

        result.success = newFavoriteIds.length;
      }

      result.failed = articleIds.length - validArticleIds.length;
    } else {
      // Remove favorites
      const deletedFavorites = await prisma.userFavorite.deleteMany({
        where: {
          userId: req.user.id,
          newsId: { in: articleIds }
        }
      });

      result.success = deletedFavorites.count;
      result.failed = articleIds.length - deletedFavorites.count;
    }

    logger.info(`Bulk ${action} favorites: ${result.success} successful, ${result.failed} failed by ${req.user.email}`);

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: result
    });
  } catch (error) {
    logger.error('Bulk favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk favorites operation'
    });
  }
});

module.exports = router;