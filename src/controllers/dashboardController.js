const prisma = require('../config/database');
const logger = require('../utils/logger');

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper function to calculate growth rate
function calculateGrowthRate(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// @desc    Get Admin Dashboard Overview
// @route   GET /api/dashboard/admin
// @access  Private (ADMIN)
const getAdminDashboard = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      userStats,
      contentStats,
      systemHealth,
      recentArticles,
      recentUsers,
      pendingArticles,
      popularArticles,
      adStats
    ] = await Promise.all([
      // User Statistics
      prisma.user.aggregate({
        _count: { id: true },
        where: {}
      }).then(async (total) => {
        const [regularUsers, editors, adManagers, admins, activeUsers, newUsers] = await Promise.all([
          prisma.user.count({ where: { role: 'USER' } }),
          prisma.user.count({ where: { role: 'EDITOR' } }),
          prisma.user.count({ where: { role: 'AD_MANAGER' } }),
          prisma.user.count({ where: { role: 'ADMIN' } }),
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count({ where: { createdAt: { gte: fromDate } } })
        ]);
        return {
          total_users: total._count.id,
          regular_users: regularUsers,
          editors: editors,
          ad_managers: adManagers,
          admins: admins,
          active_users: activeUsers,
          new_users: newUsers
        };
      }),
      
      // Content Statistics
      prisma.newsArticle.aggregate({
        _count: { id: true },
        _sum: { viewCount: true },
        _avg: { viewCount: true }
      }).then(async (total) => {
        const [published, pending, drafts, rejected, recentArticles] = await Promise.all([
          prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }),
          prisma.newsArticle.count({ where: { status: 'PENDING' } }),
          prisma.newsArticle.count({ where: { status: 'DRAFT' } }),
          prisma.newsArticle.count({ where: { status: 'REJECTED' } }),
          prisma.newsArticle.count({ where: { createdAt: { gte: fromDate } } })
        ]);
        return {
          total_articles: total._count.id,
          published: published,
          pending: pending,
          drafts: drafts,
          rejected: rejected,
          recent_articles: recentArticles,
          total_views: total._sum.viewCount || 0,
          avg_views: total._avg.viewCount || 0
        };
      }),
      
      // System Health
      Promise.resolve({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }),
      
      // Recent Articles
      prisma.newsArticle.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          headline: true,
          status: true,
          createdAt: true,
          author: { select: { fullName: true } }
        }
      }),
      
      // Recent Users
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true
        }
      }),
      
      // Pending Articles
      prisma.newsArticle.count({ where: { status: 'PENDING' } }),
      
      // Popular Articles
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
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
      
      // Advertisement Stats
      prisma.advertisement.aggregate({
        _count: { id: true },
        _sum: { impressions: true, clickCount: true }
      }).then(async (total) => {
        const activeAds = await prisma.advertisement.count({ where: { isActive: true } });
        const avgCtr = total._sum.impressions > 0 
          ? ((total._sum.clickCount || 0) / total._sum.impressions * 100).toFixed(2)
          : 0;
        return {
          total_ads: total._count.id,
          active_ads: activeAds,
          total_impressions: total._sum.impressions || 0,
          total_clicks: total._sum.clickCount || 0,
          avg_ctr: parseFloat(avgCtr)
        };
      })
    ]);

    // Previous period stats for growth calculation
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - days);
    const [prevUserStats, prevContentStats] = await Promise.all([
      prisma.user.count({
        where: { createdAt: { gte: prevFromDate, lt: fromDate } }
      }),
      prisma.newsArticle.count({
        where: { createdAt: { gte: prevFromDate, lt: fromDate } }
      })
    ]);

    const dashboard = {
      users: {
        ...userStats,
        growth: calculateGrowthRate(userStats.new_users, prevUserStats)
      },
      content: {
        ...contentStats,
        growth: calculateGrowthRate(contentStats.recent_articles, prevContentStats)
      },
      system: {
        health: systemHealth,
        pendingApprovals: pendingArticles
      },
      recent: { articles: recentArticles, users: recentUsers },
      popular: { articles: popularArticles },
      advertisements: adStats,
      timeframe: { period: timeframe, fromDate, toDate: new Date() }
    };

    res.json({ success: true, data: { dashboard } });
  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard' });
  }
};

