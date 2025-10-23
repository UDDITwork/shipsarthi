const https = require('https');
const logger = require('../utils/logger');

class MSG91Service {
  constructor() {
    this.baseUrl = 'control.msg91.com';
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.templateId = process.env.MSG91_TEMPLATE_ID || 'MSG91_TEMPLATE_ID';
    this.otpExpiry = process.env.MSG91_OTP_EXPIRY || '5'; // 5 minutes
  }

  /**
   * Send OTP to mobile number
   * @param {string} mobile - Mobile number (10 digits)
   * @param {Object} params - Additional parameters for template
   * @returns {Promise<Object>} Response from MSG91
   */
  async sendOTP(mobile, params = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp?otp_expiry=${this.otpExpiry}&template_id=${this.templateId}&mobile=${mobile}&authkey=${this.authKey}&realTimeResponse=1`,
        headers: {
          'content-type': 'application/json',
          'Content-Type': 'application/JSON'
        }
      };

      const requestData = {
        Param1: params.param1 || 'value1',
        Param2: params.param2 || 'value2',
        Param3: params.param3 || 'value3'
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            logger.info('MSG91 Send OTP Response', {
              mobile,
              status: res.statusCode,
              response: response
            });

            if (res.statusCode === 200 && response.type === 'success') {
              resolve({
                success: true,
                message: 'OTP sent successfully',
                requestId: response.request_id,
                mobile: mobile
              });
            } else {
              reject({
                success: false,
                message: response.message || 'Failed to send OTP',
                error: response
              });
            }
          } catch (error) {
            logger.error('MSG91 Send OTP Parse Error', {
              mobile,
              error: error.message,
              response: body.toString()
            });
            reject({
              success: false,
              message: 'Failed to parse response',
              error: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        logger.error('MSG91 Send OTP Request Error', {
          mobile,
          error: error.message
        });
        reject({
          success: false,
          message: 'Network error',
          error: error.message
        });
      });

      req.write(JSON.stringify(requestData));
      req.end();
    });
  }

  /**
   * Verify OTP
   * @param {string} mobile - Mobile number
   * @param {string} otp - OTP to verify
   * @returns {Promise<Object>} Response from MSG91
   */
  async verifyOTP(mobile, otp) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp/verify?otp=${otp}&mobile=${mobile}`,
        headers: {
          authkey: this.authKey
        }
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            logger.info('MSG91 Verify OTP Response', {
              mobile,
              status: res.statusCode,
              response: response
            });

            if (res.statusCode === 200 && response.type === 'success') {
              resolve({
                success: true,
                message: 'OTP verified successfully',
                mobile: mobile
              });
            } else {
              resolve({
                success: false,
                message: response.message || 'Invalid OTP',
                error: response
              });
            }
          } catch (error) {
            logger.error('MSG91 Verify OTP Parse Error', {
              mobile,
              error: error.message,
              response: body.toString()
            });
            reject({
              success: false,
              message: 'Failed to parse response',
              error: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        logger.error('MSG91 Verify OTP Request Error', {
          mobile,
          error: error.message
        });
        reject({
          success: false,
          message: 'Network error',
          error: error.message
        });
      });

      req.end();
    });
  }

  /**
   * Resend OTP
   * @param {string} mobile - Mobile number
   * @param {string} retryType - Type of retry (sms or voice)
   * @returns {Promise<Object>} Response from MSG91
   */
  async resendOTP(mobile, retryType = 'sms') {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp/retry?authkey=${this.authKey}&retrytype=${retryType}&mobile=${mobile}`,
        headers: {}
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            logger.info('MSG91 Resend OTP Response', {
              mobile,
              retryType,
              status: res.statusCode,
              response: response
            });

            if (res.statusCode === 200 && response.type === 'success') {
              resolve({
                success: true,
                message: 'OTP resent successfully',
                mobile: mobile,
                retryType: retryType
              });
            } else {
              reject({
                success: false,
                message: response.message || 'Failed to resend OTP',
                error: response
              });
            }
          } catch (error) {
            logger.error('MSG91 Resend OTP Parse Error', {
              mobile,
              retryType,
              error: error.message,
              response: body.toString()
            });
            reject({
              success: false,
              message: 'Failed to parse response',
              error: error.message
            });
          }
        });
      });

      req.on('error', (error) => {
        logger.error('MSG91 Resend OTP Request Error', {
          mobile,
          retryType,
          error: error.message
        });
        reject({
          success: false,
          message: 'Network error',
          error: error.message
        });
      });

      req.end();
    });
  }

  /**
   * Validate mobile number format
   * @param {string} mobile - Mobile number to validate
   * @returns {boolean} True if valid
   */
  validateMobile(mobile) {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(mobile);
  }

  /**
   * Format mobile number for MSG91 (add country code if needed)
   * @param {string} mobile - Mobile number
   * @returns {string} Formatted mobile number
   */
  formatMobile(mobile) {
    // Remove any non-digit characters
    const cleaned = mobile.replace(/\D/g, '');
    
    // If it's 10 digits, add country code
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    // If it already has country code, return as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    return cleaned;
  }
}

module.exports = new MSG91Service();
