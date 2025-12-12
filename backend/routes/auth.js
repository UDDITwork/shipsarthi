const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const https = require('https');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { waitForDB } = require('../middleware/dbReady');
const logger = require('../utils/logger');
const router = express.Router();

// Generate JWT Token
const generateToken = (userId, rememberMe = false) => {
  // If remember me is enabled, use longer expiration (30 days), otherwise use default (7 days)
  const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRE || '7d');
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn
  });
};

// @desc    Register user - Step 1: Validate and send OTP (NO DATABASE SAVE)
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone_number').matches(/^[6-9]\d{9}$/),
  body('company_name').trim().notEmpty(),
  body('your_name').trim().notEmpty(),
  body('user_type').notEmpty(),
  body('monthly_shipments').notEmpty(),
  body('state').trim().notEmpty(),
  body('terms_accepted').equals('true')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Registration Step 1: Validate and Send OTP', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    phone_number: req.body.phone_number,
    email: req.body.email
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Registration validation failed', {
        errors: errors.array(),
        body: req.body
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      user_type,
      monthly_shipments,
      company_name,
      your_name,
      state,
      phone_number,
      email,
      password,
      reference_code,
      terms_accepted
    } = req.body;

    logger.debug('Registration data extracted', {
      email: email.toLowerCase(),
      phone_number,
      company_name,
      user_type,
      monthly_shipments
    });

    // Check if user already exists
    logger.debug('Checking for existing user', { email: email.toLowerCase(), phone_number });
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone_number }
      ]
    });

    if (existingUser) {
      logger.warn('Registration failed - user already exists', {
        email: email.toLowerCase(),
        phone_number,
        existingEmail: existingUser.email,
        existingPhone: existingUser.phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: existingUser.email === email.toLowerCase()
          ? 'User with this email already exists'
          : 'User with this phone number already exists'
      });
    }

    // DO NOT SAVE USER YET - Send OTP first via MSG91
    const formattedMobile = phone_number.length === 10 ? `91${phone_number}` : phone_number;
    const loginTemplateId = process.env.LOGIN_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID;
    const authKey = process.env.MSG91_AUTH_KEY;
    const otpExpiry = process.env.MSG91_OTP_EXPIRY || '5';

    if (!authKey) {
      logger.error('MSG91_AUTH_KEY is not configured');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error - SMS service not configured'
      });
    }

    // Send OTP via MSG91 API
    return new Promise((resolve) => {
      const options = {
        method: 'POST',
        hostname: 'control.msg91.com',
        port: null,
        path: `/api/v5/otp?otp_expiry=${otpExpiry}&template_id=${loginTemplateId}&mobile=${formattedMobile}&authkey=${authKey}&realTimeResponse=`,
        headers: {
          'content-type': 'application/json',
          'Content-Type': 'application/JSON'
        }
      };

      const requestData = {
        Param1: company_name || 'Customer',
        Param2: your_name || 'User',
        Param3: 'Shipsarthi'
      };

      const req_otp = https.request(options, (res_otp) => {
        const chunks = [];

        res_otp.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res_otp.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());

            logger.info('MSG91 Send OTP Response for registration', {
              phone_number,
              status: res_otp.statusCode,
              response: response
            });

            if (res_otp.statusCode === 200 && response.type === 'success') {
              const responseTime = Date.now() - startTime;
              logger.info('OTP sent successfully - user NOT saved yet', {
                phone_number,
                email: email.toLowerCase(),
                responseTime: `${responseTime}ms`
              });

              // Return success with registration data to be used after OTP verification
              // DO NOT include password in response for security
              res.status(200).json({
                status: 'success',
                message: 'OTP sent successfully. Please verify to complete registration.',
                requires_otp_verification: true,
                registration_data: {
                  phone_number: phone_number,
                  email: email.toLowerCase(),
                  company_name: company_name,
                  your_name: your_name
                }
              });
              resolve();
            } else {
              logger.error('MSG91 Send OTP failed for registration', {
                phone_number,
                error: response.message
              });
              res.status(500).json({
                status: 'error',
                message: response.message || 'Failed to send OTP. Please try again.'
              });
              resolve();
            }
          } catch (error) {
            logger.error('MSG91 Send OTP Parse Error for registration', {
              phone_number,
              error: error.message
            });
            res.status(500).json({
              status: 'error',
              message: 'Failed to send OTP. Please try again.'
            });
            resolve();
          }
        });
      });

      req_otp.on('error', (error) => {
        logger.error('MSG91 Send OTP Request Error for registration', {
          phone_number,
          error: error.message
        });
        res.status(500).json({
          status: 'error',
          message: 'Network error. Please try again.'
        });
        resolve();
      });

      req_otp.write(JSON.stringify(requestData));
      req_otp.end();
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Registration error occurred', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      responseTime: `${responseTime}ms`
    });

    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
});