// @desc    Get System Statistics (for admin dashboard widgets)
// @route   GET /api/dashboard/system-stats
// @access  Private (ADMIN)
const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalArticles,
      totalAds,
      systemHealth,
      recentLogins,
      storageUsage
    ] = await Promise.all([
      prisma.user.count(),
      prisma.newsArticle.count(),
      prisma.advertisement.count(),
      Promise.resolve({
        uptime: Math.floor(process.uptime()),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }),
      prisma.user.count({
        where: {
          lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
      Promise.resolve({
        used: '2.5 GB',
        total: '10 GB',
        percentage: 25
      })
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalArticles,
        totalAds,
        recentLogins
      },
      system: {
        ...systemHealth,
        uptimeFormatted: formatUptime(systemHealth.uptime),
        memoryUsage: {
          used: Math.round(systemHealth.memory.heapUsed / 1024 / 1024),
          total: Math.round(systemHealth.memory.heapTotal / 1024 / 1024),
          percentage: Math.round((systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100)
        }
      },
      storage: storageUsage
    };

    res.json({ success: true, data: { stats } });
  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system statistics' });
  }
};

// @desc    Get Analytics Data for Dashboard Charts
// @route   GET /api/dashboard/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const { timeframe = '30d', type = 'overview' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    let analyticsData = {};
    
    switch (type) {
      case 'overview':
        // Generate date range for daily stats
        const dateRange = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dateRange.push(date.toISOString().split('T')[0]);
        }

        const [dailyArticles, dailyViews, categoryStats, userActivity] = await Promise.all([
          // Daily articles published
          Promise.all(dateRange.map(date => 
            prisma.newsArticle.count({
              where: {
                status: 'PUBLISHED',
                publishedAt: {
                  gte: new Date(date + 'T00:00:00.000Z'),
                  lt: new Date(date + 'T23:59:59.999Z')
                }
              }
            })
          )),
          
          // Daily views
          Promise.all(dateRange.map(date => 
            prisma.newsArticle.aggregate({
              where: {
                status: 'PUBLISHED',
                publishedAt: {
                  gte: new Date(date + 'T00:00:00.000Z'),
                  lt: new Date(date + 'T23:59:59.999Z')
                }
              },
              _sum: { viewCount: true }
            })
          )),
          
          // Category stats
          prisma.newsArticle.groupBy({
            by: ['category'],
            where: {
              status: 'PUBLISHED',
              publishedAt: { gte: fromDate }
            },
            _count: { id: true },
            _sum: { viewCount: true },
            orderBy: { _count: { id: 'desc' } }
          }),
          
          // User activity
          Promise.all(dateRange.map(date => 
            prisma.user.count({
              where: {
                createdAt: {
                  gte: new Date(date + 'T00:00:00.000Z'),
                  lt: new Date(date + 'T23:59:59.999Z')
                }
              }
            })
          ))
        ]);

        analyticsData = {
          dailyStats: dateRange.map((date, index) => ({
            date,
            articles: dailyArticles[index],
            views: dailyViews[index]._sum.viewCount || 0
          })),
          categoryStats: categoryStats.map(stat => ({
            category: stat.category,
            articles: stat._count.id,
            views: stat._sum.viewCount || 0
          })),
          userActivity: dateRange.map((date, index) => ({
            date,
            newUsers: userActivity[index]
          }))
        };
        break;

      case 'content':
        const [topArticles, authorPerformance, contentTrends] = await Promise.all([
          prisma.newsArticle.findMany({
            where: {
              status: 'PUBLISHED',
              publishedAt: { gte: fromDate }
            },
            take: 10,
            orderBy: [{ viewCount: 'desc' }, { shareCount: 'desc' }],
            select: {
              id: true,
              headline: true,
              category: true,
              viewCount: true,
              shareCount: true,
              publishedAt: true,
              author: { select: { fullName: true } }
            }
          }),
          
          // Author performance with proper aggregation
          prisma.newsArticle.groupBy({
            by: ['authorId'],
            where: {
              status: 'PUBLISHED',
              publishedAt: { gte: fromDate }
            },
            _count: { id: true },
            _sum: { viewCount: true },
            _avg: { viewCount: true },
            orderBy: { _sum: { viewCount: 'desc' } },
            take: 10
          }).then(async (results) => {
            const authorsData = await Promise.all(
              results.map(async (result) => {
                const author = await prisma.user.findUnique({
                  where: { id: result.authorId },
                  select: { fullName: true }
                });
                return {
                  name: author?.fullName || 'Unknown',
                  articles: result._count.id,
                  totalViews: result._sum.viewCount || 0,
                  avgViews: Math.round(result._avg.viewCount || 0)
                };
              })
            );
            return authorsData;
          }),
          
          // Content trends by week
          Promise.resolve([]) // Simplified for now
        ]);

        analyticsData = {
          topArticles,
          authorPerformance,
          contentTrends
        };
        break;

      case 'engagement':
        const [readingStats, searchStats, favoriteStats] = await Promise.all([
          prisma.readingHistory.aggregate({
            where: { updatedAt: { gte: fromDate } },
            _count: { id: true },
            _sum: { timeSpent: true },
            _avg: { readProgress: true, timeSpent: true }
          }),
          
          prisma.searchHistory.groupBy({
            by: ['query'],
            where: { createdAt: { gte: fromDate } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
          }),
          
          prisma.userFavorite.groupBy({
            by: ['newsId'],
            where: { savedAt: { gte: fromDate } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
          }).then(async (results) => {
            const favoritesData = await Promise.all(
              results.map(async (result) => {
                const article = await prisma.newsArticle.findUnique({
                  where: { id: result.newsId },
                  select: { headline: true, category: true }
                });
                return {
                  headline: article?.headline || 'Unknown',
                  category: article?.category || 'Unknown',
                  favorites: result._count.id
                };
              })
            );
            return favoritesData;
          })
        ]);

        analyticsData = {
          reading: {
            totalSessions: readingStats._count.id || 0,
            totalTimeSpent: readingStats._sum.timeSpent || 0,
            avgReadProgress: readingStats._avg.readProgress || 0,
            avgSessionTime: readingStats._avg.timeSpent || 0
          },
          popularSearches: searchStats.map(search => ({
            query: search.query,
            count: search._count.id
          })),
          mostFavorited: favoriteStats
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid analytics type. Use: overview, content, or engagement'
        });
    }

    res.json({
      success: true,
      data: {
        analytics: analyticsData,
        timeframe: { period: timeframe, fromDate, toDate: new Date() }
      }
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data' });
  }
};

// @desc    Get Dashboard Summary (for quick overview widgets)
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);

    let summary = {
      today: {
        date: today.toISOString().split('T')[0],
        articlesPublished: 0,
        totalViews: 0,
        newUsers: 0
      },
      thisWeek: {
        articlesPublished: 0,
        totalViews: 0,
        newUsers: 0
      },
      trending: {
        topArticle: null,
        topCategory: null,
        growthRate: 0
      }
    };

    switch (req.user.role) {
      case 'ADMIN':
      case 'AD_MANAGER':
        const [todayStats, weekStats, trending] = await Promise.all([
          Promise.all([
            prisma.newsArticle.count({
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: startOfToday, lt: endOfToday }
              }
            }),
            prisma.newsArticle.aggregate({
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: startOfToday, lt: endOfToday }
              },
              _sum: { viewCount: true }
            }),
            prisma.user.count({
              where: { createdAt: { gte: startOfToday, lt: endOfToday } }
            })
          ]),
          Promise.all([
            prisma.newsArticle.count({
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: thisWeek }
              }
            }),
            prisma.newsArticle.aggregate({
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: thisWeek }
              },
              _sum: { viewCount: true }
            }),
            prisma.user.count({
              where: { createdAt: { gte: thisWeek } }
            })
          ]),
          Promise.all([
            prisma.newsArticle.findFirst({
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: thisWeek }
              },
              orderBy: { viewCount: 'desc' },
              select: {
                headline: true,
                viewCount: true,
                category: true
              }
            }),
            prisma.newsArticle.groupBy({
              by: ['category'],
              where: {
                status: 'PUBLISHED',
                publishedAt: { gte: thisWeek }
              },
              _sum: { viewCount: true },
              orderBy: { _sum: { viewCount: 'desc' } },
              take: 1
            })
          ])
        ]);

        summary = {
          today: {
            date: today.toISOString().split('T')[0],
            articlesPublished: todayStats[0],
            totalViews: todayStats[1]._sum.viewCount || 0,
            newUsers: todayStats[2]
          },
          thisWeek: {
            articlesPublished: weekStats[0],
            totalViews: weekStats[1]._sum.viewCount || 0,
            newUsers: weekStats[2]
          },
          trending: {
            topArticle: trending[0],
            topCategory: trending[1][0]?.category || null,
            growthRate: calculateGrowthRate(weekStats[0], weekStats[0])
          }
        };
        break;

      case 'EDITOR':
        const editorStats = await Promise.all([
          prisma.newsArticle.count({
            where: {
              authorId: req.user.id,
              status: 'PUBLISHED',
              publishedAt: { gte: startOfToday, lt: endOfToday }
            }
          }),
          prisma.newsArticle.count({
            where: {
              authorId: req.user.id,
              status: 'PENDING'
            }
          }),
          prisma.newsArticle.aggregate({
            where: {
              authorId: req.user.id,
              status: 'PUBLISHED',
              publishedAt: { gte: thisWeek }
            },
            _sum: { viewCount: true }
          })
        ]);

        summary = {
          today: {
            date: today.toISOString().split('T')[0],
            articlesPublished: editorStats[0],
            pendingArticles: editorStats[1],
            weeklyViews: editorStats[2]._sum.viewCount || 0
          },
          performance: {
            thisWeek: {
              totalViews: editorStats[2]._sum.viewCount || 0
            }
          }
        };
        break;

      default:
        const userStats = await Promise.all([
          prisma.readingHistory.count({
            where: {
              userId: req.user.id,
              updatedAt: { gte: startOfToday, lt: endOfToday }
            }
          }),
          prisma.userFavorite.count({
            where: { userId: req.user.id }
          }),
          prisma.newsArticle.count({
            where: {
              status: 'PUBLISHED',
              publishedAt: { gte: startOfToday, lt: endOfToday }
            }
          })
        ]);

        summary = {
          today: {
            date: today.toISOString().split('T')[0],
            articlesRead: userStats[0],
            newArticles: userStats[2]
          },
          personal: {
            totalFavorites: userStats[1]
          }
        };
        break;
    }

    res.json({ success: true, data: { summary } });
  } catch (error) {
    logger.error('Get dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
};

// @desc    Get AD_Manager Dashboard Overview
// @route   GET /api/dashboard/ad-manager
// @access  Private (AD_MANAGER, ADMIN)
const getAdManagerDashboard = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      contentOverview,
      adPerformance,
      revenueStats,
      pendingApprovals,
      topContent,
      recentActivities,
      campaignStats
    ] = await Promise.all([
      // Content overview with proper aggregation
      prisma.newsArticle.aggregate({
        _count: { id: true },
        _sum: { viewCount: true, shareCount: true }
      }).then(async (total) => {
        const [published, pending, rejected, recentSubmissions] = await Promise.all([
          prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }),
          prisma.newsArticle.count({ where: { status: 'PENDING' } }),
          prisma.newsArticle.count({ where: { status: 'REJECTED' } }),
          prisma.newsArticle.count({ where: { createdAt: { gte: fromDate } } })
        ]);
        return {
          total_articles: total._count.id,
          published,
          pending_approval: pending,
          rejected,
          total_views: total._sum.viewCount || 0,
          total_shares: total._sum.shareCount || 0,
          recent_submissions: recentSubmissions
        };
      }),
      
      // Ad performance
      prisma.advertisement.aggregate({
        where: { createdAt: { gte: fromDate } },
        _count: { id: true },
        _sum: { impressions: true, clickCount: true, budget: true }
      }).then(async (total) => {
        const activeCampaigns = await prisma.advertisement.count({
          where: { isActive: true, createdAt: { gte: fromDate } }
        });
        const avgCtr = total._sum.impressions > 0 
          ? ((total._sum.clickCount || 0) / total._sum.impressions * 100).toFixed(2)
          : 0;
        return {
          total_campaigns: total._count.id,
          active_campaigns: activeCampaigns,
          total_impressions: total._sum.impressions || 0,
          total_clicks: total._sum.clickCount || 0,
          avg_ctr: parseFloat(avgCtr),
          total_budget: total._sum.budget || 0
        };
      }),
      
      // Revenue stats
      prisma.advertisement.aggregate({
        where: {
          createdAt: { gte: fromDate },
          isActive: true
        },
        _sum: { budget: true },
        _avg: { budget: true }
      }),
      
      // Pending approvals
      prisma.newsArticle.findMany({
        where: { status: 'PENDING' },
        take: 10,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          headline: true,
          category: true,
          createdAt: true,
          author: { select: { fullName: true, email: true } }
        }
      }),
      
      // Top content
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        take: 10,
        orderBy: [{ viewCount: 'desc' }, { shareCount: 'desc' }],
        select: {
          id: true,
          headline: true,
          category: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true,
          author: { select: { fullName: true } }
        }
      }),
      
      // Recent activities (if approvalHistory table exists)
      prisma.approvalHistory ? prisma.approvalHistory.findMany({
        where: { createdAt: { gte: fromDate } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          comments: true,
          createdAt: true,
          article: {
            select: {
              headline: true,
              author: { select: { fullName: true } }
            }
          },
          approver: { select: { fullName: true } }
        }
      }).catch(() => []) : Promise.resolve([]),
      
      // Campaign stats by position
      prisma.advertisement.groupBy({
        by: ['position'],
        where: { createdAt: { gte: fromDate } },
        _count: { id: true },
        _sum: { impressions: true, clickCount: true, budget: true },
        _avg: { impressions: true, clickCount: true }
      })
    ]);

    const totalProcessed = contentOverview.published + contentOverview.rejected;
    const approvalRate = totalProcessed > 0
      ? Math.round((contentOverview.published / totalProcessed) * 100)
      : 0;

    const dashboard = {
      contentManagement: {
        ...contentOverview,
        approvalRate,
        needsAttention: pendingApprovals.length
      },
      advertising: {
        ...adPerformance,
        revenue: {
          total: revenueStats._sum.budget || 0,
          average: revenueStats._avg.budget || 0
        },
        campaignsByPosition: campaignStats.map(stat => ({
          position: stat.position,
          campaigns: stat._count.id,
          totalImpressions: stat._sum.impressions || 0,
          totalClicks: stat._sum.clickCount || 0,
          totalBudget: stat._sum.budget || 0,
          avgCTR: stat._sum.impressions > 0
            ? ((stat._sum.clickCount || 0) / stat._sum.impressions * 100).toFixed(2)
            : 0
        }))
      },
      workflow: {
        pendingApprovals,
        recentActivities: recentActivities.slice(0, 5)
      },
      performance: {
        topContent
      },
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({ success: true, data: { dashboard } });
  } catch (error) {
    logger.error('Get AD_Manager dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AD_Manager dashboard' });
  }
};

// @desc    Get Editor Dashboard Overview
// @route   GET /api/dashboard/editor
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
const getEditorDashboard = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      personalStats,
      recentArticles,
      performanceStats,
      approvalStats,
      writingProgress
    ] = await Promise.all([
      // Personal stats with proper aggregation
      prisma.newsArticle.aggregate({
        where: { authorId: req.user.id },
        _count: { id: true },
        _sum: { viewCount: true, shareCount: true }
      }).then(async (total) => {
        const [published, pending, drafts, rejected, recentArticles] = await Promise.all([
          prisma.newsArticle.count({
            where: { authorId: req.user.id, status: 'PUBLISHED' }
          }),
          prisma.newsArticle.count({
            where: { authorId: req.user.id, status: 'PENDING' }
          }),
          prisma.newsArticle.count({
            where: { authorId: req.user.id, status: 'DRAFT' }
          }),
          prisma.newsArticle.count({
            where: { authorId: req.user.id, status: 'REJECTED' }
          }),
          prisma.newsArticle.count({
            where: {
              authorId: req.user.id,
              createdAt: { gte: fromDate }
            }
          })
        ]);
        return {
          total_articles: total._count.id,
          published,
          pending,
          drafts,
          rejected,
          recent_articles: recentArticles,
          total_views: total._sum.viewCount || 0,
          total_shares: total._sum.shareCount || 0
        };
      }),
      
      // Recent articles
      prisma.newsArticle.findMany({
        where: { authorId: req.user.id },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          headline: true,
          status: true,
          category: true,
          viewCount: true,
          shareCount: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true
        }
      }),
      
      // Performance stats
      prisma.newsArticle.aggregate({
        where: {
          authorId: req.user.id,
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate }
        },
        _avg: { viewCount: true, shareCount: true },
        _max: { viewCount: true, shareCount: true },
        _sum: { viewCount: true, shareCount: true }
      }),
      
      // Approval stats (if approvalHistory exists)
      prisma.approvalHistory ? prisma.approvalHistory.findMany({
        where: {
          article: { authorId: req.user.id },
          createdAt: { gte: fromDate }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          action: true,
          comments: true,
          createdAt: true,
          article: { select: { headline: true } },
          approver: { select: { fullName: true } }
        }
      }).catch(() => []) : Promise.resolve([]),
      
      // Writing progress by week
      Promise.resolve([]) // Simplified weekly progress calculation
    ]);

    const totalSubmitted = personalStats.published + personalStats.rejected;
    const approvalRate = totalSubmitted > 0
      ? Math.round((personalStats.published / totalSubmitted) * 100)
      : 0;

    const dashboard = {
      overview: {
        ...personalStats,
        approvalRate,
        avgViews: performanceStats._avg.viewCount || 0,
        avgShares: performanceStats._avg.shareCount || 0
      },
      recentWork: recentArticles,
      performance: {
        totalViews: performanceStats._sum.viewCount || 0,
        totalShares: performanceStats._sum.shareCount || 0,
        bestPerforming: {
          maxViews: performanceStats._max.viewCount || 0,
          maxShares: performanceStats._max.shareCount || 0
        }
      },
      feedback: approvalStats,
      productivity: writingProgress,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({ success: true, data: { dashboard } });
  } catch (error) {
    logger.error('Get editor dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch editor dashboard' });
  }
};

// @desc    Get User Dashboard Overview
// @route   GET /api/dashboard/user
// @access  Private
const getUserDashboard = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      readingStats,
      favoriteStats,
      searchStats,
      recentReading,
      recommendations
    ] = await Promise.all([
      // Reading statistics
      prisma.readingHistory.aggregate({
        where: {
          userId: req.user.id,
          updatedAt: { gte: fromDate }
        },
        _count: { id: true },
        _sum: { timeSpent: true },
        _avg: { readProgress: true }
      }),
      
      // Favorite articles count
      prisma.userFavorite.count({
        where: { userId: req.user.id }
      }),
      
      // Search history count
      prisma.searchHistory.count({
        where: {
          userId: req.user.id,
          createdAt: { gte: fromDate }
        }
      }),
      
      // Recent reading history
      prisma.readingHistory.findMany({
        where: { userId: req.user.id },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          timeSpent: true,
          readProgress: true,
          updatedAt: true,
          article: {
            select: {
              id: true,
              headline: true,
              category: true,
              featuredImage: true,
              author: { select: { fullName: true } }
            }
          }
        }
      }),
      
      // Recommendations (articles not read by user)
      prisma.newsArticle.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: fromDate },
          NOT: {
            readingHistory: {
              some: { userId: req.user.id }
            }
          }
        },
        take: 5,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          headline: true,
          briefContent: true,
          category: true,
          featuredImage: true,
          viewCount: true,
          publishedAt: true,
          author: { select: { fullName: true } }
        }
      })
    ]);

    // Get favorite categories
    const favoriteArticlesWithCategory = await prisma.userFavorite.findMany({
      where: { userId: req.user.id },
      include: {
        article: {
          select: { category: true }
        }
      }
    });

    const categoryCount = {};
    favoriteArticlesWithCategory.forEach(fav => {
      const category = fav.article.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const favoriteCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const dashboard = {
      reading: {
        articlesRead: readingStats._count.id || 0,
        totalTimeSpent: readingStats._sum.timeSpent || 0,
        avgReadProgress: readingStats._avg.readProgress || 0,
        avgTimePerArticle: readingStats._count.id > 0
          ? Math.round((readingStats._sum.timeSpent || 0) / readingStats._count.id)
          : 0
      },
      engagement: {
        favoriteArticles: favoriteStats,
        searchQueries: searchStats,
        favoriteCategories
      },
      recent: {
        readingHistory: recentReading.slice(0, 5)
      },
      recommendations,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({ success: true, data: { dashboard } });
  } catch (error) {
    logger.error('Get user dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user dashboard' });
  }
};

