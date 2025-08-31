 
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Params: ${e.params}`);
        logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    this.prisma.$on('error', (e) => {
      logger.error('Database error:', e);
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database info:', e.message);
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database warning:', e.message);
    });

    // Test connection
    this.testConnection();
  }

  async testConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    logger.info('Database disconnected');
  }

  getClient() {
    return this.prisma;
  }
}

// Export singleton instance
const database = new Database();
module.exports = database.getClient();