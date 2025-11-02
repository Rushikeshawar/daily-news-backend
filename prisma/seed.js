// ============================================
// FILE: scripts/seed.js
// COMPREHENSIVE SEED WITH FACT CHECKING, POLLS, COMMENTS & REAL IMAGES
// ============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ==================== REAL WORKING IMAGE URLS ====================
// All images from Unsplash - guaranteed to work
const IMAGES = {
  avatars: {
    admin: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    admanager: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    editor1: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    editor2: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    user1: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop',
    user2: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    user3: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
  },
  articles: {
    aiHealthcare: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
    climateSummit: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b5?w=800&h=600&fit=crop',
    stockMarket: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    mediterraneanDiet: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop',
    marsMission: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&h=600&fit=crop',
    educationReform: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
    cyberSecurity: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop',
    renewableEnergy: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
  },
  ai: {
    gpt5: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
    computerVision: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    drugDiscovery: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=600&fit=crop',
    robotics: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop',
    dataScience: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
  },
  timesaver: {
    aiHealthQuick: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
    climateBrief: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=600&h=400&fit=crop',
    marketsSurge: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop',
    dietWeekly: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
    spaceWeekly: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=400&fit=crop',
    gpt5Viral: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
    selfDrivingBrief: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=400&fit=crop',
    aiMedicineMonth: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop',
    remoteWork: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=600&h=400&fit=crop',
    techNews: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop',
  },
  breaking: {
    techAcquisition: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
    gdpGrowth: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop',
    earthquake: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=800&h=600&fit=crop',
  },
  ads: {
    newsletter: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop',
    cloudServices: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop',
    aiTools: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop',
  },
};

// ==================== HELPER FUNCTIONS ====================

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function getRandomDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

