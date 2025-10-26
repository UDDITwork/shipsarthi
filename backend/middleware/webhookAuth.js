// Location: backend/middleware/webhookAuth.js
const logger = require('../utils/logger');

// Delhivery IP addresses (DEV and PROD)
const DELHIVERY_DEV_IPS = [
  '18.136.12.154',
  '13.250.167.49',
  '52.220.126.238',
  '3.108.106.65',
  '3.109.19.228',
  '3.7.116.186',
  '3.6.106.39'
];

const DELHIVERY_PROD_IPS = [
  '13.229.195.68',
  '18.139.238.62',
  '52.76.70.1',
  '3.108.106.65',
  '13.127.20.101',
  '13.126.12.240',
  '35.154.161.83',
  '3.6.106.39',
  '18.61.175.16'
];

const ALLOWED_IPS = [...DELHIVERY_DEV_IPS, ...DELHIVERY_PROD_IPS];

/**
 * Extract client IP from request (handles proxy headers)
 */
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
         req.headers['x-real-ip'] ||
         'unknown';
}

/**
 * Middleware to validate webhook authentication
 * Validates X-API-Key header and optional Bearer token
 */
const webhookAuth = (req, res, next) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  logger.info('🔐 Webhook authentication check', {
    ip: clientIP,
    url: req.url,
    headers: {
      'x-api-key': req.headers['x-api-key'] ? 'present' : 'missing',
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    }
  });

  // Get environment variables
  const expectedApiKey = process.env.DELHIVERY_WEBHOOK_API_KEY;
  const expectedSecret = process.env.DELHIVERY_WEBHOOK_SECRET;
  const enableIPWhitelist = process.env.DELHIVERY_WEBHOOK_ENABLE_IP_WHITELIST !== 'false'; // Default: true

  // Check X-API-Key header
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    logger.warn('❌ Webhook authentication failed: Missing X-API-Key header', {
      ip: clientIP,
      url: req.url
    });
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Missing X-API-Key header'
    });
  }

  // Validate API Key
  if (apiKey !== expectedApiKey) {
    logger.warn('❌ Webhook authentication failed: Invalid X-API-Key', {
      ip: clientIP,
      url: req.url,
      providedKey: apiKey.substring(0, 5) + '...' // Log partial key for debugging
    });
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid API Key'
    });
  }

  // Check Bearer token (if required)
  if (expectedSecret) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('❌ Webhook authentication failed: Missing Bearer token', {
        ip: clientIP,
        url: req.url
      });
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Missing Bearer token'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== expectedSecret) {
      logger.warn('❌ Webhook authentication failed: Invalid Bearer token', {
        ip: clientIP,
        url: req.url
      });
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Invalid Bearer token'
      });
    }
  }

  // IP Whitelist validation (optional but recommended)
  if (enableIPWhitelist && clientIP !== 'unknown' && !ALLOWED_IPS.includes(clientIP)) {
    logger.warn('⚠️ Webhook from non-whitelisted IP', {
      ip: clientIP,
      url: req.url,
      allowedIPs: ALLOWED_IPS
    });
    
    // In production, you might want to block this
    // For now, we'll log a warning but allow the request
    // Uncomment the following lines to block non-whitelisted IPs:
    /*
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden: IP address not whitelisted'
    });
    */
  }

  // Authentication successful
  const duration = Date.now() - startTime;
  logger.info('✅ Webhook authentication successful', {
    ip: clientIP,
    url: req.url,
    duration: `${duration}ms`
  });

  // Attach metadata to request
  req.webhookMetadata = {
    authenticated: true,
    clientIP,
    timestamp: new Date()
  };

  next();
};

/**
 * Middleware for webhook rate limiting (separate from general rate limiting)
 * Allows higher throughput for Delhivery webhooks
 */
const webhookRateLimit = (req, res, next) => {
  // Webhooks from Delhivery should be allowed higher rate limits
  // This is a pass-through for now, but can be enhanced
  next();
};

module.exports = {
  webhookAuth,
  webhookRateLimit,
  getClientIP
};

