// controllers/categoriesController.js
const prisma = require('../config/database');
const logger = require('../utils/logger');

// Define all available categories
const CATEGORIES = [
  'GENERAL', 'NATIONAL', 'INTERNATIONAL', 'POLITICS', 'BUSINESS',
  'TECHNOLOGY', 'SCIENCE', 'HEALTH', 'EDUCATION', 'ENVIRONMENT',
  'SPORTS', 'ENTERTAINMENT', 'CRIME', 'LIFESTYLE', 'FINANCE',
  'FOOD', 'FASHION', 'OTHERS'
];

// Helper function to format category display name
const formatCategoryDisplayName = (category) => {
  if (!category) return '';
  return category
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

const categoriesController = {
  // Get all categories with article counts
  getAllCategories: async (req, res) => {
    try {
      // Get article counts for each category
      const categoryStats = await prisma.newsArticle.groupBy({
        by: ['category'],
        where: { status: 'PUBLISHED' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      });

      // Create a map for easy lookup
      const statsMap = {};
      categoryStats.forEach(stat => {
        statsMap[stat.category] = stat._count.id;
      });

      // Build categories array with counts
      const categoriesWithCounts = CATEGORIES.map(category => ({
        name: category,
        displayName: formatCategoryDisplayName(category),
        articleCount: statsMap[category] || 0
      }));

      // Sort by article count (descending) but keep GENERAL first
      const sortedCategories = categoriesWithCounts.sort((a, b) => {
        if (a.name === 'GENERAL') return -1;
        if (b.name === 'GENERAL') return 1;
        return b.articleCount - a.articleCount;
      });

      res.json({
        success: true,
        data: {
          categories: sortedCategories,
          totalCategories: CATEGORIES.length
        }
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  },

  // Get trending categories
  getTrendingCategories: async (req, res) => {
    try {
      const { limit = 5, timeframe = '7d' } = req.query;

      // Calculate date based on timeframe
      const timeframes = {
        '1d': 1,
        '7d': 7,
        '30d': 30
      };

      const days = timeframes[timeframe] || 7;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const trendingCategories = await prisma.newsArticle.groupBy({
        by: ['category'],
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        _count: { id: true },
        _sum: { viewCount: true },
        orderBy: [
          { _sum: { viewCount: 'desc' } },
          { _count: { id: 'desc' } }
        ],
        take: parseInt(limit)
      });

      const trending = trendingCategories.map(category => ({
        name: category.category,
        displayName: formatCategoryDisplayName(category.category),
        articleCount: category._count.id,
        totalViews: category._sum.viewCount || 0,
        averageViews: category._count.id > 0 ? Math.round((category._sum.viewCount || 0) / category._count.id) : 0
      }));

      res.json({
        success: true,
        data: { trending }
      });
    } catch (error) {
      logger.error('Get trending categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending categories'
      });
    }
  },

  // Get articles by category
  getArticlesByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        order = 'desc',
        featured = false
      } = req.query;

      // Validate category exists and is valid
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category parameter is required'
        });
      }

      const upperCategory = category.toUpperCase();
      
      if (!CATEGORIES.includes(upperCategory)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
          validCategories: CATEGORIES
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      const where = {
        category: upperCategory,
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() }
      };

      if (featured === 'true' || featured === true) {
        where.priorityLevel = { gte: 5 };
      }

      // Build orderBy clause
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
          category: {
            name: upperCategory,
            displayName: formatCategoryDisplayName(upperCategory)
          },
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
      logger.error('Get articles by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch articles'
      });
    }
  },

  // Get category statistics
  getCategoryStats: async (req, res) => {
    try {
      const { category } = req.params;
      const { timeframe = '30d' } = req.query;

      // Validate category exists and is valid
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category parameter is required'
        });
      }

      const upperCategory = category.toUpperCase();

      if (!CATEGORIES.includes(upperCategory)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
          validCategories: CATEGORIES
        });
      }

      // Calculate date based on timeframe
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
        recentArticles,
        totalViews,
        totalShares,
        topArticles,
        authorStats
      ] = await Promise.all([
        // Total articles in category
        prisma.newsArticle.count({
          where: {
            category: upperCategory,
            status: 'PUBLISHED'
          }
        }),

        // Recent articles
        prisma.newsArticle.count({
          where: {
            category: upperCategory,
            status: 'PUBLISHED',
            publishedAt: { gte: fromDate }
          }
        }),

        // Total views
        prisma.newsArticle.aggregate({
          where: {
            category: upperCategory,
            status: 'PUBLISHED'
          },
          _sum: { viewCount: true }
        }),

        // Total shares
        prisma.newsArticle.aggregate({
          where: {
            category: upperCategory,
            status: 'PUBLISHED'
          },
          _sum: { shareCount: true }
        }),

        // Top articles in category
        prisma.newsArticle.findMany({
          where: {
            category: upperCategory,
            status: 'PUBLISHED',
            publishedAt: { gte: fromDate }
          },
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: {
            id: true,
            headline: true,
            viewCount: true,
            shareCount: true,
            publishedAt: true
          }
        }),

        // Top authors in category
        prisma.newsArticle.groupBy({
          by: ['authorId'],
          where: {
            category: upperCategory,
            status: 'PUBLISHED',
            publishedAt: { gte: fromDate }
          },
          _count: { id: true },
          _sum: { viewCount: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5
        })
      ]);

      // Get author details
      const authorIds = authorStats.map(stat => stat.authorId);
      const authors = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, fullName: true, avatar: true }
      });

      const authorMap = {};
      authors.forEach(author => {
        authorMap[author.id] = author;
      });

      const topAuthors = authorStats.map(stat => ({
        author: authorMap[stat.authorId],
        articleCount: stat._count.id,
        totalViews: stat._sum.viewCount || 0
      }));

      const stats = {
        category: {
          name: upperCategory,
          displayName: formatCategoryDisplayName(upperCategory)
        },
        overview: {
          totalArticles,
          recentArticles,
          totalViews: totalViews._sum.viewCount || 0,
          totalShares: totalShares._sum.shareCount || 0,
          averageViews: totalArticles > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalArticles) : 0
        },
        topArticles,
        topAuthors,
        timeframe: {
          period: timeframe,
          fromDate,
          toDate: new Date()
        }
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get category stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category statistics'
      });
    }
  },

  // Compare categories
  compareCategories: async (req, res) => {
    try {
      const { categories, timeframe = '30d' } = req.body;

      if (!Array.isArray(categories) || categories.length < 2 || categories.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Please provide 2-5 categories to compare'
        });
      }

      // Validate all categories exist and are valid
      const invalidCategories = categories.filter(cat => {
        if (!cat || typeof cat !== 'string') return true;
        return !CATEGORIES.includes(cat.toUpperCase());
      });

      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid categories: ${invalidCategories.join(', ')}`,
          validCategories: CATEGORIES
        });
      }

      // Calculate date based on timeframe
      const timeframes = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      };

      const days = timeframes[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const comparisons = await Promise.all(
        categories.map(async (category) => {
          const upperCategory = category.toUpperCase();
          
          const [articleCount, totalViews, totalShares] = await Promise.all([
            prisma.newsArticle.count({
              where: {
                category: upperCategory,
                status: 'PUBLISHED',
                publishedAt: { gte: fromDate }
              }
            }),
            prisma.newsArticle.aggregate({
              where: {
                category: upperCategory,
                status: 'PUBLISHED',
                publishedAt: { gte: fromDate }
              },
              _sum: { viewCount: true }
            }),
            prisma.newsArticle.aggregate({
              where: {
                category: upperCategory,
                status: 'PUBLISHED',
                publishedAt: { gte: fromDate }
              },
              _sum: { shareCount: true }
            })
          ]);

          return {
            category: upperCategory,
            displayName: formatCategoryDisplayName(upperCategory),
            articleCount,
            totalViews: totalViews._sum.viewCount || 0,
            totalShares: totalShares._sum.shareCount || 0,
            averageViews: articleCount > 0 ? Math.round((totalViews._sum.viewCount || 0) / articleCount) : 0,
            averageShares: articleCount > 0 ? Math.round((totalShares._sum.shareCount || 0) / articleCount) : 0
          };
        })
      );

      res.json({
        success: true,
        data: {
          comparisons,
          timeframe: {
            period: timeframe,
            fromDate,
            toDate: new Date()
          }
        }
      });
    } catch (error) {
      logger.error('Compare categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare categories'
      });
    }
  }
};

module.exports = categoriesController;