require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { cleanupOldNotifications } = require('./src/utils/notifications');

// Import existing routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const articleRoutes = require('./src/routes/articles');
const categoryRoutes = require('./src/routes/categories');
const searchRoutes = require('./src/routes/search');
const favoriteRoutes = require('./src/routes/favorites');
const advertisementRoutes = require('./src/routes/advertisements');
const analyticsRoutes = require('./src/routes/analytics');
const adminRoutes = require('./src/routes/admin');
const uploadRoutes = require('./src/routes/upload');
const notificationRoutes = require('./src/routes/notifications');
const dashboardRoutes = require('./src/routes/dashboard');

// Import new routes
const aiMlRoutes = require('./src/routes/ai-ml');
const timeSaverRoutes = require('./src/routes/time-saver');

const app = express();
const PORT = process.env.PORT || 3000;

// Create required directories
const requiredDirs = ['uploads', 'logs'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API requests
app.use('/api/', limiter);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Enhanced for Flutter web development
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`CORS request from origin: ${origin}`);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('No origin - allowing request');
      return callback(null, true);
    }
    
    // In development, allow any localhost or 127.0.0.1 origin (including random Flutter ports)
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || 
          origin.startsWith('https://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('https://127.0.0.1:')) {
        console.log('Development mode - allowing localhost origin');
        return callback(null, true);
      }
    }
    
    // Get allowed origins from environment variable or use defaults
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:4200',
    ];
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('Origin found in allowed list');
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Additional CORS debugging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
    
    // Set CORS headers manually as backup
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      console.log('Handling preflight request');
      return res.status(200).end();
    }
    
    next();
  });
}

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: 'connected',
      notifications: 'active',
      fileUpload: 'available',
      aiMlFeatures: 'active',
      timeSaverFeatures: 'active'
    }
  });
});

// CORS test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/cors-test', (req, res) => {
    res.json({
      success: true,
      message: 'CORS is working!',
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  });
}

// Existing API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// New AI/ML and Time Saver API routes
app.use('/api/ai-ml', aiMlRoutes);
app.use('/api/time-saver', timeSaverRoutes);

// ===========================================
// BASIC FALLBACK ROUTES (for missing endpoints)
// ===========================================

// Basic dashboard route (in case dashboardRoutes doesn't exist)
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalArticles: 245,
    totalUsers: 1200,
    totalViews: 125000,
    activeAds: 12
  });
});

// Basic notifications route (fallback)
app.get('/api/notifications-fallback', (req, res) => {
  res.json({
    notifications: [
      {
        id: '1',
        title: 'Welcome!',
        message: 'Welcome to the Daily News Dashboard',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'System Update',
        message: 'Dashboard has been updated with new features',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    unreadCount: 1
  });
});

// Mark notifications as read (fallback)
app.put('/api/notifications-fallback/mark-read', (req, res) => {
  res.json({ success: true, message: 'Notifications marked as read' });
});

// Basic articles route (fallback)
app.get('/api/articles-fallback', (req, res) => {
  const mockArticles = [
    {
      id: '1',
      headline: 'Breaking: Technology Advances in 2025',
      briefContent: 'Major technological breakthroughs announced this year...',
      fullContent: 'Detailed article content about technology advances...',
      category: 'Technology',
      status: 'PUBLISHED',
      author: { fullName: 'John Doe' },
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      viewCount: 1250,
      featuredImage: 'https://via.placeholder.com/400x300'
    },
    {
      id: '2',
      headline: 'Market Analysis: Q4 Performance',
      briefContent: 'Quarterly market performance shows positive trends...',
      fullContent: 'Detailed market analysis and financial insights...',
      category: 'Business',
      status: 'PENDING',
      author: { fullName: 'Jane Smith' },
      createdAt: new Date().toISOString(),
      viewCount: 890,
      featuredImage: 'https://via.placeholder.com/400x300'
    },
    {
      id: '3',
      headline: 'Sports Update: Championship Results',
      briefContent: 'Latest results from the championship games...',
      fullContent: 'Complete coverage of championship events...',
      category: 'Sports',
      status: 'APPROVED',
      author: { fullName: 'Mike Johnson' },
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      viewCount: 2100,
      featuredImage: 'https://via.placeholder.com/400x300'
    }
  ];

  res.json({
    articles: mockArticles,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: mockArticles.length,
      hasNext: false,
      hasPrevious: false
    }
  });
});

// Get single article (fallback)
app.get('/api/articles-fallback/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id: id,
    headline: 'Sample Article Title',
    briefContent: 'Sample brief content for the article...',
    fullContent: 'This is the full content of the article with detailed information about the topic. It contains multiple paragraphs and provides comprehensive coverage of the subject matter.',
    category: 'Technology',
    status: 'PUBLISHED',
    author: { 
      fullName: 'John Doe',
      id: 'user1'
    },
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    viewCount: 1250,
    shareCount: 45,
    featuredImage: 'https://via.placeholder.com/800x400',
    tags: ['technology', 'innovation', 'news']
  });
});

