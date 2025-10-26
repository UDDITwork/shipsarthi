// Location: backend/middleware/webhookValidation.js
// Request validation middleware for webhooks
const validators = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Validate scan push webhook payload
 */
const validateScanPush = (req, res, next) => {
  const validation = validators.validateScanPushPayload(req.body);
  
  if (!validation.valid) {
    logger.warn('⚠️ Invalid scan push payload', {
      errors: validation.errors,
      payload: JSON.stringify(req.body).substring(0, 200)
    });
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payload',
      errors: validation.errors
    });
  }

  // Replace request body with sanitized version
  req.body = validation.sanitized;
  next();
};

/**
 * Validate EPOD webhook payload
 */
const validateEPOD = (req, res, next) => {
  const validation = validators.validateEPODPayload(req.body);
  
  if (!validation.valid) {
    logger.warn('⚠️ Invalid EPOD payload', {
      errors: validation.errors,
      waybill: req.body.waybill
    });
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payload',
      errors: validation.errors
    });
  }

  req.body = validation.sanitized;
  next();
};

/**
 * Validate sorter image webhook payload
 */
const validateSorterImage = (req, res, next) => {
  const validation = validators.validateSorterImagePayload(req.body);
  
  if (!validation.valid) {
    logger.warn('⚠️ Invalid sorter image payload', {
      errors: validation.errors
    });
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payload',
      errors: validation.errors
    });
  }

  req.body = validation.sanitized;
  next();
};

/**
 * Validate QC image webhook payload
 */
const validateQCImage = (req, res, next) => {
  const validation = validators.validateQCImagePayload(req.body);
  
  if (!validation.valid) {
    logger.warn('⚠️ Invalid QC image payload', {
      errors: validation.errors
    });
    
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payload',
      errors: validation.errors
    });
  }

  req.body = validation.sanitized;
  next();
};

module.exports = {
  validateScanPush,
  validateEPOD,
  validateSorterImage,
  validateQCImage
};

