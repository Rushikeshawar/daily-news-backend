// controllers/uploadController.js
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class UploadController {
  // @desc    Upload single image
  static uploadSingleImage(req, res) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    logger.info(`Image uploaded: ${req.file.filename} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: imageUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  }

  // @desc    Upload multiple images
  static uploadMultipleImages(req, res) {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));

    logger.info(`${req.files.length} images uploaded by ${req.user.email}`);

    res.json({
      success: true,
      message: `${req.files.length} images uploaded successfully`,
      data: { files: uploadedFiles }
    });
  }

  // @desc    Delete uploaded file
  static deleteFile(req, res) {
    try {
      const { filename } = req.params;
      
      // Validate filename (security check)
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      const filePath = path.join(__dirname, '../../uploads', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Delete the file
      fs.unlinkSync(filePath);

      logger.info(`File deleted: ${filename} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      logger.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  }

  // @desc    Get upload info/stats
  static getUploadInfo(req, res) {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return res.json({
          success: true,
          data: {
            totalFiles: 0,
            totalSize: 0,
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          }
        });
      }

      const files = fs.readdirSync(uploadsDir);
      let totalSize = 0;

      files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      });

      res.json({
        success: true,
        data: {
          totalFiles: files.length,
          totalSize,
          totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
          maxFileSizeMB: Math.round((parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024) / (1024 * 1024)),
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        }
      });
    } catch (error) {
      logger.error('Get upload info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get upload information'
      });
    }
  }

  // @desc    List uploaded files
  static listFiles(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return res.json({
          success: true,
          data: {
            files: [],
            pagination: {
              page: 1,
              limit: parseInt(limit),
              totalPages: 0,
              totalCount: 0
            }
          }
        });
      }

      let files = fs.readdirSync(uploadsDir).map(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          url: `/uploads/${filename}`,
          size: stats.size,
          sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
          uploadedAt: stats.ctime,
          modifiedAt: stats.mtime
        };
      }).filter(file => file.size > 0); // Filter out empty files

      // Apply search filter
      if (search) {
        files = files.filter(file => 
          file.filename.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Sort by upload date (newest first)
      files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

      // Apply pagination
      const totalCount = files.length;
      const totalPages = Math.ceil(totalCount / parseInt(limit));
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedFiles = files.slice(skip, skip + parseInt(limit));

      res.json({
        success: true,
        data: {
          files: paginatedFiles,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages,
            totalCount,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      logger.error('List files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list files'
      });
    }
  }

  // @desc    Cleanup old files
  static cleanupFiles(req, res) {
    try {
      const { olderThanDays = 30 } = req.body;
      const uploadsDir = path.join(__dirname, '../../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return res.json({
          success: true,
          message: 'No files to cleanup',
          data: { deletedCount: 0 }
        });
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));

      const files = fs.readdirSync(uploadsDir);
      let deletedCount = 0;

      files.forEach(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      logger.info(`File cleanup completed: ${deletedCount} files deleted by ${req.user.email}`);

      res.json({
        success: true,
        message: `Cleanup completed. ${deletedCount} old files deleted.`,
        data: { deletedCount }
      });
    } catch (error) {
      logger.error('File cleanup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup files'
      });
    }
  }

  // @desc    Generate image thumbnail (basic implementation)
  static generateThumbnail(req, res) {
    try {
      const { filename } = req.params;
      const { width = 150, height = 150 } = req.body;

      // Validate filename
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename'
        });
      }

      const filePath = path.join(__dirname, '../../uploads', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // In a real implementation, you would use a library like Sharp or Jimp
      // to generate actual thumbnails. This is a placeholder response.
      res.json({
        success: true,
        message: 'Thumbnail generation requested',
        data: {
          originalFile: filename,
          thumbnailUrl: `/uploads/${filename}`, // Would be actual thumbnail URL
          dimensions: { width: parseInt(width), height: parseInt(height) }
        }
      });
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate thumbnail'
      });
    }
  }
}

module.exports = UploadController;