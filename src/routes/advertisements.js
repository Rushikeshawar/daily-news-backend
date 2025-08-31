const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { advertisementValidation, genericValidation } = require('../middleware/validation');
const logger = require('../utils/logger');
const router = express.Router();

// @desc    Get active advertisements for display
// @route   GET /api/advertisements/active
// @access  Public
router.get('/active', async (req, res) => {
  try {
    const { position, limit = 5 } = req.query;
    const where = {
      isActive: true,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() }
    };
    if (position) {
      where.position = position;
    }
    const advertisements = await prisma.advertisement.findMany({
      where,
      take: parseInt(limit),
      orderBy: [
        { clickCount: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        targetUrl: true,
        position: true,
        impressions: true
      }
    });
    if (advertisements.length > 0) {
      const adIds = advertisements.map(ad => ad.id);
      await prisma.advertisement.updateMany({
        where: { id: { in: adIds } },
        data: { impressions: { increment: 1 } }
      });
    }
    res.json({
      success: true,
      data: { advertisements }
    });
  } catch (error) {
    logger.error('Get active advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// @desc    Toggle advertisement status
// @route   PATCH /api/advertisements/:id/toggle
// @access  Private (AD_MANAGER, ADMIN)
router.patch('/:id/toggle', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const advertisement = await prisma.advertisement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isActive: true
      }
    });
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    const updatedAd = await prisma.advertisement.update({
      where: { id },
      data: { isActive: !advertisement.isActive },
      select: {
        id: true,
        title: true,
        isActive: true,
        updatedAt: true
      }
    });
    logger.info(`Advertisement ${updatedAd.isActive ? 'activated' : 'deactivated'}: ${advertisement.title} by ${req.user.email}`);
    res.json({
      success: true,
      message: `Advertisement ${updatedAd.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { advertisement: updatedAd }
    });
  } catch (error) {
    logger.error('Toggle advertisement status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle advertisement status'
    });
  }
});

// @desc    Get advertisement analytics
// @route   GET /api/advertisements/:id/analytics
// @access  Private (AD_MANAGER, ADMIN)
router.get('/:id/analytics', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const { timeframe = '30d' } = req.query;
    const advertisement = await prisma.advertisement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        impressions: true,
        clickCount: true,
        startDate: true,
        endDate: true,
        budget: true
      }
    });
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    const clickThroughRate = advertisement.impressions > 0
      ? ((advertisement.clickCount / advertisement.impressions) * 100).toFixed(2)
      : 0;
    const costPerClick = advertisement.budget && advertisement.clickCount > 0
      ? (advertisement.budget / advertisement.clickCount).toFixed(2)
      : 0;
    const daysRunning = Math.ceil(
      (Math.min(new Date(), advertisement.endDate) - Math.max(new Date(), advertisement.startDate))
      / (1000 * 60 * 60 * 24)
    );
    const analytics = {
      overview: {
        impressions: advertisement.impressions,
        clicks: advertisement.clickCount,
        clickThroughRate: parseFloat(clickThroughRate),
        costPerClick: parseFloat(costPerClick),
        daysRunning: Math.max(0, daysRunning),
        budget: advertisement.budget
      },
      performance: {
        impressionsPerDay: daysRunning > 0 ? Math.round(advertisement.impressions / daysRunning) : 0,
        clicksPerDay: daysRunning > 0 ? Math.round(advertisement.clickCount / daysRunning) : 0
      },
      dateRange: {
        startDate: advertisement.startDate,
        endDate: advertisement.endDate
      }
    };
    res.json({
      success: true,
      data: {
        advertisement: {
          id: advertisement.id,
          title: advertisement.title
        },
        analytics
      }
    });
  } catch (error) {
    logger.error('Get advertisement analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get advertisement analytics'
    });
  }
});

// @desc    Get advertisement performance summary
// @route   GET /api/advertisements/performance/summary
// @access  Private (AD_MANAGER, ADMIN)
router.get('/performance/summary', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    const timeframes = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const days = timeframes[timeframe] || 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const [
      totalAds,
      activeAds,
      totalImpressions,
      totalClicks,
      totalBudget,
      topPerformers,
      positionStats
    ] = await Promise.all([
      prisma.advertisement.count(),
      prisma.advertisement.count({
        where: {
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      }),
      prisma.advertisement.aggregate({
        _sum: { impressions: true }
      }),
      prisma.advertisement.aggregate({
        _sum: { clickCount: true }
      }),
      prisma.advertisement.aggregate({
        _sum: { budget: true }
      }),
      prisma.advertisement.findMany({
        where: {
          startDate: { gte: fromDate }
        },
        orderBy: { clickCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          impressions: true,
          clickCount: true,
          position: true
        }
      }),
      prisma.advertisement.groupBy({
        by: ['position'],
        where: {
          startDate: { gte: fromDate }
        },
        _sum: {
          impressions: true,
          clickCount: true
        },
        _count: { id: true }
      })
    ]);
    const overallCTR = totalImpressions._sum.impressions > 0
      ? ((totalClicks._sum.clickCount / totalImpressions._sum.impressions) * 100).toFixed(2)
      : 0;
    const topPerformersWithCTR = topPerformers.map(ad => ({
      ...ad,
      clickThroughRate: ad.impressions > 0
        ? parseFloat(((ad.clickCount / ad.impressions) * 100).toFixed(2))
        : 0
    }));
    const positionPerformance = positionStats.map(stat => ({
      position: stat.position,
      totalAds: stat._count.id,
      totalImpressions: stat._sum.impressions || 0,
      totalClicks: stat._sum.clickCount || 0,
      averageCTR: stat._sum.impressions > 0
        ? parseFloat(((stat._sum.clickCount / stat._sum.impressions) * 100).toFixed(2))
        : 0
    }));
    const summary = {
      overview: {
        totalAdvertisements: totalAds,
        activeAdvertisements: activeAds,
        totalImpressions: totalImpressions._sum.impressions || 0,
        totalClicks: totalClicks._sum.clickCount || 0,
        overallClickThroughRate: parseFloat(overallCTR),
        totalBudget: totalBudget._sum.budget || 0
      },
      topPerformers: topPerformersWithCTR,
      positionPerformance,
      timeframe: {
        period: timeframe,
        fromDate,
        toDate: new Date()
      }
    };
    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    logger.error('Get advertisement performance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance summary'
    });
  }
});

// @desc    Get advertisements by position
// @route   GET /api/advertisements/position/:position
// @access  Public
router.get('/position/:position', async (req, res) => {
  try {
    const { position } = req.params;
    const { limit = 3 } = req.query;
    const validPositions = ['BANNER', 'SIDEBAR', 'INLINE', 'POPUP', 'INTERSTITIAL'];
    if (!validPositions.includes(position.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement position'
      });
    }
    const advertisements = await prisma.advertisement.findMany({
      where: {
        position: position.toUpperCase(),
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      take: parseInt(limit),
      orderBy: [
        { clickCount: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        targetUrl: true,
        position: true
      }
    });
    if (advertisements.length > 0) {
      const adIds = advertisements.map(ad => ad.id);
      await prisma.advertisement.updateMany({
        where: { id: { in: adIds } },
        data: { impressions: { increment: 1 } }
      });
    }
    res.json({
      success: true,
      data: { advertisements }
    });
  } catch (error) {
    logger.error('Get advertisements by position error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// @desc    Bulk update advertisement status
// @route   PATCH /api/advertisements/bulk/status
// @access  Private (AD_MANAGER, ADMIN)
router.patch('/bulk/status', authenticate, authorize('AD_MANAGER', 'ADMIN'), async (req, res) => {
  try {
    const { advertisementIds, isActive } = req.body;
    if (!Array.isArray(advertisementIds) || advertisementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of advertisement IDs'
      });
    }
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }
    if (advertisementIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update more than 50 advertisements at once'
      });
    }
    const result = await prisma.advertisement.updateMany({
      where: { id: { in: advertisementIds } },
      data: { isActive }
    });
    logger.info(`Bulk advertisement status update: ${result.count} ads ${isActive ? 'activated' : 'deactivated'} by ${req.user.email}`);
    res.json({
      success: true,
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${result.count} advertisements`,
      data: { updatedCount: result.count }
    });
  } catch (error) {
    logger.error('Bulk update advertisement status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement status'
    });
  }
});