// @desc    Get Content Performance Analytics
// @route   GET /api/dashboard/content-performance
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
const getContentPerformance = async (req, res) => {
  try {
    const { timeframe = '30d', authorId } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Build where clause based on user role and filters
    let whereClause = {
      status: 'PUBLISHED',
      publishedAt: { gte: fromDate }
    };

    // If user is EDITOR, only show their own content unless they're viewing as AD_MANAGER/ADMIN
    if (req.user.role === 'EDITOR' && !authorId) {
      whereClause.authorId = req.user.id;
    } else if (authorId) {
      whereClause.authorId = parseInt(authorId);
    }

    const [
      topPerformers,
      categoryPerformance,
      timeBasedPerformance,
      engagementMetrics
    ] = await Promise.all([
      // Top performing articles
      prisma.newsArticle.findMany({
        where: whereClause,
        take: 10,
        orderBy: [{ viewCount: 'desc' }, { shareCount: 'desc' }],
        select: {
          id: true,
          headline: true,
          category: true,
          viewCount: true,
          shareCount: true,
          publishedAt: true,
          author: { select: { fullName: true } }
        }
      }),
      
      // Performance by category
      prisma.newsArticle.groupBy({
        by: ['category'],
        where: whereClause,
        _count: { id: true },
        _sum: { viewCount: true, shareCount: true },
        _avg: { viewCount: true, shareCount: true },
        orderBy: { _sum: { viewCount: 'desc' } }
      }),
      
      // Time-based performance (last 7 days)
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const endOfDay = new Date(startOfDay);
          endOfDay.setDate(endOfDay.getDate() + 1);
          
          return prisma.newsArticle.aggregate({
            where: {
              ...whereClause,
              publishedAt: { gte: startOfDay, lt: endOfDay }
            },
            _count: { id: true },
            _sum: { viewCount: true, shareCount: true }
          }).then(result => ({
            date: startOfDay.toISOString().split('T')[0],
            articles: result._count.id,
            views: result._sum.viewCount || 0,
            shares: result._sum.shareCount || 0
          }));
        })
      ),
      
      // Engagement metrics
      prisma.newsArticle.findMany({
        where: whereClause,
        select: {
          id: true,
          viewCount: true,
          shareCount: true,
          readingHistory: {
            select: {
              readProgress: true,
              timeSpent: true
            }
          },
          userFavorites: {
            select: { id: true }
          }
        }
      }).then(articles => {
        const totalArticles = articles.length;
        const totalViews = articles.reduce((sum, article) => sum + (article.viewCount || 0), 0);
        const totalShares = articles.reduce((sum, article) => sum + (article.shareCount || 0), 0);
        const totalFavorites = articles.reduce((sum, article) => sum + article.userFavorites.length, 0);
        
        const readingData = articles.flatMap(article => article.readingHistory);
        const avgReadProgress = readingData.length > 0
          ? readingData.reduce((sum, reading) => sum + (reading.readProgress || 0), 0) / readingData.length
          : 0;
        const avgTimeSpent = readingData.length > 0
          ? readingData.reduce((sum, reading) => sum + (reading.timeSpent || 0), 0) / readingData.length
          : 0;
        
        return {
          totalArticles,
          totalViews,
          totalShares,
          totalFavorites,
          avgViewsPerArticle: totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0,
          avgSharesPerArticle: totalArticles > 0 ? Math.round(totalShares / totalArticles) : 0,
          avgReadProgress: Math.round(avgReadProgress),
          avgTimeSpent: Math.round(avgTimeSpent),
          shareRate: totalViews > 0 ? ((totalShares / totalViews) * 100).toFixed(2) : 0,
          favoriteRate: totalViews > 0 ? ((totalFavorites / totalViews) * 100).toFixed(2) : 0
        };
      })
    ]);

    const performance = {
      topPerformers,
      categoryPerformance: categoryPerformance.map(cat => ({
        category: cat.category,
        articles: cat._count.id,
        totalViews: cat._sum.viewCount || 0,
        totalShares: cat._sum.shareCount || 0,
        avgViews: Math.round(cat._avg.viewCount || 0),
        avgShares: Math.round(cat._avg.shareCount || 0)
      })),
      dailyPerformance: timeBasedPerformance.reverse(),
      engagement: engagementMetrics,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({ success: true, data: { performance } });
  } catch (error) {
    logger.error('Get content performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch content performance' });
  }
};

