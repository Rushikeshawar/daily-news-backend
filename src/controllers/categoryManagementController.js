// controllers/categoryManagementController.js
const prisma = require('../config/database');
const logger = require('../utils/logger');

const categoryManagementController = {
  // Get all manually created categories
  getAllCategories: async (req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { articles: true }
          }
        }
      });

      const formattedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isActive: cat.isActive,
        articleCount: cat._count.articles,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      }));

      res.json({
        success: true,
        data: formattedCategories
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  },

  // Get single category by ID
  getCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { articles: true }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...category,
          articleCount: category._count.articles
        }
      });
    } catch (error) {
      logger.error('Get category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category'
      });
    }
  },

  // Create new category
  createCategory: async (req, res) => {
    try {
      const { name, description } = req.body;

      // Check if category with same name exists
      const existing = await prisma.category.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists'
        });
      }

      const category = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          isActive: true,
          createdBy: req.user.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true
        }
      });

      logger.info(`Category created: ${category.name} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      logger.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }
  },

  // Update category
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const existing = await prisma.category.findUnique({
        where: { id }
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if new name conflicts with another category
      if (name && name !== existing.name) {
        const nameExists = await prisma.category.findFirst({
          where: {
            name: {
              equals: name,
              mode: 'insensitive'
            },
            NOT: { id }
          }
        });

        if (nameExists) {
          return res.status(400).json({
            success: false,
            message: 'A category with this name already exists'
          });
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          name: name?.trim(),
          description: description?.trim(),
          isActive: isActive !== undefined ? isActive : existing.isActive,
          updatedBy: req.user.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { articles: true }
          }
        }
      });

      logger.info(`Category updated: ${category.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: {
          ...category,
          articleCount: category._count.articles
        }
      });
    } catch (error) {
      logger.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category'
      });
    }
  },

  // Delete category
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { articles: true }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check if category has articles
      if (category._count.articles > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category with ${category._count.articles} articles. Please reassign or delete the articles first.`
        });
      }

      await prisma.category.delete({
        where: { id }
      });

      logger.info(`Category deleted: ${category.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      logger.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category'
      });
    }
  },

  // Get articles by category
  getCategoryArticles: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        order = 'desc'
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
        categoryId: id,
        status: 'PUBLISHED'
      };

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
            description: category.description
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
      logger.error('Get category articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category articles'
      });
    }
  }
};

module.exports = categoryManagementController;