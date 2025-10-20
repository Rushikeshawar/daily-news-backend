// middleware/validation.js - FIXED FOR DYNAMIC CATEGORIES
const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

// User validation rules
const userValidation = {
  create: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .optional()
      .isIn(['USER', 'EDITOR', 'AD_MANAGER', 'ADMIN'])
      .withMessage('Invalid role'),
    handleValidationErrors
  ],

  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('role')
      .optional()
      .isIn(['USER', 'EDITOR', 'AD_MANAGER', 'ADMIN'])
      .withMessage('Invalid role'),
    handleValidationErrors
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  update: [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),
    handleValidationErrors
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
  ],

  requestOTP: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
  ],

  verifyOTP: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    body('role')
      .optional()
      .isIn(['USER', 'EDITOR', 'ADMIN', 'AD_MANAGER'])
      .withMessage('Invalid role'),
    handleValidationErrors
  ],

  resendOTP: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    handleValidationErrors
  ],

  requestPasswordReset: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    handleValidationErrors
  ],

  verifyPasswordResetOTP: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    handleValidationErrors
  ],

  resetPassword: [
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    handleValidationErrors
  ]
};

// Article validation rules - FIXED FOR DYNAMIC CATEGORIES
const articleValidation = {
  create: [
    body('headline')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Headline must be between 10 and 500 characters'),
    body('briefContent')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Brief content must not exceed 1000 characters'),
    body('fullContent')
      .optional()
      .trim()
      .isLength({ min: 50 })
      .withMessage('Full content must be at least 50 characters'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isString()
      .withMessage('Category must be a string')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be between 1 and 100 characters'),
    body('tags')
      .optional()
      .isString()
      .withMessage('Tags must be a string'),
    body('priorityLevel')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Priority level must be between 0 and 10'),
    body('scheduledAt')
      .optional()
      .isISO8601()
      .withMessage('Scheduled date must be a valid ISO 8601 date'),
    handleValidationErrors
  ],

  update: [
    param('id')
      .notEmpty()
      .withMessage('Article ID is required'),
    body('headline')
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Headline must be between 10 and 500 characters'),
    body('briefContent')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Brief content must not exceed 1000 characters'),
    body('fullContent')
      .optional()
      .trim()
      .isLength({ min: 50 })
      .withMessage('Full content must be at least 50 characters'),
    body('category')
      .optional()
      .isString()
      .withMessage('Category must be a string')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be between 1 and 100 characters'),
    body('status')
      .optional()
      .isIn(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'])
      .withMessage('Invalid status'),
    body('priorityLevel')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Priority level must be between 0 and 10'),
    handleValidationErrors
  ],

  approval: [
    param('id')
      .notEmpty()
      .withMessage('Article ID is required'),
    body('action')
      .isIn(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'])
      .withMessage('Invalid approval action'),
    body('comments')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comments must not exceed 1000 characters'),
    handleValidationErrors
  ]
};

// Advertisement validation rules
const advertisementValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('content')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Content must not exceed 1000 characters'),
    body('targetUrl')
      .optional()
      .isURL()
      .withMessage('Target URL must be a valid URL'),
    body('position')
      .isIn(['BANNER', 'SIDEBAR', 'INLINE', 'POPUP', 'INTERSTITIAL'])
      .withMessage('Invalid advertisement position'),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (new Date(endDate) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('budget')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Budget must be a valid decimal with up to 2 decimal places'),
    handleValidationErrors
  ],

  update: [
    param('id')
      .notEmpty()
      .withMessage('Advertisement ID is required'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('content')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Content must not exceed 1000 characters'),
    body('targetUrl')
      .optional()
      .isURL()
      .withMessage('Target URL must be a valid URL'),
    body('position')
      .optional()
      .isIn(['BANNER', 'SIDEBAR', 'INLINE', 'POPUP', 'INTERSTITIAL'])
      .withMessage('Invalid advertisement position'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    handleValidationErrors
  ]
};

// Search validation rules - FIXED FOR DYNAMIC CATEGORIES
const searchValidation = {
  search: [
    query('q')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be between 1 and 200 characters'),
    query('category')
      .optional()
      .isString()
      .withMessage('Category must be a string')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be between 1 and 100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'publishedAt', 'viewCount', 'relevance'])
      .withMessage('Invalid sort field'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be either asc or desc'),
    handleValidationErrors
  ]
};

// Generic validation rules
const genericValidation = {
  id: [
    param('id')
      .notEmpty()
      .withMessage('ID is required'),
    handleValidationErrors
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  userValidation,
  articleValidation,
  advertisementValidation,
  searchValidation,
  genericValidation
};