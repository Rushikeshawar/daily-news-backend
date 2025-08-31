const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dailynews.com' },
    update: {},
    create: {
      email: 'admin@dailynews.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      isActive: true
    }
  });

  // Create ad manager
  const adManagerPassword = await bcrypt.hash('manager123!', 12);
  const adManager = await prisma.user.upsert({
    where: { email: 'admanager@dailynews.com' },
    update: {},
    create: {
      email: 'admanager@dailynews.com',
      passwordHash: adManagerPassword,
      fullName: 'Advertisement Manager',
      role: 'AD_MANAGER',
      isActive: true
    }
  });

  // Create editor
  const editorPassword = await bcrypt.hash('editor123!', 12);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@dailynews.com' },
    update: {},
    create: {
      email: 'editor@dailynews.com',
      passwordHash: editorPassword,
      fullName: 'Content Editor',
      role: 'EDITOR',
      isActive: true
    }
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@dailynews.com' },
    update: {},
    create: {
      email: 'user@dailynews.com',
      passwordHash: userPassword,
      fullName: 'Regular User',
      role: 'USER',
      isActive: true
    }
  });

  console.log('👥 Users created:', { admin, adManager, editor, user });

  // Create sample articles
  const sampleArticles = [
    {
      headline: 'Breaking: Major Technology Breakthrough in AI Research',
      briefContent: 'Scientists have announced a significant advancement in artificial intelligence that could revolutionize computing.',
      fullContent: 'In a groundbreaking announcement today, researchers at leading technology institutions have revealed a major breakthrough in artificial intelligence research. This development promises to enhance machine learning capabilities and could have far-reaching implications for various industries including healthcare, finance, and autonomous systems. The research team, led by renowned AI scientists, spent over three years developing this innovative approach that significantly improves processing efficiency while reducing computational costs. Early tests show promising results with applications ranging from medical diagnosis to predictive analytics. Industry experts believe this breakthrough could accelerate the adoption of AI technologies across multiple sectors.',
      category: 'TECHNOLOGY',
      status: 'PUBLISHED',
      authorId: editor.id,
      approvedBy: adManager.id,
      publishedAt: new Date(),
      priorityLevel: 8,
      tags: 'AI, technology, research, breakthrough',
      slug: 'major-technology-breakthrough-ai-research',
      metaTitle: 'Breaking: Major Technology Breakthrough in AI Research',
      metaDescription: 'Scientists announce significant AI advancement that could revolutionize computing and various industries.',
      viewCount: 1250,
      shareCount: 45
    },
    {
      headline: 'Global Climate Summit Reaches Historic Agreement',
      briefContent: 'World leaders commit to ambitious climate goals in unprecedented international cooperation effort.',
      fullContent: 'World leaders from over 150 countries have reached a historic agreement at the Global Climate Summit, committing to unprecedented measures to combat climate change. The agreement includes binding targets for carbon emission reductions, massive investments in renewable energy infrastructure, and comprehensive support for developing nations transitioning to clean energy. Environmental scientists and policy experts are calling this the most significant climate accord since the Paris Agreement. The summit, held over five days of intensive negotiations, addressed critical issues including deforestation, ocean conservation, and sustainable agriculture practices. Implementation of these measures is expected to begin immediately, with regular progress reviews scheduled annually.',
      category: 'ENVIRONMENT',
      status: 'PUBLISHED',
      authorId: editor.id,
      approvedBy: adManager.id,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      priorityLevel: 9,
      tags: 'climate, environment, global summit, agreement',
      slug: 'global-climate-summit-historic-agreement',
      metaTitle: 'Global Climate Summit Reaches Historic Agreement',
      metaDescription: 'World leaders commit to ambitious climate goals in unprecedented international cooperation effort.',
      viewCount: 2100,
      shareCount: 87
    },
    {
      headline: 'Stock Market Hits Record High Amid Economic Recovery',
      briefContent: 'Major indices reach all-time highs as economic indicators show strong recovery momentum.',
      fullContent: 'The stock market reached unprecedented heights today as major indices closed at record levels, reflecting growing investor confidence in the ongoing economic recovery. The benchmark index gained 2.3% in trading, with technology and healthcare sectors leading the rally. Economic analysts attribute this surge to positive employment data, robust corporate earnings, and optimistic projections for continued growth. Consumer spending has increased significantly over the past quarter, while inflation rates remain within target ranges. Federal Reserve officials have indicated cautious optimism about the economic trajectory, though they emphasize the need for continued monitoring of key indicators. Market participants are closely watching upcoming earnings reports and policy announcements for further direction.',
      category: 'BUSINESS',
      status: 'PUBLISHED',
      authorId: editor.id,
      approvedBy: adManager.id,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      priorityLevel: 6,
      tags: 'stock market, economy, business, finance',
      slug: 'stock-market-record-high-economic-recovery',
      metaTitle: 'Stock Market Hits Record High Amid Economic Recovery',
      metaDescription: 'Major indices reach all-time highs as economic indicators show strong recovery momentum.',
      viewCount: 890,
      shareCount: 32
    },
    {
      headline: 'Revolutionary Medical Treatment Shows Promise in Clinical Trials',
      briefContent: 'New gene therapy demonstrates remarkable results in treating previously incurable genetic disorders.',
      fullContent: 'A revolutionary gene therapy treatment has shown extraordinary promise in Phase III clinical trials, offering hope for patients with previously incurable genetic disorders. The treatment, developed over a decade of research, uses advanced CRISPR technology to correct genetic mutations at the cellular level. Trial results published in leading medical journals show a 95% success rate in treating the target condition, with minimal side effects reported. Medical professionals are hailing this as a potential game-changer in personalized medicine. The therapy has received fast-track designation from regulatory authorities and could be available to patients within the next two years. Research teams are now exploring applications for other genetic conditions, potentially benefiting millions of patients worldwide.',
      category: 'HEALTH',
      status: 'PUBLISHED',
      authorId: editor.id,
      approvedBy: adManager.id,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      priorityLevel: 7,
      tags: 'medicine, gene therapy, clinical trials, health',
      slug: 'revolutionary-medical-treatment-clinical-trials',
      metaTitle: 'Revolutionary Medical Treatment Shows Promise in Clinical Trials',
      metaDescription: 'New gene therapy demonstrates remarkable results in treating previously incurable genetic disorders.',
      viewCount: 1450,
      shareCount: 78
    },
    {
      headline: 'Championship Victory Sparks City-Wide Celebrations',
      briefContent: 'Local team achieves historic win in dramatic championship final, bringing joy to millions of fans.',
      fullContent: 'The city erupted in celebration last night as the local team secured a dramatic victory in the championship final, ending a decades-long drought and bringing immense joy to millions of devoted fans. The thrilling match went into overtime, with the winning goal scored in the final minutes of play. Team captain Maria Rodriguez was named MVP after an outstanding performance throughout the tournament. Fans gathered in the city center for spontaneous celebrations that continued well into the early morning hours. The victory represents not just athletic achievement but also community unity and perseverance. Local businesses reported record sales as fans purchased commemorative merchandise. The team is scheduled for a victory parade through the city center next week, with hundreds of thousands expected to attend.',
      category: 'SPORTS',
      status: 'PUBLISHED',
      authorId: editor.id,
      approvedBy: adManager.id,
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      priorityLevel: 5,
      tags: 'sports, championship, victory, celebration',
      slug: 'championship-victory-city-wide-celebrations',
      metaTitle: 'Championship Victory Sparks City-Wide Celebrations',
      metaDescription: 'Local team achieves historic win in dramatic championship final, bringing joy to millions of fans.',
      viewCount: 3200,
      shareCount: 156
    },
    {
      headline: 'Education Reform Initiative Shows Promising Early Results',
      briefContent: 'New teaching methods and curriculum changes demonstrate significant improvements in student outcomes.',
      fullContent: 'A comprehensive education reform initiative implemented across multiple school districts is showing highly promising results in its first year of implementation. The program, which focuses on personalized learning approaches and modern curriculum standards, has led to significant improvements in student engagement and academic performance. Test scores have increased by an average of 15% compared to previous years, while student satisfaction surveys show marked improvement in learning experiences. Teachers report increased job satisfaction and better classroom dynamics. The initiative includes enhanced teacher training, updated learning materials, and integration of technology in educational processes. Parent involvement has also increased substantially, with more families participating in school activities and student support programs. Education officials are considering expanding the program to additional districts based on these encouraging outcomes.',
      category: 'EDUCATION',
      status: 'PUBLISHED',
      authorId: editor.id,
      approvedBy: adManager.id,
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      priorityLevel: 4,
      tags: 'education, reform, students, teaching',
      slug: 'education-reform-initiative-promising-results',
      metaTitle: 'Education Reform Initiative Shows Promising Early Results',
      metaDescription: 'New teaching methods and curriculum changes demonstrate significant improvements in student outcomes.',
      viewCount: 680,
      shareCount: 28
    }
  ];

  for (const articleData of sampleArticles) {
    await prisma.newsArticle.upsert({
      where: { slug: articleData.slug },
      update: {},
      create: articleData
    });
  }

  console.log('📰 Sample articles created');

  // Create sample advertisements
  const sampleAds = [
    {
      title: 'Premium Coffee Delivery Service',
      content: 'Get fresh, premium coffee delivered to your door every morning. Use code NEWS20 for 20% off your first order.',
      imageUrl: '/uploads/coffee-ad.jpg',
      targetUrl: 'https://example.com/coffee',
      position: 'BANNER',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      budget: 500.00,
      impressions: 1500,
      clickCount: 45,
      createdBy: adManager.id
    },
    {
      title: 'Online Learning Platform',
      content: 'Advance your career with our comprehensive online courses. Join thousands of successful learners today.',
      imageUrl: '/uploads/learning-ad.jpg',
      targetUrl: 'https://example.com/learning',
      position: 'SIDEBAR',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      budget: 1200.00,
      impressions: 2800,
      clickCount: 92,
      createdBy: adManager.id
    },
    {
      title: 'Fitness Equipment Sale',
      content: 'Transform your home into a professional gym. Limited time offer - up to 40% off all equipment.',
      imageUrl: '/uploads/fitness-ad.jpg',
      targetUrl: 'https://example.com/fitness',
      position: 'INLINE',
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      budget: 800.00,
      impressions: 950,
      clickCount: 28,
      createdBy: adManager.id
    }
  ];

  for (const adData of sampleAds) {
    await prisma.advertisement.create({
      data: adData
    });
  }

  console.log('📢 Sample advertisements created');

  // Create sample notifications
  const sampleNotifications = [
    {
      userId: user.id,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: 'Welcome to Daily News Dashboard',
      message: 'Thank you for joining our news platform. Explore the latest articles and stay informed!',
      data: { source: 'system', priority: 'normal' },
      createdBy: admin.id
    },
    {
      userId: editor.id,
      type: 'ARTICLE_APPROVED',
      title: 'Article Approved',
      message: 'Your article "Breaking: Major Technology Breakthrough in AI Research" has been approved and published.',
      data: { articleId: 'placeholder', action: 'approved' },
      createdBy: adManager.id
    },
    {
      userId: user.id,
      type: 'PROMOTIONAL',
      title: 'New Articles Available',
      message: 'Check out the latest articles in Technology and Environment categories.',
      data: { categories: ['TECHNOLOGY', 'ENVIRONMENT'], count: 2 },
      createdBy: admin.id
    },
    {
      userId: editor.id,
      type: 'ARTICLE_PUBLISHED',
      title: 'Article Published',
      message: 'Your article about climate summit has been published and is gaining traction!',
      data: { articleId: 'placeholder', views: 150 },
      createdBy: adManager.id
    }
  ];

  for (const notificationData of sampleNotifications) {
    await prisma.notification.create({
      data: notificationData
    });
  }

  console.log('🔔 Sample notifications created');

  // Create system settings
  const systemSettings = [
    { key: 'site_name', value: 'Daily News Dashboard', type: 'string', category: 'general' },
    { key: 'site_description', value: 'Your trusted source for daily news and updates', type: 'string', category: 'general' },
    { key: 'max_articles_per_page', value: '10', type: 'number', category: 'content' },
    { key: 'enable_user_registration', value: 'true', type: 'boolean', category: 'users' },
    { key: 'require_email_verification', value: 'false', type: 'boolean', category: 'users' },
    { key: 'default_article_status', value: 'PENDING', type: 'string', category: 'content' },
    { key: 'enable_comments', value: 'true', type: 'boolean', category: 'engagement' },
    { key: 'auto_publish_approved_articles', value: 'true', type: 'boolean', category: 'content' },
    { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system' },
    { key: 'analytics_enabled', value: 'true', type: 'boolean', category: 'system' }
  ];

  for (const setting of systemSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }

  console.log('⚙️ System settings created');

  // Create sample user favorites (for demonstration)
  const articles = await prisma.newsArticle.findMany({
    take: 3,
    select: { id: true }
  });

  for (const article of articles) {
    await prisma.userFavorite.upsert({
      where: {
        userId_newsId: {
          userId: user.id,
          newsId: article.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        newsId: article.id
      }
    });
  }

  console.log('⭐ Sample favorites created');

  // Create sample search history
  const searchQueries = [
    'artificial intelligence',
    'climate change',
    'stock market',
    'gene therapy',
    'championship',
    'education reform'
  ];

  for (const query of searchQueries) {
    await prisma.searchHistory.create({
      data: {
        userId: user.id,
        query,
        results: Math.floor(Math.random() * 20) + 1
      }
    });
  }

  console.log('🔍 Sample search history created');

  // Create sample reading history
  const readingHistoryData = [
    {
      userId: user.id,
      articleId: articles[0].id,
      timeSpent: 180, // 3 minutes
      readProgress: 0.85,
      lastPosition: 1200
    },
    {
      userId: user.id,
      articleId: articles[1].id,
      timeSpent: 240, // 4 minutes
      readProgress: 1.0,
      lastPosition: 1800
    },
    {
      userId: editor.id,
      articleId: articles[2].id,
      timeSpent: 120, // 2 minutes
      readProgress: 0.6,
      lastPosition: 800
    }
  ];

  for (const readingData of readingHistoryData) {
    await prisma.readingHistory.upsert({
      where: {
        userId_articleId: {
          userId: readingData.userId,
          articleId: readingData.articleId
        }
      },
      update: {},
      create: readingData
    });
  }

  console.log('📚 Sample reading history created');

  console.log('✅ Database seeding completed successfully!');
  
  console.log('\n🔑 Default user credentials:');
  console.log('Admin: admin@dailynews.com / admin123!');
  console.log('AD Manager: admanager@dailynews.com / manager123!');
  console.log('Editor: editor@dailynews.com / editor123!');
  console.log('User: user@dailynews.com / user123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });