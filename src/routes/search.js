const express = require('express');
const prisma = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const { searchValidation, genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Search articles
// @route   GET /api/search
// @access  Public
router.get('/', optionalAuth, searchValidation.search, async (req, res) => {
  try {
    const {
      q: query,
      category,
      page = 1,
      limit = 10,
      sortBy = 'relevance',
      order = 'desc',
      dateFrom,
      dateTo,
      author
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for search - MySQL compatible
    const where = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() },
      OR: [
        { headline: { contains: query } },
        { briefContent: { contains: query } },
        { fullContent: { contains: query } },
        { tags: { contains: query } }
      ]
    };

    // Add filters
    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) where.publishedAt.gte = new Date(dateFrom);
      if (dateTo) where.publishedAt.lte = new Date(dateTo);
    }

    if (author) {
      where.author = {
        fullName: { contains: author }
      };
    }

    // Build orderBy clause
    let orderBy = {};
    switch (sortBy) {
      case 'relevance':
        // For relevance, we'll order by a combination of factors
        orderBy = [
          { priorityLevel: 'desc' },
          { viewCount: 'desc' },
          { publishedAt: 'desc' }
        ];
        break;
      case 'date':
        orderBy = { publishedAt: order };
        break;
      case 'popularity':
        orderBy = { viewCount: order };
        break;
      default:
        orderBy = { [sortBy]: order };
    }

    // Perform search
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

    // Calculate search result relevance scores and highlight matches
    const articlesWithRelevance = articles.map(article => {
      let relevanceScore = 0;
      const queryLower = query.toLowerCase();
      
      // Calculate relevance based on where the match occurs (case-insensitive)
      if (article.headline.toLowerCase().includes(queryLower)) {
        relevanceScore += 10;
      }
      if (article.briefContent?.toLowerCase().includes(queryLower)) {
        relevanceScore += 5;
      }
      if (article.tags?.toLowerCase().includes(queryLower)) {
        relevanceScore += 3;
      }
      
      // Boost score for priority articles
      relevanceScore += article.priorityLevel;
      
      // Boost score for popular articles
      relevanceScore += Math.log10(article.viewCount + 1);

      // Create highlighted snippets
      const highlightText = (text, query) => {
        if (!text) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      };

      return {
        ...article,
        relevanceScore,
        highlightedHeadline: highlightText(article.headline, query),
        highlightedBriefContent: highlightText(article.briefContent, query)
      };
    });

    // Sort by relevance if that's the selected sort method
    if (sortBy === 'relevance') {
      articlesWithRelevance.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Add favorite status if user is authenticated
    let finalArticles = articlesWithRelevance;
    if (req.user) {
      const favoriteArticleIds = await prisma.userFavorite.findMany({
        where: {
          userId: req.user.id,
          newsId: { in: articles.map(article => article.id) }
        },
        select: { newsId: true }
      });

      const favoriteIds = new Set(favoriteArticleIds.map(fav => fav.newsId));
      finalArticles = articlesWithRelevance.map(article => ({
        ...article,
        isFavorite: favoriteIds.has(article.id)
      }));
    }

    // Track search history if user is authenticated
    if (req.user) {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.id,
          query,
          results: totalCount
        }
      }).catch(error => {
        logger.warn('Failed to save search history:', error);
      });
    }

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        articles: finalArticles,
        searchQuery: query,
        pagination: {
          page: parseInt(page),
          limit: take,
          totalPages,
          totalCount,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        filters: {
          category,
          dateFrom,
          dateTo,
          author,
          sortBy,
          order
        }
      }
    });
  } catch (error) {
    logger.error('Search articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Get suggestions from headlines and tags - MySQL compatible
    const [headlineSuggestions, tagSuggestions] = await Promise.all([
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          headline: { contains: query }
        },
        select: { headline: true },
        take: parseInt(limit),
        orderBy: { viewCount: 'desc' }
      }),
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          tags: { contains: query }
        },
        select: { tags: true },
        take: parseInt(limit),
        distinct: ['tags']
      })
    ]);

    // Extract unique suggestions
    const suggestions = new Set();
    
    // Add headline suggestions
    headlineSuggestions.forEach(article => {
      suggestions.add(article.headline);
    });

    // Add tag suggestions
    tagSuggestions.forEach(article => {
      if (article.tags) {
        const tags = article.tags.split(',').map(tag => tag.trim());
        tags.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      }
    });

    const suggestionArray = Array.from(suggestions).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: { suggestions: suggestionArray }
    });
  } catch (error) {
    logger.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search suggestions'
    });
  }
});

// @desc    Get popular search terms
// @route   GET /api/search/popular
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10, timeframe = '7d' } = req.query;

    // Calculate date based on timeframe
    const timeframes = {
      '1d': 1,
      '7d': 7,
      '30d': 30
    };

    const days = timeframes[timeframe] || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Get popular search terms from search history
    const popularSearches = await prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: fromDate }
      },
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: parseInt(limit)
    });

    const popularTerms = popularSearches.map(search => ({
      term: search.query,
      count: search._count.query
    }));

    res.json({
      success: true,
      data: { popularTerms }
    });
  } catch (error) {
    logger.error('Get popular search terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular search terms'
    });
  }
});

// @desc    Get user search history
// @route   GET /api/search/history
// @access  Private
router.get('/history', optionalAuth, genericValidation.pagination, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [searchHistory, totalCount] = await Promise.all([
      prisma.searchHistory.findMany({
        where: { userId: req.user.id },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          query: true,
          results: true,
          createdAt: true
        }
      }),
      prisma.searchHistory.count({
        where: { userId: req.user.id }
      })
    ]);

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        searchHistory,
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
    logger.error('Get user search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search history'
    });
  }
});

