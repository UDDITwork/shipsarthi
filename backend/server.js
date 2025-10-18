const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB, checkDBHealth } = require('./config/db');
const logger = require('./utils/logger');
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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging Middleware
app.use(logger.logRequest.bind(logger));

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

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/ndr', require('./routes/ndr'));
app.use('/api/support', require('./routes/support'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  console.error('Error:', err.stack);
  
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