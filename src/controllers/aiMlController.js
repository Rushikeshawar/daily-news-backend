const prisma = require('../config/database');
const logger = require('../utils/logger');
const slugify = require('slugify');

const aiMlController = {
  // Get AI/ML news articles with filtering and pagination - ENHANCED
  getAiMlNews: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        sortBy = 'publishedAt',
        order = 'desc',
        includeTimeSaver = 'false'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {};
      if (category && category !== 'ALL') {
        where.category = category;
      }

      const orderBy = {};
      orderBy[sortBy] = order;

      // Build select object
      const selectObj = {
        id: true,
        headline: true,
        briefContent: true,
        category: true,
        featuredImage: true,
        tags: true,
        aiModel: true,
        aiApplication: true,
        companyMentioned: true,
        technologyType: true,
        viewCount: true,
        shareCount: true,
        relevanceScore: true,
        isTrending: true,
        publishedAt: true
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

      const [articles, totalCount] = await Promise.all([
        prisma.aiArticle.findMany({
          where,
          skip,
          take,
          orderBy,
          select: selectObj
        }),
        prisma.aiArticle.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      // Add timeSaver count to each article
      const articlesWithCount = articles.map(article => ({
        ...article,
        timeSaverCount: article.timeSaverReferences?.length || 0
      }));

      res.json({
        success: true,
        data: {
          articles: articlesWithCount,
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
      logger.error('Get AI/ML news error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI/ML news'
      });
    }
  },

  // Get single AI/ML article by ID - ENHANCED
  getAiMlArticleById: async (req, res) => {
    try {
      const { id } = req.params;
      const { trackView = 'true', includeTimeSaver = 'true' } = req.query;

      // Build select object
      const selectObj = {
        id: true,
        headline: true,
        briefContent: true,
        fullContent: true,
        category: true,
        featuredImage: true,
        tags: true,
        aiModel: true,
        aiApplication: true,
        companyMentioned: true,
        technologyType: true,
        viewCount: true,
        shareCount: true,
        relevanceScore: true,
        isTrending: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true
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

      const article = await prisma.aiArticle.findUnique({
        where: { id },
        select: selectObj
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'AI/ML article not found'
        });
      }

      // Track view if requested
      if (trackView === 'true') {
        await Promise.all([
          prisma.aiArticle.update({
            where: { id },
            data: { viewCount: { increment: 1 } }
          }),
          req.user && prisma.aiArticleView.create({
            data: {
              articleId: id,
              userId: req.user.id
            }
          }).catch(() => {})
        ]);
        article.viewCount += 1;
      }

      res.json({
        success: true,
        data: { 
          article: {
            ...article,
            timeSaverCount: article.timeSaverReferences?.length || 0
          }
        }
      });
    } catch (error) {
      logger.error('Get AI/ML article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI/ML article'
      });
    }
  },

  // Get TimeSaver content linked to an AI article
  getAiArticleTimeSavers: async (req, res) => {
    try {
      const { id } = req.params;

      // Verify AI article exists
      const article = await prisma.aiArticle.findUnique({
        where: { id },
        select: { id: true, headline: true }
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'AI article not found'
        });
      }

      // Get all TimeSaver content linked to this AI article
      const timeSavers = await prisma.timeSaverContent.findMany({
        where: { linkedAiArticleId: id },
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
      logger.error('Get AI article TimeSavers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI article TimeSavers'
      });
    }
  },

  // Get trending AI/ML news
  getTrendingAiMl: async (req, res) => {
    try {
      const { limit = 10, timeframe = '7d' } = req.query;

      const timeframes = {
        '24h': 1,
        '7d': 7,
        '30d': 30
      };

      const days = timeframes[timeframe] || 7;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const articles = await prisma.aiArticle.findMany({
        where: {
          publishedAt: { gte: fromDate },
          OR: [
            { isTrending: true },
            { viewCount: { gte: 100 } },
            { relevanceScore: { gte: 8.0 } }
          ]
        },
        take: parseInt(limit),
        orderBy: [
          { viewCount: 'desc' },
          { relevanceScore: 'desc' },
          { publishedAt: 'desc' }
        ],
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          featuredImage: true,
          aiModel: true,
          aiApplication: true,
          viewCount: true,
          shareCount: true,
          relevanceScore: true,
          publishedAt: true
        }
      });

      res.json({
        success: true,
        data: { articles }
      });
    } catch (error) {
      logger.error('Get trending AI/ML news error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending AI/ML news'
      });
    }
  },

  // Search AI/ML content
  searchAiMlContent: async (req, res) => {
    try {
      const {
        q: query,
        page = 1,
        limit = 10,
        category,
        sortBy = 'relevance',
        order = 'desc'
      } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {
        OR: [
          { headline: { contains: query } },
          { briefContent: { contains: query } },
          { fullContent: { contains: query } },
          { tags: { contains: query } },
          { aiModel: { contains: query } },
          { aiApplication: { contains: query } },
          { companyMentioned: { contains: query } }
        ]
      };

      if (category) {
        where.category = category;
      }

      let orderBy = {};
      switch (sortBy) {
        case 'relevance':
          orderBy = [
            { relevanceScore: 'desc' },
            { viewCount: 'desc' },
            { publishedAt: 'desc' }
          ];
          break;
        case 'date':
          orderBy = { publishedAt: order };
          break;
        default:
          orderBy = { [sortBy]: order };
      }

      const [articles, totalCount] = await Promise.all([
        prisma.aiArticle.findMany({
          where,
          skip,
          take,
          orderBy,
          select: {
            id: true,
            headline: true,
            briefContent: true,
            category: true,
            featuredImage: true,
            aiModel: true,
            aiApplication: true,
            viewCount: true,
            shareCount: true,
            relevanceScore: true,
            publishedAt: true
          }
        }),
        prisma.aiArticle.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: {
          articles,
          searchQuery: query,
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
      logger.error('Search AI/ML content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search AI/ML content'
      });
    }
  },

  // Get AI/ML categories
getAiMlCategories: async (req, res) => {
  try {
    console.log('Fetching AI/ML categories...');
    
    // Fetch all categories from ai_categories table
    const categories = await prisma.aiCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        isHot: true,
        articleCount: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format categories with displayName for better UI
    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      displayName: cat.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: cat.description,
      iconUrl: cat.iconUrl,
      isHot: cat.isHot,
      articleCount: cat.articleCount || 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt
    }));

    logger.info(`Successfully fetched ${formattedCategories.length} AI/ML categories`);

    // Return in the format your frontend expects
    res.json({
      success: true,
      data: {
        categories: formattedCategories
      }
    });
  } catch (error) {
    logger.error('Get AI/ML categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      data: {
        categories: []
      }
    });
  }
},


  // Get articles by specific AI category
  getArticlesByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'publishedAt',
        order = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const orderBy = {};
      orderBy[sortBy] = order;

      const [articles, totalCount] = await Promise.all([
        prisma.aiArticle.findMany({
          where: { category },
          skip,
          take,
          orderBy,
          select: {
            id: true,
            headline: true,
            briefContent: true,
            category: true,
            featuredImage: true,
            aiModel: true,
            aiApplication: true,
            viewCount: true,
            shareCount: true,
            publishedAt: true
          }
        }),
        prisma.aiArticle.count({ where: { category } })
      ]);

      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: {
          category,
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
      logger.error('Get articles by AI/ML category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch articles by category'
      });
    }
  },

  // Get popular AI topics/keywords
  getPopularTopics: async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const articles = await prisma.aiArticle.findMany({
        where: {
          tags: { not: null },
          publishedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: { tags: true, viewCount: true }
      });

      const topicCounts = {};
      
      articles.forEach(article => {
        if (article.tags) {
          const tags = article.tags.split(',').map(tag => tag.trim().toLowerCase());
          tags.forEach(tag => {
            if (tag) {
              topicCounts[tag] = (topicCounts[tag] || 0) + (article.viewCount || 1);
            }
          });
        }
      });

      const popularTopics = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, parseInt(limit))
        .map(([topic, score]) => ({ topic, score }));

      res.json({
        success: true,
        data: { topics: popularTopics }
      });
    } catch (error) {
      logger.error('Get popular AI topics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular topics'
      });
    }
  },

  // Track AI article view
  trackAiArticleView: async (req, res) => {
    try {
      const { id } = req.params;
      const { timestamp = new Date() } = req.body;

      const article = await prisma.aiArticle.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      await Promise.all([
        prisma.aiArticle.update({
          where: { id },
          data: { viewCount: { increment: 1 } }
        }),
        req.user && prisma.aiArticleView.create({
          data: {
            articleId: id,
            userId: req.user.id,
            timestamp: new Date(timestamp)
          }
        }).catch(() => {})
      ]);

      logger.info(`AI article view tracked: ${id}`);

      res.json({
        success: true,
        message: 'View tracked successfully'
      });
    } catch (error) {
      logger.error('Track AI article view error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track view'
      });
    }
  },

  // Track AI article interaction
  trackAiArticleInteraction: async (req, res) => {
    try {
      const { id } = req.params;
      const { interactionType, timestamp = new Date() } = req.body;

      const validTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'COMMENT', 'DOWNLOAD'];
      if (!validTypes.includes(interactionType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid interaction type'
        });
      }

      const article = await prisma.aiArticle.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }

      const updates = [];
      if (interactionType === 'SHARE') {
        updates.push(
          prisma.aiArticle.update({
            where: { id },
            data: { shareCount: { increment: 1 } }
          })
        );
      }

      updates.push(
        prisma.aiArticleInteraction.create({
          data: {
            articleId: id,
            userId: req.user?.id || null,
            interactionType,
            timestamp: new Date(timestamp)
          }
        })
      );

      await Promise.all(updates);

      logger.info(`AI article interaction tracked: ${id} - ${interactionType}`);

      res.json({
        success: true,
        message: 'Interaction tracked successfully'
      });
    } catch (error) {
      logger.error('Track AI article interaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track interaction'
      });
    }
  },

  // Get AI insights and analytics
  getAiInsights: async (req, res) => {
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
        totalArticles,
        totalViews,
        totalShares,
        trendingArticles,
        topCategories,
        topAiModels,
        engagementMetrics,
        linkedTimeSaverCount
      ] = await Promise.all([
        prisma.aiArticle.count({
          where: { publishedAt: { gte: fromDate } }
        }),

        prisma.aiArticle.aggregate({
          where: { publishedAt: { gte: fromDate } },
          _sum: { viewCount: true }
        }),

        prisma.aiArticle.aggregate({
          where: { publishedAt: { gte: fromDate } },
          _sum: { shareCount: true }
        }),

        prisma.aiArticle.findMany({
          where: {
            publishedAt: { gte: fromDate },
            isTrending: true
          },
          take: 5,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            headline: true,
            viewCount: true,
            shareCount: true,
            publishedAt: true
          }
        }),

        prisma.aiArticle.groupBy({
          by: ['category'],
          where: { publishedAt: { gte: fromDate } },
          _count: { id: true },
          _sum: { viewCount: true },
          orderBy: { _sum: { viewCount: 'desc' } },
          take: 10
        }),

        prisma.aiArticle.groupBy({
          by: ['aiModel'],
          where: {
            publishedAt: { gte: fromDate },
            aiModel: { not: null }
          },
          _count: { id: true },
          _sum: { viewCount: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        }),

        prisma.aiArticleInteraction.groupBy({
          by: ['interactionType'],
          where: { timestamp: { gte: fromDate } },
          _count: { id: true }
        }),

        // Count AI articles with linked TimeSaver content
        prisma.timeSaverContent.count({
          where: { linkedAiArticleId: { not: null } }
        })
      ]);

      const insights = {
        overview: {
          totalArticles,
          totalViews: totalViews._sum.viewCount || 0,
          totalShares: totalShares._sum.shareCount || 0,
          averageViews: totalArticles > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalArticles) : 0,
          linkedTimeSaverCount
        },
        trendingArticles,
        topCategories: topCategories.map(cat => ({
          category: cat.category,
          articleCount: cat._count.id,
          totalViews: cat._sum.viewCount || 0
        })),
        topAiModels: topAiModels.map(model => ({
          aiModel: model.aiModel,
          articleCount: model._count.id,
          totalViews: model._sum.viewCount || 0
        })),
        engagementMetrics: engagementMetrics.map(metric => ({
          type: metric.interactionType,
          count: metric._count.id
        })),
        timeframe: {
          period: timeframe,
          fromDate,
          toDate: new Date()
        }
      };

      res.json({
        success: true,
        data: { insights }
      });
    } catch (error) {
      logger.error('Get AI insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI insights'
      });
    }
  },

  // Create AI/ML article (EDITOR and AD_MANAGER)
  createAiMlArticle: async (req, res) => {
  try {
    const {
      headline,
      briefContent,
      fullContent,
      category,
      featuredImage,
      tags,
      aiModel,
      aiApplication,
      companyMentioned,
      technologyType,
      relevanceScore,
      isTrending = false,
      // TimeSaver fields (optional)
      createTimeSaver = true, // Auto-create by default
      timeSaverTitle,
      timeSaverSummary,
      timeSaverKeyPoints,
      timeSaverContentType = 'AI_ML',
      timeSaverIconName,
      timeSaverBgColor,
      timeSaverIsPriority = false
    } = req.body;

    if (!headline || !category) {
      return res.status(400).json({
        success: false,
        message: 'Headline and category are required'
      });
    }

    const article = await prisma.aiArticle.create({
      data: {
        headline,
        briefContent,
        fullContent,
        category,
        featuredImage,
        tags,
        aiModel,
        aiApplication,
        companyMentioned,
        technologyType,
        relevanceScore: relevanceScore ? parseFloat(relevanceScore) : null,
        isTrending,
        publishedAt: new Date(),
        createdBy: req.user.id
      }
    });

    // Automatically create TimeSaver content
    let timeSaver = null;
    if (createTimeSaver) {
      try {
        // Extract key points
        let keyPointsArray = [];
        if (timeSaverKeyPoints) {
          keyPointsArray = Array.isArray(timeSaverKeyPoints) 
            ? timeSaverKeyPoints 
            : timeSaverKeyPoints.split(',').map(point => point.trim());
        } else if (tags) {
          keyPointsArray = tags.split(',').slice(0, 3).map(tag => tag.trim());
        }

        // Add AI-specific key points if available
        const aiKeyPoints = [];
        if (aiModel) aiKeyPoints.push(`AI Model: ${aiModel}`);
        if (aiApplication) aiKeyPoints.push(`Application: ${aiApplication}`);
        if (companyMentioned) aiKeyPoints.push(`Company: ${companyMentioned}`);
        
        if (aiKeyPoints.length > 0 && keyPointsArray.length === 0) {
          keyPointsArray = aiKeyPoints;
        }

        timeSaver = await prisma.timeSaverContent.create({
          data: {
            title: timeSaverTitle || headline,
            summary: timeSaverSummary || briefContent?.substring(0, 300) || `AI/ML article about ${category}`,
            category: category,
            imageUrl: featuredImage,
            iconName: timeSaverIconName || 'Brain', // AI-specific icon
            bgColor: timeSaverBgColor || '#8B5CF6', // Purple for AI
            keyPoints: keyPointsArray.length > 0 ? keyPointsArray.join(',') : null,
            contentType: timeSaverContentType,
            isPriority: timeSaverIsPriority || isTrending,
            linkedAiArticleId: article.id, // IMPORTANT: Link to the AI article
            publishedAt: new Date(),
            createdBy: req.user.id
          }
        });

        logger.info(`TimeSaver created automatically for AI/ML article: ${headline}`);
      } catch (timeSaverError) {
        logger.error('Failed to create TimeSaver for AI/ML article:', timeSaverError);
        // Continue even if TimeSaver creation fails
      }
    }

    logger.info(`AI/ML article created: ${headline} by ${req.user.email} (${req.user.role})`);

    res.status(201).json({
      success: true,
      message: timeSaver 
        ? 'AI/ML article and TimeSaver created successfully' 
        : 'AI/ML article created successfully',
      data: { 
        article,
        timeSaver: timeSaver ? {
          id: timeSaver.id,
          title: timeSaver.title,
          linkedAiArticleId: timeSaver.linkedAiArticleId
        } : null
      }
    });
  } catch (error) {
    logger.error('Create AI/ML article error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create AI/ML article',
      error: error.message
    });
  }
},

  // Update AI/ML article (EDITOR and AD_MANAGER)
 // Update AI/ML article (EDITOR and AD_MANAGER)
  updateAiMlArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        headline,
        briefContent,
        fullContent,
        category,
        featuredImage,
        tags,
        aiModel,
        aiApplication,
        companyMentioned,
        technologyType,
        relevanceScore,
        isTrending
      } = req.body;

      const existingArticle = await prisma.aiArticle.findUnique({
        where: { id },
        select: { id: true, headline: true }
      });

      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'AI/ML article not found'
        });
      }

      const updateData = {};
      if (headline !== undefined) updateData.headline = headline;
      if (briefContent !== undefined) updateData.briefContent = briefContent;
      if (fullContent !== undefined) updateData.fullContent = fullContent;
      if (category !== undefined) updateData.category = category;
      if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
      // Convert tags array to comma-separated string
      if (tags !== undefined) {
        updateData.tags = Array.isArray(tags) 
          ? tags.filter(Boolean).join(',') 
          : tags;
      }
      if (aiModel !== undefined) updateData.aiModel = aiModel;
      if (aiApplication !== undefined) updateData.aiApplication = aiApplication;
      if (companyMentioned !== undefined) updateData.companyMentioned = companyMentioned;
      if (technologyType !== undefined) updateData.technologyType = technologyType;
      if (relevanceScore !== undefined) updateData.relevanceScore = parseFloat(relevanceScore);
      if (isTrending !== undefined) updateData.isTrending = isTrending;
      
      updateData.updatedAt = new Date();
      updateData.updatedBy = req.user.id;

      const article = await prisma.aiArticle.update({
        where: { id },
        data: updateData
      });

      logger.info(`AI/ML article updated: ${id} by ${req.user.email} (${req.user.role})`);

      res.json({
        success: true,
        message: 'AI/ML article updated successfully',
        data: { article }
      });
    } catch (error) {
      logger.error('Update AI/ML article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update AI/ML article'
      });
    }
  },

  // Delete AI/ML article (EDITOR and AD_MANAGER)
  deleteAiMlArticle: async (req, res) => {
    try {
      const { id } = req.params;

      const existingArticle = await prisma.aiArticle.findUnique({
        where: { id },
        select: { id: true, headline: true }
      });

      if (!existingArticle) {
        return res.status(404).json({
          success: false,
          message: 'AI/ML article not found'
        });
      }

      await prisma.aiArticle.delete({
        where: { id }
      });

      logger.info(`AI/ML article deleted: ${id} by ${req.user.email} (${req.user.role})`);

      res.json({
        success: true,
        message: 'AI/ML article deleted successfully'
      });
    } catch (error) {
      logger.error('Delete AI/ML article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete AI/ML article'
      });
    }
  },

// Create a new AI/ML category (ADMIN and AD_MANAGER)
createCategory: async (req, res) => {
  try {
    const {
      name,
      displayName,  // <-- Now we handle displayName
      description,
      iconUrl,
      isHot = false,
      articleCount = 0
    } = req.body;

    // Determine the final name to use in the database
    let finalName;
    
    if (displayName && displayName.trim()) {
      // Convert displayName to database format (e.g., "Language Models" -> "LANGUAGE_MODELS")
      finalName = displayName.trim().toUpperCase().replace(/\s+/g, '_');
    } else if (name && name.trim()) {
      finalName = name.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Name or Display Name is required'
      });
    }

    // Check if category with the same name already exists (case-insensitive)
    const existingCategory = await prisma.$queryRaw`
      SELECT * FROM ai_categories 
      WHERE LOWER(name) = LOWER(${finalName})
      LIMIT 1
    `;

    if (existingCategory.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = await prisma.aiCategory.create({
      data: {
        name: finalName,  // <-- Use the processed name
        description,
        iconUrl,
        isHot,
        articleCount,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        isHot: true,
        articleCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    logger.info(`AI/ML category created: ${finalName} by ${req.user?.email || 'unknown'} (${req.user?.role || 'unknown'})`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    logger.error('Create AI/ML category error:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: `Category with this ${error.meta.target} already exists`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
},

// Update a category (ADMIN and AD_MANAGER)
updateCategory: async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,  // <-- Now we handle displayName
      description,
      iconUrl,
      isHot,
      articleCount
    } = req.body;

    // Check if category exists
    const existingCategory = await prisma.aiCategory.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Determine the final name to use
    // Priority: displayName (if provided) > name (if provided) > keep existing
    let finalName = existingCategory.name;
    
    if (displayName && displayName.trim()) {
      // Convert displayName to database format (e.g., "Language Models" -> "LANGUAGE_MODELS")
      finalName = displayName.trim().toUpperCase().replace(/\s+/g, '_');
    } else if (name && name.trim()) {
      finalName = name.trim();
    }

    // If name is being changed, check for duplicates
    if (finalName !== existingCategory.name) {
      const duplicate = await prisma.$queryRaw`
        SELECT * FROM ai_categories 
        WHERE LOWER(name) = LOWER(${finalName}) AND id != ${id}
        LIMIT 1
      `;

      if (duplicate.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Build update data object
    const updateData = {
      name: finalName,  // <-- Always update name based on displayName or name
      updatedAt: new Date()
    };

    if (description !== undefined) updateData.description = description;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (isHot !== undefined) updateData.isHot = isHot;
    if (articleCount !== undefined) updateData.articleCount = articleCount;

    // Update category
    const updatedCategory = await prisma.aiCategory.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        isHot: true,
        articleCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    logger.info(`AI/ML category updated: ${id} by ${req.user?.email || 'unknown'} (${req.user?.role || 'unknown'})`);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updatedCategory }
    });
  } catch (error) {
    logger.error('Update AI/ML category error:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: `Category with this ${error.meta.target} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
},

  // ADD THIS METHOD TO YOUR aiMlController.js file

getAiMlCategories: async (req, res) => {
  try {
    console.log('🔍 Fetching AI/ML categories...');
    
    const categories = await prisma.aiCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        isHot: true,
        articleCount: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      displayName: cat.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: cat.description,
      iconUrl: cat.iconUrl,
      isHot: cat.isHot,
      articleCount: cat.articleCount || 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt
    }));

    console.log(`✅ Successfully fetched ${formattedCategories.length} AI/ML categories`);

    res.json({
      success: true,
      data: {
        categories: formattedCategories
      }
    });
  } catch (error) {
    console.error('❌ Get AI/ML categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      data: {
        categories: []
      }
    });
  }
},

  // Delete a category (EDITOR and AD_MANAGER)
  deleteCategory: async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists in AI categories table
    const existingCategory = await prisma.aiCategory.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is used by any AI articles
    const articleCount = await prisma.aiArticle.count({
      where: { category: existingCategory.name }
    });

    if (articleCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${articleCount} associated articles`
      });
    }

    await prisma.aiCategory.delete({
      where: { id }
    });

    logger.info(`AI/ML category deleted: ${id} by ${req.user.email} (${req.user.role})`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Delete AI/ML category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
}

};

module.exports = aiMlController;