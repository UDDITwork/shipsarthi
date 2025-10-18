const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Enhanced email configuration with timeout and retry settings
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // Connection timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,    // 5 seconds
      socketTimeout: 10000,     // 10 seconds
      // Retry settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      // TLS settings for Gmail
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration with enhanced logging
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      logger.info('🔧 EMAIL SERVICE - Testing connection...', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        timestamp: new Date().toISOString()
      });

      const success = await this.transporter.verify();
      
      if (success) {
        logger.info('✅ EMAIL SERVICE - Connection successful', {
          message: 'Server is ready to take our messages',
          host: process.env.EMAIL_HOST,
          timestamp: new Date().toISOString()
        });
        this.isConnected = true;
      } else {
        logger.error('❌ EMAIL SERVICE - Connection verification failed');
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('❌ EMAIL SERVICE - Connection error', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        timestamp: new Date().toISOString()
      });
      this.isConnected = false;
      
      // Set a flag to retry connection later
      setTimeout(() => {
        this.verifyConnection();
      }, 30000); // Retry after 30 seconds
    }
  }

  async sendEnquiryConfirmation(enquiryData) {
    try {
      // Check if email service is connected
      if (!this.isConnected) {
        logger.warn('⚠️ EMAIL SERVICE - Skipping email send (service not connected)', {
          reason: 'Email service connection failed',
          enquiryData: enquiryData
        });
        return {
          success: false,
          message: 'Email service not available',
          messageId: null
        };
      }

      const { name, email, mobile, describe, monthlyLoad } = enquiryData;

      const mailOptions = {
        from: `"Shipsarthi Solutions" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Thank you for your enquiry - Shipsarthi Solutions',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enquiry Confirmation - Shipsarthi</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .title { font-size: 28px; margin: 0; }
              .subtitle { font-size: 16px; opacity: 0.9; margin: 10px 0 0 0; }
              .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .next-steps { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
              .contact-info { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🚢 Shipsarthi</div>
                <h1 class="title">Thank You for Your Enquiry!</h1>
                <p class="subtitle">Your Trusted Partner in Every Shipment</p>
              </div>
              
              <div class="content">
                <p>Dear <strong>${name}</strong>,</p>
                
                <p>Thank you for reaching out to Shipsarthi Solutions! We have received your enquiry and our team will get back to you within 24 hours.</p>
                
                <div class="details">
                  <h3 style="margin-top: 0; color: #333;">Your Enquiry Details:</h3>
                  <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${email}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Mobile:</span>
                    <span class="detail-value">${mobile}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Business Type:</span>
                    <span class="detail-value">${describe}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Monthly Load:</span>
                    <span class="detail-value">${monthlyLoad}</span>
                  </div>
                </div>
                
                <div class="next-steps">
                  <h3 style="margin-top: 0; color: #2196F3;">What's Next?</h3>
                  <ul>
                    <li>Our logistics expert will review your requirements</li>
                    <li>We'll prepare a customized shipping solution for your business</li>
                    <li>You'll receive a detailed proposal with competitive rates</li>
                    <li>We'll schedule a call to discuss your specific needs</li>
                  </ul>
                </div>
                
                <div class="contact-info">
                  <h3 style="margin-top: 0; color: #333;">Need Immediate Assistance?</h3>
                  <p>Feel free to reach out to us:</p>
                  <p><strong>📞 Phone:</strong> +91-XXXXXXXXXX</p>
                  <p><strong>📧 Email:</strong> support@shipsarthi.com</p>
                  <p><strong>🌐 Website:</strong> www.shipsarthi.com</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://www.shipsarthi.com" class="btn">Visit Our Website</a>
                  <a href="https://www.shipsarthi.com/tracking" class="btn">Track Shipment</a>
                </div>
                
                <p>Thank you for choosing Shipsarthi Solutions. We look forward to serving your logistics needs!</p>
                
                <div class="footer">
                  <p><strong>Shipsarthi Solutions</strong><br>
                  Your Trusted Sarthi in Every Shipment</p>
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Enquiry confirmation email sent', {
        to: email,
        name: name,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send enquiry confirmation email', {
        error: error.message,
        enquiryData: enquiryData
      });
      throw error;
    }
  }

  async sendEnquiryNotification(enquiryData) {
    try {
      // Check if email service is connected
      if (!this.isConnected) {
        logger.warn('⚠️ EMAIL SERVICE - Skipping notification email (service not connected)', {
          reason: 'Email service connection failed',
          enquiryData: enquiryData
        });
        return {
          success: false,
          message: 'Email service not available',
          messageId: null
        };
      }

      const { name, email, mobile, describe, monthlyLoad } = enquiryData;

      const mailOptions = {
        from: `"Shipsarthi Solutions" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Send to company email
        subject: `New Enquiry from ${name} - Shipsarthi Website`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Enquiry - Shipsarthi</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .priority { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 New Website Enquiry</h1>
                <p>Immediate attention required</p>
              </div>
              
              <div class="content">
                <div class="priority">
                  <h3>⚠️ Action Required</h3>
                  <p>A new enquiry has been submitted through the website. Please respond within 24 hours.</p>
                </div>
                
                <div class="details">
                  <h3>Enquiry Details:</h3>
                  <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${email}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Mobile:</span>
                    <span class="detail-value">${mobile}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Business Type:</span>
                    <span class="detail-value">${describe}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Monthly Load:</span>
                    <span class="detail-value">${monthlyLoad}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Submitted:</span>
                    <span class="detail-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                  </div>
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Review the enquiry details</li>
                  <li>Prepare a customized proposal</li>
                  <li>Contact the customer within 24 hours</li>
                  <li>Follow up with detailed information</li>
                </ul>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Enquiry notification email sent to company', {
        from: name,
        email: email,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      logger.error('Failed to send enquiry notification email', {
        error: error.message,
        enquiryData: enquiryData
      });
      throw error;
    }
  }
}

module.exports = new EmailService();