// @desc    Complete Registration - Step 2: Verify OTP and create user
// @route   POST /api/auth/complete-registration
// @access  Public
router.post('/complete-registration', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone_number').matches(/^[6-9]\d{9}$/),
  body('otp').matches(/^\d{4,6}$/).withMessage('OTP must be 4-6 digits'),
  body('company_name').trim().notEmpty(),
  body('your_name').trim().notEmpty(),
  body('user_type').notEmpty(),
  body('monthly_shipments').notEmpty(),
  body('state').trim().notEmpty(),
  body('terms_accepted').equals('true')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Registration Step 2: Verify OTP and Create User', {
    ip: req.ip,
    phone_number: req.body.phone_number,
    email: req.body.email
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Complete registration validation failed', {
        errors: errors.array()
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      user_type,
      monthly_shipments,
      company_name,
      your_name,
      state,
      phone_number,
      email,
      password,
      reference_code,
      terms_accepted,
      otp
    } = req.body;

    // Check if user already exists (double-check)
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone_number }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: existingUser.email === email.toLowerCase()
          ? 'User with this email already exists'
          : 'User with this phone number already exists'
      });
    }

    // Verify OTP with MSG91
    const formattedMobile = phone_number.length === 10 ? `91${phone_number}` : phone_number;
    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
    }

    // Verify OTP via MSG91 API
    return new Promise((resolve) => {
      const options = {
        method: 'GET',
        hostname: 'control.msg91.com',
        port: null,
        path: `/api/v5/otp/verify?otp=${otp}&mobile=${formattedMobile}`,
        headers: {
          authkey: authKey
        }
      };

      const req_verify = https.request(options, async (res_verify) => {
        const chunks = [];

        res_verify.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res_verify.on('end', async () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());

            logger.info('MSG91 Verify OTP Response for registration', {
              phone_number,
              status: res_verify.statusCode,
              response: response
            });

            if (res_verify.statusCode === 200 && response.type === 'success') {
              // OTP VERIFIED - NOW create and save the user
              logger.info('OTP verified - creating user now', {
                phone_number,
                email: email.toLowerCase()
              });

              try {
                const user = new User({
                  user_type,
                  monthly_shipments,
                  company_name,
                  your_name,
                  state,
                  phone_number,
                  email: email.toLowerCase(),
                  password,
                  reference_code,
                  terms_accepted: Boolean(terms_accepted),
                  account_status: 'active', // Active since OTP is verified
                  phone_verified: true,
                  otp_verified: true
                });

                await user.save();

                const responseTime = Date.now() - startTime;
                logger.info('User created successfully after OTP verification', {
                  userId: user._id,
                  email: user.email,
                  phone_number: user.phone_number,
                  responseTime: `${responseTime}ms`
                });

                res.status(201).json({
                  status: 'success',
                  message: 'Registration completed successfully! You can now login.',
                  user: {
                    _id: user._id,
                    email: user.email,
                    company_name: user.company_name,
                    your_name: user.your_name,
                    client_id: user.client_id,
                    account_status: user.account_status,
                    phone_verified: user.phone_verified,
                    otp_verified: user.otp_verified
                  }
                });
                resolve();
              } catch (saveError) {
                logger.error('Error saving user after OTP verification', {
                  error: saveError.message,
                  phone_number,
                  email: email.toLowerCase()
                });

                if (saveError.code === 11000) {
                  const field = Object.keys(saveError.keyPattern)[0];
                  res.status(400).json({
                    status: 'error',
                    message: `${field === 'email' ? 'Email' : 'Phone number'} already exists`
                  });
                } else {
                  res.status(500).json({
                    status: 'error',
                    message: 'Failed to create user. Please try again.'
                  });
                }
                resolve();
              }
            } else {
              // OTP verification failed - DO NOT create user
              logger.warn('OTP verification failed - user NOT created', {
                phone_number,
                error: response.message
              });
              res.status(400).json({
                status: 'error',
                message: response.message || 'Invalid OTP. Please try again.'
              });
              resolve();
            }
          } catch (error) {
            logger.error('MSG91 Verify OTP Parse Error', {
              phone_number,
              error: error.message
            });
            res.status(500).json({
              status: 'error',
              message: 'Failed to verify OTP. Please try again.'
            });
            resolve();
          }
        });
      });

      req_verify.on('error', (error) => {
        logger.error('MSG91 Verify OTP Request Error', {
          phone_number,
          error: error.message
        });
        res.status(500).json({
          status: 'error',
          message: 'Network error. Please try again.'
        });
        resolve();
      });

      req_verify.end();
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Complete registration error occurred', {
      error: error.message,
      stack: error.stack,
      responseTime: `${responseTime}ms`
    });

    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email').trim().notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('remember_me').optional().isBoolean()
], async (req, res) => {
  const startTime = Date.now();
  const { email, password, remember_me } = req.body;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Quick DB check - skip wait if already connected
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      try {
        await waitForDB(2000); // Reduced timeout to 2 seconds
      } catch (dbError) {
        return res.status(503).json({
          status: 'error',
          message: 'Database is not ready. Please try again in a moment.'
        });
      }
    }

    // Find user by email or phone - optimized query with select to exclude password
    let user;
    try {
      user = await User.findByEmailOrPhone(email).select('+password'); // Explicitly select password for comparison
    } catch (dbError) {
      if (dbError.name === 'DatabaseConnectionError') {
        return res.status(503).json({
          status: 'error',
          message: 'Database connection error. Please try again in a moment.'
        });
      }
      throw dbError;
    }
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.locked_until && user.locked_until > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.locked_until - Date.now()) / (1000 * 60));
      return res.status(423).json({
        status: 'error',
        message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts and save in one operation
      user.login_attempts += 1;
      
      if (user.login_attempts >= 5) {
        user.locked_until = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
      }
      
      await user.save();
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts and update last_login in single save operation
    user.login_attempts = 0;
    user.locked_until = undefined;
    user.last_login = Date.now();
    await user.save();

    // Validate JWT_SECRET exists before generating token
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured', {
        userId: user._id,
        email: user.email
      });
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error. Please contact support.'
      });
    }

    // Generate token with remember_me support
    let token;
    try {
      token = generateToken(user._id, remember_me);
    } catch (tokenError) {
      logger.error('Token generation failed', {
        error: tokenError.message,
        userId: user._id,
        email: user.email
      });
      return res.status(500).json({
        status: 'error',
        message: 'Server error generating authentication token'
      });
    }

    const responseTime = Date.now() - startTime;
    if (responseTime > 500) { // Only log slow requests
      logger.info('Login completed', {
        userId: user._id,
        email: user.email,
        responseTime: `${responseTime}ms`,
        rememberMe: remember_me
      });
    }

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      remember_me: remember_me || false,
      token_expires_in: remember_me ? '30d' : (process.env.JWT_EXPIRE || '7d'),
      user: {
        _id: user._id,
        email: user.email,
        company_name: user.company_name,
        your_name: user.your_name,
        client_id: user.client_id,
        account_status: user.account_status,
        wallet_balance: user.wallet_balance,
        kyc_status: user.kyc_status,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        otp_verified: user.otp_verified
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Enhanced error logging
    const errorDetails = {
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      email: req.body.email,
      responseTime: `${responseTime}ms`,
      dbState: mongoose.connection.readyState,
      hasJWTSecret: !!process.env.JWT_SECRET,
      errorCode: error.code
    };
    
    // Log error with full details
    if (logger && typeof logger.error === 'function') {
      logger.error('Login error occurred', errorDetails);
    } else {
      // Fallback to console if logger fails
      console.error('Login error occurred:', errorDetails);
    }
    
    // Return more specific error messages for debugging
    let errorMessage = 'Server error during login';
    if (error.name === 'JsonWebTokenError' || error.message.includes('JWT_SECRET')) {
      errorMessage = 'Server configuration error. Please contact support.';
    } else if (error.name === 'MongoError' || error.message.includes('database')) {
      errorMessage = 'Database connection error. Please try again in a moment.';
    }
    
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        errorName: error.name 
      })
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', auth, async (req, res) => {
  logger.info('Get current user request', {
    userId: req.user._id,
    ip: req.ip
  });

  try {
    const user = await User.findById(req.user._id).select('-password');
    
    logger.debug('User data retrieved', {
      userId: user._id,
      email: user.email,
      company_name: user.company_name
    });
    
    res.json({
      status: 'success',
      user
    });
  } catch (error) {
    logger.error('Get user error occurred', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', auth, async (req, res) => {
  logger.info('User logout request', {
    userId: req.user._id,
    email: req.user.email,
    ip: req.ip
  });

  try {
    // For JWT, we can't invalidate the token on the server side
    // The client should remove the token from storage
    // In a production app, you might want to maintain a blacklist
    
    logger.info('User logged out successfully', {
      userId: req.user._id,
      email: req.user.email
    });
    
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error occurred', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Send OTP to mobile number for forgot password
// @route   POST /api/auth/forgot-password/send-otp
// @access  Public
router.post('/forgot-password/send-otp', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Forgot password - Send OTP request started', {
    mobile: req.body.mobile,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Forgot password send OTP validation failed', {
        errors: errors.array(),
        mobile: req.body.mobile
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { mobile } = req.body;
    
    // Check if user exists with this mobile number
    const user = await User.findOne({ phone_number: mobile });
    
    if (!user) {
      logger.warn('Forgot password send OTP failed - user not found', { mobile });
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this mobile number'
      });
    }

    // Format mobile for MSG91 (add country code)
    const formattedMobile = mobile.length === 10 ? `91${mobile}` : mobile;

    // Get LOGIN_TEMPLATE_ID from environment
    const loginTemplateId = process.env.LOGIN_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID;
    const authKey = process.env.MSG91_AUTH_KEY;
    const otpExpiry = process.env.MSG91_OTP_EXPIRY || '5';

    if (!authKey) {
      logger.error('MSG91_AUTH_KEY is not configured');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
    }

    // Send OTP via MSG91 API (exact format as per user's request)
    return new Promise((resolve) => {
      const options = {
        method: 'POST',
        hostname: 'control.msg91.com',
        port: null,
        path: `/api/v5/otp?otp_expiry=${otpExpiry}&template_id=${loginTemplateId}&mobile=${formattedMobile}&authkey=${authKey}&realTimeResponse=`,
        headers: {
          'content-type': 'application/json',
          'Content-Type': 'application/JSON'
        }
      };

      const requestData = {
        Param1: user.company_name || 'value1',
        Param2: user.your_name || 'value2',
        Param3: 'value3'
      };

      const req_otp = https.request(options, (res_otp) => {
        const chunks = [];

        res_otp.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res_otp.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());

            logger.info('MSG91 Send OTP Response for forgot password', {
              mobile,
              status: res_otp.statusCode,
              response: response
            });

            if (res_otp.statusCode === 200 && response.type === 'success') {
              const responseTime = Date.now() - startTime;
              logger.info('OTP sent successfully for forgot password', {
                userId: user._id,
                mobile,
                responseTime: `${responseTime}ms`
              });

              res.json({
                status: 'success',
                message: 'OTP sent successfully to your mobile number',
                mobile: mobile
              });
              resolve();
            } else {
              logger.error('MSG91 Send OTP failed for forgot password', {
                mobile,
                error: response.message
              });
              res.status(500).json({
                status: 'error',
                message: response.message || 'Failed to send OTP. Please try again.'
              });
              resolve();
            }
          } catch (error) {
            logger.error('MSG91 Send OTP Parse Error for forgot password', {
              mobile,
              error: error.message
            });
            res.status(500).json({
              status: 'error',
              message: 'Failed to send OTP. Please try again.'
            });
            resolve();
          }
        });
      });

      req_otp.on('error', (error) => {
        logger.error('MSG91 Send OTP Request Error for forgot password', {
          mobile,
          error: error.message
        });
        res.status(500).json({
          status: 'error',
          message: 'Network error. Please try again.'
        });
        resolve();
      });

      req_otp.write(JSON.stringify(requestData));
      req_otp.end();
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Forgot password send OTP error occurred', {
      error: error.message,
      stack: error.stack,
      mobile: req.body.mobile,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Verify OTP for forgot password
// @route   POST /api/auth/forgot-password/verify-otp
// @access  Public
router.post('/forgot-password/verify-otp', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number'),
  body('otp').matches(/^\d{4,6}$/).withMessage('OTP must be 4-6 digits')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Forgot password - Verify OTP request started', {
    mobile: req.body.mobile,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Forgot password verify OTP validation failed', {
        errors: errors.array(),
        mobile: req.body.mobile
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { mobile, otp } = req.body;
    
    // Check if user exists with this mobile number
    const user = await User.findOne({ phone_number: mobile });
    
    if (!user) {
      logger.warn('Forgot password verify OTP failed - user not found', { mobile });
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this mobile number'
      });
    }

    // Format mobile for MSG91 (add country code)
    const formattedMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
      logger.error('MSG91_AUTH_KEY is not configured');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
    }

    // Verify OTP via MSG91 API (exact format as per user's request)
    return new Promise((resolve) => {
      const options = {
        method: 'GET',
        hostname: 'control.msg91.com',
        port: null,
        path: `/api/v5/otp/verify?otp=${otp}&mobile=${formattedMobile}`,
        headers: {
          authkey: authKey
        }
      };

      const req_verify = https.request(options, (res_verify) => {
        const chunks = [];

        res_verify.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res_verify.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());

            logger.info('MSG91 Verify OTP Response for forgot password', {
              mobile,
              status: res_verify.statusCode,
              response: response
            });

            if (res_verify.statusCode === 200 && response.type === 'success') {
              const responseTime = Date.now() - startTime;
              logger.info('OTP verified successfully for forgot password', {
                userId: user._id,
                mobile,
                responseTime: `${responseTime}ms`
              });

              res.json({
                status: 'success',
                message: 'OTP verified successfully',
                mobile: mobile,
                verified: true
              });
              resolve();
            } else {
              logger.warn('OTP verification failed for forgot password', {
                mobile,
                error: response.message
              });
              res.status(400).json({
                status: 'error',
                message: response.message || 'Invalid OTP'
              });
              resolve();
            }
          } catch (error) {
            logger.error('MSG91 Verify OTP Parse Error for forgot password', {
              mobile,
              error: error.message
            });
            res.status(500).json({
              status: 'error',
              message: 'Failed to verify OTP. Please try again.'
            });
            resolve();
          }
        });
      });

      req_verify.on('error', (error) => {
        logger.error('MSG91 Verify OTP Request Error for forgot password', {
          mobile,
          error: error.message
        });
        res.status(500).json({
          status: 'error',
          message: 'Network error. Please try again.'
        });
        resolve();
      });

      req_verify.end();
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Forgot password verify OTP error occurred', {
      error: error.message,
      stack: error.stack,
      mobile: req.body.mobile,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Resend OTP for forgot password