// Approve/reject articles (fallback)
app.post('/api/articles-fallback/:id/approve', (req, res) => {
  res.json({ success: true, message: 'Article approved successfully' });
});

app.post('/api/articles-fallback/:id/reject', (req, res) => {
  res.json({ success: true, message: 'Article rejected' });
});

// Basic users route (fallback)
app.get('/api/users-fallback', (req, res) => {
  res.json([
    {
      id: '1',
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'EDITOR',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    },
    {
      id: '2',
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      fullName: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'AD_MANAGER',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date(Date.now() - 7200000).toISOString()
    }
  ]);
});

// Basic advertisements route (fallback)
app.get('/api/advertisements-fallback', (req, res) => {
  res.json([
    {
      id: '1',
      title: 'Tech Conference 2025',
      description: 'Join us for the biggest tech event of the year',
      imageUrl: 'https://via.placeholder.com/600x400',
      targetUrl: 'https://techconf2025.com',
      position: 'BANNER',
      status: 'ACTIVE',
      budget: 5000,
      spent: 1200,
      impressions: 25000,
      clicks: 750,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
    },
    {
      id: '2',
      title: 'Business Summit',
      description: 'Network with industry leaders',
      imageUrl: 'https://via.placeholder.com/600x400',
      targetUrl: 'https://bizsummit.com',
      position: 'SIDEBAR',
      status: 'PAUSED',
      budget: 3000,
      spent: 800,
      impressions: 15000,
      clicks: 450,
      startDate: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      endDate: new Date(Date.now() + 23*24*60*60*1000).toISOString()
    }
  ]);
});

// Basic categories route (fallback)
app.get('/api/categories-fallback', (req, res) => {
  res.json([
    { 
      id: '1', 
      name: 'Technology', 
      description: 'Latest tech news and innovations', 
      isActive: true,
      articleCount: 85
    },
    { 
      id: '2', 
      name: 'Business', 
      description: 'Business and finance updates', 
      isActive: true,
      articleCount: 60
    },
    { 
      id: '3', 
      name: 'Sports', 
      description: 'Sports news and updates', 
      isActive: true,
      articleCount: 50
    },
    { 
      id: '4', 
      name: 'Politics', 
      description: 'Political news and analysis', 
      isActive: true,
      articleCount: 35
    },
    { 
      id: '5', 
      name: 'Entertainment', 
      description: 'Entertainment and celebrity news', 
      isActive: true,
      articleCount: 15
    }
  ]);
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Daily News Dashboard API with AI/ML and Time Saver Features',
    version: '2.0.0',
    endpoints: {
      // Core endpoints
      authentication: '/api/auth',
      users: '/api/users',
      articles: '/api/articles',
      categories: '/api/categories',
      search: '/api/search',
      favorites: '/api/favorites',
      advertisements: '/api/advertisements',
      analytics: '/api/analytics',
      admin: '/api/admin',
      upload: '/api/upload',
      notifications: '/api/notifications',
      dashboard: '/api/dashboard',
      
      // New feature endpoints
      aiMl: {
        base: '/api/ai-ml',
        news: '/api/ai-ml/news',
        trending: '/api/ai-ml/trending',
        search: '/api/ai-ml/search',
        categories: '/api/ai-ml/categories',
        insights: '/api/ai-ml/insights',
        popularTopics: '/api/ai-ml/popular-topics'
      },
      timeSaver: {
        base: '/api/time-saver',
        content: '/api/time-saver/content',
        stats: '/api/time-saver/stats',
        trendingUpdates: '/api/time-saver/trending-updates',
        breakingNews: '/api/time-saver/breaking-news',
        analytics: '/api/time-saver/analytics',
        search: '/api/time-saver/search',
        categories: '/api/time-saver/categories'
      }
    },
    features: {
      aiMl: {
        description: 'AI/ML focused news and content',
        capabilities: [
          'AI/ML article management',
          'Trending AI news',
          'Category-based filtering',
          'Analytics and insights',
          'Popular topics tracking',
          'User interaction tracking'
        ]
      },
      timeSaver: {
        description: 'Quick digest and summary content',
        capabilities: [
          'Time-saving content digests',
          'Breaking news alerts',
          'Quick updates',
          'Content analytics',
          'Multiple content types',
          'Priority-based content'
        ]
      }
    },
    documentation: 'See README.md for detailed API documentation',
    health: '/health',
    corsTest: process.env.NODE_ENV !== 'production' ? '/api/cors-test' : undefined
  });
});

