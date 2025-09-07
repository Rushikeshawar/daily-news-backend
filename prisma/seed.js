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

  // Create sample articles with real images from Unsplash
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
      featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
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
      featuredImage: 'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e5?w=800&h=400&fit=crop',
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
      featuredImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
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
      featuredImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop',
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
      featuredImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop',
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
      featuredImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=400&fit=crop',
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

  // Create AI/ML content if tables exist
  try {
    await prisma.aiArticle.count();
    
    const aiArticles = [
      {
        headline: 'GPT-4 Successor Demonstrates Revolutionary Language Understanding',
        briefContent: 'OpenAI unveils next-generation language model with unprecedented comprehension capabilities.',
        fullContent: 'OpenAI has announced the development of its most advanced language model to date, surpassing GPT-4 in multiple benchmark tests. The new model demonstrates remarkable improvements in logical reasoning, mathematical problem-solving, and nuanced language understanding. Early testing reveals a 40% improvement in complex reasoning tasks and significantly reduced hallucination rates. The model incorporates novel training techniques and architectural improvements that allow for more accurate and contextually appropriate responses. Industry experts are calling this a significant leap forward in artificial general intelligence development.',
        category: 'NATURAL_LANGUAGE_PROCESSING',
        featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
        tags: 'GPT, language model, OpenAI, NLP, AGI',
        aiModel: 'GPT-5',
        aiApplication: 'Language Understanding',
        companyMentioned: 'OpenAI',
        technologyType: 'Large Language Model',
        viewCount: 2450,
        shareCount: 189,
        relevanceScore: 9.2,
        isTrending: true,
        publishedAt: new Date()
      },
      {
        headline: 'Google DeepMind Achieves Breakthrough in Protein Folding Prediction',
        briefContent: 'AlphaFold 3 predicts protein structures with 98% accuracy, revolutionizing drug discovery.',
        fullContent: 'Google DeepMind has released AlphaFold 3, which achieves unprecedented accuracy in predicting protein structures and interactions. This breakthrough could accelerate drug discovery processes by decades, enabling researchers to understand diseases at a molecular level and design targeted treatments more efficiently. The system can now predict not only protein folding but also protein-protein, protein-DNA, and protein-RNA interactions with remarkable precision. Pharmaceutical companies are already integrating this technology into their research pipelines, with several major drug discoveries attributed to AlphaFold insights.',
        category: 'DEEP_LEARNING',
        featuredImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop',
        tags: 'protein folding, AlphaFold, drug discovery, biology, DeepMind',
        aiModel: 'AlphaFold 3',
        aiApplication: 'Protein Structure Prediction',
        companyMentioned: 'Google DeepMind',
        technologyType: 'Deep Neural Network',
        viewCount: 1890,
        shareCount: 124,
        relevanceScore: 8.9,
        isTrending: true,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        headline: 'Tesla Full Self-Driving Achieves Level 4 Autonomy in Urban Testing',
        briefContent: 'Tesla FSD Beta demonstrates consistent Level 4 autonomous driving in complex city environments.',
        fullContent: 'Tesla Full Self-Driving (FSD) Beta has successfully achieved Level 4 autonomy in extensive urban testing scenarios, marking a significant milestone in autonomous vehicle development. The system demonstrated the ability to navigate complex intersections, handle unexpected obstacles, and make split-second decisions without human intervention across 10,000 miles of city driving. The breakthrough comes from improved neural network architectures and vast amounts of real-world training data collected from Tesla vehicle fleet. Regulatory approval discussions are underway in several states, with commercial deployment expected within 18 months.',
        category: 'COMPUTER_VISION',
        featuredImage: 'https://images.unsplash.com/photo-1549317336-206569e8475c?w=800&h=400&fit=crop',
        tags: 'autonomous driving, Tesla, FSD, computer vision, neural networks',
        aiModel: 'Tesla FSD v12',
        aiApplication: 'Autonomous Driving',
        companyMentioned: 'Tesla',
        technologyType: 'Computer Vision Neural Network',
        viewCount: 3200,
        shareCount: 245,
        relevanceScore: 9.0,
        isTrending: true,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const aiArticle of aiArticles) {
      await prisma.aiArticle.create({
        data: aiArticle
      });
    }

    console.log('🤖 AI/ML articles created');
  } catch (error) {
    console.log('ℹ️  AI/ML tables not found, skipping AI content creation');
  }

  // Create Time Saver Content if tables exist
  try {
    await prisma.timeSaverContent.count();
    
    const timeSaverContent = [
      {
        title: 'Tech Industry Weekly Digest',
        summary: 'Major developments in technology this week including AI breakthroughs, startup funding, and tech policy updates.',
        category: 'TECHNOLOGY',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
        iconName: 'TechIcon',
        bgColor: '#3B82F6',
        keyPoints: 'AI breakthroughs, $2B startup funding, new privacy regulations, quantum computing advances',
        sourceUrl: 'https://example.com/tech-digest',
        readTimeSeconds: 180,
        isPriority: true,
        contentType: 'DIGEST',
        viewCount: 1250,
        publishedAt: new Date()
      },
      {
        title: 'Global Markets Quick Update',
        summary: 'Stock markets rally on positive economic data. Key indicators show strong growth momentum.',
        category: 'BUSINESS',
        imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
        iconName: 'BusinessIcon',
        bgColor: '#10B981',
        keyPoints: 'S&P 500 +2.3%, unemployment down, inflation stable, earnings beat expectations',
        sourceUrl: 'https://example.com/market-update',
        readTimeSeconds: 90,
        isPriority: false,
        contentType: 'QUICK_UPDATE',
        viewCount: 890,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        title: 'Health & Science Briefing',
        summary: 'New medical breakthroughs, climate research findings, and space exploration updates.',
        category: 'HEALTH',
        imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
        iconName: 'HealthIcon',
        bgColor: '#EF4444',
        keyPoints: 'Gene therapy approval, climate adaptation study, Mars mission progress, vaccine updates',
        sourceUrl: 'https://example.com/health-briefing',
        readTimeSeconds: 240,
        isPriority: true,
        contentType: 'BRIEFING',
        viewCount: 1450,
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },
      {
        title: 'Sports Highlights Summary',
        summary: 'Championship results, trade news, and upcoming matches across major sports leagues.',
        category: 'SPORTS',
        imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop',
        iconName: 'SportsIcon',
        bgColor: '#F59E0B',
        keyPoints: 'Championship finals, major trades, injury updates, playoff schedules',
        sourceUrl: 'https://example.com/sports-highlights',
        readTimeSeconds: 150,
        isPriority: false,
        contentType: 'HIGHLIGHTS',
        viewCount: 950,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },
      {
        title: 'Political Updates Summary',
        summary: 'Key political developments, policy changes, and international relations updates.',
        category: 'POLITICS',
        imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop',
        iconName: 'PoliticsIcon',
        bgColor: '#8B5CF6',
        keyPoints: 'Policy announcements, diplomatic meetings, election updates, legislative progress',
        sourceUrl: 'https://example.com/political-updates',
        readTimeSeconds: 200,
        isPriority: true,
        contentType: 'SUMMARY',
        viewCount: 720,
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
      }
    ];

    for (const content of timeSaverContent) {
      await prisma.timeSaverContent.create({
        data: content
      });
    }

    console.log('⏰ Time Saver content created');

    // Create Breaking News
    const breakingNews = [
      {
        title: 'URGENT: Major Cybersecurity Breach Affects Millions of Users',
        brief: 'A sophisticated cyberattack has compromised data from multiple major platforms, affecting over 50 million users worldwide.',
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop',
        sourceUrl: 'https://example.com/cybersecurity-breach',
        priority: 'CRITICAL',
        location: 'Global',
        tags: 'cybersecurity, data breach, privacy, technology',
        timestamp: new Date()
      },
      {
        title: 'Breaking: Historic Climate Agreement Reached at COP Summit',
        brief: 'World leaders commit to unprecedented carbon reduction targets and renewable energy investments.',
        imageUrl: 'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e5?w=400&h=300&fit=crop',
        sourceUrl: 'https://example.com/climate-agreement',
        priority: 'HIGH',
        location: 'Dubai, UAE',
        tags: 'climate change, environment, policy, global',
        timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        title: 'Stock Market Flash: Tech Stocks Surge 5% in Pre-Market Trading',
        brief: 'Major technology companies see significant gains following positive earnings reports and AI investment announcements.',
        imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop',
        sourceUrl: 'https://example.com/tech-stocks-surge',
        priority: 'MEDIUM',
        location: 'New York, USA',
        tags: 'stocks, technology, earnings, finance',
        timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      }
    ];

    for (const news of breakingNews) {
      await prisma.breakingNews.create({
        data: news
      });
    }

    console.log('🚨 Breaking news created');

    // Create Quick Updates
    const quickUpdates = [
      {
        title: 'AI Startup Raises $100M Series B Funding',
        brief: 'Revolutionary AI company secures major funding round led by top venture capital firms.',
        category: 'TECHNOLOGY',
        imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop',
        tags: 'startup, funding, AI, venture capital',
        isHot: true,
        engagementScore: 95,
        timestamp: new Date()
      },
      {
        title: 'New COVID Variant Detected in Multiple Countries',
        brief: 'Health officials monitor new variant with enhanced transmissibility but similar severity.',
        category: 'HEALTH',
        imageUrl: 'https://images.unsplash.com/photo-1584118624012-df056829fbd0?w=400&h=300&fit=crop',
        tags: 'covid, health, variant, global',
        isHot: true,
        engagementScore: 87,
        timestamp: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      },
      {
        title: 'Space Mission Achieves Historic Milestone',
        brief: 'Artemis mission successfully completes lunar orbit insertion, paving way for moon landing.',
        category: 'SCIENCE',
        imageUrl: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop',
        tags: 'space, NASA, moon mission, science',
        isHot: false,
        engagementScore: 78,
        timestamp: new Date(Date.now() - 90 * 60 * 1000) // 1.5 hours ago
      }
    ];

    for (const update of quickUpdates) {
      await prisma.quickUpdate.create({
        data: update
      });
    }

    console.log('⚡ Quick updates created');

  } catch (error) {
    console.log('ℹ️  Time Saver tables not found, skipping Time Saver content creation');
  }

  // Create sample advertisements with real images
  const sampleAds = [
    {
      title: 'Premium Coffee Delivery Service',
      content: 'Get fresh, premium coffee delivered to your door every morning. Use code NEWS20 for 20% off your first order.',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
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
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop',
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
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
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
      title: 'New Time Saver Content Available',
      message: 'Check out the latest tech digest and breaking news updates in your Time Saver section.',
      data: { categories: ['TECHNOLOGY', 'BUSINESS'], count: 3 },
      createdBy: admin.id
    },
    {
      userId: editor.id,
      type: 'ARTICLE_PUBLISHED',
      title: 'Time Saver Content Published',
      message: 'Your weekly tech digest has been published and is getting great engagement!',
      data: { articleId: 'placeholder', views: 250 },
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
    { key: 'analytics_enabled', value: 'true', type: 'boolean', category: 'system' },
    { key: 'time_saver_enabled', value: 'true', type: 'boolean', category: 'features' },
    { key: 'breaking_news_enabled', value: 'true', type: 'boolean', category: 'features' },
    { key: 'quick_updates_refresh_rate', value: '300', type: 'number', category: 'time_saver' }
  ];

  for (const setting of systemSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }

  console.log('⚙️ System settings created');

  // Create sample user favorites and reading history
  const articles = await prisma.newsArticle.findMany({
    take: 3,
    select: { id: true }
  });

  // Create favorites for regular articles
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
    'machine learning breakthrough',
    'climate change',
    'stock market',
    'gene therapy',
    'autonomous driving',
    'education reform',
    'breaking news',
    'time saver digest',
    'quick updates'
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

  // Create engagement data for Time Saver content if tables exist
  try {
    const timeSaverContentIds = await prisma.timeSaverContent.findMany({
      select: { id: true }
    });

    // Create sample time saver views
    for (const content of timeSaverContentIds.slice(0, 3)) {
      await prisma.timeSaverView.create({
        data: {
          contentId: content.id,
          userId: user.id,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) // Random time in last 24 hours
        }
      }).catch(() => {}); // Ignore duplicates
    }

    // Create sample time saver interactions
    const interactionTypes = ['SHARE', 'BOOKMARK', 'LIKE', 'SAVE_FOR_LATER'];
    for (const content of timeSaverContentIds.slice(0, 2)) {
      const randomInteraction = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
      await prisma.timeSaverInteraction.create({
        data: {
          contentId: content.id,
          userId: user.id,
          interactionType: randomInteraction,
          timestamp: new Date()
        }
      }).catch(() => {}); // Ignore duplicates
    }

    console.log('⏰ Time Saver engagement data created');
  } catch (error) {
    console.log('ℹ️  Time Saver interaction tables not found, skipping engagement data');
  }

  console.log('✅ Database seeding completed successfully!');
  
  console.log('\n🔑 Default user credentials:');
  console.log('Admin: admin@dailynews.com / admin123!');
  console.log('AD Manager: admanager@dailynews.com / manager123!');
  console.log('Editor: editor@dailynews.com / editor123!');
  console.log('User: user@dailynews.com / user123!');
  
  console.log('\n🚀 Features Created:');
  console.log('- 6 Regular News Articles with Unsplash images');
  console.log('- 3 AI/ML Articles (if tables exist)');
  console.log('- 5 Time Saver Content items');
  console.log('- 3 Breaking News items');  
  console.log('- 3 Quick Updates');
  console.log('- Sample engagement and analytics data');
  console.log('- Real images from Unsplash for all content');
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
