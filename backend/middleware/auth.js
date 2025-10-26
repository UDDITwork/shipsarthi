const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.warn('⚠️ AUTH: No token provided', {
        url: req.url,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        console.warn('⚠️ AUTH: User not found', {
          decodedId: decoded.id,
          url: req.url,
          timestamp: new Date().toISOString()
        });
        return res.status(401).json({
          status: 'error',
          message: 'Token is not valid'
        });
      }

      if (user.account_status === 'suspended') {
        console.warn('⚠️ AUTH: Account suspended', {
          userId: user._id,
          email: user.email,
          url: req.url,
          timestamp: new Date().toISOString()
        });
        return res.status(403).json({
          status: 'error',
          message: 'Account has been suspended'
        });
      }

      // Add user ID to request for better debugging
      req.user = user;
      req.userId = user._id || user.id;
      
      console.log('✅ AUTH: User authenticated', {
        userId: user._id,
        email: user.email,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      
      next();
    } catch (err) {
      console.warn('⚠️ AUTH: Token verification failed', {
        error: err.message,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({
        status: 'error',
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    console.error('❌ AUTH: Middleware error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// Admin middleware (for future use)
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.user_type !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin privileges required.'
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// Optional auth middleware (doesn't throw error if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      req.user = user;
    } catch (err) {
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

module.exports = { auth, adminAuth, optionalAuth };