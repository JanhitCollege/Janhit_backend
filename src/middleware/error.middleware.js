import logger from '../utils/logger.js';

/**
 * Express centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred on the server.';

  // Log error details for the developers
  logger.error(`${req.method} ${req.originalUrl} - Handler caught error:`, err);

  // 1. Prisma unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 400;
    const targets = err.meta?.target || [];
    if (targets.includes('email')) {
      message = 'Email address is already in use.';
    } else if (targets.includes('mobile')) {
      message = 'Mobile number is already in use.';
    } else {
      message = `Duplicate field value error for: ${targets.join(', ')}.`;
    }
  }

  // 2. Prisma foreign key constraint violation
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Invalid reference key constraint error.';
  }

  // 3. Prisma record not found error
  if (err.code === 'P2025') {
    statusCode = 404;
    message = err.meta?.cause || 'Requested record was not found.';
  }

  // 4. JWT Validation Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid session token. Please login again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session token has expired. Please login again.';
  }

  // Send standardized response
  res.status(statusCode).json({
    success: false,
    message
  });
};
