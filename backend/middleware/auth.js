const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Optimize: Only select necessary fields, exclude password and heavy fields
      const user = await User.findById(decoded.id).select('-password -documents -__v');
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Token is not valid'
        });
      }

      if (user.account_status === 'suspended') {
        return res.status(403).json({
          status: 'error',
          message: 'Account has been suspended'
        });
      }

      // Add user ID to request
      req.user = user;
      req.userId = user._id || user.id;
      
      next();
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('AUTH middleware error:', error.message);
    }
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