// @desc    Get expired advertisements
// @route   GET /api/advertisements/expired/list
// @access  Private (AD_MANAGER, ADMIN)
router.get('/expired/list', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.pagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [expiredAds, totalCount] = await Promise.all([
      prisma.advertisement.findMany({
        where: {
          endDate: { lt: new Date() }
        },
        skip,
        take,
        orderBy: { endDate: 'desc' },
        select: {
          id: true,
          title: true,
          position: true,
          isActive: true,
          impressions: true,
          clickCount: true,
          budget: true,
          startDate: true,
          endDate: true,
          creator: {
            select: {
              fullName: true
            }
          }
        }
      }),
      prisma.advertisement.count({
        where: { endDate: { lt: new Date() } }
      })
    ]);
    const totalPages = Math.ceil(totalCount / take);
    res.json({
      success: true,
      data: {
        expiredAdvertisements: expiredAds,
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
    logger.error('Get expired advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expired advertisements'
    });
  }
});

// @desc    Track advertisement click
// @route   POST /api/advertisements/:id/click
// @access  Public
router.post('/:id/click', genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const advertisement = await prisma.advertisement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        targetUrl: true,
        isActive: true,
        startDate: true,
        endDate: true
      }
    });
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    const now = new Date();
    if (!advertisement.isActive ||
        advertisement.startDate > now ||
        advertisement.endDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement is not active'
      });
    }
    await prisma.advertisement.update({
      where: { id },
      data: { clickCount: { increment: 1 } }
    });
    logger.info(`Advertisement clicked: ${advertisement.title}`);
    res.json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        redirectUrl: advertisement.targetUrl
      }
    });
  } catch (error) {
    logger.error('Track advertisement click error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click'
    });
  }
});

