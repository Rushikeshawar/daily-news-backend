// controllers/timeSaverController.js
const prisma = require('../config/database');
const logger = require('../utils/logger');

class TimeSaverController {
  // @desc    Get time saver content with enhanced filtering and linked articles
  static async getContent(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        contentGroup,
        sortBy = 'publishedAt',
        order = 'desc',
        includeLinked = 'true'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {};
      if (category && category !== 'ALL') {
        where.category = category;
      }
      
      // Enhanced filtering for content groups
      if (contentGroup) {
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
            where.OR = [
              { viewCount: { gte: 1000 } },
              { tags: { contains: 'viral' } },
              { tags: { contains: 'trending' } }
            ];
            break;
          case 'changing_norms':
            where.OR = [
              { category: { contains: 'society' } },
              { category: { contains: 'culture' } },
              { tags: { contains: 'social' } }
            ];
            break;
        }
      }

      const orderBy = {};
      orderBy[sortBy] = order;

      // Build select object with optional linked articles
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
        linkedAiArticleId: true
      };

      // Include linked article details if requested
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
        data: {
          content,
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
      logger.error('Get time saver content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch time saver content'
      });
    }
  }

  // @desc    Get single TimeSaver content with full linked article details
  static async getContentById(req, res) {
    try {
      const { id } = req.params;

      const content = await prisma.timeSaverContent.findUnique({
        where: { id },
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              briefContent: true,
              fullContent: true,
              category: true,
              featuredImage: true,
              slug: true,
              viewCount: true,
              shareCount: true,
              publishedAt: true,
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
          linkedAiArticle: {
            select: {
              id: true,
              headline: true,
              briefContent: true,
              fullContent: true,
              category: true,
              featuredImage: true,
              viewCount: true,
              shareCount: true,
              publishedAt: true,
              aiModel: true,
              aiApplication: true,
              companyMentioned: true,
              technologyType: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'TimeSaver content not found'
        });
      }

      res.json({
        success: true,
        data: { content }
      });
    } catch (error) {
      logger.error('Get TimeSaver content by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch TimeSaver content'
      });
    }
  }

  // @desc    Get all TimeSaver content linked to a specific article
  static async getContentByArticle(req, res) {
    try {
      const { articleId } = req.params;
      const { type = 'news' } = req.query; // 'news' or 'ai'

      const where = type === 'ai' 
        ? { linkedAiArticleId: articleId }
        : { linkedArticleId: articleId };

      const content = await prisma.timeSaverContent.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          imageUrl: true,
          iconName: true,
          bgColor: true,
          contentType: true,
          viewCount: true,
          publishedAt: true
        }
      });

      res.json({
        success: true,
        data: {
          content,
          articleId,
          articleType: type,
          count: content.length
        }
      });
    } catch (error) {
      logger.error('Get content by article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content by article'
      });
    }
  }

  // @desc    Get enhanced quick stats for dashboard with category counts
  static async getStats(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const [
        storiesCount,
        updatesCount,
        breakingCount,
        todayNewCount,
        criticalCount,
        weeklyCount,
        monthlyCount,
        viralBuzzCount,
        changingNormsCount,
        linkedArticlesCount,
        linkedAiArticlesCount,
        recentContent
      ] = await Promise.all([
        prisma.timeSaverContent.count({
          where: {
            contentType: { in: ['DIGEST', 'BRIEFING', 'SUMMARY'] },
            publishedAt: { gte: today }
          }
        }),

        prisma.timeSaverContent.count({
          where: {
            contentType: { in: ['QUICK_UPDATE', 'HIGHLIGHTS'] },
            publishedAt: { gte: today }
          }
        }),

        prisma.breakingNews ? prisma.breakingNews.count({
          where: { timestamp: { gte: today } }
        }).catch(() => 0) : Promise.resolve(0),

        prisma.timeSaverContent.count({
          where: { publishedAt: { gte: today } }
        }),

        prisma.timeSaverContent.count({
          where: {
            OR: [
              { isPriority: true },
              { contentType: 'DIGEST' }
            ]
          }
        }),

        prisma.timeSaverContent.count({
          where: {
            publishedAt: { gte: weekAgo },
            contentType: 'HIGHLIGHTS'
          }
        }),

        prisma.timeSaverContent.count({
          where: { publishedAt: { gte: monthAgo } }
        }),

        prisma.timeSaverContent.count({
          where: {
            OR: [
              { viewCount: { gte: 1000 } },
              { tags: { contains: 'viral' } },
              { tags: { contains: 'trending' } }
            ]
          }
        }),

        prisma.timeSaverContent.count({
          where: {
            OR: [
              { category: { contains: 'society' } },
              { category: { contains: 'culture' } },
              { tags: { contains: 'social' } }
            ]
          }
        }),

        // Count linked articles
        prisma.timeSaverContent.count({
          where: { linkedArticleId: { not: null } }
        }),

        // Count linked AI articles
        prisma.timeSaverContent.count({
          where: { linkedAiArticleId: { not: null } }
        }),

        prisma.timeSaverContent.findFirst({
          orderBy: { publishedAt: 'desc' },
          select: { publishedAt: true }
        })
      ]);

      const stats = {
        storiesCount,
        updatesCount,
        breakingCount,
        todayNewCount: Math.min(todayNewCount, 5),
        criticalCount: Math.min(criticalCount, 7),
        weeklyCount: Math.min(weeklyCount, 15),
        monthlyCount: Math.min(monthlyCount, 30),
        viralBuzzCount: Math.min(viralBuzzCount, 10),
        changingNormsCount: Math.min(changingNormsCount, 10),
        linkedArticlesCount,
        linkedAiArticlesCount,
        totalLinkedCount: linkedArticlesCount + linkedAiArticlesCount,
        lastUpdated: recentContent?.publishedAt || new Date()
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Get enhanced time saver stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch time saver stats'
      });
    }
  }

  // @desc    Get content by specific category group
  static async getCategoryContent(req, res) {
    try {
      const { group } = req.params;
      const { limit = 20, includeLinked = 'true' } = req.query;
      
      const where = {};
      const take = Math.min(parseInt(limit), 50);
      
      switch (group) {
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
          where.OR = [
            { viewCount: { gte: 1000 } },
            { tags: { contains: 'viral' } },
            { tags: { contains: 'trending' } }
          ];
          break;
        case 'changing_norms':
          where.OR = [
            { category: { contains: 'society' } },
            { category: { contains: 'culture' } },
            { tags: { contains: 'social' } }
          ];
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid category group'
          });
      }

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
        linkedAiArticleId: true
      };

      if (includeLinked === 'true') {
        selectObj.linkedArticle = {
          select: {
            id: true,
            headline: true,
            slug: true,
            category: true,
            featuredImage: true
          }
        };
        selectObj.linkedAiArticle = {
          select: {
            id: true,
            headline: true,
            category: true,
            featuredImage: true
          }
        };
      }

      const content = await prisma.timeSaverContent.findMany({
        where,
        take,
        orderBy: [
          { isPriority: 'desc' },
          { publishedAt: 'desc' }
        ],
        select: selectObj
      });

      res.json({
        success: true,
        data: {
          content,
          category: group,
          totalCount: content.length
        }
      });
    } catch (error) {
      logger.error('Get category content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category content'
      });
    }
  }

  // @desc    Create enhanced time saver content with article linking
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
        contentGroup,
        tags = [],
        linkedArticleId,
        linkedAiArticleId
      } = req.body;

      if (!title || !summary || !category) {
        return res.status(400).json({
          success: false,
          message: 'Title, summary, and category are required'
        });
      }

      const validContentTypes = ['DIGEST', 'QUICK_UPDATE', 'BRIEFING', 'SUMMARY', 'HIGHLIGHTS'];
      if (!validContentTypes.includes(contentType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content type'
        });
      }

      // Validate linked articles if provided
      if (linkedArticleId) {
        const article = await prisma.newsArticle.findUnique({
          where: { id: linkedArticleId },
          select: { id: true, status: true }
        });
        
        if (!article) {
          return res.status(400).json({
            success: false,
            message: 'Linked article not found'
          });
        }
        
        if (article.status !== 'PUBLISHED') {
          return res.status(400).json({
            success: false,
            message: 'Can only link to published articles'
          });
        }
      }

      if (linkedAiArticleId) {
        const aiArticle = await prisma.aiArticle.findUnique({
          where: { id: linkedAiArticleId },
          select: { id: true }
        });
        
        if (!aiArticle) {
          return res.status(400).json({
            success: false,
            message: 'Linked AI article not found'
          });
        }
      }

      // Process tags
      let processedTags = [];
      if (typeof tags === 'string') {
        processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        processedTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
      }

      const content = await prisma.timeSaverContent.create({
        data: {
          title,
          summary,
          category,
          imageUrl,
          iconName,
          bgColor,
          keyPoints: Array.isArray(keyPoints) ? keyPoints.join('|') : keyPoints,
          sourceUrl,
          readTimeSeconds: readTimeSeconds ? parseInt(readTimeSeconds) : null,
          isPriority,
          contentType,
          contentGroup,
          tags: processedTags.join(','),
          linkedArticleId,
          linkedAiArticleId,
          publishedAt: new Date(),
          createdBy: req.user.id
        },
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              slug: true,
              category: true
            }
          },
          linkedAiArticle: {
            select: {
              id: true,
              headline: true,
              category: true
            }
          }
        }
      });

      logger.info(`Time saver content created: ${title} by ${req.user.email} (${req.user.role})`);

      res.status(201).json({
        success: true,
        message: 'Time saver content created successfully',
        data: { content }
      });
    } catch (error) {
      logger.error('Create time saver content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create time saver content'
      });
    }
  }

  // @desc    Update time saver content with article linking
  static async updateContent(req, res) {
    try {
      const { id } = req.params;
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
        isPriority,
        contentType,
        contentGroup,
        tags,
        linkedArticleId,
        linkedAiArticleId
      } = req.body;

      const existingContent = await prisma.timeSaverContent.findUnique({
        where: { id },
        select: { id: true, title: true }
      });

      if (!existingContent) {
        return res.status(404).json({
          success: false,
          message: 'Time saver content not found'
        });
      }

      // Validate linked articles if provided
      if (linkedArticleId !== undefined && linkedArticleId !== null) {
        const article = await prisma.newsArticle.findUnique({
          where: { id: linkedArticleId },
          select: { id: true, status: true }
        });
        
        if (!article) {
          return res.status(400).json({
            success: false,
            message: 'Linked article not found'
          });
        }
        
        if (article.status !== 'PUBLISHED') {
          return res.status(400).json({
            success: false,
            message: 'Can only link to published articles'
          });
        }
      }

      if (linkedAiArticleId !== undefined && linkedAiArticleId !== null) {
        const aiArticle = await prisma.aiArticle.findUnique({
          where: { id: linkedAiArticleId },
          select: { id: true }
        });
        
        if (!aiArticle) {
          return res.status(400).json({
            success: false,
            message: 'Linked AI article not found'
          });
        }
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (summary !== undefined) updateData.summary = summary;
      if (category !== undefined) updateData.category = category;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (iconName !== undefined) updateData.iconName = iconName;
      if (bgColor !== undefined) updateData.bgColor = bgColor;
      if (keyPoints !== undefined) {
        updateData.keyPoints = Array.isArray(keyPoints) ? keyPoints.join('|') : keyPoints;
      }
      if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
      if (readTimeSeconds !== undefined) updateData.readTimeSeconds = parseInt(readTimeSeconds);
      if (isPriority !== undefined) updateData.isPriority = isPriority;
      if (contentType !== undefined) updateData.contentType = contentType;
      if (contentGroup !== undefined) updateData.contentGroup = contentGroup;
      if (linkedArticleId !== undefined) updateData.linkedArticleId = linkedArticleId;
      if (linkedAiArticleId !== undefined) updateData.linkedAiArticleId = linkedAiArticleId;
      
      if (tags !== undefined) {
        let processedTags = [];
        if (typeof tags === 'string') {
          processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(tags)) {
          processedTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
        }
        updateData.tags = processedTags.join(',');
      }
      
      updateData.updatedAt = new Date();
      updateData.updatedBy = req.user.id;

      const content = await prisma.timeSaverContent.update({
        where: { id },
        data: updateData,
        include: {
          linkedArticle: {
            select: {
              id: true,
              headline: true,
              slug: true,
              category: true
            }
          },
          linkedAiArticle: {
            select: {
              id: true,
              headline: true,
              category: true
            }
          }
        }
      });

      logger.info(`Time saver content updated: ${id} by ${req.user.email} (${req.user.role})`);

      res.json({
        success: true,
        message: 'Time saver content updated successfully',
        data: { content }
      });
    } catch (error) {
      logger.error('Update time saver content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update time saver content'
      });
    }
  }

  // @desc    Delete time saver content
  static async deleteContent(req, res) {
    try {
      const { id } = req.params;

      const existingContent = await prisma.timeSaverContent.findUnique({
        where: { id },
        select: { id: true, title: true }
      });

      if (!existingContent) {
        return res.status(404).json({
          success: false,
          message: 'Time saver content not found'
        });
      }

      await prisma.timeSaverContent.delete({
        where: { id }
      });

      logger.info(`Time saver content deleted: ${id} by ${req.user.email} (${req.user.role})`);

      res.json({
        success: true,
        message: 'Time saver content deleted successfully'
      });
    } catch (error) {
      logger.error('Delete time saver content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete time saver content'
      });
    }
  }

  // @desc    Track time saver content view
  static async trackView(req, res) {
    try {
      const { id } = req.params;
      const { timestamp = new Date() } = req.body;

      if (!id || id.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content ID'
        });
      }

      const content = await prisma.timeSaverContent.findUnique({
        where: { id },
        select: { id: true, viewCount: true }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      await prisma.timeSaverContent.update({
        where: { id },
        data: { 
          viewCount: { 
            increment: 1 
          }
        }
      });

      if (req.user) {
        try {
          await prisma.timeSaverView.create({
            data: {
              contentId: id,
              userId: req.user.id,
              timestamp: new Date(timestamp)
            }
          });
        } catch (viewError) {
          console.warn('Failed to create user view record:', viewError.message);
        }
      }

      res.json({
        success: true,
        message: 'View tracked successfully',
        data: {
          viewCount: content.viewCount + 1
        }
      });

    } catch (error) {
      console.error('Track time saver content view error:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }
      
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'View already recorded'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to track view'
      });
    }
  }

  // @desc    Track time saver content interaction
  static async trackInteraction(req, res) {
    try {
      const { id } = req.params;
      const { interactionType, timestamp = new Date() } = req.body;

      if (!id || id.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Invalid content ID'
        });
      }

      const validTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'SAVE_FOR_LATER', 'MARK_AS_READ'];
      if (!validTypes.includes(interactionType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid interaction type'
        });
      }

      const content = await prisma.timeSaverContent.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      try {
        await prisma.timeSaverInteraction.create({
          data: {
            contentId: id,
            userId: req.user?.id || null,
            interactionType,
            timestamp: new Date(timestamp)
          }
        });
      } catch (interactionError) {
        console.warn('Failed to create interaction record:', interactionError.message);
      }

      res.json({
        success: true,
        message: 'Interaction tracked successfully'
      });

    } catch (error) {
      console.error('Track time saver content interaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track interaction'
      });
    }
  }

  // @desc    Get analytics
  static async getAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;

      const timeframes = {
        '7d': 7,
        '30d': 30,
        '90d': 90
      };

      const days = timeframes[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [
        totalContent,
        totalViews,
        topPerforming,
        linkedStats
      ] = await Promise.all([
        prisma.timeSaverContent.count({
          where: { publishedAt: { gte: fromDate } }
        }),

        prisma.timeSaverContent.aggregate({
          where: { publishedAt: { gte: fromDate } },
          _sum: { viewCount: true }
        }),

        prisma.timeSaverContent.findMany({
          where: { publishedAt: { gte: fromDate } },
          take: 10,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            title: true,
            category: true,
            viewCount: true,
            contentType: true,
            publishedAt: true,
            linkedArticleId: true,
            linkedAiArticleId: true
          }
        }),

        // Get linked article statistics
        prisma.timeSaverContent.groupBy({
          by: ['linkedArticleId'],
          where: {
            publishedAt: { gte: fromDate },
            linkedArticleId: { not: null }
          },
          _count: { id: true }
        })
      ]);

      const analytics = {
        overview: {
          totalContent,
          totalViews: totalViews._sum.viewCount || 0,
          totalInteractions: 0,
          averageReadTime: 95,
          linkedArticles: linkedStats.length,
          withLinksPercentage: totalContent > 0 
            ? Math.round((linkedStats.length / totalContent) * 100)
            : 0
        },
        topPerforming,
        contentByType: [],
        linkedArticlesBreakdown: linkedStats.map(stat => ({
          articleId: stat.linkedArticleId,
          timeSaverCount: stat._count.id
        })),
        timeframe: {
          period: timeframe,
          fromDate,
          toDate: new Date()
        }
      };

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Get time saver analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  }

  // @desc    Link existing TimeSaver content to an article
  static async linkToArticle(req, res) {
    try {
      const { id } = req.params;
      const { articleId, articleType = 'news' } = req.body;

      if (!articleId) {
        return res.status(400).json({
          success: false,
          message: 'Article ID is required'
        });
      }

      // Check if content exists
      const content = await prisma.timeSaverContent.findUnique({
        where: { id },
        select: { id: true, title: true }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'TimeSaver content not found'
        });
      }

      // Validate article exists
      if (articleType === 'ai') {
        const aiArticle = await prisma.aiArticle.findUnique({
          where: { id: articleId },
          select: { id: true, headline: true }
        });

        if (!aiArticle) {
          return res.status(404).json({
            success: false,
            message: 'AI article not found'
          });
        }

        await prisma.timeSaverContent.update({
          where: { id },
          data: {
            linkedAiArticleId: articleId,
            updatedBy: req.user.id
          }
        });

        logger.info(`TimeSaver ${id} linked to AI article ${articleId} by ${req.user.email}`);
      } else {
        const article = await prisma.newsArticle.findUnique({
          where: { id: articleId },
          select: { id: true, headline: true, status: true }
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
            message: 'Can only link to published articles'
          });
        }

        await prisma.timeSaverContent.update({
          where: { id },
          data: {
            linkedArticleId: articleId,
            updatedBy: req.user.id
          }
        });

        logger.info(`TimeSaver ${id} linked to article ${articleId} by ${req.user.email}`);
      }

      res.json({
        success: true,
        message: 'Successfully linked to article'
      });
    } catch (error) {
      logger.error('Link to article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to link to article'
      });
    }
  }

  // @desc    Unlink TimeSaver content from article
  static async unlinkFromArticle(req, res) {
    try {
      const { id } = req.params;
      const { articleType = 'news' } = req.body;

      const content = await prisma.timeSaverContent.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'TimeSaver content not found'
        });
      }

      const updateData = { updatedBy: req.user.id };
      
      if (articleType === 'ai') {
        updateData.linkedAiArticleId = null;
      } else {
        updateData.linkedArticleId = null;
      }

      await prisma.timeSaverContent.update({
        where: { id },
        data: updateData
      });

      logger.info(`TimeSaver ${id} unlinked from ${articleType} article by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Successfully unlinked from article'
      });
    } catch (error) {
      logger.error('Unlink from article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unlink from article'
      });
    }
  }

  // @desc    Bulk create sample content for testing categories
  static async seedSampleData(req, res) {
    try {
      const sampleContent = [
        {
          title: "Breaking: Major Tech Breakthrough Announced",
          summary: "Revolutionary AI advancement changes industry landscape",
          category: "TECHNOLOGY",
          contentType: "DIGEST",
          isPriority: true,
          readTimeSeconds: 120,
          keyPoints: "AI breakthrough|Industry impact|Future implications",
          tags: "tech,ai,breakthrough,today",
          contentGroup: "today_new",
          publishedAt: new Date(),
          createdBy: req.user.id
        }
      ];

      const createdContent = await Promise.all(
        sampleContent.map(item => 
          prisma.timeSaverContent.create({
            data: {
              ...item,
              viewCount: Math.floor(Math.random() * 500) + 100
            }
          })
        )
      );

      logger.info(`Sample data seeded: ${createdContent.length} items by ${req.user.email} (${req.user.role})`);

      res.status(201).json({
        success: true,
        message: `Successfully created ${createdContent.length} sample content items`,
        data: { count: createdContent.length }
      });

    } catch (error) {
      logger.error('Seed sample data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed sample data'
      });
    }
  }
}

module.exports = TimeSaverController;