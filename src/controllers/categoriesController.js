// controllers/categoriesController.js - FOR DYNAMIC CATEGORIES
const prisma = require('../config/database');
const logger = require('../utils/logger');

// Helper function to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const categoriesController = {
  // ==================== GET ALL CATEGORIES ====================
  getAllCategories: async (req, res) => {
    try {
      const { 
        includeInactive = 'false',
        sortBy = 'sortOrder',
        order = 'asc'
      } = req.query;

      const where = {};
      
      if (includeInactive !== 'true') {
        where.isActive = true;
      }

      const orderBy = {};
      orderBy[sortBy] = order;

      const categories = await prisma.category.findMany({
        where,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      // Get article counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          let articleCount = 0;
          
          try {
            articleCount = await prisma.newsArticle.count({
              where: {
                category: category.name.toUpperCase(),
                status: { in: ['PUBLISHED', 'APPROVED'] }
              }
            });
          } catch (error) {
            logger.error(`Error counting articles for category ${category.name}:`, error.message);
            articleCount = 0;
          }

          return {
            ...category,
            articleCount
          };
        })
      );

      res.json({
        success: true,
        data: {
          categories: categoriesWithCounts,
          totalCategories: categoriesWithCounts.length
        }
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  },

  // ==================== GET SINGLE CATEGORY ====================
  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Get article count
      let articleCount = 0;
      try {
        articleCount = await prisma.newsArticle.count({
          where: {
            category: category.name.toUpperCase(),
            status: { in: ['PUBLISHED', 'APPROVED'] }
          }
        });
      } catch (error) {
        logger.error(`Error counting articles for category ${category.name}:`, error.message);
      }

      res.json({
        success: true,
        data: {
          category: {
            ...category,
            articleCount
          }
        }
      });
    } catch (error) {
      logger.error('Get category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category',
        error: error.message
      });
    }
  },

  // ==================== CREATE CATEGORY ====================
  createCategory: async (req, res) => {
    try {
      const {
        name,
        displayName,
        description,
        iconUrl,
        color,
        sortOrder = 0
      } = req.body;

      if (!name || !displayName) {
        return res.status(400).json({
          success: false,
          message: 'Name and display name are required'
        });
      }

      const upperName = name.trim().toUpperCase();
      const slug = generateSlug(name);

      // Check for duplicate
      const existingCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name: upperName },
            { slug }
          ]
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      const category = await prisma.category.create({
        data: {
          name: upperName,
          displayName,
          description,
          slug,
          iconUrl,
          color,
          sortOrder: parseInt(sortOrder),
          createdBy: req.user.id
        },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      logger.info(`Category created: ${category.name} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category }
      });
    } catch (error) {
      logger.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
  },

  // ==================== UPDATE CATEGORY ====================
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const existingCategory = await prisma.category.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check for duplicate name if changing
      if (updateData.name) {
        const upperName = updateData.name.toUpperCase();
        
        if (upperName !== existingCategory.name) {
          const duplicate = await prisma.category.findFirst({
            where: {
              name: upperName,
              NOT: { id }
            }
          });

          if (duplicate) {
            return res.status(400).json({
              success: false,
              message: 'Category with this name already exists'
            });
          }

          updateData.name = upperName;
          updateData.slug = generateSlug(upperName);
        }
      }

      if (updateData.sortOrder !== undefined) {
        updateData.sortOrder = parseInt(updateData.sortOrder);
      }

      const category = await prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      logger.info(`Category updated: ${category.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: { category }
      });
    } catch (error) {
      logger.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message
      });
    }
  },

  // ==================== DELETE CATEGORY ====================
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const existingCategory = await prisma.category.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category has articles
      let articleCount = 0;
      try {
        articleCount = await prisma.newsArticle.count({
          where: {
            category: existingCategory.name.toUpperCase()
          }
        });
      } catch (error) {
        logger.error(`Error checking articles for category ${existingCategory.name}:`, error.message);
      }

      if (articleCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. It has ${articleCount} article(s). Please reassign or delete articles first.`
        });
      }

      await prisma.category.delete({
        where: { id }
      });

      logger.info(`Category deleted: ${existingCategory.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      logger.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message
      });
    }
  },

  // ==================== TOGGLE CATEGORY STATUS ====================
  toggleCategoryStatus: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          isActive: !category.isActive
        }
      });

      logger.info(`Category status toggled: ${updatedCategory.name} - Active: ${updatedCategory.isActive} by ${req.user.email}`);

      res.json({
        success: true,
        message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { category: updatedCategory }
      });
    } catch (error) {
      logger.error('Toggle category status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle category status',
        error: error.message
      });
    }
  },

  // ==================== GET ARTICLES BY CATEGORY ====================
  getArticlesByCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        order = 'desc',
        status
      } = req.query;

      const category = await prisma.category.findUnique({
        where: { id }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {
        category: category.name.toUpperCase()
      };

      if (status) {
        where.status = status;
      } else {
        where.status = { in: ['PUBLISHED', 'APPROVED'] };
        where.publishedAt = { lte: new Date() };
      }

      const orderByObj = {};
      orderByObj[sortBy] = order;

      const [articles, totalCount] = await Promise.all([
        prisma.newsArticle.findMany({
          where,
          skip,
          take,
          orderBy: orderByObj,
          select: {
            id: true,
            headline: true,
            briefContent: true,
            category: true,
            status: true,
            priorityLevel: true,
            featuredImage: true,
            tags: true,
            slug: true,
            viewCount: true,
            shareCount: true,
            publishedAt: true,
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
          category: {
            id: category.id,
            name: category.name,
            displayName: category.displayName
          },
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
      logger.error('Get articles by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch articles',
        error: error.message
      });
    }
  },

  // ==================== GET CATEGORY STATS ====================
  getCategoryStats: async (req, res) => {
    try {
      const { id } = req.params;
      const { timeframe = '30d' } = req.query;

      const category = await prisma.category.findUnique({
        where: { id }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

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
        totalShares
      ] = await Promise.all([
        prisma.newsArticle.count({
          where: {
            category: category.name.toUpperCase(),
            status: { in: ['PUBLISHED', 'APPROVED'] }
          }
        }),
        prisma.newsArticle.count({
          where: {
            category: category.name.toUpperCase(),
            status: { in: ['PUBLISHED', 'APPROVED'] },
            publishedAt: { gte: fromDate }
          }
        }),
        prisma.newsArticle.aggregate({
          where: {
            category: category.name.toUpperCase(),
            status: { in: ['PUBLISHED', 'APPROVED'] }
          },
          _sum: { viewCount: true }
        }),
        prisma.newsArticle.aggregate({
          where: {
            category: category.name.toUpperCase(),
            status: { in: ['PUBLISHED', 'APPROVED'] }
          },
          _sum: { shareCount: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          category: {
            id: category.id,
            name: category.name,
            displayName: category.displayName
          },
          stats: {
            totalArticles,
            recentArticles,
            totalViews: totalViews._sum.viewCount || 0,
            totalShares: totalShares._sum.shareCount || 0,
            averageViews: totalArticles > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalArticles) : 0
          },
          timeframe: {
            period: timeframe,
            fromDate,
            toDate: new Date()
          }
        }
      });
    } catch (error) {
      logger.error('Get category stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category stats',
        error: error.message
      });
    }
  }
};

module.exports = categoriesController;