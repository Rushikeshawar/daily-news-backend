// scripts/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Working placeholder image URLs
const IMAGES = {
  avatars: {
    admin: 'https://i.pravatar.cc/150?img=12',
    admanager: 'https://i.pravatar.cc/150?img=33',
    editor1: 'https://i.pravatar.cc/150?img=68',
    editor2: 'https://i.pravatar.cc/150?img=47',
    user1: 'https://i.pravatar.cc/150?img=25',
    user2: 'https://i.pravatar.cc/150?img=56',
    user3: 'https://i.pravatar.cc/150?img=31'
  },
  articles: {
    aiHealthcare: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    climateSummit: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b5?w=800',
    stockMarket: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    mediterraneanDiet: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
    marsMission: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800',
    educationReform: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800'
  },
  ai: {
    gpt5: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
    computerVision: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    drugDiscovery: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800'
  },
  timesaver: {
    aiHealthQuick: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600',
    climateBrief: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600',
    marketsSurge: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600',
    dietWeekly: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    spaceWeekly: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600',
    gpt5Viral: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600',
    selfDrivingBrief: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600',
    aiMedicineMonth: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600',
    remoteWork: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=600'
  },
  breaking: {
    techAcquisition: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
    gdpGrowth: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'
  },
  ads: {
    newsletter: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300',
    cloudServices: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600'
  },
  icons: {
    aiModels: 'https://api.iconify.design/mdi/robot.svg',
    computerVision: 'https://api.iconify.design/mdi/eye-outline.svg',
    healthcareAi: 'https://api.iconify.design/mdi/heart-pulse.svg',
    nlp: 'https://api.iconify.design/mdi/message-text.svg',
    robotics: 'https://api.iconify.design/mdi/robot-industrial.svg'
  }
};

