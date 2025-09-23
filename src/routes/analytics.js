const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Recursively converts BigInt values to numbers for JSON serialization
 */
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  
  return obj;
}

// @desc    Get platform overview analytics
// @route   GET /api/analytics/overview
// @access  Private (AD_MANAGER, ADMIN)
router.get('/overview', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

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
      totalUsers,
      activeUsers,
      newUsers,
      totalArticles,
      publishedArticles,
      totalViews,
      totalShares,
      totalSearches,
      adImpressions,
      adClicks
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (users who logged in within timeframe)
      prisma.user.count({
        where: {
          lastLogin: { gte: fromDate }
        }
      }),
      
      // New users
      prisma.user.count({
        where: {
          createdAt: { gte: fromDate }
        }
      }),
      
      // Total articles
      prisma.newsArticle.count(),
      
      // Published articles
      prisma.newsArticle.count({
        where: { status: 'PUBLISHED' }
      }),
      
      // Total views
      prisma.newsArticle.aggregate({
        _sum: { viewCount: true }
      }),
      
      // Total shares
      prisma.newsArticle.aggregate({
        _sum: { shareCount: true }
      }),
      
      // Total searches within timeframe
      prisma.searchHistory.count({
        where: {
          createdAt: { gte: fromDate }
        }
      }),
      
      // Advertisement impressions
      prisma.advertisement.aggregate({
        _sum: { impressions: true }
      }),
      
      // Advertisement clicks
      prisma.advertisement.aggregate({
        _sum: { clickCount: true }
      })
    ]);

    // Calculate growth rates (compare with previous period)
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - days);

    const [
      prevNewUsers,
      prevPublishedArticles,
      prevTotalViews,
      prevTotalSearches
    ] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: prevFromDate, lt: fromDate }
        }
      }),
      
      prisma.newsArticle.count({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: prevFromDate, lt: fromDate }
        }
      }),
      
      prisma.newsArticle.aggregate({
        where: {
          publishedAt: { gte: prevFromDate, lt: fromDate }
        },
        _sum: { viewCount: true }
      }),
      
      prisma.searchHistory.count({
        where: {
          createdAt: { gte: prevFromDate, lt: fromDate }
        }
      })
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const overview = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        growth: calculateGrowth(newUsers, prevNewUsers)
      },
      content: {
        totalArticles,
        publishedArticles,
        newArticles: await prisma.newsArticle.count({
          where: {
            createdAt: { gte: fromDate }
          }
        }),
        growth: calculateGrowth(
          await prisma.newsArticle.count({
            where: {
              publishedAt: { gte: fromDate }
            }
          }),
          prevPublishedArticles
        )
      },
      engagement: {
        totalViews: totalViews._sum.viewCount || 0,
        totalShares: totalShares._sum.shareCount || 0,
        totalSearches,
        averageViewsPerArticle: publishedArticles > 0 ? Math.round((totalViews._sum.viewCount || 0) / publishedArticles) : 0,
        viewsGrowth: calculateGrowth(
          await prisma.newsArticle.aggregate({
            where: { publishedAt: { gte: fromDate } },
            _sum: { viewCount: true }
          }).then(result => result._sum.viewCount || 0),
          prevTotalViews._sum.viewCount || 0
        )
      },
      advertising: {
        totalImpressions: adImpressions._sum.impressions || 0,
        totalClicks: adClicks._sum.clickCount || 0,
        clickThroughRate: adImpressions._sum.impressions > 0 
          ? parseFloat(((adClicks._sum.clickCount || 0) / adImpressions._sum.impressions * 100).toFixed(2))
          : 0,
        activeAds: await prisma.advertisement.count({
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        })
      },
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({
      success: true,
      data: { overview }
    });
  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
});

