const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const msg91Service = require('../services/msg91Service');
const logger = require('../utils/logger');
const router = express.Router();

// @desc    Send OTP for phone verification
// @route   POST /api/otp/send
// @access  Public
router.post('/send', [
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit phone number')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Send OTP request started', {
    phone_number: req.body.phone_number,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Send OTP validation failed', {
        errors: errors.array(),
        phone_number: req.body.phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone_number } = req.body;

    // Check if user exists with this phone number
    const user = await User.findOne({ phone_number });
    
    if (!user) {
      logger.warn('Send OTP failed - user not found', { phone_number });
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this phone number'
      });
    }

    // Check if OTP is locked
    if (user.isOTPLocked()) {
      const lockTimeRemaining = Math.ceil((user.otp_locked_until - Date.now()) / (1000 * 60));
      logger.warn('Send OTP failed - OTP locked', {
        userId: user._id,
        phone_number,
        lockTimeRemaining
      });
      return res.status(423).json({
        status: 'error',
        message: `OTP is locked. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Check if phone is already verified
    if (user.phone_verified) {
      logger.warn('Send OTP failed - phone already verified', {
        userId: user._id,
        phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is already verified'
      });
    }

    // Generate OTP token
    const otpToken = user.createOTPToken();
    await user.save();

    logger.info('OTP token generated', {
      userId: user._id,
      phone_number,
      otpExpires: user.otp_expires
    });

    // Send OTP via MSG91
    const formattedMobile = msg91Service.formatMobile(phone_number);
    
    if (!msg91Service.validateMobile(phone_number)) {
      logger.error('Invalid mobile number format', { phone_number });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number format'
      });
    }

    const otpResult = await msg91Service.sendOTP(formattedMobile, {
      param1: user.company_name,
      param2: user.your_name
    });

    if (!otpResult.success) {
      logger.error('MSG91 Send OTP failed', {
        userId: user._id,
        phone_number,
        error: otpResult.message
      });
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP. Please try again.'
      });
    }

    const responseTime = Date.now() - startTime;
    logger.info('OTP sent successfully', {
      userId: user._id,
      phone_number,
      requestId: otpResult.requestId,
      responseTime: `${responseTime}ms`
    });

    res.json({
      status: 'success',
      message: 'OTP sent successfully to your phone number',
      phone_number: phone_number,
      expires_in: 300 // 5 minutes in seconds
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Send OTP error occurred', {
      error: error.message,
      stack: error.stack,
      phone_number: req.body.phone_number,
      responseTime: `${responseTime}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error while sending OTP'
    });
  }
});

// @desc    Verify OTP
// @route   POST /api/otp/verify
// @access  Public
router.post('/verify', [
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('otp')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Verify OTP request started', {
    phone_number: req.body.phone_number,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Verify OTP validation failed', {
        errors: errors.array(),
        phone_number: req.body.phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone_number, otp } = req.body;

    // Find user
    const user = await User.findOne({ phone_number });
    
    if (!user) {
      logger.warn('Verify OTP failed - user not found', { phone_number });
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this phone number'
      });
    }

    // Check if OTP is locked
    if (user.isOTPLocked()) {
      const lockTimeRemaining = Math.ceil((user.otp_locked_until - Date.now()) / (1000 * 60));
      logger.warn('Verify OTP failed - OTP locked', {
        userId: user._id,
        phone_number,
        lockTimeRemaining
      });
      return res.status(423).json({
        status: 'error',
        message: `OTP is locked. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Check if phone is already verified
    if (user.phone_verified) {
      logger.warn('Verify OTP failed - phone already verified', {
        userId: user._id,
        phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is already verified'
      });
    }

    // Verify OTP with MSG91
    const formattedMobile = msg91Service.formatMobile(phone_number);
    const verifyResult = await msg91Service.verifyOTP(formattedMobile, otp);

    if (!verifyResult.success) {
      // Increment OTP attempts
      await user.incrementOTPAttempts();
      
      logger.warn('OTP verification failed', {
        userId: user._id,
        phone_number,
        otpAttempts: user.otp_attempts,
        error: verifyResult.message
      });

      if (user.otp_attempts >= 3) {
        return res.status(423).json({
          status: 'error',
          message: 'Too many failed attempts. OTP is locked for 15 minutes.'
        });
      }

      return res.status(400).json({
        status: 'error',
        message: verifyResult.message || 'Invalid OTP'
      });
    }

    // Reset OTP attempts and mark as verified
    await user.resetOTPAttempts();

    const responseTime = Date.now() - startTime;
    logger.info('OTP verified successfully', {
      userId: user._id,
      phone_number,
      responseTime: `${responseTime}ms`
    });

    res.json({
      status: 'success',
      message: 'Phone number verified successfully',
      user: {
        _id: user._id,
        phone_number: user.phone_number,
        phone_verified: user.phone_verified,
        otp_verified: user.otp_verified
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Verify OTP error occurred', {
      error: error.message,
      stack: error.stack,
      phone_number: req.body.phone_number,
      responseTime: `${responseTime}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error while verifying OTP'
    });
  }
});