// @desc    Get all advertisements (AD_MANAGER, ADMIN)
// @route   GET /api/advertisements
// @access  Private (AD_MANAGER, ADMIN)
router.get('/', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.pagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      position,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
      search
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where = {};
    if (position) where.position = position;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }
    const orderBy = {};
    orderBy[sortBy] = order;
    const [advertisements, totalCount] = await Promise.all([
      prisma.advertisement.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      }),
      prisma.advertisement.count({ where })
    ]);
    const totalPages = Math.ceil(totalCount / take);
    res.json({
      success: true,
      data: {
        advertisements,
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
    logger.error('Get advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// @desc    Get advertisement by ID
// @route   GET /api/advertisements/:id
// @access  Private (AD_MANAGER, ADMIN)
router.get('/:id', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const advertisement = await prisma.advertisement.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    res.json({
      success: true,
      data: { advertisement }
    });
  } catch (error) {
    logger.error('Get advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement'
    });
  }
});

// @desc    Create new advertisement
// @route   POST /api/advertisements
// @access  Private (AD_MANAGER, ADMIN)
router.post('/', authenticate, authorize('AD_MANAGER', 'ADMIN'), advertisementValidation.create, async (req, res) => {
  try {
    const {
      title,
      content,
      imageUrl,
      targetUrl,
      position,
      startDate,
      endDate,
      budget
    } = req.body;
    const advertisement = await prisma.advertisement.create({
      data: {
        title,
        content,
        imageUrl,
        targetUrl,
        position,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget: budget ? parseFloat(budget) : null,
        createdBy: req.user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    logger.info(`Advertisement created: ${title} by ${req.user.email}`);
    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      data: { advertisement }
    });
  } catch (error) {
    logger.error('Create advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement'
    });
  }
});

// @desc    Update advertisement
// @route   PUT /api/advertisements/:id
// @access  Private (AD_MANAGER, ADMIN)
router.put('/:id', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, advertisementValidation.update, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    const existingAd = await prisma.advertisement.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        createdBy: true
      }
    });
    if (!existingAd) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.budget) updateData.budget = parseFloat(updateData.budget);
    const advertisement = await prisma.advertisement.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });
    logger.info(`Advertisement updated: ${existingAd.title} by ${req.user.email}`);
    res.json({
      success: true,
      message: 'Advertisement updated successfully',
      data: { advertisement }
    });
  } catch (error) {
    logger.error('Update advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement'
    });
  }
});

// @desc    Delete advertisement
// @route   DELETE /api/advertisements/:id
// @access  Private (AD_MANAGER, ADMIN)
router.delete('/:id', authenticate, authorize('AD_MANAGER', 'ADMIN'), genericValidation.id, async (req, res) => {
  try {
    const { id } = req.params;
    const advertisement = await prisma.advertisement.findUnique({
      where: { id },
      select: { title: true }
    });
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }
    await prisma.advertisement.delete({
      where: { id }
    });
    logger.info(`Advertisement deleted: ${advertisement.title} by ${req.user.email}`);
    res.json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    logger.error('Delete advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement'
    });
  }
});

module.exports = router;
