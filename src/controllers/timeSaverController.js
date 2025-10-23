// ============================================
// FILE: controllers/timeSaverController.js
// COMPLETE CONTROLLER WITH ALL FUNCTIONALITY
// ============================================

const prisma = require('../config/database');
const logger = require('../utils/logger');

class TimeSaverController {
  // ==================== PUBLIC ROUTES ====================

  /**
   * @desc    Get time saver content with enhanced filtering and categorization
   * @route   GET /api/time-saver/content
   * @access  Public
   */
  static async getContent(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        contentGroup,
        contentType,
        isPriority,
        sortBy = 'publishedAt',
        order = 'desc',
        includeLinked = 'true',
        search
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      const where = {};

      if (category && category !== 'ALL') {
        where.category = category;
      }

      if (contentType) {
        where.contentType = contentType;
      }

      if (isPriority !== undefined) {
        where.isPriority = isPriority === 'true';
      }

      // Search functionality
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { summary: { contains: search } },
          { tags: { contains: search } }
        ];
      }

      // Enhanced filtering for content groups
      if (contentGroup && contentGroup !== 'ALL') {
        switch (contentGroup) {
          case 'today_new':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            where.publishedAt = { gte: today };
            break;
          case 'breaking_critical':
            where.OR = [
              { isPriority: true },
              { contentType: 'DIGEST' }
            ];
            break;
          case 'weekly_highlights':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            where.AND = [
              { publishedAt: { gte: weekAgo } },
              { contentType: 'HIGHLIGHTS' }
            ];
            break;
          case 'monthly_top':
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            where.publishedAt = { gte: monthAgo };
            break;
          case 'brief_updates':
            where.OR = [
              { contentType: 'QUICK_UPDATE' },
              { readTimeSeconds: { lte: 60 } }
            ];
            break;
          case 'viral_buzz':
            where.viewCount = { gte: 1000 };
            break;
          case 'changing_norms':
            where.tags = { contains: 'social' };
            break;
        }
      }

      const orderBy = {};
      orderBy[sortBy] = order;

      // Build select object
      const selectObj = {
        id: true,
        title: true,
        summary: true,
        category: true,
        imageUrl: true,
        iconName: true,
        bgColor: true,
        keyPoints: true,
        sourceUrl: true,
        readTimeSeconds: true,
        viewCount: true,
        isPriority: true,
        contentType: true,
        publishedAt: true,
        tags: true,
        contentGroup: true,
        linkedArticleId: true,
        linkedAiArticleId: true,
        createdAt: true,
        updatedAt: true
      };

      // Include linked articles if requested
      if (includeLinked === 'true') {
        selectObj.linkedArticle = {
          select: {
            id: true,
            headline: true,
            briefContent: true,
            category: true,
            featuredImage: true,
            slug: true,
            viewCount: true,
            publishedAt: true,
            author: {
              select: {
                id: true,
                fullName: true,
                avatar: true
              }
            }
          }
        };
        selectObj.linkedAiArticle = {
          select: {
            id: true,
            headline: true,
            briefContent: true,
            category: true,
            featuredImage: true,
            viewCount: true,
            publishedAt: true,
            aiModel: true,
            aiApplication: true
          }
        };
      }

      const [content, totalCount] = await Promise.all([
        prisma.timeSaverContent.findMany({
          where,
          skip,
          take,
          orderBy,
          select: selectObj
        }),
        prisma.timeSaverContent.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: content,
        pagination: {
          page: parseInt(page),
          limit: take,
          totalCount,
          totalPages,
          hasMore: parseInt(page) < totalPages
        }
      });
    } catch (error) {
      logger.error('Error fetching time saver content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch time saver content',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get single TimeSaver content by ID with full linked article details
   * @route   GET /api/time-saver/content/:id
   * @access  Public
   */
  static async getContentById(req, res) {
    try {
      const { id } = req.params;

      const content = await prisma.timeSaverContent.findUnique({
        where: { id },
        include: {
          linkedArticle: {
            include: {
              author: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true,
                  email: true
                }
              }
            }
          },
          linkedAiArticle: true,
          views: {
            take: 10,
            orderBy: { timestamp: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true
                }
              }
            }
          },
          interactions: {
            take: 10,
            orderBy: { timestamp: 'desc' }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
              email: true
            }
          }
        }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Time saver content not found'
        });
      }

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      logger.error('Error fetching time saver content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch time saver content',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get all TimeSaver content linked to a specific article
   * @route   GET /api/time-saver/by-article/:articleId
   * @access  Public
   * @query   type=news|ai (default: news)
   */
  static async getContentByArticle(req, res) {
    try {
      const { articleId } = req.params;
      const { type = 'news' } = req.query;

      const where = {};
      if (type === 'ai') {
        where.linkedAiArticleId = articleId;
      } else {
        where.linkedArticleId = articleId;
      }

      const content = await prisma.timeSaverContent.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              slug: true
            }
          },
          linkedAiArticle: {
            select: {
              id: true,
              headline: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: content,
        count: content.length
      });
    } catch (error) {
      logger.error('Error fetching content by article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content by article',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get enhanced quick stats for dashboard with category counts
   * @route   GET /api/time-saver/stats
   * @access  Public
   */
  static async getStats(req, res) {
    try {
      const [
        totalContent,
        priorityCount,
        todayCount,
        categoryStats,
        contentTypeStats,
        totalViews,
        totalInteractions
      ] = await Promise.all([
        // Total content count
        prisma.timeSaverContent.count(),
        
        // Priority content count
        prisma.timeSaverContent.count({ where: { isPriority: true } }),
        
        // Today's content
        prisma.timeSaverContent.count({
          where: {
            publishedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        
        // Category breakdown
        prisma.timeSaverContent.groupBy({
          by: ['category'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        }),
        
        // Content type breakdown
        prisma.timeSaverContent.groupBy({
          by: ['contentType'],
          _count: { id: true }
        }),
        
        // Total views
        prisma.timeSaverView.count(),
        
        // Total interactions
        prisma.timeSaverInteraction.count()
      ]);

      // Get top viewed content
      const topViewed = await prisma.timeSaverContent.findMany({
        take: 5,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          viewCount: true,
          publishedAt: true
        }
      });

      // Get recent content
      const recentContent = await prisma.timeSaverContent.findMany({
        take: 5,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          isPriority: true,
          publishedAt: true
        }
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalContent,
            priorityCount,
            todayCount,
            totalViews,
            totalInteractions
          },
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            count: stat._count.id
          })),
          contentTypeStats: contentTypeStats.map(stat => ({
            type: stat.contentType,
            count: stat._count.id
          })),
          topViewed,
          recentContent
        }
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stats',
        error: error.message
      });
    }
  }

  /**
   * @desc    Get content by specific category group
   * @route   GET /api/time-saver/category/:group
   * @access  Public
   */
  static async getCategoryContent(req, res) {
    try {
      const { group } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [content, totalCount] = await Promise.all([
        prisma.timeSaverContent.findMany({
          where: { category: group },
          skip,
          take,
          orderBy: { publishedAt: 'desc' },
          include: {
            linkedArticle: {
              select: {
                id: true,
                headline: true,
                slug: true
              }
            },
            linkedAiArticle: {
              select: {
                id: true,
                headline: true
              }
            }
          }
        }),
        prisma.timeSaverContent.count({ where: { category: group } })
      ]);

      res.json({
        success: true,
        data: content,
        pagination: {
          page: parseInt(page),
          limit: take,
          totalCount,
          totalPages: Math.ceil(totalCount / take)
        }
      });
    } catch (error) {
      logger.error('Error fetching category content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category content',
        error: error.message
      });
    }
  }

  /**
   * @desc    Track time saver content view
   * @route   POST /api/time-saver/content/:id/view
   * @access  Public
   */
  static async trackView(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId || null;

      // Check if content exists
      const content = await prisma.timeSaverContent.findUnique({
        where: { id }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      // Create view record and increment view count
      await Promise.all([
        prisma.timeSaverView.create({
          data: {
            contentId: id,
            userId
          }
        }),
        prisma.timeSaverContent.update({
          where: { id },
          data: { viewCount: { increment: 1 } }
        })
      ]);

      res.json({
        success: true,
        message: 'View tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking view:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track view',
        error: error.message
      });
    }
  }

  /**
   * @desc    Track time saver content interaction
   * @route   POST /api/time-saver/content/:id/interaction
   * @access  Public
   */
  static async trackInteraction(req, res) {
    try {
      const { id } = req.params;
      const { interactionType } = req.body;
      const userId = req.user?.userId || null;

      // Validate interaction type
      const validTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'SAVE_FOR_LATER', 'MARK_AS_READ'];
      if (!validTypes.includes(interactionType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid interaction type. Must be one of: ${validTypes.join(', ')}`
        });
      }

      // Check if content exists
      const content = await prisma.timeSaverContent.findUnique({
        where: { id }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      // Create interaction record
      await prisma.timeSaverInteraction.create({
        data: {
          contentId: id,
          userId,
          interactionType
        }
      });

      res.json({
        success: true,
        message: 'Interaction tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking interaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track interaction',
        error: error.message
      });
    }
  }

  // ==================== PRIVATE ROUTES (EDITOR, AD_MANAGER) ====================

  /**
   * @desc    Create enhanced time saver content
   * @route   POST /api/time-saver/content
   * @access  Private (EDITOR, AD_MANAGER)
   */
  static async createContent(req, res) {
    try {
      const {
        title,
        summary,
        category,
        imageUrl,
        iconName,
        bgColor,
        keyPoints,
        sourceUrl,
        readTimeSeconds,
        isPriority = false,
        contentType = 'DIGEST',
        tags,
        contentGroup,
        linkedArticleId,
        linkedAiArticleId
      } = req.body;

      // Validation
      if (!title || !summary || !category) {
        return res.status(400).json({
          success: false,
          message: 'Title, summary, and category are required'
        });
      }

      // Validate contentType enum
      const validContentTypes = ['DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS'];
      if (!validContentTypes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`
        });
      }

      // Validate linkedArticleId if provided
      if (linkedArticleId) {
        const articleExists = await prisma.newsArticle.findUnique({
          where: { id: linkedArticleId }
        });
        if (!articleExists) {
          return res.status(404).json({
            success: false,
            message: 'Linked article not found'
          });
        }
      }

      // Validate linkedAiArticleId if provided
      if (linkedAiArticleId) {
        const aiArticleExists = await prisma.aiArticle.findUnique({
          where: { id: linkedAiArticleId }
        });
        if (!aiArticleExists) {
          return res.status(404).json({
            success: false,
            message: 'Linked AI article not found'
          });
        }
      }

      // Create content
      const content = await prisma.timeSaverContent.create({
        data: {
          title,
          summary,
          category,
          imageUrl,
          iconName,
          bgColor,
          keyPoints,
          sourceUrl,
          readTimeSeconds: readTimeSeconds || 60,
          isPriority,
          contentType,
          tags,
          contentGroup,
          linkedArticleId,
          linkedAiArticleId,
          publishedAt: new Date(),
          createdBy: req.user?.userId
        },
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              briefContent: true,
              category: true,
              slug: true,
              publishedAt: true
            }
          },
          linkedAiArticle: {
            select: {
              id: true,
              headline: true,
              briefContent: true,
              category: true,
              publishedAt: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      });

      logger.info(`Time saver content created: ${content.id} by user ${req.user?.userId}`);

      res.status(201).json({
        success: true,
        message: 'Time saver content created successfully',
        data: content
      });
    } catch (error) {
      logger.error('Error creating time saver content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create time saver content',
        error: error.message
      });
    }
  }

  /**
   * @desc    Update time saver content
   * @route   PUT /api/time-saver/content/:id
   * @access  Private (EDITOR, AD_MANAGER)
   */
  static async updateContent(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;
      delete updateData.publishedAt;
      delete updateData.viewCount;
      
      // Add updatedBy
      updateData.updatedBy = req.user?.userId;

      // Validate contentType if provided
      if (updateData.contentType) {
        const validContentTypes = ['DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS'];
        if (!validContentTypes.includes(updateData.contentType)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid contentType'
          });
        }
      }

      const content = await prisma.timeSaverContent.update({
        where: { id },
        data: updateData,
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              slug: true
            }
          },
          linkedAiArticle: {
            select: {
              id: true,
              headline: true
            }
          }
        }
      });

      logger.info(`Time saver content updated: ${id} by user ${req.user?.userId}`);

      res.json({
        success: true,
        message: 'Time saver content updated successfully',
        data: content
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Time saver content not found'
        });
      }
      logger.error('Error updating time saver content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update time saver content',
        error: error.message
      });
    }
  }

  /**
   * @desc    Delete time saver content
   * @route   DELETE /api/time-saver/content/:id
   * @access  Private (EDITOR, AD_MANAGER)
   */
  static async deleteContent(req, res) {
    try {
      const { id } = req.params;

      await prisma.timeSaverContent.delete({
        where: { id }
      });

      logger.info(`Time saver content deleted: ${id} by user ${req.user?.userId}`);

      res.json({
        success: true,
        message: 'Time saver content deleted successfully'
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Time saver content not found'
        });
      }
      logger.error('Error deleting time saver content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete time saver content',
        error: error.message
      });
    }
  }

  /**
   * @desc    Link existing TimeSaver content to an article
   * @route   POST /api/time-saver/content/:id/link
   * @access  Private (EDITOR, AD_MANAGER)
   * @body    { articleId: string, articleType: 'news'|'ai' }
   */
  static async linkToArticle(req, res) {
    try {
      const { id } = req.params;
      const { articleId, articleType = 'news' } = req.body;

      if (!articleId) {
        return res.status(400).json({
          success: false,
          message: 'articleId is required'
        });
      }

      // Validate article type
      if (!['news', 'ai'].includes(articleType)) {
        return res.status(400).json({
          success: false,
          message: 'articleType must be either "news" or "ai"'
        });
      }

      // Verify article exists
      if (articleType === 'news') {
        const article = await prisma.newsArticle.findUnique({
          where: { id: articleId }
        });
        if (!article) {
          return res.status(404).json({
            success: false,
            message: 'News article not found'
          });
        }
      } else {
        const aiArticle = await prisma.aiArticle.findUnique({
          where: { id: articleId }
        });
        if (!aiArticle) {
          return res.status(404).json({
            success: false,
            message: 'AI article not found'
          });
        }
      }

      // Update TimeSaver content
      const updateData = {};
      if (articleType === 'news') {
        updateData.linkedArticleId = articleId;
      } else {
        updateData.linkedAiArticleId = articleId;
      }
      updateData.updatedBy = req.user?.userId;

      const content = await prisma.timeSaverContent.update({
        where: { id },
        data: updateData,
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              slug: true
            }
          },
          linkedAiArticle: {
            select: {
              id: true,
              headline: true
            }
          }
        }
      });

      logger.info(`Article linked to TimeSaver: ${id} -> ${articleId} (${articleType})`);

      res.json({
        success: true,
        message: `${articleType === 'news' ? 'Article' : 'AI article'} linked successfully`,
        data: content
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'TimeSaver content not found'
        });
      }
      logger.error('Error linking article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to link article',
        error: error.message
      });
    }
  }

  /**
   * @desc    Unlink TimeSaver content from article
   * @route   POST /api/time-saver/content/:id/unlink
   * @access  Private (EDITOR, AD_MANAGER)
   * @body    { articleType: 'news'|'ai' }
   */
  static async unlinkFromArticle(req, res) {
    try {
      const { id } = req.params;
      const { articleType = 'news' } = req.body;

      // Validate article type
      if (!['news', 'ai'].includes(articleType)) {
        return res.status(400).json({
          success: false,
          message: 'articleType must be either "news" or "ai"'
        });
      }

      // Update TimeSaver content
      const updateData = {};
      if (articleType === 'news') {
        updateData.linkedArticleId = null;
      } else {
        updateData.linkedAiArticleId = null;
      }
      updateData.updatedBy = req.user?.userId;

      const content = await prisma.timeSaverContent.update({
        where: { id },
        data: updateData
      });

      logger.info(`Article unlinked from TimeSaver: ${id} (${articleType})`);

      res.json({
        success: true,
        message: `${articleType === 'news' ? 'Article' : 'AI article'} unlinked successfully`,
        data: content
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'TimeSaver content not found'
        });
      }
      logger.error('Error unlinking article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unlink article',
        error: error.message
      });
    }
  }

  /**
   * @desc    Bulk create sample content for testing categories
   * @route   POST /api/time-saver/seed-sample-data
   * @access  Private (EDITOR, AD_MANAGER)
   */
  static async seedSampleData(req, res) {
    try {
      const { count = 10 } = req.body;
      const userId = req.user?.userId;

      // Get active categories from database
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        select: { name: true, displayName: true }
      });

      if (categories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active categories found. Please create categories first.'
        });
      }

      const contentTypes = ['DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS'];
      const contentGroups = ['today_new', 'breaking_critical', 'weekly_highlights', 'monthly_top', 'brief_updates'];

      const sampleData = [];
      for (let i = 0; i < count; i++) {
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        const randomGroup = contentGroups[Math.floor(Math.random() * contentGroups.length)];
        
        sampleData.push({
          title: `Sample ${randomCategory.displayName} Content ${i + 1}`,
          summary: `This is a sample summary for ${randomCategory.displayName} content. It contains interesting information about the topic.`,
          category: randomCategory.name,
          imageUrl: `https://source.unsplash.com/800x600/?${randomCategory.name.toLowerCase()}`,
          keyPoints: `• Key point 1 about ${randomCategory.displayName}\n• Key point 2 with important details\n• Key point 3 highlighting main takeaways`,
          sourceUrl: `https://example.com/${randomCategory.name.toLowerCase()}`,
          readTimeSeconds: Math.floor(Math.random() * 180) + 60,
          isPriority: Math.random() > 0.7,
          contentType: randomType,
          contentGroup: randomGroup,
          tags: `${randomCategory.name}, sample, test`,
          publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          createdBy: userId
        });
      }

      const created = await prisma.timeSaverContent.createMany({
        data: sampleData
      });

      logger.info(`Sample data seeded: ${created.count} items by user ${userId}`);

      res.status(201).json({
        success: true,
        message: `Successfully created ${created.count} sample TimeSaver items`,
        data: { count: created.count }
      });
    } catch (error) {
      logger.error('Error seeding sample data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed sample data',
        error: error.message
      });
    }
  }

  // ==================== ANALYTICS ROUTES (AD_MANAGER, ADMIN) ====================

  /**
   * @desc    Get analytics
   * @route   GET /api/time-saver/analytics
   * @access  Private (AD_MANAGER, ADMIN)
   */
  static async getAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        category,
        contentType
      } = req.query;

      // Build date range filter
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }

      const where = {};
      if (Object.keys(dateFilter).length > 0) {
        where.publishedAt = dateFilter;
      }
      if (category) {
        where.category = category;
      }
      if (contentType) {
        where.contentType = contentType;
      }

      // Get comprehensive analytics
      const [
        totalContent,
        totalViews,
        totalInteractions,
        avgViewsPerContent,
        categoryPerformance,
        contentTypePerformance,
        topContent,
        recentActivity,
        dailyStats
      ] = await Promise.all([
        // Total content
        prisma.timeSaverContent.count({ where }),
        
        // Total views
        prisma.timeSaverView.count({
          where: {
            content: where
          }
        }),
        
        // Total interactions
        prisma.timeSaverInteraction.count({
          where: {
            content: where
          }
        }),
        
        // Average views per content
        prisma.timeSaverContent.aggregate({
          where,
          _avg: { viewCount: true }
        }),
        
        // Performance by category
        prisma.timeSaverContent.groupBy({
          by: ['category'],
          where,
          _count: { id: true },
          _sum: { viewCount: true },
          _avg: { viewCount: true },
          orderBy: { _sum: { viewCount: 'desc' } }
        }),
        
        // Performance by content type
        prisma.timeSaverContent.groupBy({
          by: ['contentType'],
          where,
          _count: { id: true },
          _sum: { viewCount: true },
          _avg: { viewCount: true }
        }),
        
        // Top performing content
        prisma.timeSaverContent.findMany({
          where,
          take: 10,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            title: true,
            category: true,
            contentType: true,
            viewCount: true,
            publishedAt: true,
            isPriority: true
          }
        }),
        
        // Recent activity (last 50 views)
        prisma.timeSaverView.findMany({
          take: 50,
          orderBy: { timestamp: 'desc' },
          include: {
            content: {
              select: {
                id: true,
                title: true,
                category: true
              }
            },
            user: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }),
        
        // Daily stats for the period
        prisma.$queryRaw`
          SELECT 
            DATE(published_at) as date,
            COUNT(*) as content_count,
            SUM(view_count) as total_views
          FROM time_saver_content
          WHERE published_at >= ${dateFilter.gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND published_at <= ${dateFilter.lte || new Date()}
          GROUP BY DATE(published_at)
          ORDER BY date DESC
        `
      ]);

      // Get interaction breakdown
      const interactionBreakdown = await prisma.timeSaverInteraction.groupBy({
        by: ['interactionType'],
        where: {
          content: where
        },
        _count: { id: true }
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalContent,
            totalViews,
            totalInteractions,
            avgViewsPerContent: avgViewsPerContent._avg.viewCount || 0
          },
          categoryPerformance: categoryPerformance.map(cat => ({
            category: cat.category,
            contentCount: cat._count.id,
            totalViews: cat._sum.viewCount || 0,
            avgViews: cat._avg.viewCount || 0
          })),
          contentTypePerformance: contentTypePerformance.map(type => ({
            type: type.contentType,
            contentCount: type._count.id,
            totalViews: type._sum.viewCount || 0,
            avgViews: type._avg.viewCount || 0
          })),
          interactionBreakdown: interactionBreakdown.map(int => ({
            type: int.interactionType,
            count: int._count.id
          })),
          topContent,
          recentActivity,
          dailyStats
        }
      });
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }
}

module.exports = TimeSaverController;