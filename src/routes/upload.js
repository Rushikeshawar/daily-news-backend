// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const UploadController = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 5 // Maximum 5 files at once
  }
});

// Multer error handling middleware
const handleMulterError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 5 files allowed.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.post('/image', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), handleMulterError(upload.single('image')), UploadController.uploadSingleImage);

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.post('/images', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), handleMulterError(upload.array('images', 5)), UploadController.uploadMultipleImages);

// @desc    Delete uploaded file
// @route   DELETE /api/upload/:filename
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.delete('/:filename', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), UploadController.deleteFile);

// @desc    Get upload info/stats
// @route   GET /api/upload/info
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.get('/info', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), UploadController.getUploadInfo);

// @desc    List uploaded files
// @route   GET /api/upload/files
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.get('/files', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), UploadController.listFiles);

// @desc    Cleanup old files
// @route   POST /api/upload/cleanup
// @access  Private (ADMIN)
router.post('/cleanup', authenticate, authorize('ADMIN'), UploadController.cleanupFiles);

// @desc    Generate image thumbnail (basic implementation)
// @route   POST /api/upload/thumbnail/:filename
// @access  Private (EDITOR, AD_MANAGER, ADMIN)
router.post('/thumbnail/:filename', authenticate, authorize('EDITOR', 'AD_MANAGER', 'ADMIN'), UploadController.generateThumbnail);

module.exports = router;