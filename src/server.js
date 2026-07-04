import dotenv from 'dotenv';
import app from './app.js';
import prisma from './config/prisma.js';
import logger from './utils/logger.js';
import { validateStorageConfig } from './modules/gallery/gallery.storage.js';

// Load environment variables before importing components
dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // Validate storage configuration on startup
    validateStorageConfig();

    logger.info('Connecting to PostgreSQL database...');
    // Verify database connectivity
    await prisma.$connect();
    logger.info('PostgreSQL connection established successfully via Prisma Client.');

    const server = app.listen(PORT, () => {
      logger.info(`REST API server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // Graceful shutdown helper
    const handleShutdown = async (signal) => {
      logger.warn(`Received ${signal}. Shutting down application gracefully...`);
      server.close(async () => {
        logger.info('HTTP server terminated.');
        await prisma.$disconnect();
        logger.info('Prisma Client disconnected. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to connect to the database or start the server:', error);
    process.exit(1);
  }
}

// Global Exception handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  logger.error('CRITICAL: Uncaught Exception detected!', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('CRITICAL: Unhandled Promise Rejection detected!', reason);
  process.exit(1);
});

bootstrap();
