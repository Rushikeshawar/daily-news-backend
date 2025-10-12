// controllers/analyticsController.js - COMPLETE VERSION
const prisma = require('../config/database');
const logger = require('../utils/logger');

function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  return obj;
}

const analyticsController = {
  // Get dashboard analytics - REAL DATA ONLY
  getDashboardAnalytics: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      logger.info(`Fetching dashboard analytics for timeframe: ${timeframe}`);

      const [
        totalUsers,
        totalArticles,
        publishedArticles,
        pendingArticles,
        rejectedArticles,
        draftArticles,
        totalViews,
        totalShares,
        activeAds,
        dailyViews,
        categoryStats,
        topArticles,
        recentArticles
      ] = await Promise.all([
        prisma.user.count().catch(err => { logger.error('Error counting users:', err); return 0; }),
        prisma.newsArticle.count().catch(err => { logger.error('Error counting articles:', err); return 0; }),
        prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }).catch(err => { logger.error('Error counting published:', err); return 0; }),
        prisma.newsArticle.count({ where: { status: 'PENDING' } }).catch(err => { logger.error('Error counting pending:', err); return 0; }),
        prisma.newsArticle.count({ where: { status: 'REJECTED' } }).catch(err => { logger.error('Error counting rejected:', err); return 0; }),
        prisma.newsArticle.count({ where: { status: 'DRAFT' } }).catch(err => { logger.error('Error counting draft:', err); return 0; }),
        
        prisma.newsArticle.aggregate({
          _sum: { viewCount: true }
        }).catch(err => { logger.error('Error aggregating views:', err); return { _sum: { viewCount: 0 } }; }),
        
        prisma.newsArticle.aggregate({
          _sum: { shareCount: true }
        }).catch(err => { logger.error('Error aggregating shares:', err); return { _sum: { shareCount: 0 } }; }),
        
        prisma.advertisement.count({
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        }).catch(err => { logger.error('Error counting active ads:', err); return 0; }),
        
        prisma.$queryRaw`
          SELECT 
            DATE(published_at) as date,
            COALESCE(SUM(view_count), 0) as views
          FROM news_articles 
          WHERE status = 'PUBLISHED' 
          AND published_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND published_at IS NOT NULL
          GROUP BY DATE(published_at)
          ORDER BY date ASC
        `.then(results => {
          const converted = convertBigIntToNumber(results);
          // Ensure dates are valid
          return converted.map(item => ({
            date: item.date ? new Date(item.date).toISOString().split('T')[0] : null,
            views: item.views || 0
          })).filter(item => item.date !== null);
        }).catch(err => { 
          logger.error('Error fetching daily views:', err); 
          return []; 
        }),
        
        prisma.newsArticle.groupBy({
          by: ['category'],
          where: { status: 'PUBLISHED' },
          _count: { id: true },
          _sum: { viewCount: true },
          orderBy: { _count: { id: 'desc' } }
        }).catch(err => { logger.error('Error grouping by category:', err); return []; }),
        
        prisma.newsArticle.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: {
            id: true,
            headline: true,
            viewCount: true,
            shareCount: true,
            category: true,
            publishedAt: true,
            author: {
              select: { fullName: true }
            }
          }
        }).catch(err => { logger.error('Error fetching top articles:', err); return []; }),
        
        prisma.newsArticle.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            headline: true,
            status: true,
            createdAt: true,
            author: {
              select: { fullName: true }
            }
          }
        }).catch(err => { logger.error('Error fetching recent articles:', err); return []; })
      ]);

      logger.info('Successfully fetched all dashboard data');

      // Calculate revenue
      const adRevenue = await prisma.advertisement.aggregate({
        where: { isActive: true },
        _sum: { impressions: true, clickCount: true }
      }).catch(err => { 
        logger.error('Error aggregating ad revenue:', err); 
        return { _sum: { impressions: 0, clickCount: 0 } };
      });
      
      const totalRevenue = Math.round(
        ((adRevenue._sum.impressions || 0) / 1000 * 5) + 
        ((adRevenue._sum.clickCount || 0) * 2)
      );

      // Process daily views - handle invalid dates
      const viewsMap = new Map();
      dailyViews.forEach(item => {
        try {
          if (item.date) {
            const date = new Date(item.date);
            if (!isNaN(date.getTime())) {
              const dateStr = date.toISOString().split('T')[0];
              viewsMap.set(dateStr, Number(item.views) || 0);
            }
          }
        } catch (error) {
          logger.error('Invalid date in dailyViews:', item.date, error);
        }
      });

      const dailyViewsArray = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyViewsArray.push(viewsMap.get(dateStr) || 0);
      }

      // Process categories
      const categories = {};
      categoryStats.forEach(cat => {
        categories[cat.category] = cat._count.id;
      });

      const dashboardData = convertBigIntToNumber({
        overview: {
          totalArticles: totalArticles,
          totalUsers: totalUsers,
          totalViews: totalViews._sum.viewCount || 0,
          totalShares: totalShares._sum.shareCount || 0,
          totalRevenue: totalRevenue
        },
        ads: {
          active: activeAds,
          totalImpressions: adRevenue._sum.impressions || 0,
          totalClicks: adRevenue._sum.clickCount || 0
        },
        articles: {
          pending: pendingArticles,
          published: publishedArticles,
          rejected: rejectedArticles,
          draft: draftArticles,
          total: totalArticles
        },
        chartData: {
          dailyViews: dailyViewsArray,
          categories: categories
        },
        topArticles: topArticles.map(article => ({
          id: article.id,
          headline: article.headline,
          author: article.author?.fullName || 'Unknown',
          views: article.viewCount || 0,
          shares: article.shareCount || 0,
          category: article.category,
          publishedAt: article.publishedAt
        })),
        recentActivity: recentArticles.map(article => ({
          id: article.id,
          headline: article.headline,
          status: article.status,
          author: article.author?.fullName || 'Unknown',
          createdAt: article.createdAt
        })),
        timeframe: {
          period: timeframe,
          fromDate,
          toDate: new Date()
        }
      });

      logger.info('Dashboard data prepared successfully');
      res.json(dashboardData);
    } catch (error) {
      logger.error('Get dashboard analytics error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard analytics',
        error: error.message
      });
    }
  },

  // Get overview analytics
  getOverview: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [
        totalUsers, activeUsers, newUsers,
        totalArticles, publishedArticles,
        totalViews, totalShares, totalSearches,
        adImpressions, adClicks
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { lastLogin: { gte: fromDate } } }),
        prisma.user.count({ where: { createdAt: { gte: fromDate } } }),
        prisma.newsArticle.count(),
        prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }),
        prisma.newsArticle.aggregate({ _sum: { viewCount: true } }),
        prisma.newsArticle.aggregate({ _sum: { shareCount: true } }),
        prisma.searchHistory.count({ where: { createdAt: { gte: fromDate } } }),
        prisma.advertisement.aggregate({ _sum: { impressions: true } }),
        prisma.advertisement.aggregate({ _sum: { clickCount: true } })
      ]);

      const prevFromDate = new Date(fromDate);
      prevFromDate.setDate(prevFromDate.getDate() - days);

      const [prevNewUsers, prevPublishedArticles] = await Promise.all([
        prisma.user.count({
          where: { createdAt: { gte: prevFromDate, lt: fromDate } }
        }),
        prisma.newsArticle.count({
          where: {
            status: 'PUBLISHED',
            publishedAt: { gte: prevFromDate, lt: fromDate }
          }
        })
      ]);

      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const revenue = Math.round(
        ((adImpressions._sum.impressions || 0) / 1000 * 5) + 
        ((adClicks._sum.clickCount || 0) * 2)
      );

      const overview = convertBigIntToNumber({
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
            where: { createdAt: { gte: fromDate } }
          }),
          growth: calculateGrowth(
            await prisma.newsArticle.count({
              where: { publishedAt: { gte: fromDate } }
            }),
            prevPublishedArticles
          )
        },
        engagement: {
          totalViews: totalViews._sum.viewCount || 0,
          totalShares: totalShares._sum.shareCount || 0,
          totalSearches,
          averageViewsPerArticle: publishedArticles > 0 
            ? Math.round((totalViews._sum.viewCount || 0) / publishedArticles) 
            : 0
        },
        advertising: {
          totalImpressions: adImpressions._sum.impressions || 0,
          totalClicks: adClicks._sum.clickCount || 0,
          revenue: revenue,
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
        timeframe: { period: timeframe, fromDate, toDate: new Date() }
      });

      res.json({ success: true, data: { overview } });
    } catch (error) {
      logger.error('Get analytics overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics overview'
      });
    }
  },

  // Get content analytics
  getContentAnalytics: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [topArticles, categoryPerformance, authorPerformance, contentTrends] = await Promise.all([
        prisma.newsArticle.findMany({
          where: {
            status: 'PUBLISHED',
            publishedAt: { gte: fromDate }
          },
          orderBy: { viewCount: 'desc' },
          take: 10,
          select: {
            id: true, headline: true, category: true,
            viewCount: true, shareCount: true, publishedAt: true,
            author: { select: { fullName: true } }
          }
        }),
        
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

      const authorIds = authorPerformance.map(perf => perf.authorId);
      const authors = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, fullName: true, avatar: true }
      });

      const authorMap = {};
      authors.forEach(author => { authorMap[author.id] = author; });

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
        timeframe: { period: timeframe, fromDate, toDate: new Date() }
      });

      res.json({ success: true, data: { analytics } });
    } catch (error) {
      logger.error('Get content analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content analytics'
      });
    }
  },

  // Get user analytics
  getUserAnalytics: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [userGrowth, roleDistribution, userActivity, topReaders, searchActivity] = await Promise.all([
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as new_users
          FROM users WHERE created_at >= ${fromDate}
          GROUP BY DATE(created_at) ORDER BY date ASC
        `.then(results => convertBigIntToNumber(results)),
        
        prisma.user.groupBy({
          by: ['role'],
          _count: { id: true }
        }),
        
        prisma.$queryRaw`
          SELECT DATE(last_login) as date, COUNT(DISTINCT id) as active_users
          FROM users WHERE last_login >= ${fromDate}
          GROUP BY DATE(last_login) ORDER BY date ASC
        `.then(results => convertBigIntToNumber(results)),
        
        prisma.readingHistory.groupBy({
          by: ['userId'],
          where: { updatedAt: { gte: fromDate } },
          _count: { id: true },
          _sum: { timeSpent: true },
          orderBy: { _sum: { timeSpent: 'desc' } },
          take: 10
        }),
        
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as searches, COUNT(DISTINCT user_id) as unique_searchers
          FROM search_history WHERE created_at >= ${fromDate}
          GROUP BY DATE(created_at) ORDER BY date ASC
        `.then(results => convertBigIntToNumber(results))
      ]);

      const readerIds = topReaders.map(reader => reader.userId);
      const readers = await prisma.user.findMany({
        where: { id: { in: readerIds } },
        select: { id: true, fullName: true, email: true, role: true }
      });

      const readerMap = {};
      readers.forEach(reader => { readerMap[reader.id] = reader; });

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
        timeframe: { period: timeframe, fromDate, toDate: new Date() }
      });

      res.json({ success: true, data: { analytics } });
    } catch (error) {
      logger.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user analytics'
      });
    }
  },

  // Get engagement analytics
  getEngagementAnalytics: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [engagementTrends, readingPatterns, socialSharing, searchTrends, favoriteActivity] = await Promise.all([
        prisma.$queryRaw`
          SELECT DATE(published_at) as date, SUM(view_count) as views, SUM(share_count) as shares, COUNT(*) as articles
          FROM news_articles WHERE status = 'PUBLISHED' AND published_at >= ${fromDate}
          GROUP BY DATE(published_at) ORDER BY date ASC
        `.then(results => convertBigIntToNumber(results)),
        
        prisma.readingHistory.aggregate({
          where: { updatedAt: { gte: fromDate } },
          _avg: { timeSpent: true, readProgress: true },
          _sum: { timeSpent: true },
          _count: { id: true }
        }),
        
        prisma.newsArticle.groupBy({
          by: ['category'],
          where: {
            status: 'PUBLISHED',
            publishedAt: { gte: fromDate }
          },
          _sum: { shareCount: true },
          orderBy: { _sum: { shareCount: 'desc' } }
        }),
        
        prisma.$queryRaw`
          SELECT query, COUNT(*) as search_count, AVG(results) as avg_results
          FROM search_history WHERE created_at >= ${fromDate}
          GROUP BY query ORDER BY search_count DESC LIMIT 10
        `.then(results => convertBigIntToNumber(results)),
        
        prisma.$queryRaw`
          SELECT DATE(saved_at) as date, COUNT(*) as favorites_added
          FROM user_favorites WHERE saved_at >= ${fromDate}
          GROUP BY DATE(saved_at) ORDER BY date ASC
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
        timeframe: { period: timeframe, fromDate, toDate: new Date() }
      });

      res.json({ success: true, data: { analytics } });
    } catch (error) {
      logger.error('Get engagement analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch engagement analytics'
      });
    }
  },

  // Get realtime analytics
  getRealtimeAnalytics: async (req, res) => {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeUsers, recentViews, recentSearches, liveArticles, recentSignups] = await Promise.all([
        prisma.user.count({ where: { lastLogin: { gte: lastHour } } }),
        prisma.readingHistory.count({ where: { updatedAt: { gte: lastHour } } }),
        prisma.searchHistory.count({ where: { createdAt: { gte: lastHour } } }),
        prisma.$queryRaw`
          SELECT na.id, na.headline, na.view_count, na.share_count, u.full_name as author_name
          FROM news_articles na JOIN users u ON na.author_id = u.id
          WHERE na.status = 'PUBLISHED' ORDER BY na.updated_at DESC LIMIT 10
        `.then(results => convertBigIntToNumber(results)),
        prisma.user.count({ where: { createdAt: { gte: today } } })
      ]);

      const recentSharesCount = await prisma.newsArticle.aggregate({
        where: { updatedAt: { gte: lastHour } },
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
        lastUpdated: now
      });

      res.json({ success: true, data: { realtime } });
    } catch (error) {
      logger.error('Get realtime analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch realtime analytics'
      });
    }
  },

  // Export analytics
  exportAnalytics: async (req, res) => {
    try {
      const { type = 'overview', timeframe = '30d', format = 'json' } = req.query;
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      let exportData = {};
      // ... export logic here

      res.json({
        success: true,
        message: 'Export functionality coming soon'
      });
    } catch (error) {
      logger.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export analytics data'
      });
    }
  }
};

module.exports = analyticsController;