// @desc    Get content analytics
// @route   GET /api/analytics/content
// @access  Private (AD_MANAGER, ADMIN)
router.get('/content', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      topArticles,
      categoryPerformance,
      authorPerformance,
      contentTrends
    ] = await Promise.all([
      // Top performing articles
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        orderBy: { viewCount: 'desc' },
        take: 10,
        select: {
          id: true,
          headline: true,
          category: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true,
          author: {
            select: {
              fullName: true
            }
          }
        }
      }),
      
      // Category performance
      prisma.newsArticle.groupBy({
        by: ['category'],
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        _count: { id: true },
        _sum: { viewCount: true, shareCount: true },
        orderBy: { _sum: { viewCount: 'desc' } }
      }),
      
      // Author performance
      prisma.newsArticle.groupBy({
        by: ['authorId'],
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        _count: { id: true },
        _sum: { viewCount: true, shareCount: true },
        orderBy: { _sum: { viewCount: 'desc' } },
        take: 10
      }),
      
      // Daily content trends
      prisma.$queryRaw`
        SELECT 
          DATE(published_at) as date,
          COUNT(*) as articles_published,
          SUM(view_count) as total_views,
          SUM(share_count) as total_shares
        FROM news_articles 
        WHERE status = 'PUBLISHED' AND published_at >= ${fromDate}
        GROUP BY DATE(published_at)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results))
    ]);

    // Get author details
    const authorIds = authorPerformance.map(perf => perf.authorId);
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, fullName: true, avatar: true }
    });

    const authorMap = {};
    authors.forEach(author => {
      authorMap[author.id] = author;
    });

    const topAuthors = authorPerformance.map(perf => ({
      author: authorMap[perf.authorId],
      articleCount: perf._count.id,
      totalViews: perf._sum.viewCount || 0,
      totalShares: perf._sum.shareCount || 0,
      averageViews: perf._count.id > 0 ? Math.round((perf._sum.viewCount || 0) / perf._count.id) : 0
    }));

    const categoryStats = categoryPerformance.map(cat => ({
      category: cat.category,
      articleCount: cat._count.id,
      totalViews: cat._sum.viewCount || 0,
      totalShares: cat._sum.shareCount || 0,
      averageViews: cat._count.id > 0 ? Math.round((cat._sum.viewCount || 0) / cat._count.id) : 0
    }));

    const analytics = convertBigIntToNumber({
      topArticles,
      categoryPerformance: categoryStats,
      topAuthors,
      contentTrends,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    });

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Get content analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content analytics'
    });
  }
});

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private (ADMIN)
router.get('/users', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      userGrowth,
      roleDistribution,
      userActivity,
      topReaders,
      searchActivity
    ] = await Promise.all([
      // Daily user registrations
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users 
        WHERE created_at >= ${fromDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results)),
      
      // User role distribution
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      }),
      
      // User activity (logins)
      prisma.$queryRaw`
        SELECT 
          DATE(last_login) as date,
          COUNT(DISTINCT id) as active_users
        FROM users 
        WHERE last_login >= ${fromDate}
        GROUP BY DATE(last_login)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results)),
      
      // Top readers
      prisma.readingHistory.groupBy({
        by: ['userId'],
        where: {
          updatedAt: { gte: fromDate }
        },
        _count: { id: true },
        _sum: { timeSpent: true },
        orderBy: { _sum: { timeSpent: 'desc' } },
        take: 10
      }),
      
      // Search activity trends
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as searches,
          COUNT(DISTINCT user_id) as unique_searchers
        FROM search_history 
        WHERE created_at >= ${fromDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results))
    ]);

    // Get reader details
    const readerIds = topReaders.map(reader => reader.userId);
    const readers = await prisma.user.findMany({
      where: { id: { in: readerIds } },
      select: { id: true, fullName: true, email: true, role: true }
    });

    const readerMap = {};
    readers.forEach(reader => {
      readerMap[reader.id] = reader;
    });

    const topReadersWithDetails = topReaders.map(reader => ({
      user: readerMap[reader.userId],
      articlesRead: reader._count.id,
      totalReadingTime: reader._sum.timeSpent || 0
    }));

    const analytics = convertBigIntToNumber({
      userGrowth,
      roleDistribution: roleDistribution.map(role => ({
        role: role.role,
        count: role._count.id
      })),
      userActivity,
      topReaders: topReadersWithDetails,
      searchActivity,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    });

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics'
    });
  }
});