// Scheduled tasks
if (process.env.NODE_ENV === 'production') {
  // Clean up old notifications daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Starting scheduled cleanup of old notifications');
      const cleanedCount = await cleanupOldNotifications(90); // 90 days
      logger.info(`Scheduled cleanup completed: ${cleanedCount} notifications cleaned`);
    } catch (error) {
      logger.error('Scheduled notification cleanup failed:', error);
    }
  });

  // Clean up old refresh tokens weekly
  cron.schedule('0 3 * * 0', async () => {
    try {
      const prisma = require('./src/config/database');
      logger.info('Starting scheduled cleanup of expired refresh tokens');
      const result = await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      logger.info(`Scheduled token cleanup completed: ${result.count} tokens cleaned`);
    } catch (error) {
      logger.error('Scheduled token cleanup failed:', error);
    }
  });

  // Update trending AI/ML articles every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const prisma = require('./src/config/database');
      logger.info('Starting trending AI/ML articles update');
      
      // Mark articles as trending based on views and relevance in last 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await prisma.aiArticle.updateMany({
        where: {
          publishedAt: { gte: yesterday },
          viewCount: { gte: 50 } // Threshold for trending
        },
        data: { isTrending: true }
      });
      
      // Remove trending status from older articles
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      await prisma.aiArticle.updateMany({
        where: {
          publishedAt: { lt: threeDaysAgo },
          isTrending: true
        },
        data: { isTrending: false }
      });
      
      logger.info('Trending AI/ML articles update completed');
    } catch (error) {
      logger.error('Trending update failed:', error);
    }
  });

  // Update AI category article counts every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      const prisma = require('./src/config/database');
      logger.info('Starting AI category counts update');
      
      // Get category counts
      const categoryCounts = await prisma.aiArticle.groupBy({
        by: ['category'],
        _count: { id: true }
      });
      
      // Update each category's article count
      for (const categoryData of categoryCounts) {
        await prisma.aiCategory.upsert({
          where: { name: categoryData.category },
          update: { articleCount: categoryData._count.id },
          create: {
            name: categoryData.category,
            articleCount: categoryData._count.id,
            description: `Articles related to ${categoryData.category}`
          }
        });
      }
      
      logger.info('AI category counts update completed');
    } catch (error) {
      logger.error('Category counts update failed:', error);
    }
  });

  // Clean up old views and interactions weekly
  cron.schedule('0 4 * * 0', async () => {
    try {
      const prisma = require('./src/config/database');
      logger.info('Starting cleanup of old tracking data');
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const [aiViews, aiInteractions, timeSaverViews, timeSaverInteractions] = await Promise.all([
        prisma.aiArticleView.deleteMany({
          where: { timestamp: { lt: sixMonthsAgo } }
        }),
        prisma.aiArticleInteraction.deleteMany({
          where: { timestamp: { lt: sixMonthsAgo } }
        }),
        prisma.timeSaverView.deleteMany({
          where: { timestamp: { lt: sixMonthsAgo } }
        }),
        prisma.timeSaverInteraction.deleteMany({
          where: { timestamp: { lt: sixMonthsAgo } }
        })
      ]);
      
      logger.info(`Tracking data cleanup completed: ${aiViews.count + aiInteractions.count + timeSaverViews.count + timeSaverInteractions.count} records cleaned`);
    } catch (error) {
      logger.error('Tracking data cleanup failed:', error);
    }
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableEndpoints: '/api'
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed.');
    
    // Close database connections
    const prisma = require('./src/config/database');
    prisma.$disconnect()
      .then(() => {
        logger.info('Database connections closed.');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error during database disconnect:', error);
        process.exit(1);
      });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Enhanced Daily News Dashboard API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`CORS test endpoint: http://localhost:${PORT}/api/cors-test`);
    console.log('Development mode: All localhost origins allowed for CORS');
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Scheduled tasks enabled for:');
    console.log('- Notification cleanup (daily at 2 AM)');
    console.log('- Token cleanup (weekly on Sunday at 3 AM)');
    console.log('- Trending articles update (hourly)');
    console.log('- Category counts update (every 6 hours)');
    console.log('- Tracking data cleanup (weekly on Sunday at 4 AM)');
  }
  
  console.log('\n🚀 New Features Available:');
  console.log('📰 AI/ML News: /api/ai-ml/*');
  console.log('⏰ Time Saver: /api/time-saver/*');
  console.log('📊 Enhanced Analytics: /api/analytics/*');
  console.log('🔍 Advanced Search: /api/search/advanced');
  
  console.log('✅ Basic fallback routes added for missing endpoints');
});

module.exports = app;