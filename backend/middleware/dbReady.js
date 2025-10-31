const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Middleware to check if database is ready before processing requests
 * Returns 503 Service Unavailable if DB is not connected
 */
const checkDBReady = (req, res, next) => {
  const dbState = mongoose.connection.readyState;
  
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (dbState !== 1) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    logger.warn('Database not ready for request', {
      requestId: req.requestId,
      dbState: states[dbState],
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(503).json({
      status: 'error',
      message: 'Database is not ready. Please try again in a moment.',
      dbState: states[dbState]
    });
  }
  
  next();
};

/**
 * Async helper function to wait for database connection with timeout
 * Used for critical operations that need DB to be ready
 */
const waitForDB = (timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      return resolve(true);
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      if (mongoose.connection.readyState === 1) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (elapsed >= timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error('Database connection timeout'));
      }
    }, 100); // Check every 100ms
    
    // Also listen for connection event
    mongoose.connection.once('connected', () => {
      clearInterval(checkInterval);
      resolve(true);
    });
    
    mongoose.connection.once('error', (err) => {
      clearInterval(checkInterval);
      reject(err);
    });
  });
};

module.exports = { checkDBReady, waitForDB };

