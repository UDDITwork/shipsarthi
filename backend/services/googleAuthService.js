const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class GoogleAuthService {
  // Verify Google token with reduced timeout
  async verifyGoogleToken(token) {
    const startTime = Date.now();
    try {
      // Reduced timeout to 5 seconds for faster failure
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Google token verification timeout')), 5000);
      });

      logger.debug('Verifying Google token...', { 
        clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...' 
      });

      const verificationPromise = client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const ticket = await Promise.race([verificationPromise, timeoutPromise]);
      
      const payload = ticket.getPayload();
      
      logger.debug('Google token verified successfully', {
        email: payload.email,
        duration: `${Date.now() - startTime}ms`
      });
      
      // Validate required fields
      if (!payload.email) {
        return {
          success: false,
          error: 'Email not provided by Google'
        };
      }
      
      return {
        success: true,
        payload: {
          email: payload.email,
          name: payload.name || 'Google User',
          picture: payload.picture,
          email_verified: payload.email_verified === true,
          google_id: payload.sub
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Google token verification failed', { 
        error: error.message,
        duration: `${duration}ms`,
        isTimeout: error.message.includes('timeout')
      });
      return {
        success: false,
        error: error.message.includes('timeout') 
          ? 'Google verification timed out. Please try again.'
          : error.message
      };
    }
  }

  // Find user by Google email or ID
  async findGoogleUser(googleData) {
    const startTime = Date.now();
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        logger.error('Database not connected in findGoogleUser', {
          dbState: mongoose.connection.readyState
        });
        return {
          success: false,
          error: 'Database is not connected'
        };
      }

      logger.debug('Finding Google user...', { email: googleData.email });

      // Optimized query with field selection and timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const findPromise = User.findOne({ 
        $or: [
          { email: googleData.email },
          { google_id: googleData.google_id }
        ]
      }).select('google_id auth_provider email email_verified phone_verified avatar_url account_status locked_until').maxTimeMS(5000);
      
      const user = await Promise.race([findPromise, timeoutPromise]);

      logger.debug('Google user search completed', {
        found: !!user,
        duration: `${Date.now() - startTime}ms`
      });

      if (user) {
        // Update Google info if needed
        if (!user.google_id || !user.auth_provider) {
          user.google_id = googleData.google_id;
          user.email_verified = true;
          if (googleData.picture && !user.avatar_url) {
            user.avatar_url = googleData.picture;
          }
          if (!user.auth_provider) {
            user.auth_provider = 'google';
          }
          await user.save();
          logger.debug('Updated user Google info', { userId: user._id });
        }
        
        return {
          success: true,
          user,
          isNewUser: false
        };
      }

      return {
        success: false,
        error: 'User not found',
        user: null
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error in findGoogleUser', {
        error: error.message,
        duration: `${duration}ms`,
        isTimeout: error.message.includes('timeout')
      });
      return {
        success: false,
        error: error.message.includes('timeout')
          ? 'Database operation timed out. Please try again.'
          : error.message
      };
    }
  }

  // Find or create user from Google data
  async findOrCreateGoogleUser(googleData, additionalData = {}) {
    const startTime = Date.now();
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        logger.error('Database not connected in findOrCreateGoogleUser', {
          dbState: mongoose.connection.readyState
        });
        return {
          success: false,
          error: 'Database is not connected'
        };
      }

      logger.debug('Finding or creating Google user...', { email: googleData.email });

      // Optimized query with field selection and timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const findPromise = User.findOne({ email: googleData.email })
        .select('google_id auth_provider email email_verified phone_verified avatar_url account_status locked_until')
        .maxTimeMS(5000);
      let user = await Promise.race([findPromise, timeoutPromise]);

      if (user) {
        logger.debug('Existing user found', {
          userId: user._id,
          duration: `${Date.now() - startTime}ms`
        });

        // Update Google info if needed
        if (!user.google_id || !user.auth_provider) {
          user.google_id = googleData.google_id;
          user.email_verified = true;
          if (googleData.picture && !user.avatar_url) {
            user.avatar_url = googleData.picture;
          }
          if (!user.auth_provider) {
            user.auth_provider = 'google';
          }
          await user.save();
          logger.debug('Updated existing user Google info', { userId: user._id });
        }
        
        return {
          success: true,
          user,
          isNewUser: false
        };
      }

      // Create new user
      logger.debug('Creating new Google user...', { email: googleData.email });

      const randomPassword = crypto.randomBytes(32).toString('hex');

      const userData = {
        email: googleData.email,
        your_name: googleData.name || additionalData.your_name || 'Google User',
        company_name: additionalData.company_name || `${googleData.name || 'User'}'s Company`,
        user_type: additionalData.user_type || 'individual-shippers',
        monthly_shipments: additionalData.monthly_shipments || '10-300',
        state: additionalData.state || 'Not Specified',
        phone_number: additionalData.phone_number || '0000000000', // Required field
        password: randomPassword,
        terms_accepted: true,
        google_id: googleData.google_id,
        email_verified: true,
        avatar_url: googleData.picture,
        auth_provider: 'google',
        account_status: 'active',
        phone_verified: false
      };

      user = new User(userData);
      await user.save();

      logger.info('New Google user created successfully', {
        userId: user._id,
        email: user.email,
        duration: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        user,
        isNewUser: true
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error in findOrCreateGoogleUser', {
        error: error.message,
        duration: `${duration}ms`,
        code: error.code,
        name: error.name,
        isTimeout: error.message.includes('timeout')
      });

      // Handle specific errors
      if (error.code === 11000) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      if (error.name === 'ValidationError') {
        return {
          success: false,
          error: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
        };
      }

      if (error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Database operation timed out. Please try again.'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate JWT token for user
  generateToken(user) {
    return jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }
}

module.exports = new GoogleAuthService();