// @desc    Clear user search history
// @route   DELETE /api/search/history
// @access  Private
router.delete('/history', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    await prisma.searchHistory.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({
      success: true,
      message: 'Search history cleared successfully'
    });
  } catch (error) {
    logger.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history'
    });
  }
});

// @desc    Advanced search with filters
// @route   POST /api/search/advanced
// @access  Public
router.post('/advanced', optionalAuth, async (req, res) => {
  try {
    const {
      query,
      categories = [],
      authors = [],
      dateFrom,
      dateTo,
      tags = [],
      minViewCount,
      maxViewCount,
      priorityLevel,
      page = 1,
      limit = 10,
      sortBy = 'relevance',
      order = 'desc'
    } = req.body;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build complex where clause - MySQL compatible
    const where = {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() }
    };

    // Text search - MySQL compatible
    if (query && query.trim()) {
      where.OR = [
        { headline: { contains: query.trim() } },
        { briefContent: { contains: query.trim() } },
        { fullContent: { contains: query.trim() } },
        { tags: { contains: query.trim() } }
      ];
    }

    // Category filter
    if (categories.length > 0) {
      where.category = { in: categories };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.publishedAt = {};
      if (dateFrom) where.publishedAt.gte = new Date(dateFrom);
      if (dateTo) where.publishedAt.lte = new Date(dateTo);
    }

    // Author filter
    if (authors.length > 0) {
      where.authorId = { in: authors };
    }

    // Tags filter - MySQL compatible
    if (tags.length > 0) {
      where.OR = where.OR || [];
      tags.forEach(tag => {
        where.OR.push({ tags: { contains: tag } });
      });
    }

    // View count filter
    if (minViewCount !== undefined || maxViewCount !== undefined) {
      where.viewCount = {};
      if (minViewCount !== undefined) where.viewCount.gte = parseInt(minViewCount);
      if (maxViewCount !== undefined) where.viewCount.lte = parseInt(maxViewCount);
    }

    // Priority level filter
    if (priorityLevel !== undefined) {
      where.priorityLevel = { gte: parseInt(priorityLevel) };
    }

    // Build orderBy clause
    let orderBy = {};
    switch (sortBy) {
      case 'relevance':
        orderBy = [
          { priorityLevel: 'desc' },
          { viewCount: 'desc' },
          { publishedAt: 'desc' }
        ];
        break;
      case 'date':
        orderBy = { publishedAt: order };
        break;
      case 'popularity':
        orderBy = { viewCount: order };
        break;
      case 'alphabetical':
        orderBy = { headline: order };
        break;
      default:
        orderBy = { [sortBy]: order };
    }

    // Perform search
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
    let finalArticles = articles;
    if (req.user) {
      const favoriteArticleIds = await prisma.userFavorite.findMany({
        where: {
          userId: req.user.id,
          newsId: { in: articles.map(article => article.id) }
        },
        select: { newsId: true }
      });

      const favoriteIds = new Set(favoriteArticleIds.map(fav => fav.newsId));
      finalArticles = articles.map(article => ({
        ...article,
        isFavorite: favoriteIds.has(article.id)
      }));
    }

    // Track search history if user is authenticated and query exists
    if (req.user && query && query.trim()) {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.id,
          query: query.trim(),
          results: totalCount
        }
      }).catch(error => {
        logger.warn('Failed to save advanced search history:', error);
      });
    }

    const totalPages = Math.ceil(totalCount / take);

    res.json({
      success: true,
      data: {
        articles: finalArticles,
        searchFilters: {
          query: query || '',
          categories,
          authors,
          dateFrom,
          dateTo,
          tags,
          minViewCount,
          maxViewCount,
          priorityLevel
        },
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
    logger.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Advanced search failed'
    });
  }
});

// @desc    Get search analytics (for admins)
// @route   GET /api/search/analytics
// @access  Private (ADMIN, AD_MANAGER)
router.get('/analytics', optionalAuth, async (req, res) => {
  try {
    if (!req.user || !['ADMIN', 'AD_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { timeframe = '30d' } = req.query;

    // Calculate date based on timeframe
    const timeframes = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = timeframes[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Get search analytics
    const [
      totalSearches,
      uniqueSearchers,
      topQueries,
      searchTrends,
      noResultQueries
    ] = await Promise.all([
      // Total searches
      prisma.searchHistory.count({
        where: { createdAt: { gte: fromDate } }
      }),
      
      // Unique searchers
      prisma.searchHistory.findMany({
        where: { createdAt: { gte: fromDate } },
        select: { userId: true },
        distinct: ['userId']
      }),
      
      // Top queries
      prisma.searchHistory.groupBy({
        by: ['query'],
        where: { createdAt: { gte: fromDate } },
        _count: { query: true },
        _avg: { results: true },
        orderBy: { _count: { query: 'desc' } },
        take: 10
      }),
      
      // Search trends (daily)
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as searches
        FROM search_history 
        WHERE created_at >= ${fromDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      
      // Queries with no results
      prisma.searchHistory.groupBy({
        by: ['query'],
        where: {
          createdAt: { gte: fromDate },
          results: 0
        },
        _count: { query: true },
        orderBy: { _count: { query: 'desc' } },
        take: 10
      })
    ]);

    const analytics = {
      totalSearches,
      uniqueSearchers: uniqueSearchers.length,
      averageSearchesPerUser: uniqueSearchers.length > 0 ? totalSearches / uniqueSearchers.length : 0,
      topQueries: topQueries.map(item => ({
        query: item.query,
        count: item._count.query,
        averageResults: Math.round(item._avg.results || 0)
      })),
      searchTrends,
      noResultQueries: noResultQueries.map(item => ({
        query: item.query,
        count: item._count.query
      }))
    };

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Get search analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search analytics'
    });
  }
});

module.exports = router;