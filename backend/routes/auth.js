const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
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

// @desc    Register user
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
  logger.info('🚨 REGISTER ROUTE EXECUTED - NEW VERSION', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
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

    logger.debug('User existence check completed', {
      userExists: !!existingUser,
      email: email.toLowerCase(),
      phone_number
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

    logger.info('Creating new user', {
      email: email.toLowerCase(),
      company_name,
      user_type
    });

    // Create user (without OTP verification initially)
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
      account_status: 'pending_verification' // Set to pending until OTP is verified
    });

    await user.save();
    logger.info('User created successfully (pending OTP verification)', {
      userId: user._id,
      email: user.email,
      company_name: user.company_name,
      client_id: user.client_id,
      user_type: user.user_type,
      monthly_shipments: user.monthly_shipments,
      phone_verified: user.phone_verified
    });

    const responseTime = Date.now() - startTime;
    logger.info('Registration completed successfully (OTP verification required)', {
      userId: user._id,
      email: user.email,
      company_name: user.company_name,
      responseTime: `${responseTime}ms`
    });

    // DEBUG: Log the response before sending
    logger.info('🔧 DEBUG: Sending registration response', {
      requires_otp_verification: true,
      userId: user._id
    });

    logger.info('🚨 ABOUT TO SEND RESPONSE WITH OTP FLAG', {
      userId: user._id,
      requires_otp_verification: true
    });

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your phone number with OTP to complete registration.',
      user: {
        _id: user._id,
        email: user.email,
        company_name: user.company_name,
        your_name: user.your_name,
        client_id: user.client_id,
        account_status: user.account_status,
        wallet_balance: user.wallet_balance,
        kyc_status: user.kyc_status,
        phone_verified: user.phone_verified,
        otp_verified: user.otp_verified
      },
      requires_otp_verification: true
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Registration error occurred', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      responseTime: `${responseTime}ms`
    });
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      logger.warn('Duplicate key error during registration', {
        field,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      return res.status(400).json({
        status: 'error',
        message: `${field === 'email' ? 'Email' : 'Phone number'} already exists`
      });
    }

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