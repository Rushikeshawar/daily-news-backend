 
const logger = require('../utils/logger');
const { Prisma } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${err.name}: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        const field = err.meta?.target?.[0] || 'field';
        error.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        error.statusCode = 400;
        break;
      case 'P2025':
        // Record not found
        error.message = 'Resource not found';
        error.statusCode = 404;
        break;
      case 'P2003':
        // Foreign key constraint violation
        error.message = 'Invalid reference to related resource';
        error.statusCode = 400;
        break;
      default:
        error.message = 'Database error occurred';
        error.statusCode = 500;
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    error.message = 'Invalid data provided';
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error.message = message;
    error.statusCode = 400;
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error.message = 'Invalid ID format';
    error.statusCode = 400;
  }

  // Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File too large';
      error.statusCode = 400;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error.message = 'Too many files';
      error.statusCode = 400;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error.message = 'Unexpected field';
      error.statusCode = 400;
    }
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;