// @desc    Resend OTP
// @route   POST /api/otp/resend
// @access  Public
router.post('/resend', [
  body('phone_number')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('retry_type')
    .optional()
    .isIn(['sms', 'voice'])
    .withMessage('Retry type must be either sms or voice')
], async (req, res) => {
  const startTime = Date.now();
  logger.info('Resend OTP request started', {
    phone_number: req.body.phone_number,
    retry_type: req.body.retry_type || 'sms',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Resend OTP validation failed', {
        errors: errors.array(),
        phone_number: req.body.phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone_number, retry_type = 'sms' } = req.body;

    // Find user
    const user = await User.findOne({ phone_number });
    
    if (!user) {
      logger.warn('Resend OTP failed - user not found', { phone_number });
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this phone number'
      });
    }

    // Check if OTP is locked
    if (user.isOTPLocked()) {
      const lockTimeRemaining = Math.ceil((user.otp_locked_until - Date.now()) / (1000 * 60));
      logger.warn('Resend OTP failed - OTP locked', {
        userId: user._id,
        phone_number,
        lockTimeRemaining
      });
      return res.status(423).json({
        status: 'error',
        message: `OTP is locked. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Check if phone is already verified
    if (user.phone_verified) {
      logger.warn('Resend OTP failed - phone already verified', {
        userId: user._id,
        phone_number
      });
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is already verified'
      });
    }

    // Generate new OTP token
    const otpToken = user.createOTPToken();
    await user.save();

    logger.info('New OTP token generated for resend', {
      userId: user._id,
      phone_number,
      otpExpires: user.otp_expires
    });

    // Resend OTP via MSG91
    const formattedMobile = msg91Service.formatMobile(phone_number);
    
    if (!msg91Service.validateMobile(phone_number)) {
      logger.error('Invalid mobile number format', { phone_number });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number format'
      });
    }

    const resendResult = await msg91Service.resendOTP(formattedMobile, retry_type);

    if (!resendResult.success) {
      logger.error('MSG91 Resend OTP failed', {
        userId: user._id,
        phone_number,
        retry_type,
        error: resendResult.message
      });
      return res.status(500).json({
        status: 'error',
        message: 'Failed to resend OTP. Please try again.'
      });
    }

    const responseTime = Date.now() - startTime;
    logger.info('OTP resent successfully', {
      userId: user._id,
      phone_number,
      retry_type,
      responseTime: `${responseTime}ms`
    });

    res.json({
      status: 'success',
      message: `OTP resent successfully via ${retry_type.toUpperCase()}`,
      phone_number: phone_number,
      retry_type: retry_type,
      expires_in: 300 // 5 minutes in seconds
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Resend OTP error occurred', {
      error: error.message,
      stack: error.stack,
      phone_number: req.body.phone_number,
      responseTime: `${responseTime}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error while resending OTP'
    });
  }
});

// @desc    Check OTP status
// @route   GET /api/otp/status/:phone_number
// @access  Public
router.get('/status/:phone_number', async (req, res) => {
  const startTime = Date.now();
  const { phone_number } = req.params;
  
  logger.info('Check OTP status request', {
    phone_number,
    ip: req.ip
  });

  try {
    // Validate phone number format
    if (!/^[6-9]\d{9}$/.test(phone_number)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number format'
      });
    }

    const user = await User.findOne({ phone_number });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this phone number'
      });
    }

    const isLocked = user.isOTPLocked();
    const lockTimeRemaining = isLocked ? Math.ceil((user.otp_locked_until - Date.now()) / (1000 * 60)) : 0;

    const responseTime = Date.now() - startTime;
    logger.info('OTP status retrieved', {
      userId: user._id,
      phone_number,
      phone_verified: user.phone_verified,
      otp_verified: user.otp_verified,
      is_locked: isLocked,
      responseTime: `${responseTime}ms`
    });

    res.json({
      status: 'success',
      data: {
        phone_number: user.phone_number,
        phone_verified: user.phone_verified,
        otp_verified: user.otp_verified,
        is_locked: isLocked,
        lock_time_remaining: lockTimeRemaining,
        otp_attempts: user.otp_attempts,
        has_otp_token: !!user.otp_token,
        otp_expires: user.otp_expires
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Check OTP status error occurred', {
      error: error.message,
      stack: error.stack,
      phone_number,
      responseTime: `${responseTime}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error while checking OTP status'
    });
  }
});

module.exports = router;
