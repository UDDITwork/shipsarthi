const express = require('express');
const { body, validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const router = express.Router();

// @desc    Submit enquiry form
// @route   POST /api/enquiry/submit
// @access  Public
router.post('/submit', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile number is required'),
  body('describe').notEmpty().withMessage('Business type is required'),
  body('monthlyLoad').notEmpty().withMessage('Monthly load is required')
], async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('🚀 ENQUIRY FORM SUBMISSION STARTED', {
    requestId,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    body: req.body,
    bodyKeys: Object.keys(req.body),
    bodyValues: Object.values(req.body)
  });

  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('❌ VALIDATION FAILED - ENQUIRY FORM', {
        requestId,
        timestamp: new Date().toISOString(),
        validationErrors: errors.array(),
        errorDetails: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value,
          location: err.location
        })),
        submittedData: {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          describe: req.body.describe,
          monthlyLoad: req.body.monthlyLoad
        },
        body: req.body,
        responseTime: `${Date.now() - startTime}ms`
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, mobile, describe, monthlyLoad } = req.body;

    logger.info('✅ VALIDATION PASSED - PROCESSING ENQUIRY', {
      requestId,
      timestamp: new Date().toISOString(),
      submittedData: {
        name,
        email,
        mobile,
        describe,
        monthlyLoad
      },
      dataValidation: {
        nameValid: !!name,
        emailValid: !!email,
        mobileValid: !!mobile,
        describeValid: !!describe,
        monthlyLoadValid: !!monthlyLoad
      }
    });

    // Send confirmation email to customer
    const confirmationResult = await emailService.sendEnquiryConfirmation({
      name,
      email,
      mobile,
      describe,
      monthlyLoad
    });

    // Send notification email to company
    const notificationResult = await emailService.sendEnquiryNotification({
      name,
      email,
      mobile,
      describe,
      monthlyLoad
    });

    const responseTime = Date.now() - startTime;
    logger.info('Enquiry form processed successfully', {
      name,
      email,
      confirmationMessageId: confirmationResult.messageId,
      notificationMessageId: notificationResult.messageId,
      responseTime: `${responseTime}ms`
    });

    res.status(200).json({
      status: 'success',
      message: 'Enquiry submitted successfully. We will contact you within 24 hours.',
      data: {
        name,
        email,
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('💥 ENQUIRY FORM SUBMISSION ERROR', {
      requestId,
      timestamp: new Date().toISOString(),
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
      submittedData: req.body,
      responseTime: `${responseTime}ms`,
      errorDetails: {
        name: error.name,
        code: error.code,
        status: error.status,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : null
      }
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to submit enquiry. Please try again later.',
      requestId: requestId
    });
  }
});

// @desc    Get enquiry form options
// @route   GET /api/enquiry/options
// @access  Public
router.get('/options', (req, res) => {
  try {
    const options = {
      businessTypes: [
        { value: 'ecommerce', label: 'E-commerce Business' },
        { value: 'retailer', label: 'Retailer' },
        { value: 'wholesaler', label: 'Wholesaler' },
        { value: 'manufacturer', label: 'Manufacturer' }
      ],
      monthlyLoads: [
        { value: '0-100', label: '0-100 shipments' },
        { value: '100-500', label: '100-500 shipments' },
        { value: '500-1000', label: '500-1000 shipments' },
        { value: '1000+', label: '1000+ shipments' }
      ]
    };

    res.json({
      status: 'success',
      data: options
    });
  } catch (error) {
    logger.error('Failed to get enquiry options', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to load form options'
    });
  }
});

module.exports = router;