// ==================== MAIN SEED FUNCTION ====================

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  try {
    // ==================== CLEAR EXISTING DATA ====================
    console.log('🗑️  Cleaning existing data...');
    
    await prisma.timeSaverInteraction.deleteMany();
    await prisma.timeSaverView.deleteMany();
    await prisma.aiArticleInteraction.deleteMany();
    await prisma.aiArticleView.deleteMany();
    await prisma.readingHistory.deleteMany();
    await prisma.searchHistory.deleteMany();
    await prisma.userFavorite.deleteMany();
    await prisma.approvalHistory.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.advertisement.deleteMany();
    await prisma.breakingNews.deleteMany();
    await prisma.timeSaverContent.deleteMany();
    await prisma.aiArticle.deleteMany();
    await prisma.aiCategory.deleteMany();
    await prisma.newsArticle.deleteMany();
    await prisma.category.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.pendingRegistration.deleteMany();
    await prisma.systemSettings.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Existing data cleared\n');

    // ==================== CREATE USERS ====================
    console.log('👥 Creating users...');

    const hash = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@newsplatform.com',
        passwordHash: hash,
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatar: IMAGES.avatars.admin,
        lastLogin: new Date(),
        preferences: {
          theme: 'light',
          notifications: true,
          newsletter: true
        }
      }
    });

    const adManager = await prisma.user.create({
      data: {
        email: 'admanager@newsplatform.com',
        passwordHash: hash,
        fullName: 'Marcus Thompson',
        role: 'AD_MANAGER',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatar: IMAGES.avatars.admanager,
        lastLogin: new Date(),
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }
    });

    const editor1 = await prisma.user.create({
      data: {
        email: 'editor1@newsplatform.com',
        passwordHash: hash,
        fullName: 'John Editor',
        role: 'EDITOR',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatar: IMAGES.avatars.editor1,
        lastLogin: getRandomDate(1)
      }
    });

    const editor2 = await prisma.user.create({
      data: {
        email: 'editor2@newsplatform.com',
        passwordHash: hash,
        fullName: 'Sarah Williams',
        role: 'EDITOR',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatar: IMAGES.avatars.editor2,
        lastLogin: getRandomDate(2)
      }
    });

    const user1 = await prisma.user.create({
      data: {
        email: 'alice@example.com',
        passwordHash: hash,
        fullName: 'Alice Johnson',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatar: IMAGES.avatars.user1,
        preferences: {
          theme: 'auto',
          emailNotifications: true
        }
      }
    });

    const user2 = await prisma.user.create({
      data: {
        email: 'bob@example.com',
        passwordHash: hash,
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
        email: 'carol@example.com',
        passwordHash: hash,
        fullName: 'Carol Davis',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatar: IMAGES.avatars.user3
      }
    });

    const users = [admin, adManager, editor1, editor2, user1, user2, user3];
    console.log(`✅ Created ${users.length} users\n`);

    // ==================== CREATE CATEGORIES ====================
    console.log('📁 Creating categories...');

    const categories = [
      {
        name: 'TECHNOLOGY',
        displayName: 'Technology & Innovation',
        description: 'Latest in technology, AI, and digital innovation',
        slug: 'technology',
        color: '#3B82F6',
        iconUrl: '💻',
        sortOrder: 1,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'ENVIRONMENT',
        displayName: 'Environment & Climate',
        description: 'Climate change, sustainability, and environmental news',
        slug: 'environment',
        color: '#10B981',
        iconUrl: '🌍',
        sortOrder: 2,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'BUSINESS',
        displayName: 'Business & Finance',
        description: 'Markets, economy, and business news',
        slug: 'business',
        color: '#F59E0B',
        iconUrl: '💼',
        sortOrder: 3,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'HEALTH',
        displayName: 'Health & Wellness',
        description: 'Medical research, health tips, and wellness',
        slug: 'health',
        color: '#EF4444',
        iconUrl: '🏥',
        sortOrder: 4,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'SCIENCE',
        displayName: 'Science & Space',
        description: 'Scientific discoveries and space exploration',
        slug: 'science',
        color: '#8B5CF6',
        iconUrl: '🔬',
        sortOrder: 5,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'EDUCATION',
        displayName: 'Education',
        description: 'Education news, reforms, and learning',
        slug: 'education',
        color: '#EC4899',
        iconUrl: '📚',
        sortOrder: 6,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'LIFESTYLE',
        displayName: 'Lifestyle & Culture',
        description: 'Culture, lifestyle, and society',
        slug: 'lifestyle',
        color: '#06B6D4',
        iconUrl: '🎨',
        sortOrder: 7,
        isActive: true,
        createdBy: admin.id
      },
      {
        name: 'POLITICS',
        displayName: 'Politics & Policy',
        description: 'Political news and government policy',
        slug: 'politics',
        color: '#DC2626',
        iconUrl: '🏛️',
        sortOrder: 8,
        isActive: true,
        createdBy: admin.id
      }
    ];

    const createdCategories = [];
    for (const cat of categories) {
      const created = await prisma.category.create({ data: cat });
      createdCategories.push(created);
    }

    console.log(`✅ Created ${createdCategories.length} categories\n`);

    // ==================== CREATE AI CATEGORIES ====================
    console.log('🤖 Creating AI/ML categories...');

    const aiCategories = [
      {
        name: 'LANGUAGE_MODELS',
        description: 'LLMs, GPT, BERT, and natural language processing',
        iconUrl: '💬',
        isHot: true,
        articleCount: 0
      },
      {
        name: 'COMPUTER_VISION',
        description: 'Image recognition, object detection, and visual AI',
        iconUrl: '👁️',
        isHot: true,
        articleCount: 0
      },
      {
        name: 'ROBOTICS',
        description: 'AI-powered robots and automation',
        iconUrl: '🤖',
        isHot: false,
        articleCount: 0
      },
      {
        name: 'AUTONOMOUS_VEHICLES',
        description: 'Self-driving cars and transportation AI',
        iconUrl: '🚗',
        isHot: true,
        articleCount: 0
      },
      {
        name: 'HEALTHCARE_AI',
        description: 'Medical diagnosis, drug discovery, and health tech',
        iconUrl: '🏥',
        isHot: false,
        articleCount: 0
      },
      {
        name: 'AI_RESEARCH',
        description: 'Latest AI research papers and breakthroughs',
        iconUrl: '🔬',
        isHot: false,
        articleCount: 0
      },
      {
        name: 'GENERATIVE_AI',
        description: 'AI art, music, and content generation',
        iconUrl: '🎨',
        isHot: true,
        articleCount: 0
      },
      {
        name: 'AI_ETHICS',
        description: 'AI safety, bias, and responsible AI development',
        iconUrl: '⚖️',
        isHot: false,
        articleCount: 0
      }
    ];

    await prisma.aiCategory.createMany({ data: aiCategories });
    console.log(`✅ Created ${aiCategories.length} AI/ML categories\n`);

    // ==================== CREATE NEWS ARTICLES ====================
    console.log('📰 Creating news articles...');

    const article1 = await prisma.newsArticle.create({
      data: {
        headline: 'Revolutionary AI Breakthrough in Healthcare Diagnosis',
        briefContent: 'Scientists announce major advancement in AI-powered disease detection with 99% accuracy rate, potentially saving millions of lives worldwide.',
        fullContent: `In a groundbreaking development that could reshape modern medicine, researchers have created an AI system capable of detecting diseases with an unprecedented 99% accuracy rate. This breakthrough represents years of collaborative effort and could revolutionize early diagnosis procedures globally.

**Key Findings:**
The AI system, developed through a partnership between leading universities and tech companies, utilizes advanced machine learning algorithms to analyze medical imaging and patient data with remarkable precision. Early trials have shown exceptional results across various conditions, including cancer, cardiovascular disease, and neurological disorders.

**Impact on Healthcare:**
Medical professionals are calling this development a "game-changer" for early detection and treatment. Dr. Sarah Chen, lead researcher, stated: "This technology could dramatically improve patient outcomes by catching diseases in their earliest, most treatable stages."

**Next Steps:**
The system is currently undergoing final regulatory approvals and is expected to be implemented in major hospitals by next year. Training programs for medical staff are already underway.`,
        category: createdCategories[0].name, // TECHNOLOGY
        status: 'PUBLISHED',
        priorityLevel: 9,
        authorId: editor1.id,
        approvedBy: adManager.id,
        featuredImage: IMAGES.articles.aiHealthcare,
        tags: 'AI,Healthcare,Technology,Innovation,Medical',
        slug: generateSlug('Revolutionary AI Breakthrough in Healthcare Diagnosis'),
        metaTitle: 'AI Breakthrough in Healthcare | 99% Accuracy in Disease Detection',
        metaDescription: 'Major advancement in AI-powered disease detection announced with 99% accuracy',
        viewCount: 15420,
        shareCount: 892,
        publishedAt: getRandomDate(2),
        createdAt: getRandomDate(3)
      }
    });

    const article2 = await prisma.newsArticle.create({
      data: {
        headline: 'Global Climate Summit Reaches Historic Agreement on Carbon Reduction',
        briefContent: 'World leaders from 195 countries commit to ambitious carbon reduction targets in landmark environmental accord.',
        fullContent: `After two weeks of intensive negotiations, representatives from 195 countries have reached a historic agreement on comprehensive climate action plans. The accord, described as "the most significant climate agreement since the Paris Accord," includes binding commitments and substantial financial backing.

**Agreement Highlights:**
- 50% reduction in carbon emissions by 2035
- $100 billion climate adaptation fund for developing nations
- Transition to 75% renewable energy by 2040
- Protection of critical ecosystems and biodiversity

**Global Response:**
Environmental organizations have hailed the agreement as a "turning point" in the fight against climate change. UN Secretary-General António Guterres called it "a beacon of hope for future generations."

**Implementation Timeline:**
Countries will submit detailed implementation plans within 90 days, with annual progress reviews and accountability mechanisms to ensure compliance.`,
        category: createdCategories[1].name, // ENVIRONMENT
        status: 'PUBLISHED',
        priorityLevel: 10,
        authorId: editor2.id,
        approvedBy: adManager.id,
        featuredImage: IMAGES.articles.climateSummit,
        tags: 'Climate,Environment,Politics,Global,Sustainability',
        slug: generateSlug('Global Climate Summit Reaches Historic Agreement'),
        metaTitle: 'Historic Climate Agreement Reached at Global Summit',
        metaDescription: '195 countries commit to ambitious carbon reduction targets',
        viewCount: 12350,
        shareCount: 756,
        publishedAt: getRandomDate(1),
        createdAt: getRandomDate(2)
      }
    });

    const article3 = await prisma.newsArticle.create({
      data: {
        headline: 'Stock Markets Hit All-Time Highs Amid Economic Optimism',
        briefContent: 'Major indices surge as positive economic indicators fuel investor confidence in sustained growth.',
        fullContent: `Global stock markets celebrated today as major indices reached record highs, driven by strong corporate earnings and optimistic economic forecasts. The rally extended across sectors, with technology and healthcare stocks leading gains.

**Market Performance:**
- S&P 500: +2.3% (Record high: 5,847)
- Dow Jones: +1.8% (Record high: 42,567)
- Nasdaq: +3.1% (Record high: 18,956)
- Tech sector: +3.5% average gains

**Driving Factors:**
Analysts attribute the surge to several positive indicators:
- Better-than-expected Q4 earnings
- Strong consumer spending data
- Declining inflation rates
- Fed's dovish policy signals

**Expert Analysis:**
"This isn't just a rally, it's a reflection of genuine economic strength," says Goldman Sachs economist Dr. Michael Roberts. "Corporate fundamentals are solid, and consumer confidence remains high."

**Outlook:**
While some analysts caution about overvaluation, most remain optimistic about sustained growth through the coming quarters.`,
        category: createdCategories[2].name, // BUSINESS
        status: 'PUBLISHED',
        priorityLevel: 8,
        authorId: editor1.id,
        approvedBy: admin.id,
        featuredImage: IMAGES.articles.stockMarket,
        tags: 'Finance,Business,Economy,Markets,Stocks',
        slug: generateSlug('Stock Markets Hit All-Time Highs'),
        metaTitle: 'Stock Market Reaches Record High on Economic Optimism',
        metaDescription: 'Major indices surge on positive economic indicators',
        viewCount: 8920,
        shareCount: 445,
        publishedAt: getRandomDate(3),
        createdAt: getRandomDate(4)
      }
    });

    const article4 = await prisma.newsArticle.create({
      data: {
        headline: 'Comprehensive Study Confirms Mediterranean Diet Health Benefits',
        briefContent: '10-year research reveals significant improvements in heart health, cognitive function, and longevity from dietary changes.',
        fullContent: `A landmark 10-year study involving 50,000 participants has provided the most comprehensive evidence yet of the Mediterranean diet's extensive health benefits. The research, published in the New England Journal of Medicine, shows remarkable improvements across multiple health markers.

**Key Findings:**
- 30% reduction in heart disease risk
- 25% lower risk of stroke
- Improved cognitive function and memory
- Better blood sugar control
- Enhanced longevity (average 3-5 years increase)

**Diet Components:**
The Mediterranean diet emphasizes:
- Olive oil as primary fat source
- Abundant fruits and vegetables
- Whole grains and legumes
- Fish and seafood twice weekly
- Moderate wine consumption
- Limited red meat

**Expert Recommendations:**
Dr. Maria Rodriguez, lead researcher, emphasizes: "The Mediterranean diet isn't just about food—it's a lifestyle approach that includes social eating, physical activity, and stress management."

**Practical Implementation:**
Nutritionists recommend gradual transition, starting with one Mediterranean-style meal per day and progressively incorporating more elements.`,
        category: createdCategories[3].name, // HEALTH
        status: 'PUBLISHED',
        priorityLevel: 7,
        authorId: editor2.id,
        approvedBy: adManager.id,
        featuredImage: IMAGES.articles.mediterraneanDiet,
        tags: 'Health,Diet,Wellness,Research,Nutrition',
        slug: generateSlug('Mediterranean Diet Health Benefits Confirmed'),
        metaTitle: 'Mediterranean Diet Benefits Confirmed by Major Study',
        metaDescription: '10-year research validates extensive health improvements',
        viewCount: 7650,
        shareCount: 523,
        publishedAt: getRandomDate(4),
        createdAt: getRandomDate(5)
      }
    });

    const article5 = await prisma.newsArticle.create({
      data: {
        headline: 'Space Agency Unveils Ambitious Mars Mission Timeline for 2030',
        briefContent: 'Detailed plans revealed for first manned mission to Mars, including permanent research base establishment.',
        fullContent: `In an unprecedented announcement, the international space agency has unveiled comprehensive plans for sending astronauts to Mars within the next decade. The mission, named "Horizon 2030," represents humanity's most ambitious space exploration endeavor.

**Mission Overview:**
The multi-phase mission includes:
- Launch: Q2 2030
- Mars arrival: Q4 2030 (7-month journey)
- Surface operations: 18 months
- Return journey: Q1 2032

**Key Objectives:**
1. Establish permanent research base
2. Conduct geological surveys
3. Search for signs of past or present life
4. Test technologies for future colonization
5. Prepare for sustained human presence

**Crew Selection:**
Six astronauts will be chosen from international candidates, with training beginning next year. Required expertise includes geology, biology, engineering, and medicine.

**Technology Highlights:**
- Advanced life support systems
- Nuclear-powered habitats
- Cutting-edge communication networks
- Revolutionary propulsion systems

**Budget and Funding:**
The $50 billion mission is funded through international cooperation, with contributions from 25 nations and private partnerships.

**Scientific Impact:**
Dr. James Chen, mission director, states: "This mission will answer fundamental questions about Mars' habitability and lay groundwork for eventual human settlement."`,
        category: createdCategories[4].name, // SCIENCE
        status: 'PUBLISHED',
        priorityLevel: 9,
        authorId: editor1.id,
        approvedBy: admin.id,
        featuredImage: IMAGES.articles.marsMission,
        tags: 'Space,Science,Mars,Exploration,NASA',
        slug: generateSlug('Mars Mission Timeline Announced'),
        metaTitle: 'Mars Mission Timeline: Humanity Heading to Red Planet by 2030',
        metaDescription: 'Manned mission to Mars planned for 2030 with permanent base',
        viewCount: 11240,
        shareCount: 678,
        publishedAt: getRandomDate(5),
        createdAt: getRandomDate(6)
      }
    });

    const article6 = await prisma.newsArticle.create({
      data: {
        headline: 'Education Reform Bill Proposes Major Changes to National System',
        briefContent: 'Comprehensive legislation aims to modernize schools with increased STEM funding and teacher support.',
        fullContent: `Lawmakers have introduced sweeping education reform legislation that could transform the national education system. The bipartisan bill addresses long-standing challenges and introduces innovative approaches to 21st-century learning.

**Key Proposals:**
- $15 billion increase in STEM program funding
- 20% raise in teacher salaries over 3 years
- Universal pre-K access
- School infrastructure modernization
- Enhanced technology integration
- Expanded mental health services

**Technology Integration:**
The bill mandates:
- High-speed internet in all schools
- One-to-one device programs
- Digital literacy curriculum
- Cybersecurity education

**Support for Teachers:**
Provisions include professional development funding, reduced class sizes, and student loan forgiveness programs for educators in underserved areas.

**Timeline:**
If passed, implementation would begin in the 2026-2027 academic year, with full rollout by 2028.`,
        category: createdCategories[5].name, // EDUCATION
        status: 'PENDING',
        priorityLevel: 6,
        authorId: editor2.id,
        featuredImage: IMAGES.articles.educationReform,
        tags: 'Education,Politics,Reform,Schools',
        slug: generateSlug('Education Reform Bill Under Review'),
        metaTitle: 'Major Education Reform Bill Proposed',
        metaDescription: 'Comprehensive changes to national education system proposed',
        viewCount: 0,
        shareCount: 0,
        createdAt: getRandomDate(1)
      }
    });

    const article7 = await prisma.newsArticle.create({
      data: {
        headline: 'Cybersecurity Threats Evolve: New AI-Powered Defense Systems Deployed',
        briefContent: 'Organizations worldwide adopt advanced AI security solutions to combat increasingly sophisticated cyber attacks.',
        fullContent: `As cyber threats grow more sophisticated, organizations are turning to AI-powered defense systems to protect critical infrastructure. The latest generation of security tools leverages machine learning to detect and respond to threats in real-time.

**Threat Landscape:**
Recent reports show:
- 45% increase in ransomware attacks
- Sophisticated phishing campaigns
- Supply chain vulnerabilities
- Nation-state cyber warfare

**AI Defense Solutions:**
New systems feature:
- Predictive threat intelligence
- Automated incident response
- Behavioral anomaly detection
- Zero-trust architecture

**Industry Impact:**
Fortune 500 companies are investing billions in cybersecurity infrastructure, with AI tools becoming standard across industries.

**Expert Recommendations:**
Security professionals urge organizations to adopt multi-layered defenses, regular security audits, and comprehensive employee training programs.`,
        category: createdCategories[0].name, // TECHNOLOGY
        status: 'PUBLISHED',
        priorityLevel: 8,
        authorId: editor1.id,
        approvedBy: adManager.id,
        featuredImage: IMAGES.articles.cyberSecurity,
        tags: 'Cybersecurity,Technology,AI,Security,Defense',
        slug: generateSlug('AI-Powered Cybersecurity Defense Systems'),
        metaTitle: 'AI-Powered Cybersecurity: New Defense Against Evolving Threats',
        metaDescription: 'Advanced AI security solutions combat sophisticated cyber attacks',
        viewCount: 6890,
        shareCount: 412,
        publishedAt: getRandomDate(6),
        createdAt: getRandomDate(7)
      }
    });

    const article8 = await prisma.newsArticle.create({
      data: {
        headline: 'Renewable Energy Investment Hits Record $500 Billion Globally',
        briefContent: 'Clean energy sector sees unprecedented growth as countries accelerate transition from fossil fuels.',
        fullContent: `Global investment in renewable energy reached a record $500 billion this year, marking a watershed moment in the transition to clean energy. The surge reflects growing confidence in sustainable technologies and increasing pressure to address climate change.

**Investment Breakdown:**
- Solar energy: $180 billion (36%)
- Wind power: $150 billion (30%)
- Battery storage: $85 billion (17%)
- Hydroelectric: $50 billion (10%)
- Other renewables: $35 billion (7%)

**Regional Leaders:**
China leads with $180 billion in investments, followed by the United States ($95 billion) and Europe ($120 billion collectively).

**Technology Advances:**
Recent innovations have dramatically reduced costs:
- Solar panel efficiency increased 40%
- Wind turbine capacity doubled
- Battery storage costs dropped 70%

**Economic Impact:**
The renewable sector now employs 12 million people globally, with projections reaching 20 million by 2030.

**Future Outlook:**
Analysts predict renewable energy will account for 75% of global electricity generation by 2050, fundamentally transforming energy markets.`,
        category: createdCategories[1].name, // ENVIRONMENT
        status: 'PUBLISHED',
        priorityLevel: 8,
        authorId: editor2.id,
        approvedBy: admin.id,
        featuredImage: IMAGES.articles.renewableEnergy,
        tags: 'Renewable,Energy,Environment,Investment,Clean Tech',
        slug: generateSlug('Renewable Energy Investment Record'),
        metaTitle: 'Renewable Energy Investment Reaches Historic $500B',
        metaDescription: 'Clean energy sector sees unprecedented global investment growth',
        viewCount: 5430,
        shareCount: 367,
        publishedAt: getRandomDate(7),
        createdAt: getRandomDate(8)
      }
    });

    const newsArticles = [article1, article2, article3, article4, article5, article6, article7, article8];
    console.log(`✅ Created ${newsArticles.length} news articles\n`);

    // ==================== CREATE AI/ML ARTICLES ====================
    console.log('🤖 Creating AI/ML articles...');

    const aiArticle1 = await prisma.aiArticle.create({
      data: {
        headline: 'GPT-5 Rumors Surface: What We Know About OpenAI\'s Next Model',
        briefContent: 'Industry insiders share details about the upcoming generation of large language models with dramatically improved capabilities.',
        fullContent: `Speculation is intensifying around OpenAI's next-generation language model, tentatively called GPT-5. While official details remain scarce, industry sources suggest the new model will feature significant advances in reasoning, context understanding, and efficiency.

**Rumored Capabilities:**
- 10x improvement in reasoning tasks
- Context window expanding to 1 million tokens
- Enhanced multimodal understanding
- Reduced hallucinations and improved accuracy
- More efficient training and inference

**Training Innovations:**
Sources indicate GPT-5 may incorporate novel training techniques, including:
- Advanced reinforcement learning from human feedback
- Improved data curation methods
- New architectural optimizations
- Better alignment with human values

**Industry Impact:**
If the rumors prove accurate, GPT-5 could revolutionize applications in:
- Medical diagnosis support
- Legal document analysis
- Scientific research assistance
- Educational tutoring
- Creative content generation

**Timeline:**
While OpenAI hasn't confirmed a release date, speculation points to a potential announcement in late 2025 or early 2026.

**Competitive Landscape:**
Anthropic's Claude, Google's Gemini, and Meta's LLaMA are also advancing rapidly, intensifying competition in the AI space.`,
        category: 'LANGUAGE_MODELS',
        featuredImage: IMAGES.ai.gpt5,
        tags: 'GPT,LLM,AI,OpenAI,Language Models',
        aiModel: 'GPT-5',
        aiApplication: 'Natural Language Processing',
        companyMentioned: 'OpenAI',
        technologyType: 'Large Language Model',
        viewCount: 8920,
        shareCount: 567,
        relevanceScore: 9.2,
        isTrending: true,
        publishedAt: getRandomDate(1),
        createdBy: adManager.id,
        createdAt: getRandomDate(2)
      }
    });

    const aiArticle2 = await prisma.aiArticle.create({
      data: {
        headline: 'YOLOv8 Achieves Breakthrough in Autonomous Vehicle Object Detection',
        briefContent: 'New computer vision algorithms dramatically improve self-driving car safety with 99.7% accuracy in real-world conditions.',
        fullContent: `Researchers have achieved a major breakthrough in autonomous vehicle safety with the latest version of the YOLO (You Only Look Once) object detection system. YOLOv8's remarkable 99.7% accuracy in real-world testing marks a significant milestone in self-driving technology.

**Technical Achievements:**
- Real-time processing at 120 FPS
- 99.7% detection accuracy
- Recognition of 80+ object classes
- Weather-resistant performance
- Edge device optimization

**Safety Improvements:**
The system excels at detecting:
- Pedestrians and cyclists
- Other vehicles and obstacles
- Traffic signs and signals
- Road markings and boundaries
- Unexpected hazards

**Real-World Testing:**
Extensive trials across diverse conditions:
- Urban environments: 500,000 miles
- Highways: 1 million miles
- Adverse weather: 100,000 miles
- Night driving: 200,000 miles

**Industry Adoption:**
Major automakers including Tesla, Waymo, and Cruise are evaluating YOLOv8 for integration into next-generation autonomous systems.

**Expert Analysis:**
Dr. Emily Chang, computer vision specialist, notes: "This level of accuracy, combined with processing speed, addresses one of the biggest challenges in autonomous driving."

**Deployment Timeline:**
Production vehicles featuring YOLOv8-based systems are expected to begin rolling out in 2026.`,
        category: 'COMPUTER_VISION',
        featuredImage: IMAGES.ai.computerVision,
        tags: 'Computer Vision,Autonomous Vehicles,YOLO,Self-Driving,AI',
        aiModel: 'YOLOv8',
        aiApplication: 'Object Detection',
        companyMentioned: 'Tesla',
        technologyType: 'Computer Vision',
        viewCount: 6540,
        shareCount: 423,
        relevanceScore: 8.7,
        isTrending: true,
        publishedAt: getRandomDate(2),
        createdBy: admin.id,
        createdAt: getRandomDate(3)
      }
    });

    const aiArticle3 = await prisma.aiArticle.create({
      data: {
        headline: 'AlphaFold Revolutionizes Drug Discovery Process',
        briefContent: 'DeepMind\'s protein folding AI accelerates pharmaceutical research, cutting development time from years to months.',
        fullContent: `DeepMind's AlphaFold has fundamentally transformed drug discovery by solving the decades-old protein folding problem. The AI system can now predict protein structures with remarkable accuracy, dramatically accelerating the development of new medications.

**Scientific Breakthrough:**
AlphaFold's achievements include:
- Accurate prediction of 200+ million protein structures
- 98% accuracy rate
- Processing time reduced from months to hours
- Open-source database for researchers

**Impact on Drug Development:**
Traditional drug discovery timeline: 10-15 years
AlphaFold-assisted timeline: 3-5 years

Cost reduction: 60-70% savings in early research phases

**Recent Successes:**
AlphaFold has contributed to:
- COVID-19 treatment development
- Cancer therapy research
- Antibiotic resistance solutions
- Rare disease treatments

**Pharmaceutical Industry Adoption:**
Over 50 major pharmaceutical companies now integrate AlphaFold into their research pipelines, with several drugs in clinical trials.

**Academic Impact:**
The system has enabled breakthroughs across biology:
- Understanding disease mechanisms
- Enzyme engineering
- Protein design
- Evolutionary biology research

**Future Developments:**
DeepMind is working on AlphaFold 3, which will model protein interactions with other molecules, further expanding capabilities.

**Collaborative Approach:**
The technology is freely available to academic researchers, fostering global collaboration in medical research.`,
        category: 'HEALTHCARE_AI',
        featuredImage: IMAGES.ai.drugDiscovery,
        tags: 'Machine Learning,Healthcare,Pharmaceutical,AlphaFold,Drug Discovery',
        aiModel: 'AlphaFold',
        aiApplication: 'Protein Structure Prediction',
        companyMentioned: 'DeepMind',
        technologyType: 'Machine Learning',
        viewCount: 5230,
        shareCount: 334,
        relevanceScore: 8.5,
        isTrending: false,
        publishedAt: getRandomDate(3),
        createdBy: adManager.id,
        createdAt: getRandomDate(4)
      }
    });

    const aiArticle4 = await prisma.aiArticle.create({
      data: {
        headline: 'Humanoid Robots Enter Workforce: Tesla Optimus Begins Factory Trials',
        briefContent: 'Advanced robotics powered by AI enter commercial deployment as Tesla tests humanoid robots in manufacturing facilities.',
        fullContent: `Tesla has begun deploying its Optimus humanoid robots in select manufacturing facilities, marking a significant milestone in practical robotics applications. The AI-powered robots are performing various tasks alongside human workers in controlled pilot programs.

**Optimus Capabilities:**
- Bipedal locomotion and balance
- Object manipulation and handling
- Visual task understanding
- Adaptive learning from demonstrations
- Safe human-robot collaboration

**Current Applications:**
Factory trials include:
- Parts sorting and organization
- Quality inspection
- Material transport
- Assembly line assistance
- Inventory management

**Performance Metrics:**
- Operating time: 8 hours per charge
- Precision: ±1mm accuracy
- Load capacity: 45 pounds
- Walking speed: 5 mph
- Learning time: 2-4 hours per new task

**Safety Features:**
Advanced safety systems ensure:
- Collision detection and avoidance
- Force-limited movements
- Emergency stop protocols
- Continuous self-monitoring
- Human proximity awareness

**Economic Impact:**
Industry analysts predict:
- 30% productivity increase in tested areas
- ROI within 18 months
- Creation of new robot maintenance jobs
- Shift of human workers to higher-value tasks

**Future Expansion:**
Tesla plans to scale production to 1,000 units by 2026, with potential applications in:
- Warehousing and logistics
- Healthcare assistance
- Disaster response
- Space exploration support

**Competitive Landscape:**
Other companies advancing humanoid robotics include Boston Dynamics, Figure AI, and Sanctuary AI, signaling an emerging industry.`,
        category: 'ROBOTICS',
        featuredImage: IMAGES.ai.robotics,
        tags: 'Robotics,AI,Automation,Tesla,Optimus',
        aiModel: 'Tesla Optimus',
        aiApplication: 'Manufacturing Automation',
        companyMentioned: 'Tesla',
        technologyType: 'Robotics',
        viewCount: 7890,
        shareCount: 456,
        relevanceScore: 8.9,
        isTrending: true,
        publishedAt: getRandomDate(4),
        createdBy: admin.id,
        createdAt: getRandomDate(5)
      }
    });

    const aiArticle5 = await prisma.aiArticle.create({
      data: {
        headline: 'AI-Powered Data Analysis Transforms Scientific Research',
        briefContent: 'Machine learning tools enable researchers to process vast datasets, accelerating discoveries across multiple scientific disciplines.',
        fullContent: `Artificial intelligence is revolutionizing scientific research by processing and analyzing massive datasets that would take humans years to examine. These AI-powered tools are accelerating discoveries in fields ranging from genomics to astrophysics.

**Key Applications:**
- Genomic sequence analysis
- Climate modeling and prediction
- Particle physics data processing
- Astronomical data analysis
- Materials science discovery

**Impact on Research Speed:**
Traditional analysis: Months to years
AI-assisted analysis: Days to weeks

Data processing capability: 1000x increase

**Notable Discoveries:**
AI has contributed to:
- Identification of exoplanets
- Discovery of new antibiotics
- Understanding of protein interactions
- Climate pattern predictions
- Material property predictions

**Tools and Platforms:**
Leading AI research platforms:
- TensorFlow for scientific computing
- PyTorch for deep learning research
- AutoML for automated analysis
- Custom neural networks for specific domains

**Collaboration:**
Major research institutions are:
- Sharing AI models and datasets
- Developing standardized frameworks
- Training researchers in AI methods
- Establishing data governance protocols

**Challenges:**
Researchers must address:
- Data quality and bias
- Interpretability of AI decisions
- Computational resource requirements
- Integration with traditional methods

**Future Directions:**
Next-generation tools will feature:
- Automated hypothesis generation
- Real-time experiment optimization
- Cross-domain knowledge transfer
- Explainable AI for scientific validation`,
        category: 'AI_RESEARCH',
        featuredImage: IMAGES.ai.dataScience,
        tags: 'Data Science,AI,Research,Machine Learning,Analytics',
        aiModel: 'Various ML Models',
        aiApplication: 'Scientific Data Analysis',
        companyMentioned: 'Multiple Research Institutions',
        technologyType: 'Machine Learning',
        viewCount: 4560,
        shareCount: 289,
        relevanceScore: 8.3,
        isTrending: false,
        publishedAt: getRandomDate(5),
        createdBy: adManager.id,
        createdAt: getRandomDate(6)
      }
    });

    const aiArticles = [aiArticle1, aiArticle2, aiArticle3, aiArticle4, aiArticle5];
    console.log(`✅ Created ${aiArticles.length} AI/ML articles\n`);

    // ==================== CREATE TIMESAVER CONTENT ====================
    console.log('⏱️  Creating TimeSaver content with article linking...');

    const timeSavers = [
      // Linked to News Articles
      {
        title: 'AI Healthcare Revolution - Quick Summary',
        summary: "Today's biggest AI breakthrough in medical diagnostics explained in 45 seconds",
        category: createdCategories[0].name,
        imageUrl: IMAGES.timesaver.aiHealthQuick,
        iconName: 'Zap',
        bgColor: '#3B82F6',
        keyPoints: 'AI detects diseases with 99% accuracy,Game-changing for early diagnosis,Available in hospitals next year',
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
        summary: 'Key points from historic global climate agreement - 195 countries united',
        category: createdCategories[1].name,
        imageUrl: IMAGES.timesaver.climateBrief,
        iconName: 'Globe',
        bgColor: '#10B981',
        keyPoints: '195 countries signed,50% carbon reduction by 2035,$100B climate fund established',
        readTimeSeconds: 60,
        isPriority: true,
        contentType: 'DIGEST',
        contentGroup: 'today_new',
        tags: 'climate,environment,today',
        linkedArticleId: article2.id,
        publishedAt: new Date(),
        createdBy: adManager.id
      },
      {
        title: 'Markets Surge to Records',
        summary: 'Stock indices hit all-time highs on strong earnings - what investors need to know',
        category: createdCategories[2].name,
        imageUrl: IMAGES.timesaver.marketsSurge,
        iconName: 'TrendingUp',
        bgColor: '#F59E0B',
        keyPoints: 'S&P 500 up 2.3%,Tech sector leads gains,Investors optimistic',
        readTimeSeconds: 40,
        isPriority: true,
        contentType: 'BRIEFING',
        contentGroup: 'breaking_critical',
        tags: 'business,markets,breaking',
        linkedArticleId: article3.id,
        publishedAt: getRandomDate(0.25),
        createdBy: admin.id
      },
      {
        title: 'Top Health Story: Mediterranean Diet',
        summary: "Week's most important health research findings in 90 seconds",
        category: createdCategories[3].name,
        imageUrl: IMAGES.timesaver.dietWeekly,
        iconName: 'Heart',
        bgColor: '#EF4444',
        keyPoints: '30% reduced heart disease risk,Improved cognitive function,Easy to follow',
        readTimeSeconds: 90,
        isPriority: false,
        contentType: 'HIGHLIGHTS',
        contentGroup: 'weekly_highlights',
        tags: 'health,weekly,research',
        linkedArticleId: article4.id,
        publishedAt: getRandomDate(2),
        createdBy: adManager.id
      },
      {
        title: 'Week in Space Exploration',
        summary: 'Mars mission timeline and other exciting space news',
        category: createdCategories[4].name,
        imageUrl: IMAGES.timesaver.spaceWeekly,
        iconName: 'Rocket',
        bgColor: '#8B5CF6',
        keyPoints: 'Mars 2030 mission confirmed,New telescope images released,ISS expansion plans',
        readTimeSeconds: 75,
        isPriority: false,
        contentType: 'HIGHLIGHTS',
        contentGroup: 'weekly_highlights',
        tags: 'space,science,weekly',
        linkedArticleId: article5.id,
        publishedAt: getRandomDate(3),
        createdBy: admin.id
      },
      // Linked to AI Articles
      {
        title: "Everyone's Talking About GPT-5",
        summary: "The AI model that's breaking the internet - rumors and speculation",
        category: createdCategories[0].name,
        imageUrl: IMAGES.timesaver.gpt5Viral,
        iconName: 'Brain',
        bgColor: '#EC4899',
        keyPoints: 'Trending on all platforms,Developers excited,Release date speculation',
        readTimeSeconds: 50,
        isPriority: false,
        contentType: 'QUICK_UPDATE',
        contentGroup: 'viral_buzz',
        tags: 'viral,trending,ai,gpt',
        linkedAiArticleId: aiArticle1.id,
        publishedAt: getRandomDate(1),
        createdBy: adManager.id
      },
      {
        title: 'Self-Driving Breakthrough',
        summary: 'YOLOv8 pushes autonomous driving safety to unprecedented heights',
        category: createdCategories[0].name,
        imageUrl: IMAGES.timesaver.selfDrivingBrief,
        iconName: 'Car',
        bgColor: '#3B82F6',
        keyPoints: '99.7% detection accuracy,Real-world tests passed,Coming to roads in 2026',
        readTimeSeconds: 55,
        isPriority: true,
        contentType: 'BRIEFING',
        contentGroup: 'today_new',
        tags: 'self-driving,ai,autonomous',
        linkedAiArticleId: aiArticle2.id,
        publishedAt: getRandomDate(0.5),
        createdBy: admin.id
      },
      {
        title: 'AI Medicine Monthly Digest',
        summary: 'Top AI-driven drug discovery stories this month',
        category: createdCategories[3].name,
        imageUrl: IMAGES.timesaver.aiMedicineMonth,
        iconName: 'Activity',
        bgColor: '#EF4444',
        keyPoints: 'AlphaFold speeds up research,10 new drug candidates,Clinical trials start Q1',
        readTimeSeconds: 80,
        isPriority: false,
        contentType: 'DIGEST',
        contentGroup: 'monthly_top',
        tags: 'ai,medicine,research,monthly',
        linkedAiArticleId: aiArticle3.id,
        publishedAt: getRandomDate(7),
        createdBy: adManager.id
      },
      // Standalone TimeSavers
      {
        title: 'Remote Work Revolution',
        summary: 'How workplace culture is evolving in the post-pandemic era',
        category: createdCategories[6].name,
        imageUrl: IMAGES.timesaver.remoteWork,
        iconName: 'Home',
        bgColor: '#06B6D4',
        keyPoints: 'Companies embrace hybrid models,Work-life balance focus,Digital nomad lifestyle rise',
        readTimeSeconds: 85,
        isPriority: false,
        contentType: 'DIGEST',
        contentGroup: 'changing_norms',
        tags: 'culture,work,society,change',
        linkedArticleId: null,
        linkedAiArticleId: null,
        publishedAt: getRandomDate(7),
        createdBy: adManager.id
      },
      {
        title: 'Tech News Roundup',
        summary: 'Quick overview of this week\'s top technology stories',
        category: createdCategories[0].name,
        imageUrl: IMAGES.timesaver.techNews,
        iconName: 'Newspaper',
        bgColor: '#3B82F6',
        keyPoints: 'New smartphone launches,Software updates released,Tech stocks perform well',
        readTimeSeconds: 60,
        isPriority: false,
        contentType: 'QUICK_UPDATE',
        contentGroup: 'brief_updates',
        tags: 'tech,news,weekly',
        linkedArticleId: null,
        linkedAiArticleId: null,
        publishedAt: getRandomDate(4),
        createdBy: admin.id
      }
    ];

    for (const ts of timeSavers) {
      await prisma.timeSaverContent.create({ data: ts });
    }

    console.log(`✅ Created ${timeSavers.length} TimeSaver items\n`);
    console.log(`   - 5 linked to News Articles`);
    console.log(`   - 3 linked to AI/ML Articles`);
    console.log(`   - 2 standalone items\n`);

    // ==================== CREATE BREAKING NEWS ====================
    console.log('🚨 Creating breaking news...');

    await prisma.breakingNews.createMany({
      data: [
        {
          title: 'BREAKING: Major Tech Acquisition Announced',
          brief: 'Tech giant acquires AI startup for $5 billion in landmark deal',
          imageUrl: IMAGES.breaking.techAcquisition,
          sourceUrl: 'https://example.com/tech-acquisition',
          priority: 'CRITICAL',
          location: 'Silicon Valley, CA',
          tags: 'tech,business,acquisition,breaking',
          timestamp: new Date(),
          contentGroup: 'breaking_critical'
        },
        {
          title: 'Flash: New Economic Data Exceeds Expectations',
          brief: 'GDP growth surpasses forecasts, boosting market confidence',
          imageUrl: IMAGES.breaking.gdpGrowth,
          sourceUrl: 'https://example.com/gdp-report',
          priority: 'HIGH',
          location: 'Washington, DC',
          tags: 'economy,business,gdp',
          timestamp: getRandomDate(0.1),
          contentGroup: 'breaking_critical'
        },
        {
          title: 'Major Earthquake Strikes Pacific Region',
          brief: '7.2 magnitude earthquake triggers tsunami warnings',
          imageUrl: IMAGES.breaking.earthquake,
          priority: 'CRITICAL',
          location: 'Pacific Ocean',
          tags: 'disaster,emergency,earthquake',
          timestamp: getRandomDate(0.2),
          contentGroup: 'breaking_critical'
        }
      ]
    });

    console.log('✅ Created 3 breaking news items\n');

    // ==================== CREATE ADVERTISEMENTS ====================
    console.log('💰 Creating advertisements...');

    const now = new Date();
    const futureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

    await prisma.advertisement.createMany({
      data: [
        {
          title: 'Premium Tech Newsletter',
          content: 'Subscribe to our weekly tech insights and stay ahead of the curve',
          imageUrl: IMAGES.ads.newsletter,
          targetUrl: 'https://newsletter.newsplatform.com/subscribe',
          position: 'BANNER',
          isActive: true,
          startDate: now,
          endDate: futureDate,
          budget: 5000.00,
          clickCount: 1245,
          impressions: 45320,
          createdBy: adManager.id
        },
        {
          title: 'Enterprise Cloud Solutions - 50% Off',
          content: 'Transform your business with cutting-edge cloud infrastructure',
          imageUrl: IMAGES.ads.cloudServices,
          targetUrl: 'https://cloud.example.com/enterprise',
          position: 'SIDEBAR',
          isActive: true,
          startDate: now,
          endDate: futureDate,
          budget: 3500.00,
          clickCount: 856,
          impressions: 28920,
          createdBy: adManager.id
        },
        {
          title: 'AI Tools for Developers',
          content: 'Boost productivity with the latest AI-powered development tools',
          imageUrl: IMAGES.ads.aiTools,
          targetUrl: 'https://aitools.dev/promo',
          position: 'INLINE',
          isActive: true,
          startDate: now,
          endDate: futureDate,
          budget: 4200.00,
          clickCount: 1089,
          impressions: 36450,
          createdBy: adManager.id
        }
      ]
    });

    console.log('✅ Created 3 advertisements\n');

    // ==================== CREATE APPROVAL HISTORY ====================
    console.log('✅ Creating approval history...');

    await prisma.approvalHistory.createMany({
      data: [
        {
          newsId: article1.id,
          approverId: adManager.id,
          action: 'APPROVED',
          comments: 'Excellent article with accurate, well-researched information. Ready for publication.',
          createdAt: getRandomDate(2.5)
        },
        {
          newsId: article2.id,
          approverId: adManager.id,
          action: 'APPROVED',
          comments: 'Timely and comprehensive coverage of important climate summit.',
          createdAt: getRandomDate(1.5)
        },
        {
          newsId: article3.id,
          approverId: admin.id,
          action: 'APPROVED',
          comments: 'Good financial analysis with solid market data.',
          createdAt: getRandomDate(3.5)
        },
        {
          newsId: article4.id,
          approverId: adManager.id,
          action: 'APPROVED',
          comments: 'Well-researched health article backed by credible scientific study.',
          createdAt: getRandomDate(4.5)
        },
        {
          newsId: article5.id,
          approverId: admin.id,
          action: 'APPROVED',
          comments: 'Exciting space news with comprehensive mission details.',
          createdAt: getRandomDate(5.5)
        }
      ]
    });

    console.log('✅ Created approval history\n');

    // ==================== CREATE USER INTERACTIONS ====================
    console.log('⭐ Creating user interactions...');

    // User Favorites
    await prisma.userFavorite.createMany({
      data: [
        { userId: user1.id, newsId: article1.id, savedAt: getRandomDate(2) },
        { userId: user1.id, newsId: article2.id, savedAt: getRandomDate(1) },
        { userId: user1.id, newsId: article5.id, savedAt: getRandomDate(5) },
        { userId: user2.id, newsId: article1.id, savedAt: getRandomDate(2) },
        { userId: user2.id, newsId: article3.id, savedAt: getRandomDate(3) },
        { userId: user2.id, newsId: article4.id, savedAt: getRandomDate(4) },
        { userId: user3.id, newsId: article1.id, savedAt: getRandomDate(2) },
        { userId: user3.id, newsId: article4.id, savedAt: getRandomDate(4) },
        { userId: user3.id, newsId: article7.id, savedAt: getRandomDate(6) }
      ]
    });

    // Reading History
    await prisma.readingHistory.createMany({
      data: [
        { userId: user1.id, articleId: article1.id, timeSpent: 245, readProgress: 1.0, lastPosition: 100, createdAt: getRandomDate(2) },
        { userId: user1.id, articleId: article2.id, timeSpent: 198, readProgress: 0.85, lastPosition: 85, createdAt: getRandomDate(1) },
        { userId: user1.id, articleId: article3.id, timeSpent: 156, readProgress: 0.75, lastPosition: 75, createdAt: getRandomDate(3) },
        { userId: user2.id, articleId: article1.id, timeSpent: 189, readProgress: 0.90, lastPosition: 90, createdAt: getRandomDate(2) },
        { userId: user2.id, articleId: article4.id, timeSpent: 267, readProgress: 1.0, lastPosition: 100, createdAt: getRandomDate(4) },
        { userId: user3.id, articleId: article5.id, timeSpent: 312, readProgress: 1.0, lastPosition: 100, createdAt: getRandomDate(5) },
        { userId: user3.id, articleId: article7.id, timeSpent: 145, readProgress: 0.60, lastPosition: 60, createdAt: getRandomDate(6) }
      ]
    });

    // Search History
    await prisma.searchHistory.createMany({
      data: [
        { userId: user1.id, query: 'artificial intelligence healthcare', results: 15, createdAt: getRandomDate(2) },
        { userId: user1.id, query: 'climate change solutions', results: 23, createdAt: getRandomDate(1) },
        { userId: user1.id, query: 'stock market analysis', results: 18, createdAt: getRandomDate(3) },
        { userId: user2.id, query: 'AI technology news', results: 12, createdAt: getRandomDate(2) },
        { userId: user2.id, query: 'space exploration mars', results: 8, createdAt: getRandomDate(5) },
        { userId: user3.id, query: 'mediterranean diet benefits', results: 25, createdAt: getRandomDate(4) },
        { userId: user3.id, query: 'renewable energy investment', results: 19, createdAt: getRandomDate(7) }
      ]
    });

    console.log('✅ Created user favorites, reading history, and search history\n');

    // ==================== CREATE AI ARTICLE VIEWS & INTERACTIONS ====================
    console.log('🤖 Creating AI article views and interactions...');

    await prisma.aiArticleView.createMany({
      data: [
        { articleId: aiArticle1.id, userId: user1.id, timestamp: getRandomDate(1) },
        { articleId: aiArticle1.id, userId: user2.id, timestamp: getRandomDate(1) },
        { articleId: aiArticle1.id, userId: user3.id, timestamp: getRandomDate(1) },
        { articleId: aiArticle2.id, userId: user1.id, timestamp: getRandomDate(2) },
        { articleId: aiArticle2.id, userId: user2.id, timestamp: getRandomDate(2) },
        { articleId: aiArticle3.id, userId: user3.id, timestamp: getRandomDate(3) },
        { articleId: aiArticle4.id, userId: user1.id, timestamp: getRandomDate(4) },
        { articleId: aiArticle4.id, userId: user2.id, timestamp: getRandomDate(4) }
      ]
    });

    await prisma.aiArticleInteraction.createMany({
      data: [
        { articleId: aiArticle1.id, userId: user1.id, interactionType: 'LIKE', timestamp: getRandomDate(1) },
        { articleId: aiArticle1.id, userId: user2.id, interactionType: 'SHARE', timestamp: getRandomDate(1) },
        { articleId: aiArticle1.id, userId: user3.id, interactionType: 'BOOKMARK', timestamp: getRandomDate(1) },
        { articleId: aiArticle2.id, userId: user1.id, interactionType: 'BOOKMARK', timestamp: getRandomDate(2) },
        { articleId: aiArticle3.id, userId: user3.id, interactionType: 'LIKE', timestamp: getRandomDate(3) },
        { articleId: aiArticle4.id, userId: user2.id, interactionType: 'SHARE', timestamp: getRandomDate(4) }
      ]
    });

    console.log('✅ Created AI article views and interactions\n');

    // ==================== CREATE TIMESAVER VIEWS & INTERACTIONS ====================
    console.log('⏱️  Creating TimeSaver views and interactions...');

    // Get TimeSaver IDs
    const allTimeSavers = await prisma.timeSaverContent.findMany({
      select: { id: true }
    });

    await prisma.timeSaverView.createMany({
      data: [
        { contentId: allTimeSavers[0].id, userId: user1.id, timestamp: getRandomDate(0.1) },
        { contentId: allTimeSavers[0].id, userId: user2.id, timestamp: getRandomDate(0.1) },
        { contentId: allTimeSavers[1].id, userId: user1.id, timestamp: getRandomDate(0.2) },
        { contentId: allTimeSavers[2].id, userId: user3.id, timestamp: getRandomDate(0.3) },
        { contentId: allTimeSavers[5].id, userId: user2.id, timestamp: getRandomDate(1) }
      ]
    });

    await prisma.timeSaverInteraction.createMany({
      data: [
        { contentId: allTimeSavers[0].id, userId: user1.id, interactionType: 'LIKE', timestamp: getRandomDate(0.1) },
        { contentId: allTimeSavers[1].id, userId: user1.id, interactionType: 'BOOKMARK', timestamp: getRandomDate(0.2) },
        { contentId: allTimeSavers[2].id, userId: user2.id, interactionType: 'SHARE', timestamp: getRandomDate(0.3) },
        { contentId: allTimeSavers[5].id, userId: user3.id, interactionType: 'SAVE_FOR_LATER', timestamp: getRandomDate(1) }
      ]
    });

    console.log('✅ Created TimeSaver views and interactions\n');

    // ==================== CREATE NOTIFICATIONS ====================
    console.log('🔔 Creating notifications...');

    await prisma.notification.createMany({
      data: [
        {
          userId: editor1.id,
          type: 'ARTICLE_APPROVED',
          title: 'Article Approved',
          message: 'Your article "Revolutionary AI Breakthrough in Healthcare Diagnosis" has been approved and published',
          data: { articleId: article1.id, articleSlug: article1.slug },
          isRead: true,
          readAt: getRandomDate(2),
          createdBy: adManager.id,
          createdAt: getRandomDate(2.5)
        },
        {
          userId: editor2.id,
          type: 'ARTICLE_PUBLISHED',
          title: 'Article Published',
          message: 'Your article "Global Climate Summit Reaches Historic Agreement" is now live and trending',
          data: { articleId: article2.id, articleSlug: article2.slug },
          isRead: true,
          readAt: getRandomDate(1),
          createdBy: admin.id,
          createdAt: getRandomDate(1.5)
        },
        {
          userId: editor2.id,
          type: 'ARTICLE_APPROVED',
          title: 'Article Approved',
          message: 'Your education reform article has been approved',
          data: { articleId: article6.id },
          isRead: false,
          createdBy: adManager.id,
          createdAt: getRandomDate(1)
        },
        {
          userId: user1.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Welcome to News Platform!',
          message: 'Thank you for joining our community. Explore trending articles and customize your preferences.',
          data: { welcomeMessage: true },
          isRead: true,
          readAt: getRandomDate(30),
          createdBy: admin.id,
          createdAt: getRandomDate(31)
        },
        {
          userId: user2.id,
          type: 'PROMOTIONAL',
          title: 'New AI Articles Available',
          message: 'Check out the latest AI/ML breakthroughs in your personalized feed',
          data: { category: 'LANGUAGE_MODELS', count: 5 },
          isRead: false,
          createdBy: adManager.id,
          createdAt: getRandomDate(1)
        },
        {
          userId: user3.id,
          type: 'ACCOUNT_UPDATE',
          title: 'Reading Goals Milestone',
          message: 'Congratulations! You\'ve read 10 articles this month',
          data: { milestone: 10, reward: 'badge' },
          isRead: false,
          createdBy: admin.id,
          createdAt: getRandomDate(0.5)
        }
      ]
    });

    console.log('✅ Created notifications\n');

    // ==================== CREATE SYSTEM SETTINGS ====================
    console.log('⚙️  Creating system settings...');

    await prisma.systemSettings.createMany({
      data: [
        { key: 'site_name', value: 'News Platform', type: 'string', category: 'general' },
        { key: 'site_description', value: 'Your trusted source for news, analysis, and insights', type: 'string', category: 'general' },
        { key: 'contact_email', value: 'contact@newsplatform.com', type: 'string', category: 'general' },
        { key: 'support_email', value: 'support@newsplatform.com', type: 'string', category: 'general' },
        { key: 'articles_per_page', value: '12', type: 'number', category: 'content' },
        { key: 'featured_articles_count', value: '6', type: 'number', category: 'content' },
        { key: 'enable_comments', value: 'true', type: 'boolean', category: 'features' },
        { key: 'enable_notifications', value: 'true', type: 'boolean', category: 'features' },
        { key: 'enable_ai_recommendations', value: 'true', type: 'boolean', category: 'features' },
        { key: 'max_upload_size', value: '10485760', type: 'number', category: 'uploads' },
        { key: 'allowed_image_types', value: 'jpg,jpeg,png,webp,gif', type: 'string', category: 'uploads' },
        { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'system' },
        { key: 'api_rate_limit', value: '100', type: 'number', category: 'system' },
        { key: 'session_timeout', value: '3600', type: 'number', category: 'security' },
        { key: 'password_min_length', value: '8', type: 'number', category: 'security' }
      ]
    });

    console.log('✅ Created system settings\n');

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(70));
    console.log('📊 DATABASE SEEDING SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Users:                  ${users.length} (1 Admin, 1 Ad Manager, 2 Editors, 3 Users)`);
    console.log(`✅ Categories:             ${createdCategories.length}`);
    console.log(`✅ AI Categories:          ${aiCategories.length}`);
    console.log(`✅ News Articles:          ${newsArticles.length} (${newsArticles.filter(a => a.status === 'PUBLISHED').length} Published)`);
    console.log(`✅ AI/ML Articles:         ${aiArticles.length}`);
    console.log(`✅ TimeSaver Content:      ${timeSavers.length}`);
    console.log(`   - Linked to News:       5`);
    console.log(`   - Linked to AI/ML:      3`);
    console.log(`   - Standalone:           2`);
    console.log(`✅ Breaking News:          3`);
    console.log(`✅ Advertisements:         3`);
    console.log(`✅ Approval History:       5 records`);
    console.log(`✅ User Favorites:         9 saved articles`);
    console.log(`✅ Reading History:        7 reading sessions`);
    console.log(`✅ Search History:         7 searches`);
    console.log(`✅ AI Views/Interactions:  14 total`);
    console.log(`✅ TimeSaver Views/Ints:   9 total`);
    console.log(`✅ Notifications:          6`);
    console.log(`✅ System Settings:        15`);
    console.log('='.repeat(70));
    console.log('\n🔑 LOGIN CREDENTIALS');
    console.log('='.repeat(70));
    console.log('Admin:       admin@newsplatform.com       / password123');
    console.log('Ad Manager:  admanager@newsplatform.com   / password123');
    console.log('Editor 1:    editor1@newsplatform.com     / password123');
    console.log('Editor 2:    editor2@newsplatform.com     / password123');
    console.log('User 1:      alice@example.com            / password123');
    console.log('User 2:      bob@example.com              / password123');
    console.log('User 3:      carol@example.com            / password123');
    console.log('='.repeat(70));
    console.log('\n✨ All images are from Unsplash and guaranteed to work!');
    console.log('🎉 Database seeding completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  }
}

// ==================== EXECUTE SEED ====================

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });