// controllers/customCategoriesController.js
const prisma = require('../config/database');
const logger = require('../utils/logger');

const customCategoriesController = {
  // Get all custom categories
  getAllCategories: async (req, res) => {
    try {
      const categories = await prisma.customCategory.findMany({
        include: {
          _count: {
            select: { articles: true }
          }
        },
        orderBy: { createdAt: 'desc' }
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
      logger.error('Get custom categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }
  },

  // Get single category
  getCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await prisma.customCategory.findUnique({
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

      res.json({
        success: true,
        data: {
          id: category.id,
          name: category.name,
          description: category.description,
          isActive: category.isActive,
          articleCount: category._count.articles,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
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

  // Create category
  createCategory: async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Check for duplicate name
      const existing = await prisma.customCategory.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive'
          }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }

      const category = await prisma.customCategory.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
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

      const category = await prisma.customCategory.findUnique({
        where: { id }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Check for duplicate name (excluding current category)
      if (name && name.trim() !== category.name) {
        const existing = await prisma.customCategory.findFirst({
          where: {
            name: {
              equals: name.trim(),
              mode: 'insensitive'
            },
            id: { not: id }
          }
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Category with this name already exists'
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedCategory = await prisma.customCategory.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: updatedCategory,
        message: 'Category updated successfully'
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

      const category = await prisma.customCategory.findUnique({
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
          message: `Cannot delete category with ${category._count.articles} article(s). Please reassign or delete the articles first.`
        });
      }

      await prisma.customCategory.delete({
        where: { id }
      });

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
  }
};

module.exports = customCategoriesController;