// src/services/emailService.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Only create transporter if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
        logger.info('Email service initialized with SMTP');
      } catch (error) {
        logger.warn('Email service initialization failed:', error.message);
        this.transporter = null;
      }
    } else {
      logger.warn('Email service not configured - SMTP credentials missing. OTPs will be logged to console.');
      this.transporter = null;
    }
  }

  async sendOTPEmail(email, otp, fullName) {
    // If no transporter, just log to console (development mode)
    if (!this.transporter) {
      logger.info(`OTP for ${email}: ${otp}`);
      console.log('\n' + '='.repeat(50));
      console.log(`📧 EMAIL NOT SENT (Development Mode)`);
      console.log('='.repeat(50));
      console.log(`To: ${email}`);
      console.log(`Name: ${fullName}`);
      console.log(`\n🔑 YOUR OTP CODE: ${otp}`);
      console.log(`⏰ Valid for: 10 minutes`);
      console.log('='.repeat(50) + '\n');
      
      // Return success so registration continues
      return { success: true, messageId: 'development-mode' };
    }

    // If transporter exists, send actual email
    const mailOptions = {
      from: `"Lines Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email - Lines Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px; }
            .content { background: white; padding: 30px; border-radius: 8px; }
            .otp-box { background: #f7fafc; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
            h1 { color: #1a202c; margin-bottom: 20px; }
            .warning { background: #fed7d7; border-left: 4px solid #e53e3e; padding: 12px; margin-top: 20px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h1>Welcome to Lines! 👋</h1>
              <p>Hi ${fullName},</p>
              <p>Thank you for registering with Lines Platform. To complete your registration, please verify your email address using the OTP code below:</p>
              <div class="otp-box">
                <p style="margin: 0; color: #718096; font-size: 14px;">Your verification code</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 0; color: #718096; font-size: 14px;">Valid for 10 minutes</p>
              </div>
              <p>Enter this code in the verification page to activate your account.</p>
              <div class="warning">
                <strong>⚠️ Security Note:</strong> Never share this code with anyone.
              </div>
              <div class="footer">
                <p>If you didn't request this code, please ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} Lines Platform. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendWelcomeEmail(email, fullName) {
    if (!this.transporter) {
      logger.info(`Welcome email not sent to ${email} - Development mode`);
      console.log(`\n✅ Welcome ${fullName}! Your account is ready.\n`);
      return { success: true, messageId: 'development-mode' };
    }

    const mailOptions = {
      from: `"Lines Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to Lines Platform! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px; }
            .content { background: white; padding: 30px; border-radius: 8px; }
            h1 { color: #1a202c; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .features { margin: 30px 0; }
            .feature-item { padding: 15px; margin: 10px 0; background: #f7fafc; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h1>Welcome aboard, ${fullName}! 🎉</h1>
              <p>Your account has been successfully verified and activated.</p>
              <div class="features">
                <h2>What you can do now:</h2>
                <div class="feature-item">📰 Access latest AI/ML news and articles</div>
                <div class="feature-item">⭐ Save your favorite articles</div>
                <div class="feature-item">📊 Track your reading progress</div>
                <div class="feature-item">🔔 Get personalized notifications</div>
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="cta-button">Start Exploring</a>
              </p>
              <p>Happy reading!<br>The Lines Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      // Don't throw error for welcome email
      return { success: false };
    }
  }
}

module.exports = new EmailService();