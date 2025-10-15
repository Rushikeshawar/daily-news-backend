// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

// Generate random 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const authController = {
  // Step 1: Request OTP for registration
  requestOTP: async (req, res) => {
    try {
      const { email, fullName, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Hash password temporarily
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Store pending registration with OTP
      await prisma.pendingRegistration.upsert({
        where: { email },
        update: {
          fullName,
          passwordHash,
          otp,
          otpExpiry,
          attempts: 0
        },
        create: {
          email,
          fullName,
          passwordHash,
          otp,
          otpExpiry,
          attempts: 0
        }
      });

      // Send OTP email
      await emailService.sendOTPEmail(email, otp, fullName);

      logger.info(`OTP sent to ${email} for registration`);

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email address',
        data: {
          email,
          expiresIn: 600 // seconds
        }
      });
    } catch (error) {
      logger.error('Request OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }
  },

  // Step 2: Verify OTP and complete registration
  verifyOTPAndRegister: async (req, res) => {
    try {
      const { email, otp, role = 'USER' } = req.body;

      // Find pending registration
      const pendingReg = await prisma.pendingRegistration.findUnique({
        where: { email }
      });

      if (!pendingReg) {
        return res.status(400).json({
          success: false,
          message: 'No pending registration found for this email'
        });
      }

      // Check if OTP has expired
      if (new Date() > pendingReg.otpExpiry) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      // Check attempts limit
      if (pendingReg.attempts >= 5) {
        await prisma.pendingRegistration.delete({
          where: { email }
        });
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please start registration again.'
        });
      }

      // Verify OTP
      if (pendingReg.otp !== otp) {
        await prisma.pendingRegistration.update({
          where: { email },
          data: { attempts: pendingReg.attempts + 1 }
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.',
          attemptsLeft: 5 - (pendingReg.attempts + 1)
        });
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: pendingReg.email,
          passwordHash: pendingReg.passwordHash,
          fullName: pendingReg.fullName,
          role: role.toUpperCase(),
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true
        }
      });

      // Delete pending registration
      await prisma.pendingRegistration.delete({
        where: { email }
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt
        }
      });

      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(user.email, user.fullName).catch(err => {
        logger.error('Failed to send welcome email:', err);
      });

      logger.info(`User registered successfully: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.'
      });
    }
  },

  // Resend OTP
  resendOTP: async (req, res) => {
    try {
      const { email } = req.body;

      const pendingReg = await prisma.pendingRegistration.findUnique({
        where: { email }
      });

      if (!pendingReg) {
        return res.status(400).json({
          success: false,
          message: 'No pending registration found for this email'
        });
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      // Update pending registration
      await prisma.pendingRegistration.update({
        where: { email },
        data: {
          otp,
          otpExpiry,
          attempts: 0
        }
      });

      // Send new OTP
      await emailService.sendOTPEmail(email, otp, pendingReg.fullName);

      logger.info(`OTP resent to ${email}`);

      res.status(200).json({
        success: true,
        message: 'New OTP sent to your email address',
        data: {
          email,
          expiresIn: 600
        }
      });
    } catch (error) {
      logger.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again.'
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          fullName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          avatar: true,
          preferences: true,
          lastLogin: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      if (!user.emailVerified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const { accessToken, refreshToken } = generateTokens(user.id);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const { passwordHash, ...userWithoutPassword } = user;

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  },

  // Refresh access token
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
              isActive: true,
              emailVerified: true,
              avatar: true,
              preferences: true
            }
          }
        }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) {
          await prisma.refreshToken.delete({
            where: { token: refreshToken }
          });
        }

        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      if (!storedToken.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(storedToken.user.id);

      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.update({
        where: { token: refreshToken },
        data: {
          token: newRefreshToken,
          expiresAt: newExpiresAt
        }
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: storedToken.user,
          accessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  },

  // Logout user
  logout: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await prisma.refreshToken.deleteMany({
          where: {
            OR: [
              { token: refreshToken },
              { userId: req.user.id }
            ]
          }
        });
      } else {
        await prisma.refreshToken.deleteMany({
          where: { userId: req.user.id }
        });
      }

      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  },

  // Logout from all devices
  logoutAll: async (req, res) => {
    try {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id }
      });

      logger.info(`User logged out from all devices: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout from all devices failed'
      });
    }
  },

  // Get current user
  getCurrentUser: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          avatar: true,
          preferences: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user information'
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { passwordHash: true }
      });

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: newPasswordHash }
      });

      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id }
      });

      logger.info(`Password changed for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  },

  // Request password reset OTP
  requestPasswordResetOTP: async (req, res) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, fullName: true, email: true, isActive: true }
      });

      if (!user) {
        // Don't reveal if user exists or not
        return res.status(200).json({
          success: true,
          message: 'If the email exists, an OTP has been sent'
        });
      }

      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.passwordReset.upsert({
        where: { email },
        update: {
          otp,
          otpExpiry,
          attempts: 0
        },
        create: {
          email,
          otp,
          otpExpiry,
          attempts: 0
        }
      });

      await emailService.sendOTPEmail(email, otp, user.fullName);

      logger.info(`Password reset OTP sent to ${email}`);

      res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent',
        data: {
          email,
          expiresIn: 600
        }
      });
    } catch (error) {
      logger.error('Request password reset OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset OTP'
      });
    }
  },

  // Verify password reset OTP
  verifyPasswordResetOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;

      const resetRequest = await prisma.passwordReset.findUnique({
        where: { email }
      });

      if (!resetRequest) {
        return res.status(400).json({
          success: false,
          message: 'No password reset request found'
        });
      }

      if (new Date() > resetRequest.otpExpiry) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired'
        });
      }

      if (resetRequest.attempts >= 5) {
        await prisma.passwordReset.delete({
          where: { email }
        });
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts'
        });
      }

      if (resetRequest.otp !== otp) {
        await prisma.passwordReset.update({
          where: { email },
          data: { attempts: resetRequest.attempts + 1 }
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid OTP',
          attemptsLeft: 5 - (resetRequest.attempts + 1)
        });
      }

      await prisma.passwordReset.update({
        where: { email },
        data: { verified: true }
      });

      res.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } catch (error) {
      logger.error('Verify password reset OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP'
      });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      const resetRequest = await prisma.passwordReset.findUnique({
        where: { email }
      });

      if (!resetRequest || !resetRequest.verified) {
        return res.status(400).json({
          success: false,
          message: 'Please verify OTP first'
        });
      }

      if (new Date() > resetRequest.otpExpiry) {
        await prisma.passwordReset.delete({
          where: { email }
        });
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one'
        });
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const user = await prisma.user.update({
        where: { email },
        data: { passwordHash }
      });

      await prisma.passwordReset.delete({
        where: { email }
      });

      await prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      });

      logger.info(`Password reset successful for ${email}`);

      res.json({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  }
};

module.exports = authController;