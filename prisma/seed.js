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

  // Clear existing data in correct order (respecting foreign key constraints)
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
  await prisma.passwordReset.deleteMany({});
  await prisma.pendingRegistration.deleteMany({});
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
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      emailVerified: true,
      emailVerifiedAt: new Date(),
      avatar: IMAGES.avatars.editor2,
      lastLogin: new Date()
    }
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      passwordHash: hashedPassword,
      fullName: 'Alice Reader',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      avatar: IMAGES.avatars.user1
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      passwordHash: hashedPassword,
      fullName: 'Bob Smith',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      avatar: IMAGES.avatars.user2
    }
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'user3@example.com',
      passwordHash: hashedPassword,
      fullName: 'Carol Johnson',
      role: 'USER',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      avatar: IMAGES.avatars.user3
    }
  });

  console.log('Created 7 users\n');

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
  console.log('Created 5 AI categories\n');

  // 5. Create TimeSaver Content with Article Links
  console.log('Creating TimeSaver content...');

  // Today's New content
  const timesaver1 = await prisma.timeSaverContent.create({
    data: {
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
    }
  });

  const timesaver2 = await prisma.timeSaverContent.create({
    data: {
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
  });

  // Breaking & Critical content
  const timesaver3 = await prisma.timeSaverContent.create({
    data: {
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
  });

  // Weekly Highlights
  const timesaver4 = await prisma.timeSaverContent.create({
    data: {
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
    }
  });

  const timesaver5 = await prisma.timeSaverContent.create({
    data: {
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
  });

  // Viral Buzz (linked to AI articles)
  const timesaver6 = await prisma.timeSaverContent.create({
    data: {
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
  });

  // Brief Updates
  const timesaver7 = await prisma.timeSaverContent.create({
    data: {
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
  });

  // Monthly Top content
  const timesaver8 = await prisma.timeSaverContent.create({
    data: {
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
  });

  // Changing Norms content (no linked articles)
  const timesaver9 = await prisma.timeSaverContent.create({
    data: {
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
  });

  console.log('Created 9 TimeSaver content items with article links\n');

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
  console.log('Created 2 breaking news items\n');

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
  console.log('Created 2 advertisements\n');

  // 8. Create Approval History
  console.log('Creating approval history...');
  await prisma.approvalHistory.createMany({
    data: [
      {
        newsId: article1.id,
        approverId: adManager.id,
        action: 'APPROVED',
        comments: 'Excellent article with accurate information'
      },
      {
        newsId: article2.id,
        approverId: adManager.id,
        action: 'APPROVED',
        comments: 'Well-researched and timely'
      },
      {
        newsId: article3.id,
        approverId: admin.id,
        action: 'APPROVED',
        comments: 'Good financial analysis'
      }
    ]
  });
  console.log('Created approval history\n');

  // 9. Create User Interactions
  console.log('Creating user interactions...');

  // Create favorites
  await prisma.userFavorite.createMany({
    data: [
      { userId: user1.id, newsId: article1.id, savedAt: new Date() },
      { userId: user1.id, newsId: article2.id, savedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { userId: user2.id, newsId: article3.id, savedAt: new Date() },
      { userId: user3.id, newsId: article1.id, savedAt: new Date() }
    ]
  });
  console.log('Created user favorites\n');

  // Create reading history
  await prisma.readingHistory.createMany({
    data: [
      {
        userId: user1.id,
        articleId: article1.id,
        timeSpent: 245,
        readProgress: 1.0,
        lastPosition: 100
      },
      {
        userId: user1.id,
        articleId: article3.id,
        timeSpent: 156,
        readProgress: 0.75,
        lastPosition: 75
      },
      {
        userId: user2.id,
        articleId: article1.id,
        timeSpent: 189,
        readProgress: 0.85,
        lastPosition: 85
      },
      {
        userId: user2.id,
        articleId: article2.id,
        timeSpent: 320,
        readProgress: 1.0,
        lastPosition: 100
      },
      {
        userId: user3.id,
        articleId: article4.id,
        timeSpent: 145,
        readProgress: 0.60,
        lastPosition: 60
      }
    ]
  });
  console.log('Created reading history\n');

  // Create search history
  await prisma.searchHistory.createMany({
    data: [
      { userId: user1.id, query: 'artificial intelligence', results: 15 },
      { userId: user1.id, query: 'climate change', results: 23 },
      { userId: user1.id, query: 'stock market', results: 18 },
      { userId: user2.id, query: 'healthcare technology', results: 12 },
      { userId: user2.id, query: 'space exploration', results: 8 },
      { userId: user3.id, query: 'diet and nutrition', results: 25 }
    ]
  });
  console.log('Created search history\n');

  // 10. Create AI Article Views and Interactions
  console.log('Creating AI article views and interactions...');
  
  await prisma.aiArticleView.createMany({
    data: [
      { articleId: aiArticle1.id, userId: user1.id, timestamp: new Date() },
      { articleId: aiArticle1.id, userId: user2.id, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { articleId: aiArticle2.id, userId: user1.id, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
      { articleId: aiArticle3.id, userId: user3.id, timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) }
    ]
  });

  await prisma.aiArticleInteraction.createMany({
    data: [
      { articleId: aiArticle1.id, userId: user1.id, interactionType: 'LIKE', timestamp: new Date() },
      { articleId: aiArticle1.id, userId: user2.id, interactionType: 'SHARE', timestamp: new Date() },
      { articleId: aiArticle2.id, userId: user1.id, interactionType: 'BOOKMARK', timestamp: new Date() },
      { articleId: aiArticle3.id, userId: user3.id, interactionType: 'LIKE', timestamp: new Date() }
    ]
  });
  console.log('Created AI article views and interactions\n');

  // 11. Create TimeSaver Views and Interactions
  console.log('Creating TimeSaver views and interactions...');
  
  await prisma.timeSaverView.createMany({
    data: [
      { contentId: timesaver1.id, userId: user1.id, timestamp: new Date() },
      { contentId: timesaver1.id, userId: user2.id, timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
      { contentId: timesaver2.id, userId: user1.id, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { contentId: timesaver3.id, userId: user3.id, timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { contentId: timesaver6.id, userId: user2.id, timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) }
    ]
  });

  await prisma.timeSaverInteraction.createMany({
    data: [
      { contentId: timesaver1.id, userId: user1.id, interactionType: 'LIKE', timestamp: new Date() },
      { contentId: timesaver2.id, userId: user1.id, interactionType: 'BOOKMARK', timestamp: new Date() },
      { contentId: timesaver3.id, userId: user2.id, interactionType: 'SHARE', timestamp: new Date() },
      { contentId: timesaver6.id, userId: user3.id, interactionType: 'SAVE_FOR_LATER', timestamp: new Date() }
    ]
  });
  console.log('Created TimeSaver views and interactions\n');

  // 12. Create Notifications
  console.log('Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: editor1.id,
        type: 'ARTICLE_APPROVED',
        title: 'Article Approved',
        message: 'Your article "Revolutionary AI Breakthrough in Healthcare" has been approved',
        data: JSON.stringify({ articleId: article1.id }),
        isRead: true,
        readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdBy: adManager.id
      },
      {
        userId: editor2.id,
        type: 'ARTICLE_PUBLISHED',
        title: 'Article Published',
        message: 'Your article "Global Climate Summit Reaches Historic Agreement" is now live',
        data: JSON.stringify({ articleId: article2.id }),
        isRead: false,
        createdBy: admin.id
      },
      {
        userId: user1.id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Welcome to News Platform',
        message: 'Thank you for joining our community!',
        data: null,
        isRead: true,
        readAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdBy: admin.id
      },
      {
        userId: user2.id,
        type: 'PROMOTIONAL',
        title: 'New AI Articles Available',
        message: 'Check out the latest AI/ML news in your feed',
        data: JSON.stringify({ category: 'AI Models' }),
        isRead: false,
        createdBy: adManager.id
      }
    ]
  });
  console.log('Created notifications\n');

  // 13. Create System Settings
  console.log('Creating system settings...');
  await prisma.systemSettings.createMany({
    data: [
      { key: 'site_name', value: 'News Platform', type: 'string', category: 'general' },
      { key: 'site_description', value: 'Your trusted news source', type: 'string', category: 'general' },
      { key: 'contact_email', value: 'contact@newsplatform.com', type: 'string', category: 'general' },
      { key: 'articles_per_page', value: '10', type: 'number', category: 'content' },
      { key: 'enable_comments', value: 'true', type: 'boolean', category: 'features' },
      { key: 'enable_notifications', value: 'true', type: 'boolean', category: 'features' },
      { key: 'max_upload_size', value: '5242880', type: 'number', category: 'uploads' },
      { key: 'allowed_image_types', value: 'jpg,jpeg,png,webp', type: 'string', category: 'uploads' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system' },
      { key: 'api_rate_limit', value: '100', type: 'number', category: 'system' }
    ]
  });
  console.log('Created system settings\n');

  console.log('✅ Database seeding completed successfully!\n');
  console.log('━'.repeat(60));
  console.log('📊 DATABASE SEEDING SUMMARY');
  console.log('━'.repeat(60));
  console.log('');
  console.log('👥 Users: 7');
  console.log('   ├─ 1 Admin');
  console.log('   ├─ 1 AD Manager');
  console.log('   ├─ 2 Editors');
  console.log('   └─ 3 Regular Users');
  console.log('');
  console.log('📰 News Articles: 6');
  console.log('   ├─ 5 Published');
  console.log('   └─ 1 Pending');
  console.log('');
  console.log('🤖 AI/ML Articles: 3');
  console.log('   └─ All Published & Trending');
  console.log('');
  console.log('⚡ TimeSaver Content: 9');
  console.log('   ├─ Linked to News Articles: 5');
  console.log('   ├─ Linked to AI Articles: 3');
  console.log('   └─ Standalone: 1');
  console.log('');
  console.log('🔥 Breaking News: 2');
  console.log('📢 Advertisements: 2');
  console.log('📂 AI Categories: 5');
  console.log('⭐ User Favorites: 4');
  console.log('📖 Reading History: 5');
  console.log('🔍 Search History: 6');
  console.log('✅ Approval History: 3');
  console.log('👁️  AI Article Views: 4');
  console.log('💬 AI Article Interactions: 4');
  console.log('👁️  TimeSaver Views: 5');
  console.log('💬 TimeSaver Interactions: 4');
  console.log('🔔 Notifications: 4');
  console.log('⚙️  System Settings: 10');
  console.log('');
  console.log('━'.repeat(60));
  console.log('🔑 LOGIN CREDENTIALS');
  console.log('━'.repeat(60));
  console.log('');
  console.log('Admin:      admin@newsplatform.com      / password123');
  console.log('AD Manager: admanager@newsplatform.com / password123');
  console.log('Editor 1:   editor1@newsplatform.com   / password123');
  console.log('Editor 2:   editor2@newsplatform.com   / password123');
  console.log('User 1:     user1@example.com          / password123');
  console.log('User 2:     user2@example.com          / password123');
  console.log('User 3:     user3@example.com          / password123');
  console.log('');
  console.log('━'.repeat(60));
  console.log('📸 IMAGE SOURCES');
  console.log('━'.repeat(60));
  console.log('');
  console.log('Avatars:  pravatar.cc (Random avatar generator)');
  console.log('Photos:   unsplash.com (High-quality stock photos)');
  console.log('Icons:    iconify.design (SVG icon API)');
  console.log('');
  console.log('━'.repeat(60));
  console.log('');
  console.log('✨ All data successfully seeded! Your database is ready.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });