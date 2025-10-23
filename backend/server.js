const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB, checkDBHealth } = require('./config/db');
const logger = require('./utils/logger');
const trackingService = require('./services/trackingService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://shipsarthi.vercel.app',
  'https://shipsarthi-git-main-udditworks-projects.vercel.app',
  'https://www.shipsarthi.com',
  'https://shipsarthi.com'
];

// Enhanced CORS configuration for production
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      logger.info('🌐 CORS - Request with no origin (allowed)', { origin: null });
      return callback(null, true);
    }
    
    // Log all incoming origins for debugging
    logger.info('🌐 CORS CHECK', {
      origin,
      allowedOrigins,
      timestamp: new Date().toISOString()
    });
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      logger.info('✅ CORS ALLOWED', { origin });
      callback(null, true);
    } else {
      logger.error('❌ CORS BLOCKED', { 
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Admin-Email', 'X-Admin-Password'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// Preflight requests are handled by the CORS middleware above

// Enhanced Request Logging Middleware
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  
  logger.info('🌐 INCOMING REQUEST', {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    headers: req.headers,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
    query: req.query,
    params: req.params
  });
  
  next();
});

// Enhanced Order Creation Logging Middleware
app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST') {
    logger.info('🚀 ORDER CREATION REQUEST STARTED', {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      body: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }
  next();
});

// Add response logging middleware for orders
app.use('/api/orders', (req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    if (req.method === 'POST') {
      logger.info('📦 ORDER CREATION RESPONSE', {
        requestId: req.requestId,
        statusCode: res.statusCode,
        response: JSON.parse(data),
        timestamp: new Date().toISOString()
      });
    }
    originalSend.call(this, data);
  };
  next();
});

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Files
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// MongoDB Connection
connectDB()
.then(() => {
  logger.info('✅ Connected to MongoDB');
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  logger.error('❌ MongoDB connection error', { error: error.message, stack: error.stack });
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Health Check Route
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDBHealth();
  res.status(200).json({
    status: 'success',
    message: 'Shipsarthi API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: dbHealth
  });
});

// Test CORS Route
app.post('/api/test-cors', (req, res) => {
  logger.info('🧪 CORS TEST ENDPOINT HIT', {
    requestId: req.requestId,
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  
  res.status(200).json({
    status: 'success',
    message: 'CORS test successful',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test Email Service Route
app.get('/api/test-email', async (req, res) => {
  try {
    const emailService = require('./services/emailService');
    
    logger.info('🧪 EMAIL TEST ENDPOINT HIT', {
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
    
    const testResult = await emailService.sendEnquiryConfirmation({
      name: 'Test User',
      email: 'test@example.com',
      mobile: '1234567890',
      describe: 'Test Business',
      monthlyLoad: 'Test Load'
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Email test completed',
      emailResult: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ EMAIL TEST ERROR', {
      requestId: req.requestId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Email test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/ndr', require('./routes/ndr'));
app.use('/api/support', require('./routes/support'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/enquiry', require('./routes/enquiry'));
app.use('/api/admin', require('./routes/admin'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.error('💥 UNHANDLED ERROR OCCURRED', {
    errorId,
    timestamp: new Date().toISOString(),
    errorName: err.name,
    errorMessage: err.message,
    errorStack: err.stack,
    errorCode: err.code,
    requestDetails: {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      contentType: req.get('Content-Type')
    },
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  console.error('💥 Error:', err.stack);
  
  if (err.name === 'ValidationError') {
    logger.warn('Validation error', { errors: Object.values(err.errors).map(e => e.message) });
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    logger.warn('Cast error', { value: err.value, kind: err.kind });
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    logger.warn('Duplicate key error', { field, keyPattern: err.keyPattern });
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`
    });
  }

  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

// 404 Handler - Fixed wildcard route pattern
app.use((req, res) => {
  logger.warn('404 - Route not found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start Server
app.listen(PORT, () => {
  logger.info('🚀 Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    healthCheck: `http://localhost:${PORT}/api/health`
  });
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully');
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down gracefully');
  console.log('🛑 SIGINT received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;