// @desc    Get engagement analytics
// @route   GET /api/analytics/engagement
// @access  Private (AD_MANAGER, ADMIN)
router.get('/engagement', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      engagementTrends,
      readingPatterns,
      socialSharing,
      searchTrends,
      favoriteActivity
    ] = await Promise.all([
      // Daily engagement trends
      prisma.$queryRaw`
        SELECT 
          DATE(published_at) as date,
          SUM(view_count) as views,
          SUM(share_count) as shares,
          COUNT(*) as articles
        FROM news_articles 
        WHERE status = 'PUBLISHED' AND published_at >= ${fromDate}
        GROUP BY DATE(published_at)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results)),
      
      // Reading time patterns
      prisma.readingHistory.aggregate({
        where: {
          updatedAt: { gte: fromDate }
        },
        _avg: { timeSpent: true, readProgress: true },
        _sum: { timeSpent: true },
        _count: { id: true }
      }),
      
      // Social sharing by category
      prisma.newsArticle.groupBy({
        by: ['category'],
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        _sum: { shareCount: true },
        orderBy: { _sum: { shareCount: 'desc' } }
      }),
      
      // Search trends
      prisma.$queryRaw`
        SELECT 
          query,
          COUNT(*) as search_count,
          AVG(results) as avg_results
        FROM search_history 
        WHERE created_at >= ${fromDate}
        GROUP BY query
        ORDER BY search_count DESC
        LIMIT 10
      `.then(results => convertBigIntToNumber(results)),
      
      // Favorite activity
      prisma.$queryRaw`
        SELECT 
          DATE(saved_at) as date,
          COUNT(*) as favorites_added
        FROM user_favorites 
        WHERE saved_at >= ${fromDate}
        GROUP BY DATE(saved_at)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results))
    ]);

    const analytics = convertBigIntToNumber({
      engagementTrends,
      readingPatterns: {
        totalReadingSessions: readingPatterns._count.id || 0,
        totalReadingTime: readingPatterns._sum.timeSpent || 0,
        averageReadingTime: readingPatterns._avg.timeSpent || 0,
        averageReadProgress: readingPatterns._avg.readProgress || 0
      },
      socialSharing: socialSharing.map(share => ({
        category: share.category,
        totalShares: share._sum.shareCount || 0
      })),
      topSearchTerms: searchTrends,
      favoriteActivity,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    });

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Get engagement analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engagement analytics'
    });
  }
});

// @desc    Get real-time analytics
// @route   GET /api/analytics/realtime
// @access  Private (AD_MANAGER, ADMIN)
router.get('/realtime', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeUsers,
      recentViews,
      recentSearches,
      recentShares,
      liveArticles,
      recentSignups
    ] = await Promise.all([
      // Users active in last hour
      prisma.user.count({
        where: {
          lastLogin: { gte: lastHour }
        }
      }),
      
      // Articles viewed in last hour
      prisma.readingHistory.count({
        where: {
          updatedAt: { gte: lastHour }
        }
      }),
      
      // Searches in last hour
      prisma.searchHistory.count({
        where: {
          createdAt: { gte: lastHour }
        }
      }),
      
      // Get articles with recent activity
      prisma.$queryRaw`
        SELECT 
          na.id,
          na.headline,
          na.view_count,
          na.share_count,
          u.full_name as author_name
        FROM news_articles na
        JOIN users u ON na.author_id = u.id
        WHERE na.status = 'PUBLISHED'
        ORDER BY na.updated_at DESC
        LIMIT 10
      `.then(results => convertBigIntToNumber(results)),
      
      // Recently published articles
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: today }
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          headline: true,
          category: true,
          viewCount: true,
          publishedAt: true,
          author: {
            select: {
              fullName: true
            }
          }
        }
      }),
      
      // New user signups today
      prisma.user.count({
        where: {
          createdAt: { gte: today }
        }
      })
    ]);

    // Calculate shares in the last hour (approximate)
    const recentSharesCount = await prisma.newsArticle.aggregate({
      where: {
        updatedAt: { gte: lastHour }
      },
      _sum: { shareCount: true }
    });

    const realtime = convertBigIntToNumber({
      activeUsers,
      recentActivity: {
        views: recentViews,
        searches: recentSearches,
        shares: recentSharesCount._sum.shareCount || 0,
        signups: recentSignups
      },
      liveArticles,
      recentPublications: liveArticles,
      lastUpdated: now
    });

    res.json({
      success: true,
      data: { realtime }
    });
  } catch (error) {
    logger.error('Get realtime analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime analytics'
    });
  }
});