async function main() {
  console.log('Starting database seeding...\n');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.timeSaverInteraction.deleteMany({});
  await prisma.timeSaverView.deleteMany({});
  await prisma.aiArticleInteraction.deleteMany({});
  await prisma.aiArticleView.deleteMany({});
  await prisma.timeSaverContent.deleteMany({});
  await prisma.breakingNews.deleteMany({});
  await prisma.quickUpdate.deleteMany({});
  await prisma.aiArticle.deleteMany({});
  await prisma.aiCategory.deleteMany({});
  await prisma.readingHistory.deleteMany({});
  await prisma.searchHistory.deleteMany({});
  await prisma.approvalHistory.deleteMany({});
  await prisma.userFavorite.deleteMany({});
  await prisma.advertisement.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.newsArticle.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.systemSettings.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Existing data cleared\n');

  // 1. Create Users
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@newsplatform.com',
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      avatar: IMAGES.avatars.admin,
      lastLogin: new Date()
    }
  });

  const adManager = await prisma.user.create({
    data: {
      email: 'admanager@newsplatform.com',
      passwordHash: hashedPassword,
      fullName: 'Ad Manager',
      role: 'AD_MANAGER',
      isActive: true,
      avatar: IMAGES.avatars.admanager,
      lastLogin: new Date()
    }
  });

  const editor1 = await prisma.user.create({
    data: {
      email: 'editor1@newsplatform.com',
      passwordHash: hashedPassword,
      fullName: 'John Editor',
      role: 'EDITOR',
      isActive: true,
      avatar: IMAGES.avatars.editor1,
      lastLogin: new Date()
    }
  });

  const editor2 = await prisma.user.create({
    data: {
      email: 'editor2@newsplatform.com',
      passwordHash: hashedPassword,
      fullName: 'Sarah Writer',
      role: 'EDITOR',
      isActive: true,
      avatar: IMAGES.avatars.editor2,
      lastLogin: new Date()
    }
  });

  const users = await prisma.user.createMany({
    data: [
      {
        email: 'user1@example.com',
        passwordHash: hashedPassword,
        fullName: 'Alice Reader',
        role: 'USER',
        isActive: true,
        avatar: IMAGES.avatars.user1
      },
      {
        email: 'user2@example.com',
        passwordHash: hashedPassword,
        fullName: 'Bob Smith',
        role: 'USER',
        isActive: true,
        avatar: IMAGES.avatars.user2
      },
      {
        email: 'user3@example.com',
        passwordHash: hashedPassword,
        fullName: 'Carol Johnson',
        role: 'USER',
        isActive: true,
        avatar: IMAGES.avatars.user3
      }
    ]
  });
  console.log(`Created ${3 + users.count} users\n`);

  // 2. Create News Articles
  console.log('Creating news articles...');
  
  const article1 = await prisma.newsArticle.create({
    data: {
      headline: 'Revolutionary AI Breakthrough in Healthcare',
      briefContent: 'Scientists announce major advancement in AI-powered disease detection',
      fullContent: 'In a groundbreaking development, researchers have created an AI system that can detect diseases with 99% accuracy. This breakthrough could revolutionize early diagnosis and save millions of lives globally. The system uses advanced machine learning algorithms to analyze medical imaging and patient data with unprecedented precision.',
      category: 'TECHNOLOGY',
      status: 'PUBLISHED',
      priorityLevel: 8,
      authorId: editor1.id,
      approvedBy: adManager.id,
      featuredImage: IMAGES.articles.aiHealthcare,
      tags: 'AI, Healthcare, Technology, Innovation',
      slug: 'revolutionary-ai-breakthrough-healthcare',
      metaTitle: 'AI Breakthrough in Healthcare | News Platform',
      metaDescription: 'Major advancement in AI-powered disease detection announced',
      viewCount: 15420,
      shareCount: 892,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  const article2 = await prisma.newsArticle.create({
    data: {
      headline: 'Global Climate Summit Reaches Historic Agreement',
      briefContent: 'World leaders commit to ambitious carbon reduction targets',
      fullContent: 'After intense negotiations, representatives from 195 countries have agreed on comprehensive climate action plans. The historic agreement includes binding commitments to reduce carbon emissions by 50% by 2035 and establish a $100 billion fund for climate adaptation in developing nations.',
      category: 'ENVIRONMENT',
      status: 'PUBLISHED',
      priorityLevel: 9,
      authorId: editor2.id,
      approvedBy: adManager.id,
      featuredImage: IMAGES.articles.climateSummit,
      tags: 'Climate, Environment, Politics, Global',
      slug: 'global-climate-summit-historic-agreement',
      metaTitle: 'Historic Climate Agreement Reached',
      metaDescription: 'World leaders commit to ambitious carbon reduction',
      viewCount: 12350,
      shareCount: 756,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  });

  const article3 = await prisma.newsArticle.create({
    data: {
      headline: 'Stock Market Hits All-Time High',
      briefContent: 'Major indices surge on positive economic indicators',
      fullContent: 'Global stock markets celebrated today as major indices reached record highs, driven by strong corporate earnings and optimistic economic forecasts. The S&P 500 gained 2.3%, while tech stocks led the rally with gains exceeding 3%.',
      category: 'BUSINESS',
      status: 'PUBLISHED',
      priorityLevel: 7,
      authorId: editor1.id,
      approvedBy: admin.id,
      featuredImage: IMAGES.articles.stockMarket,
      tags: 'Finance, Business, Economy, Markets',
      slug: 'stock-market-all-time-high',
      metaTitle: 'Stock Market Reaches Record High',
      metaDescription: 'Major indices surge on positive economic data',
      viewCount: 8920,
      shareCount: 445,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  const article4 = await prisma.newsArticle.create({
    data: {
      headline: 'New Study Reveals Benefits of Mediterranean Diet',
      briefContent: 'Research shows significant health improvements from dietary changes',
      fullContent: 'A comprehensive 10-year study has confirmed the extensive health benefits of the Mediterranean diet. Participants following the diet showed a 30% reduction in heart disease risk, improved cognitive function, and better overall health markers.',
      category: 'HEALTH',
      status: 'PUBLISHED',
      priorityLevel: 6,
      authorId: editor2.id,
      approvedBy: adManager.id,
      featuredImage: IMAGES.articles.mediterraneanDiet,
      tags: 'Health, Diet, Wellness, Research',
      slug: 'mediterranean-diet-health-benefits',
      metaTitle: 'Mediterranean Diet Benefits Confirmed',
      metaDescription: 'New research validates health improvements',
      viewCount: 7650,
      shareCount: 523,
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    }
  });

  const article5 = await prisma.newsArticle.create({
    data: {
      headline: 'Space Agency Announces Mars Mission Timeline',
      briefContent: 'Manned mission to Mars planned for 2030',
      fullContent: 'The space agency has unveiled detailed plans for sending astronauts to Mars within the next decade. The mission will include establishing a permanent research base and conducting extensive geological surveys to understand the planet\'s history and potential for supporting life.',
      category: 'SCIENCE',
      status: 'PUBLISHED',
      priorityLevel: 8,
      authorId: editor1.id,
      approvedBy: admin.id,
      featuredImage: IMAGES.articles.marsMission,
      tags: 'Space, Science, Mars, Exploration',
      slug: 'mars-mission-timeline-announced',
      metaTitle: 'Mars Mission Timeline Revealed',
      metaDescription: 'Manned mission to Mars planned for 2030',
      viewCount: 11240,
      shareCount: 678,
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  });

  const article6 = await prisma.newsArticle.create({
    data: {
      headline: 'Education Reform Bill Under Review',
      briefContent: 'Proposed changes to national education system',
      fullContent: 'Lawmakers are considering significant reforms to the education system, including increased funding for STEM programs, teacher salary improvements, and modernization of school infrastructure.',
      category: 'EDUCATION',
      status: 'PENDING',
      priorityLevel: 5,
      authorId: editor2.id,
      featuredImage: IMAGES.articles.educationReform,
      tags: 'Education, Politics, Reform',
      slug: 'education-reform-bill-review'
    }
  });

  console.log('Created 6 news articles\n');

  // 3. Create AI/ML Articles
  console.log('Creating AI/ML articles...');

  const aiArticle1 = await prisma.aiArticle.create({
    data: {
      headline: 'GPT-5 Rumors: What We Know So Far',
      briefContent: 'Industry insiders share details about upcoming AI model',
      fullContent: 'Speculation is building around the next generation of large language models. Industry sources suggest GPT-5 will feature dramatically improved reasoning capabilities, better context understanding, and more efficient training methods.',
      category: 'AI Models',
      featuredImage: IMAGES.ai.gpt5,
      tags: 'GPT, LLM, AI, OpenAI',
      aiModel: 'GPT-5',
      aiApplication: 'Natural Language Processing',
      companyMentioned: 'OpenAI',
      technologyType: 'Large Language Model',
      viewCount: 8920,
      shareCount: 567,
      relevanceScore: 9.2,
      isTrending: true,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdBy: adManager.id
    }
  });

  const aiArticle2 = await prisma.aiArticle.create({
    data: {
      headline: 'Computer Vision Breakthrough in Autonomous Vehicles',
      briefContent: 'New algorithms improve object detection accuracy',
      fullContent: 'Researchers have developed advanced computer vision systems that dramatically improve autonomous vehicle safety. The new YOLOv8-based system achieves 99.7% accuracy in real-world conditions.',
      category: 'Computer Vision',
      featuredImage: IMAGES.ai.computerVision,
      tags: 'CV, Autonomous, Self-Driving, AI',
      aiModel: 'YOLOv8',
      aiApplication: 'Object Detection',
      companyMentioned: 'Tesla',
      technologyType: 'Computer Vision',
      viewCount: 6540,
      shareCount: 423,
      relevanceScore: 8.7,
      isTrending: true,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: admin.id
    }
  });

  const aiArticle3 = await prisma.aiArticle.create({
    data: {
      headline: 'Machine Learning in Drug Discovery',
      briefContent: 'AI accelerates pharmaceutical research timelines',
      fullContent: 'Pharmaceutical companies are increasingly turning to machine learning to speed up drug discovery. AlphaFold and similar systems are revolutionizing protein structure prediction and drug candidate identification.',
      category: 'Healthcare AI',
      featuredImage: IMAGES.ai.drugDiscovery,
      tags: 'ML, Healthcare, Pharma, Research',
      aiModel: 'AlphaFold',
      aiApplication: 'Drug Discovery',
      companyMentioned: 'DeepMind',
      technologyType: 'Machine Learning',
      viewCount: 5230,
      shareCount: 334,
      relevanceScore: 8.5,
      isTrending: false,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdBy: adManager.id
    }
  });

  console.log('Created 3 AI/ML articles\n');

  // 4. Create AI Categories
  console.log('Creating AI categories...');
  await prisma.aiCategory.createMany({
    data: [
      { 
        name: 'AI Models', 
        description: 'Latest AI model developments', 
        iconUrl: IMAGES.icons.aiModels, 
        articleCount: 1, 
        isHot: true 
      },
      { 
        name: 'Computer Vision', 
        description: 'Visual AI and image processing', 
        iconUrl: IMAGES.icons.computerVision, 
        articleCount: 1, 
        isHot: true 
      },
      { 
        name: 'Healthcare AI', 
        description: 'AI in medical applications', 
        iconUrl: IMAGES.icons.healthcareAi, 
        articleCount: 1, 
        isHot: false 
      },
      { 
        name: 'NLP', 
        description: 'Natural Language Processing advances', 
        iconUrl: IMAGES.icons.nlp, 
        articleCount: 0, 
        isHot: true 
      },
      { 
        name: 'Robotics', 
        description: 'AI-powered robotics', 
        iconUrl: IMAGES.icons.robotics, 
        articleCount: 0, 
        isHot: false 
      }
    ]
  });
  console.log('Created AI categories\n');

  // 5. Create TimeSaver Content with Article Links
  console.log('Creating TimeSaver content...');

  // Today's New content
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'AI Healthcare Revolution',
        summary: 'Quick recap of today\'s biggest AI breakthrough in medical diagnostics',
        category: 'TECHNOLOGY',
        imageUrl: IMAGES.timesaver.aiHealthQuick,
        iconName: 'activity',
        bgColor: '#3B82F6',
        keyPoints: 'AI detects diseases with 99% accuracy|Game-changing for early diagnosis|Available in hospitals next year',
        readTimeSeconds: 45,
        isPriority: true,
        contentType: 'QUICK_UPDATE',
        contentGroup: 'today_new',
        tags: 'ai,healthcare,today,breaking',
        linkedArticleId: article1.id,
        publishedAt: new Date(),
        createdBy: adManager.id
      },
      {
        title: 'Climate Deal Highlights',
        summary: 'Key points from the historic global climate agreement',
        category: 'ENVIRONMENT',
        imageUrl: IMAGES.timesaver.climateBrief,
        iconName: 'globe',
        bgColor: '#10B981',
        keyPoints: '195 countries signed|50% carbon reduction by 2035|$100B climate fund established',
        readTimeSeconds: 60,
        isPriority: true,
        contentType: 'DIGEST',
        contentGroup: 'today_new',
        tags: 'climate,environment,today',
        linkedArticleId: article2.id,
        publishedAt: new Date(),
        createdBy: adManager.id
      }
    ]
  });

  // Breaking & Critical content
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'Markets Surge to Records',
        summary: 'Stock indices hit all-time highs on strong earnings',
        category: 'BUSINESS',
        imageUrl: IMAGES.timesaver.marketsSurge,
        iconName: 'trending-up',
        bgColor: '#EF4444',
        keyPoints: 'S&P 500 up 2.3%|Tech sector leads gains|Investors optimistic',
        readTimeSeconds: 40,
        isPriority: true,
        contentType: 'BRIEFING',
        contentGroup: 'breaking_critical',
        tags: 'business,markets,breaking',
        linkedArticleId: article3.id,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        createdBy: admin.id
      }
    ]
  });

  // Weekly Highlights
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'Top Health Story: Mediterranean Diet Benefits',
        summary: 'Week\'s most important health research findings',
        category: 'HEALTH',
        imageUrl: IMAGES.timesaver.dietWeekly,
        iconName: 'heart',
        bgColor: '#F59E0B',
        keyPoints: '30% reduced heart disease risk|Improved cognitive function|Easy to follow',
        readTimeSeconds: 90,
        isPriority: false,
        contentType: 'HIGHLIGHTS',
        contentGroup: 'weekly_highlights',
        tags: 'health,weekly,research',
        linkedArticleId: article4.id,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdBy: adManager.id
      },
      {
        title: 'Week in Space Exploration',
        summary: 'Mars mission timeline and other space news',
        category: 'SCIENCE',
        imageUrl: IMAGES.timesaver.spaceWeekly,
        iconName: 'zap',
        bgColor: '#8B5CF6',
        keyPoints: 'Mars 2030 mission confirmed|New telescope images|ISS expansion plans',
        readTimeSeconds: 75,
        isPriority: false,
        contentType: 'HIGHLIGHTS',
        contentGroup: 'weekly_highlights',
        tags: 'space,science,weekly',
        linkedArticleId: article5.id,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdBy: admin.id
      }
    ]
  });

  // Viral Buzz (linked to AI articles)
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'Everyone\'s Talking About GPT-5',
        summary: 'The AI model that\'s breaking the internet',
        category: 'TECHNOLOGY',
        imageUrl: IMAGES.timesaver.gpt5Viral,
        iconName: 'zap',
        bgColor: '#EC4899',
        keyPoints: 'Trending on all platforms|Developers excited|Release date speculation',
        readTimeSeconds: 50,
        isPriority: false,
        contentType: 'QUICK_UPDATE',
        contentGroup: 'viral_buzz',
        tags: 'viral,trending,ai,gpt',
        linkedAiArticleId: aiArticle1.id,
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        createdBy: adManager.id
      }
    ]
  });

  // Brief Updates
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'Self-Driving Cars Get Smarter',
        summary: '30-second update on autonomous vehicle tech',
        category: 'TECHNOLOGY',
        imageUrl: IMAGES.timesaver.selfDrivingBrief,
        iconName: 'truck',
        bgColor: '#6366F1',
        keyPoints: 'New vision system|Better object detection|Safer navigation',
        readTimeSeconds: 30,
        isPriority: false,
        contentType: 'QUICK_UPDATE',
        contentGroup: 'brief_updates',
        tags: 'tech,ai,autonomous,brief',
        linkedAiArticleId: aiArticle2.id,
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
        createdBy: admin.id
      }
    ]
  });

  // Monthly Top content
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'AI in Medicine: Month in Review',
        summary: 'The breakthrough drug discovery powered by machine learning',
        category: 'HEALTH',
        imageUrl: IMAGES.timesaver.aiMedicineMonth,
        iconName: 'activity',
        bgColor: '#14B8A6',
        keyPoints: 'AI speeds drug discovery|New treatments identified|Future of medicine',
        readTimeSeconds: 120,
        isPriority: false,
        contentType: 'SUMMARY',
        contentGroup: 'monthly_top',
        tags: 'health,ai,monthly,research',
        linkedAiArticleId: aiArticle3.id,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdBy: adManager.id
      }
    ]
  });

  // Changing Norms content (no linked articles)
  await prisma.timeSaverContent.createMany({
    data: [
      {
        title: 'Remote Work Becomes the New Normal',
        summary: 'How workplace culture is evolving post-pandemic',
        category: 'LIFESTYLE',
        imageUrl: IMAGES.timesaver.remoteWork,
        iconName: 'home',
        bgColor: '#06B6D4',
        keyPoints: 'Companies embrace hybrid|Work-life balance focus|Digital nomad rise',
        readTimeSeconds: 85,
        isPriority: false,
        contentType: 'DIGEST',
        contentGroup: 'changing_norms',
        tags: 'culture,work,society,change',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdBy: adManager.id
      }
    ]
  });

  console.log('Created TimeSaver content with article links\n');

  // 6. Create Breaking News
  console.log('Creating breaking news...');
  await prisma.breakingNews.createMany({
    data: [
      {
        title: 'BREAKING: Major Tech Acquisition Announced',
        brief: 'Tech giant acquires AI startup for $5 billion',
        imageUrl: IMAGES.breaking.techAcquisition,
        sourceUrl: 'https://example.com/tech-acquisition',
        priority: 'CRITICAL',
        location: 'Silicon Valley',
        tags: 'tech,business,acquisition',
        timestamp: new Date()
      },
      {
        title: 'Flash: New Economic Data Released',
        brief: 'GDP growth exceeds expectations',
        imageUrl: IMAGES.breaking.gdpGrowth,
        priority: 'HIGH',
        tags: 'economy,business',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ]
  });
  console.log('Created breaking news\n');

  // 7. Create Advertisements
  console.log('Creating advertisements...');
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.advertisement.createMany({
    data: [
      {
        title: 'Premium Tech Newsletter',
        content: 'Subscribe to our weekly tech insights',
        imageUrl: IMAGES.ads.newsletter,
        targetUrl: 'https://example.com/subscribe',
        position: 'BANNER',
        isActive: true,
        startDate: now,
        endDate: futureDate,
        budget: 5000,
        clickCount: 245,
        impressions: 12340,
        createdBy: adManager.id
      },
      {
        title: 'Cloud Services Promo',
        content: 'Get 50% off enterprise cloud solutions',
        imageUrl: IMAGES.ads.cloudServices,
        targetUrl: 'https://example.com/cloud-promo',
        position: 'SIDEBAR',
        isActive: true,
        startDate: now,
        endDate: futureDate,
        budget: 3000,
        clickCount: 156,
        impressions: 8920,
        createdBy: adManager.id
      }
    ]
  });
  console.log('Created advertisements\n');

  // 8. Create User Interactions
  console.log('Creating user interactions...');
  const allUsers = await prisma.user.findMany();
  const regularUser = allUsers.find(u => u.role === 'USER');

  if (regularUser) {
    // Create favorites
    await prisma.userFavorite.createMany({
      data: [
        { userId: regularUser.id, newsId: article1.id, savedAt: new Date() },
        { userId: regularUser.id, newsId: article2.id, savedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      ]
    });

    // Create reading history
    await prisma.readingHistory.createMany({
      data: [
        {
          userId: regularUser.id,
          articleId: article1.id,
          timeSpent: 245,
          readProgress: 1.0,
          lastPosition: 100
        },
        {
          userId: regularUser.id,
          articleId: article3.id,
          timeSpent: 156,
          readProgress: 0.75,
          lastPosition: 75
        }
      ]
    });

    // Create search history
    await prisma.searchHistory.createMany({
      data: [
        { userId: regularUser.id, query: 'artificial intelligence', results: 15 },
        { userId: regularUser.id, query: 'climate change', results: 23 },
        { userId: regularUser.id, query: 'stock market', results: 18 }
      ]
    });
  }
  console.log('Created user interactions\n');

  // 9. Create System Settings
  console.log('Creating system settings...');
  await prisma.systemSettings.createMany({
    data: [
      { key: 'site_name', value: 'News Platform', type: 'string', category: 'general' },
      { key: 'site_description', value: 'Your trusted news source', type: 'string', category: 'general' },
      { key: 'articles_per_page', value: '10', type: 'number', category: 'content' },
      { key: 'enable_comments', value: 'true', type: 'boolean', category: 'features' },
      { key: 'max_upload_size', value: '5242880', type: 'number', category: 'uploads' }
    ]
  });
  console.log('Created system settings\n');

  console.log('✅ Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log('   - Users: 7 (1 Admin, 1 AD_MANAGER, 2 Editors, 3 Regular Users)');
  console.log('   - News Articles: 6 (5 published, 1 pending)');
  console.log('   - AI Articles: 3');
  console.log('   - TimeSaver Content: 9 (with article links)');
  console.log('   - Breaking News: 2');
  console.log('   - Advertisements: 2');
  console.log('   - AI Categories: 5');
  console.log('\n🔑 Login Credentials:');
  console.log('   Admin: admin@newsplatform.com / password123');
  console.log('   AD Manager: admanager@newsplatform.com / password123');
  console.log('   Editor: editor1@newsplatform.com / password123');
  console.log('   User: user1@example.com / password123');
  console.log('\n📸 Image Sources:');
  console.log('   - Avatars: pravatar.cc (random avatar generator)');
  console.log('   - Articles: unsplash.com (high-quality stock photos)');
  console.log('   - Icons: iconify.design (SVG icon API)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });