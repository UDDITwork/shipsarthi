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
  
  logger.info('Enquiry form submission started', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });

  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Enquiry form validation failed', {
        errors: errors.array(),
        body: req.body
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, mobile, describe, monthlyLoad } = req.body;

    logger.info('Processing enquiry submission', {
      name,
      email,
      mobile,
      describe,
      monthlyLoad
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
    logger.error('Enquiry form submission error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      responseTime: `${responseTime}ms`
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to submit enquiry. Please try again later.'
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