// @desc    Get Quick Actions for Dashboard
// @route   GET /api/dashboard/quick-actions
// @access  Private
const getQuickActions = async (req, res) => {
  try {
    const userRole = req.user.role;
    let quickActions = [];

    switch (userRole) {
      case 'ADMIN':
        quickActions = [
          {
            id: 'manage-users',
            title: 'Manage Users',
            description: 'Add, edit, or deactivate users',
            icon: 'users',
            action: '/admin/users',
            priority: 1
          },
          {
            id: 'system-settings',
            title: 'System Settings',
            description: 'Configure application settings',
            icon: 'settings',
            action: '/admin/settings',
            priority: 2
          },
          {
            id: 'view-analytics',
            title: 'View Analytics',
            description: 'Check system performance and metrics',
            icon: 'bar-chart',
            action: '/dashboard/analytics',
            priority: 3
          },
          {
            id: 'manage-content',
            title: 'Content Management',
            description: 'Review and manage all content',
            icon: 'file-text',
            action: '/admin/content',
            priority: 4
          },
          {
            id: 'backup-system',
            title: 'System Backup',
            description: 'Create system backup',
            icon: 'download',
            action: '/admin/backup',
            priority: 5
          }
        ];
        
        // Add pending approvals count
        const pendingCount = await prisma.newsArticle.count({
          where: { status: 'PENDING' }
        });
        
        if (pendingCount > 0) {
          quickActions.unshift({
            id: 'pending-approvals',
            title: `Review Articles (${pendingCount})`,
            description: `${pendingCount} articles pending approval`,
            icon: 'clock',
            action: '/admin/articles/pending',
            priority: 0,
            badge: pendingCount,
            urgent: pendingCount > 10
          });
        }
        break;

      case 'AD_MANAGER':
        quickActions = [
          {
            id: 'review-content',
            title: 'Review Content',
            description: 'Approve or reject submitted articles',
            icon: 'check-circle',
            action: '/content/review',
            priority: 1
          },
          {
            id: 'manage-ads',
            title: 'Manage Ads',
            description: 'Create and manage advertisements',
            icon: 'target',
            action: '/ads/manage',
            priority: 2
          },
          {
            id: 'content-analytics',
            title: 'Content Analytics',
            description: 'View content performance metrics',
            icon: 'trending-up',
            action: '/dashboard/content-performance',
            priority: 3
          },
          {
            id: 'revenue-report',
            title: 'Revenue Report',
            description: 'Check advertising revenue',
            icon: 'dollar-sign',
            action: '/dashboard/revenue',
            priority: 4
          }
        ];
        
        // Add pending approvals
        const adManagerPending = await prisma.newsArticle.count({
          where: { status: 'PENDING' }
        });
        
        if (adManagerPending > 0) {
          quickActions.unshift({
            id: 'pending-reviews',
            title: `Pending Reviews (${adManagerPending})`,
            description: `${adManagerPending} articles need review`,
            icon: 'eye',
            action: '/content/pending',
            priority: 0,
            badge: adManagerPending
          });
        }
        break;

      case 'EDITOR':
        quickActions = [
          {
            id: 'create-article',
            title: 'Write New Article',
            description: 'Create and publish new content',
            icon: 'edit',
            action: '/articles/create',
            priority: 1
          },
          {
            id: 'my-drafts',
            title: 'My Drafts',
            description: 'Continue working on saved drafts',
            icon: 'file',
            action: '/articles/drafts',
            priority: 2
          },
          {
            id: 'my-articles',
            title: 'My Articles',
            description: 'View your published articles',
            icon: 'book',
            action: '/articles/mine',
            priority: 3
          },
          {
            id: 'performance',
            title: 'My Performance',
            description: 'View your article analytics',
            icon: 'activity',
            action: '/dashboard/content-performance',
            priority: 4
          }
        ];
        
        // Add draft count
        const draftCount = await prisma.newsArticle.count({
          where: { 
            authorId: req.user.id,
            status: 'DRAFT'
          }
        });
        
        if (draftCount > 0) {
          quickActions[1].badge = draftCount;
          quickActions[1].title = `My Drafts (${draftCount})`;
        }
        
        // Add pending count
        const editorPending = await prisma.newsArticle.count({
          where: { 
            authorId: req.user.id,
            status: 'PENDING'
          }
        });
        
        if (editorPending > 0) {
          quickActions.push({
            id: 'pending-articles',
            title: `Pending Review (${editorPending})`,
            description: `${editorPending} articles under review`,
            icon: 'clock',
            action: '/articles/pending',
            priority: 5,
            badge: editorPending
          });
        }
        break;

      default: // USER
        quickActions = [
          {
            id: 'browse-articles',
            title: 'Browse Articles',
            description: 'Discover new content',
            icon: 'compass',
            action: '/articles',
            priority: 1
          },
          {
            id: 'my-favorites',
            title: 'My Favorites',
            description: 'View your saved articles',
            icon: 'heart',
            action: '/favorites',
            priority: 2
          },
          {
            id: 'reading-history',
            title: 'Reading History',
            description: 'Continue where you left off',
            icon: 'history',
            action: '/history',
            priority: 3
          },
          {
            id: 'search',
            title: 'Search Articles',
            description: 'Find specific content',
            icon: 'search',
            action: '/search',
            priority: 4
          },
          {
            id: 'profile',
            title: 'My Profile',
            description: 'Update your preferences',
            icon: 'user',
            action: '/profile',
            priority: 5
          }
        ];
        
        // Add favorites count
        const favoritesCount = await prisma.userFavorite.count({
          where: { userId: req.user.id }
        });
        
        if (favoritesCount > 0) {
          quickActions[1].badge = favoritesCount;
          quickActions[1].title = `My Favorites (${favoritesCount})`;
        }
        break;
    }

    // Sort by priority
    quickActions.sort((a, b) => a.priority - b.priority);

    res.json({
      success: true,
      data: {
        quickActions,
        userRole: userRole
      }
    });
  } catch (error) {
    logger.error('Get quick actions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick actions'
    });
  }
};