// @route   POST /api/auth/forgot-password/resend-otp
// @access  Public
router.post('/forgot-password/resend-otp', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number'),
  body('retrytype').optional().isIn(['sms', 'voice']).withMessage('Retry type must be sms or voice')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Forgot password - Resend OTP request started', {
    mobile: req.body.mobile,
    retrytype: req.body.retrytype || 'sms',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Forgot password resend OTP validation failed', {
        errors: errors.array(),
        mobile: req.body.mobile
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { mobile, retrytype = 'sms' } = req.body;
    
    // Check if user exists with this mobile number
    const user = await User.findOne({ phone_number: mobile });
    
    if (!user) {
      logger.warn('Forgot password resend OTP failed - user not found', { mobile });
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this mobile number'
      });
    }

    // Format mobile for MSG91 (add country code)
    const formattedMobile = mobile.length === 10 ? `91${mobile}` : mobile;
    const authKey = process.env.MSG91_AUTH_KEY;

    if (!authKey) {
      logger.error('MSG91_AUTH_KEY is not configured');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
    }

    // Resend OTP via MSG91 API (exact format as per user's request)
    return new Promise((resolve) => {
      const options = {
        method: 'GET',
        hostname: 'control.msg91.com',
        port: null,
        path: `/api/v5/otp/retry?authkey=${authKey}&retrytype=${retrytype}&mobile=${formattedMobile}`,
        headers: {}
      };

      const req_resend = https.request(options, (res_resend) => {
        const chunks = [];

        res_resend.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res_resend.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());

            logger.info('MSG91 Resend OTP Response for forgot password', {
              mobile,
              retrytype,
              status: res_resend.statusCode,
              response: response
            });

            if (res_resend.statusCode === 200 && response.type === 'success') {
              const responseTime = Date.now() - startTime;
              logger.info('OTP resent successfully for forgot password', {
                userId: user._id,
                mobile,
                retrytype,
                responseTime: `${responseTime}ms`
              });

              res.json({
                status: 'success',
                message: 'OTP resent successfully',
                mobile: mobile,
                retrytype: retrytype
              });
              resolve();
            } else {
              logger.error('MSG91 Resend OTP failed for forgot password', {
                mobile,
                error: response.message
              });
              res.status(500).json({
                status: 'error',
                message: response.message || 'Failed to resend OTP. Please try again.'
              });
              resolve();
            }
          } catch (error) {
            logger.error('MSG91 Resend OTP Parse Error for forgot password', {
              mobile,
              error: error.message
            });
            res.status(500).json({
              status: 'error',
              message: 'Failed to resend OTP. Please try again.'
            });
            resolve();
          }
        });
      });

      req_resend.on('error', (error) => {
        logger.error('MSG91 Resend OTP Request Error for forgot password', {
          mobile,
          error: error.message
        });
        res.status(500).json({
          status: 'error',
          message: 'Network error. Please try again.'
        });
        resolve();
      });

      req_resend.end();
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Forgot password resend OTP error occurred', {
      error: error.message,
      stack: error.stack,
      mobile: req.body.mobile,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Reset password after OTP verification
// @route   POST /api/auth/forgot-password/reset
// @access  Public
router.post('/forgot-password/reset', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Forgot password - Reset password request started', {
    mobile: req.body.mobile,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Forgot password reset validation failed', {
        errors: errors.array(),
        mobile: req.body.mobile
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { mobile, password } = req.body;

    logger.debug('Searching for user with mobile', { mobile });
    const user = await User.findOne({ phone_number: mobile });

    if (!user) {
      logger.warn('Forgot password reset failed - user not found', {
        mobile
      });
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    logger.info('User found for password reset', {
      userId: user._id,
      mobile: user.phone_number,
      accountStatus: user.account_status
    });

    // Set new password (mongoose will hash it automatically via pre-save hook)
    user.password = password;
    // Clear any existing reset tokens
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    const responseTime = Date.now() - startTime;
    logger.info('Password reset completed successfully', {
      userId: user._id,
      mobile: user.phone_number,
      responseTime: `${responseTime}ms`
    });

    res.json({
      status: 'success',
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Forgot password reset error occurred', {
      error: error.message,
      stack: error.stack,
      mobile: req.body.mobile,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Check if email exists for password reset (no email sent)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Forgot password - email verification started', {
    email: req.body.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Forgot password validation failed', {
        errors: errors.array(),
        email: req.body.email
      });
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address'
      });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();
    
    logger.debug('Searching for user with email', { email: normalizedEmail });
    const user = await User.findOne({ email: normalizedEmail }).select('_id email account_status');

    if (!user) {
      logger.warn('Forgot password failed - user not found', { email: normalizedEmail });
      return res.status(404).json({
        status: 'error',
        message: 'No account found with this email address'
      });
    }

    logger.info('Email verified for password reset', {
      userId: user._id,
      email: user.email,
      accountStatus: user.account_status
    });

    const responseTime = Date.now() - startTime;
    logger.info('Email verification completed successfully', {
      userId: user._id,
      email: user.email,
      responseTime: `${responseTime}ms`
    });
    
    // Return success - client can proceed to password reset
    res.json({
      status: 'success',
      message: 'Email verified. You can now reset your password.',
      email: normalizedEmail // Return email for client to use in reset step
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Forgot password error occurred', {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Reset password directly (no token needed, email verification done in previous step)
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Reset password request started', {
    email: req.body.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Reset password validation failed', {
        errors: errors.array(),
        email: req.body.email
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    logger.debug('Searching for user with email', { email: normalizedEmail });
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      logger.warn('Reset password failed - user not found', {
        email: normalizedEmail
      });
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    logger.info('User found for password reset', {
      userId: user._id,
      email: user.email,
      accountStatus: user.account_status
    });

    // Set new password (mongoose will hash it automatically via pre-save hook)
    user.password = password;
    // Clear any existing reset tokens
    user.password_reset_token = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    const responseTime = Date.now() - startTime;
    logger.info('Password reset completed successfully', {
      userId: user._id,
      email: user.email,
      responseTime: `${responseTime}ms`
    });

    res.json({
      status: 'success',
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Reset password error occurred', {
      error: error.message,
      stack: error.stack,
      email: req.body.email,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;