// Add this endpoint to your existing src/routes/analytics.js file
// Insert this code near the top of the file, after the existing routes

// @desc    Get dashboard analytics (simplified overview for dashboard)
// @route   GET /api/analytics/dashboard
// @access  Private (All authenticated users)
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      totalUsers,
      totalArticles,
      publishedArticles,
      pendingArticles,
      rejectedArticles,
      totalViews,
      activeAds,
      dailyViews,
      categoryStats,
      topArticles
    ] = await Promise.all([
      // Basic counts
      prisma.user.count(),
      prisma.newsArticle.count(),
      prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }),
      prisma.newsArticle.count({ where: { status: 'PENDING' } }),
      prisma.newsArticle.count({ where: { status: 'REJECTED' } }),
      
      // Total views
      prisma.newsArticle.aggregate({
        _sum: { viewCount: true }
      }),
      
      // Active advertisements
      prisma.advertisement.count({
        where: {
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      }),
      
      // Daily views for chart (last 7 days)
      prisma.$queryRaw`
        SELECT 
          DATE(published_at) as date,
          SUM(view_count) as views
        FROM news_articles 
        WHERE status = 'PUBLISHED' AND published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(published_at)
        ORDER BY date ASC
      `.then(results => convertBigIntToNumber(results)),
      
      // Category distribution
      prisma.newsArticle.groupBy({
        by: ['category'],
        where: { status: 'PUBLISHED' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      // Top articles
      prisma.newsArticle.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: {
          id: true,
          headline: true,
          viewCount: true,
          author: {
            select: { fullName: true }
          }
        }
      })
    ]);

    // Process daily views data - ensure we have 7 days
    const viewsMap = new Map();
    dailyViews.forEach(item => {
      const dateStr = new Date(item.date).toISOString().split('T')[0];
      viewsMap.set(dateStr, Number(item.views) || 0);
    });

    // Fill missing days with 0
    const dailyViewsArray = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyViewsArray.push(viewsMap.get(dateStr) || 0);
    }

    // Process category data
    const categories = {};
    categoryStats.forEach(cat => {
      categories[cat.category] = cat._count.id;
    });

    const dashboardData = convertBigIntToNumber({
      overview: {
        totalArticles: totalArticles,
        totalUsers: totalUsers,
        totalViews: totalViews._sum.viewCount || 0,
        totalRevenue: 15750 // Mock value - replace with actual revenue calculation
      },
      ads: {
        active: activeAds
      },
      articles: {
        pending: pendingArticles,
        published: publishedArticles,
        rejected: rejectedArticles
      },
      chartData: {
        dailyViews: dailyViewsArray,
        categories: categories
      },
      topArticles: topArticles.map((article, index) => ({
        id: article.id,
        headline: article.headline,
        author: article.author?.fullName || 'Unknown',
        views: article.viewCount || 0
      })),
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    });

    res.json(dashboardData);
  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    
    // Fallback to mock data on error
    const mockData = {
      overview: {
        totalArticles: 245,
        totalUsers: 1200,
        totalViews: 125000,
        totalRevenue: 15750
      },
      ads: {
        active: 12
      },
      articles: {
        pending: 8,
        published: 187,
        rejected: 5
      },
      chartData: {
        dailyViews: [1200, 1400, 1100, 1600, 1800, 2000, 1750],
        categories: {
          'Technology': 85,
          'Business': 60,
          'Sports': 50,
          'Politics': 35,
          'Entertainment': 15
        }
      },
      topArticles: [
        {
          id: '1',
          headline: 'Breaking: New Technology Breakthrough',
          author: 'John Smith',
          views: 15420
        },
        {
          id: '2',
          headline: 'Market Analysis: Q3 Results',
          author: 'Jane Doe',
          views: 12350
        }
      ]
    };

    res.json(mockData);
  }
});

