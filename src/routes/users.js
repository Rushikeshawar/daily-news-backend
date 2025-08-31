const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { userValidation, genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        preferences: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            authoredArticles: true,
            favorites: true,
            searchHistory: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get reading stats
    const readingStats = await prisma.readingHistory.aggregate({
      where: { userId: req.user.id },
      _sum: { timeSpent: true },
      _count: { id: true }
    });

    const profile = {
      ...user,
      stats: {
        articlesAuthored: user._count.authoredArticles,
        favoriteArticles: user._count.favorites,
        searchQueries: user._count.searchHistory,
        articlesRead: readingStats._count.id || 0,
        totalReadingTime: readingStats._sum.timeSpent || 0
      }
    };

    delete profile._count;

    res.json({
      success: true,
      data: { user: profile }
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', authenticate, userValidation.update, async (req, res) => {
  try {
    const { fullName, preferences, avatar } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (preferences !== undefined) updateData.preferences = preferences;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatar: true,
        preferences: true,
        updatedAt: true
      }
    });

    logger.info(`User profile updated: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @desc    Get user's reading history
// @route   GET /api/users/reading-history
// @access  Private
router.get('/reading-history', authenticate, genericValidation.pagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'updatedAt', order = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const orderBy = {};
    orderBy[sortBy] = order;

    const [readingHistory, totalCount] = await Promise.all([
      prisma.readingHistory.findMany({
        where: { userId: req.user.id },
        skip,
        take,
        orderBy,
        select: {
          timeSpent: true,
          readProgress: true,
          lastPosition: true,
          createdAt: true,
          updatedAt: true,
          article: {
            select: {
              id: true,
              headline: true,
              briefContent: true,
              category: true,
              featuredImage: true,
              slug: true,
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
      prisma.readingHistory.count({
        where: { userId: req.user.id }
      })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        readingHistory,
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
    logger.error('Get reading history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reading history'
    });
  }
});

// @desc    Update reading progress
// @route   PUT /api/users/reading-progress/:articleId
// @access  Private
router.put('/reading-progress/:articleId', authenticate, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { timeSpent, readProgress, lastPosition } = req.body;

    // Validate article exists and is published
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { id: true, status: true }
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
        message: 'Cannot track reading progress for unpublished articles'
      });
    }

    // Update or create reading history
    const updateData = {};
    if (timeSpent !== undefined) updateData.timeSpent = Math.max(0, parseInt(timeSpent));
    if (readProgress !== undefined) updateData.readProgress = Math.max(0, Math.min(1, parseFloat(readProgress)));
    if (lastPosition !== undefined) updateData.lastPosition = Math.max(0, parseInt(lastPosition));

    const readingRecord = await prisma.readingHistory.upsert({
      where: {
        userId_articleId: {
          userId: req.user.id,
          articleId: articleId
        }
      },
      update: updateData,
      create: {
        userId: req.user.id,
        articleId: articleId,
        ...updateData
      }
    });

    res.json({
      success: true,
      message: 'Reading progress updated',
      data: { readingRecord }
    });
  } catch (error) {
    logger.error('Update reading progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reading progress'
    });
  }
});

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get comprehensive dashboard stats
    const [
      totalFavorites,
      recentFavorites,
      totalArticlesRead,
      articlesReadThisWeek,
      totalReadingTime,
      readingTimeThisWeek,
      authoredArticles,
      recentSearches,
      readingStreak
    ] = await Promise.all([
      // Total favorites
      prisma.userFavorite.count({
        where: { userId }
      }),

      // Recent favorites (last 7 days)
      prisma.userFavorite.count({
        where: {
          userId,
          savedAt: { gte: weekAgo }
        }
      }),

      // Total articles read
      prisma.readingHistory.count({
        where: { userId }
      }),

      // Articles read this week
      prisma.readingHistory.count({
        where: {
          userId,
          updatedAt: { gte: weekAgo }
        }
      }),

      // Total reading time
      prisma.readingHistory.aggregate({
        where: { userId },
        _sum: { timeSpent: true }
      }),

      // Reading time this week
      prisma.readingHistory.aggregate({
        where: {
          userId,
          updatedAt: { gte: weekAgo }
        },
        _sum: { timeSpent: true }
      }),

      // Authored articles (if user is editor/admin/ad_manager)
      ['EDITOR', 'AD_MANAGER', 'ADMIN'].includes(req.user.role)
        ? prisma.newsArticle.groupBy({
            by: ['status'],
            where: { authorId: userId },
            _count: { id: true }
          })
        : [],

      // Recent searches
      prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          query: true,
          results: true,
          createdAt: true
        }
      }),

      // Calculate reading streak (consecutive days with reading activity)
      prisma.$queryRaw`
        SELECT COUNT(*) as streak_days
        FROM (
          SELECT DATE(updated_at) as reading_date,
                 ROW_NUMBER() OVER (ORDER BY DATE(updated_at) DESC) as rn,
                 DATE(updated_at) + INTERVAL ROW_NUMBER() OVER (ORDER BY DATE(updated_at) DESC) DAY as expected_date
          FROM reading_history 
          WHERE user_id = ${userId}
          GROUP BY DATE(updated_at)
          ORDER BY DATE(updated_at) DESC
        ) as reading_days
        WHERE reading_date = expected_date - INTERVAL 1 DAY
        ORDER BY reading_date DESC
        LIMIT 1
      `
    ]);

    // Process authored articles data
    const authoredStats = {};
    if (Array.isArray(authoredArticles)) {
      authoredArticles.forEach(item => {
        authoredStats[item.status.toLowerCase()] = item._count.id;
      });
    }

    // Get favorite categories
    const favoriteCategories = await prisma.userFavorite.groupBy({
      by: ['article.category'],
      where: { userId },
      _count: { newsId: true },
      orderBy: { _count: { newsId: 'desc' } },
      take: 5
    });

    const dashboardData = {
      favorites: {
        total: totalFavorites,
        recent: recentFavorites
      },
      reading: {
        totalArticles: totalArticlesRead,
        articlesThisWeek: articlesReadThisWeek,
        totalTime: totalReadingTime._sum.timeSpent || 0,
        timeThisWeek: readingTimeThisWeek._sum.timeSpent || 0,
        streak: readingStreak.length > 0 ? readingStreak[0].streak_days : 0
      },
      authored: {
        draft: authoredStats.draft || 0,
        pending: authoredStats.pending || 0,
        approved: authoredStats.approved || 0,
        published: authoredStats.published || 0,
        rejected: authoredStats.rejected || 0
      },
      recentSearches,
      favoriteCategories: favoriteCategories.map(cat => ({
        category: cat.article.category,
        count: cat._count.newsId
      }))
    };

    res.json({
      success: true,
      data: { dashboard: dashboardData }
    });
  } catch (error) {
    logger.error('Get user dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (ADMIN)
router.get('/', authenticate, authorize('ADMIN'), genericValidation.pagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = order;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          avatar: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              authoredArticles: true,
              favorites: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        users,
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
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (ADMIN)
router.get('/:id', authenticate, authorize('ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        preferences: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            authoredArticles: true,
            favorites: true,
            searchHistory: true,
            readingHistory: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (ADMIN)
router.put('/:id', authenticate, authorize('ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        updatedAt: true
      }
    });

    logger.info(`User updated: ${existingUser.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (ADMIN)
router.delete('/:id', authenticate, authorize('ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    logger.info(`User deleted: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// @desc    Get user activity summary
// @route   GET /api/users/:id/activity
// @access  Private (ADMIN or own profile)
router.get('/:id/activity', authenticate, genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { timeframe = '30d' } = req.query;

    // Check permissions
    if (id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate date range
    const timeframes = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const days = timeframes[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      articlesRead,
      searchQueries,
      favoriteActions,
      authoredArticles
    ] = await Promise.all([
      // Articles read
      prisma.readingHistory.count({
        where: {
          userId: id,
          updatedAt: { gte: fromDate }
        }
      }),

      // Search queries
      prisma.searchHistory.count({
        where: {
          userId: id,
          createdAt: { gte: fromDate }
        }
      }),

      // Favorite actions
      prisma.userFavorite.count({
        where: {
          userId: id,
          savedAt: { gte: fromDate }
        }
      }),

      // Authored articles (if applicable)
      prisma.newsArticle.count({
        where: {
          authorId: id,
          createdAt: { gte: fromDate }
        }
      })
    ]);

    const activity = {
      timeframe,
      fromDate,
      toDate: new Date(),
      metrics: {
        articlesRead,
        searchQueries,
        favoriteActions,
        authoredArticles
      }
    };

    res.json({
      success: true,
      data: { activity }
    });
  } catch (error) {
    logger.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity'
    });
  }
});

module.exports = router;