// @desc    Get Notifications for User
// @route   GET /api/dashboard/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { limit = 10, offset = 0, type, unreadOnly = false } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let notifications = [];
    
    // Build notifications based on user role and recent activities
    switch (userRole) {
      case 'ADMIN':
      case 'AD_MANAGER':
        // Recent user registrations
        const recentUsers = await prisma.user.findMany({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { fullName: true, email: true, createdAt: true, role: true }
        });

        notifications.push(...recentUsers.map(user => ({
          id: `user-${user.email}`,
          type: 'user_registration',
          title: 'New User Registration',
          message: `${user.fullName} (${user.role}) has joined`,
          timestamp: user.createdAt,
          isRead: false,
          priority: 'medium',
          action: `/admin/users?search=${user.email}`
        })));

        // Pending article approvals
        const pendingArticles = await prisma.newsArticle.findMany({
          where: { status: 'PENDING' },
          take: 5,
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            headline: true,
            createdAt: true,
            author: { select: { fullName: true } }
          }
        });

        notifications.push(...pendingArticles.map(article => ({
          id: `article-${article.id}`,
          type: 'content_approval',
          title: 'Article Pending Approval',
          message: `"${article.headline}" by ${article.author.fullName}`,
          timestamp: article.createdAt,
          isRead: false,
          priority: 'high',
          action: `/articles/${article.id}/review`
        })));

        // System alerts (simulated)
        if (userRole === 'ADMIN') {
          const systemAlerts = [
            {
              id: 'system-1',
              type: 'system_alert',
              title: 'System Performance',
              message: 'Database queries running optimally',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              isRead: false,
              priority: 'low',
              action: '/admin/system-health'
            }
          ];
          notifications.push(...systemAlerts);
        }
        break;

      case 'EDITOR':
        // Article status updates
        const editorArticles = await prisma.newsArticle.findMany({
          where: {
            authorId: userId,
            updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            status: { in: ['PUBLISHED', 'REJECTED'] }
          },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            headline: true,
            status: true,
            updatedAt: true,
            publishedAt: true
          }
        });

        notifications.push(...editorArticles.map(article => ({
          id: `status-${article.id}`,
          type: article.status === 'PUBLISHED' ? 'article_published' : 'article_rejected',
          title: article.status === 'PUBLISHED' ? 'Article Published' : 'Article Rejected',
          message: `"${article.headline}" has been ${article.status.toLowerCase()}`,
          timestamp: article.updatedAt,
          isRead: false,
          priority: article.status === 'REJECTED' ? 'high' : 'medium',
          action: `/articles/${article.id}`
        })));

        // Performance notifications
        const topPerforming = await prisma.newsArticle.findFirst({
          where: {
            authorId: userId,
            status: 'PUBLISHED',
            publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            viewCount: { gt: 100 }
          },
          orderBy: { viewCount: 'desc' },
          select: { id: true, headline: true, viewCount: true, publishedAt: true }
        });

        if (topPerforming) {
          notifications.push({
            id: `performance-${topPerforming.id}`,
            type: 'performance_alert',
            title: 'Article Performing Well!',
            message: `"${topPerforming.headline}" has ${topPerforming.viewCount} views`,
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            isRead: false,
            priority: 'medium',
            action: `/articles/${topPerforming.id}/analytics`
          });
        }
        break;

      default: // USER
        // Recently favorited articles by other users (trending)
        const trendingArticles = await prisma.newsArticle.findMany({
          where: {
            status: 'PUBLISHED',
            publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            viewCount: { gt: 50 }
          },
          take: 3,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            headline: true,
            category: true,
            publishedAt: true,
            viewCount: true
          }
        });

        notifications.push(...trendingArticles.map(article => ({
          id: `trending-${article.id}`,
          type: 'trending_content',
          title: 'Trending Article',
          message: `"${article.headline}" is trending in ${article.category}`,
          timestamp: article.publishedAt,
          isRead: false,
          priority: 'low',
          action: `/articles/${article.id}`
        })));

        // Reading recommendations based on user's favorite categories
        const userFavoriteCategories = await prisma.userFavorite.findMany({
          where: { userId: userId },
          include: { article: { select: { category: true } } }
        });

        const categories = [...new Set(userFavoriteCategories.map(fav => fav.article.category))];
        
        if (categories.length > 0) {
          const recommendations = await prisma.newsArticle.findMany({
            where: {
              status: 'PUBLISHED',
              category: { in: categories },
              publishedAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
              NOT: {
                readingHistory: { some: { userId: userId } },
                favorites: { some: { userId: userId } }
              }
            },
            take: 2,
            orderBy: { publishedAt: 'desc' },
            select: {
              id: true,
              headline: true,
              category: true,
              publishedAt: true
            }
          });

          notifications.push(...recommendations.map(article => ({
            id: `recommendation-${article.id}`,
            type: 'content_recommendation',
            title: 'Recommended for You',
            message: `New article in ${article.category}: "${article.headline}"`,
            timestamp: article.publishedAt,
            isRead: false,
            priority: 'low',
            action: `/articles/${article.id}`
          })));
        }
        break;
    }

    // Sort by timestamp (newest first) and priority
    notifications.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Apply filters
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.isRead);
    }

    // Apply pagination
    const total = notifications.length;
    const paginatedNotifications = notifications.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    // Add summary counts
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const typesCounts = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        },
        summary: {
          unreadCount,
          totalCount: total,
          typesCounts
        }
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// @desc    Get Revenue Analytics (for AD_MANAGER and ADMIN)
// @route   GET /api/dashboard/revenue
// @access  Private (AD_MANAGER, ADMIN)
const getRevenueAnalytics = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      revenueOverview,
      adPerformance,
      dailyRevenue,
      topCampaigns
    ] = await Promise.all([
      // Revenue overview
      prisma.advertisement.aggregate({
        where: { createdAt: { gte: fromDate } },
        _sum: { budget: true },
        _avg: { budget: true },
        _count: { id: true }
      }).then(async (total) => {
        const [activeAds, totalImpressions, totalClicks] = await Promise.all([
          prisma.advertisement.count({
            where: { isActive: true, createdAt: { gte: fromDate } }
          }),
          prisma.advertisement.aggregate({
            where: { createdAt: { gte: fromDate } },
            _sum: { impressions: true }
          }),
          prisma.advertisement.aggregate({
            where: { createdAt: { gte: fromDate } },
            _sum: { clickCount: true }
          })
        ]);
        
        return {
          totalRevenue: total._sum.budget || 0,
          avgRevenuePerCampaign: total._avg.budget || 0,
          totalCampaigns: total._count.id,
          activeCampaigns: activeAds,
          totalImpressions: totalImpressions._sum.impressions || 0,
          totalClicks: totalClicks._sum.clickCount || 0,
          overallCTR: totalImpressions._sum.impressions > 0
            ? ((totalClicks._sum.clickCount || 0) / totalImpressions._sum.impressions * 100).toFixed(2)
            : 0
        };
      }),
      
      // Ad performance by position
      prisma.advertisement.groupBy({
        by: ['position'],
        where: { createdAt: { gte: fromDate } },
        _sum: { budget: true, impressions: true, clickCount: true },
        _count: { id: true },
        _avg: { budget: true }
      }),
      
      // Daily revenue for the last 7 days
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const endOfDay = new Date(startOfDay);
          endOfDay.setDate(endOfDay.getDate() + 1);
          
          return prisma.advertisement.aggregate({
            where: {
              createdAt: { gte: startOfDay, lt: endOfDay }
            },
            _sum: { budget: true, impressions: true, clickCount: true },
            _count: { id: true }
          }).then(result => ({
            date: startOfDay.toISOString().split('T')[0],
            revenue: result._sum.budget || 0,
            campaigns: result._count.id,
            impressions: result._sum.impressions || 0,
            clicks: result._sum.clickCount || 0,
            ctr: result._sum.impressions > 0
              ? ((result._sum.clickCount || 0) / result._sum.impressions * 100).toFixed(2)
              : 0
          }));
        })
      ),
      
      // Top performing campaigns
      prisma.advertisement.findMany({
        where: { createdAt: { gte: fromDate } },
        take: 10,
        orderBy: [{ impressions: 'desc' }, { clickCount: 'desc' }],
        select: {
          id: true,
          title: true,
          position: true,
          budget: true,
          impressions: true,
          clickCount: true,
          isActive: true,
          createdAt: true
        }
      })
    ]);

    const revenue = {
      overview: revenueOverview,
      adPerformance: adPerformance.map(ad => ({
        position: ad.position,
        campaigns: ad._count.id,
        totalRevenue: ad._sum.budget || 0,
        avgRevenue: ad._avg.budget || 0,
        totalImpressions: ad._sum.impressions || 0,
        totalClicks: ad._sum.clickCount || 0,
        ctr: ad._sum.impressions > 0
          ? ((ad._sum.clickCount || 0) / ad._sum.impressions * 100).toFixed(2)
          : 0
      })),
      dailyRevenue: dailyRevenue.reverse(),
      topCampaigns: topCampaigns.map(campaign => ({
        ...campaign,
        ctr: campaign.impressions > 0
          ? ((campaign.clickCount / campaign.impressions) * 100).toFixed(2)
          : 0,
        costPerClick: campaign.clickCount > 0
          ? (campaign.budget / campaign.clickCount).toFixed(2)
          : 0
      })),
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };

    res.json({ success: true, data: { revenue } });
  } catch (error) {
    logger.error('Get revenue analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
  }
};

module.exports = {
  getAdminDashboard,
  getSystemStats,
  getAnalytics,
  getDashboardSummary,
  getAdManagerDashboard,
  getEditorDashboard,
  getUserDashboard,
  getContentPerformance,
  getQuickActions,
  getNotifications,
  getRevenueAnalytics
};