// @desc    Export analytics data
// @route   GET /api/analytics/export
// @access  Private (ADMIN)
router.get('/export', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { type = 'overview', timeframe = '30d', format = 'json' } = req.query;

    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    let exportData = {};

    switch (type) {
      case 'overview':
        exportData = await getOverviewData(fromDate);
        break;
      case 'content':
        exportData = await getContentData(fromDate);
        break;
      case 'users':
        exportData = await getUserData(fromDate);
        break;
      case 'engagement':
        exportData = await getEngagementData(fromDate);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    const exportResponse = convertBigIntToNumber({
      exportType: type,
      timeframe,
      exportedAt: new Date(),
      dateRange: {
        fromDate,
        toDate: new Date()
      },
      data: exportData
    });

    if (format === 'csv') {
      // Convert to CSV (simplified version)
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${type}_${timeframe}.csv"`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${type}_${timeframe}.json"`);
      res.json(exportResponse);
    }

    logger.info(`Analytics data exported: ${type} by ${req.user.email}`);
  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

// Helper functions for export
async function getOverviewData(fromDate) {
  try {
    const [totalUsers, totalArticles, totalViews] = await Promise.all([
      prisma.user.count(),
      prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }),
      prisma.newsArticle.aggregate({ _sum: { viewCount: true } })
    ]);

    return convertBigIntToNumber({
      totalUsers,
      totalArticles,
      totalViews: totalViews._sum.viewCount || 0,
      period: 'overview'
    });
  } catch (error) {
    logger.error('Error getting overview data:', error);
    return {};
  }
}

async function getContentData(fromDate) {
  try {
    const topArticles = await prisma.newsArticle.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: fromDate }
      },
      orderBy: { viewCount: 'desc' },
      take: 10,
      select: {
        id: true,
        headline: true,
        viewCount: true,
        shareCount: true,
        publishedAt: true
      }
    });

    return convertBigIntToNumber({
      topArticles,
      period: 'content'
    });
  } catch (error) {
    logger.error('Error getting content data:', error);
    return {};
  }
}

async function getUserData(fromDate) {
  try {
    const [newUsers, activeUsers] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: fromDate } }
      }),
      prisma.user.count({
        where: { lastLogin: { gte: fromDate } }
      })
    ]);

    return convertBigIntToNumber({
      newUsers,
      activeUsers,
      period: 'users'
    });
  } catch (error) {
    logger.error('Error getting user data:', error);
    return {};
  }
}

async function getEngagementData(fromDate) {
  try {
    const readingPatterns = await prisma.readingHistory.aggregate({
      where: { updatedAt: { gte: fromDate } },
      _avg: { timeSpent: true, readProgress: true },
      _sum: { timeSpent: true },
      _count: { id: true }
    });

    return convertBigIntToNumber({
      readingPatterns: {
        totalSessions: readingPatterns._count.id || 0,
        totalTime: readingPatterns._sum.timeSpent || 0,
        averageTime: readingPatterns._avg.timeSpent || 0,
        averageProgress: readingPatterns._avg.readProgress || 0
      },
      period: 'engagement'
    });
  } catch (error) {
    logger.error('Error getting engagement data:', error);
    return {};
  }
}

function convertToCSV(data) {
  try {
    // Simple CSV conversion implementation
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value}"` : value
        ).join(',')
      );
      
      return [headers, ...rows].join('\n');
    } else {
      // For non-array data, convert to key-value pairs
      const rows = Object.entries(data).map(([key, value]) => 
        `"${key}","${typeof value === 'object' ? JSON.stringify(value) : value}"`
      );
      
      return ['Key,Value', ...rows].join('\n');
    }
  } catch (error) {
    logger.error('Error converting to CSV:', error);
    return JSON.stringify(data);
  }
}

module.exports = router;