const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const cloudinaryService = require('../services/cloudinaryService');
const bcrypt = require('bcryptjs');

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }
  }
});

// Get user profile data
router.get('/profile', auth, async (req, res) => {
  try {
    // Use _id instead of id for better compatibility
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password -api_details.private_key');
    
    if (!user) {
      console.error('❌ USER NOT FOUND:', { userId, userFromAuth: req.user });
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Return user data with original field names for frontend compatibility
    const userProfile = {
      _id: user._id,
      company_name: user.company_name,
      your_name: user.your_name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
      monthly_shipments: user.monthly_shipments,
      state: user.state,
      gstin: user.gstin,
      client_id: user.client_id,
      account_status: user.account_status,
      wallet_balance: user.wallet_balance,
      kyc_status: user.kyc_status,
      joined_date: user.joined_date,
      address: user.address,
      bank_details: user.bank_details,
      documents: user.documents,
      api_details: user.api_details,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified
    };

    res.json({
      status: 'success',
      data: userProfile
    });
  } catch (error) {
    console.error('❌ Error fetching user profile:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id || req.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { company_name, your_name, phone_number, gstin, address } = req.body;
    
    // Use _id instead of id for better compatibility
    const userId = req.user._id || req.user.id;
    
    // Debug: Log incoming data
    console.log('📥 BACKEND RECEIVED DATA:', {
      userId: userId,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    const updateData = {};
    if (company_name) updateData.company_name = company_name;
    if (your_name) updateData.your_name = your_name;
    if (phone_number) updateData.phone_number = phone_number;
    if (gstin) updateData.gstin = gstin;
    if (address) updateData.address = address;
    
    console.log('🔄 UPDATE DATA TO SAVE:', updateData);

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -api_details.private_key');

    if (!user) {
      console.log('❌ USER NOT FOUND:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('✅ DATABASE UPDATED SUCCESSFULLY:', {
      userId: user._id,
      updatedFields: Object.keys(updateData),
      newData: {
        company_name: user.company_name,
        your_name: user.your_name,
        phone_number: user.phone_number,
        gstin: user.gstin
      }
    });

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle other errors
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('company_name wallet_balance joined_date');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // This would typically fetch from Orders, Shipments, etc.
    // For now, returning mock data
    const dashboardData = {
      user: {
        companyName: user.company_name,
        walletBalance: user.wallet_balance,
        joinedDate: user.joined_date
      },
      metrics: {
        todaysOrders: { current: 100, previous: 60 },
        todaysRevenue: { current: 100, previous: 80 },
        averageShippingCost: { amount: 15000, totalOrders: 900 }
      },
      shipmentStatus: {
        totalOrder: 1400,
        newOrder: 1800,
        pickupPending: 300,
        inTransit: 900,
        delivered: 2400,
        ndrPending: 1400,
        rto: 60
      }
    };

    res.json({
      status: 'success',
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Helper function to generate initials
function generateInitials(companyName) {
  const words = companyName.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return companyName.substring(0, 2).toUpperCase();
}

// @desc    Upload document
// @route   POST /api/users/upload-document
// @access  Private
router.post('/upload-document', auth, upload.single('file'), [
  body('document_type').isIn(['gst_certificate', 'photo_selfie', 'pan_card', 'aadhaar_card']).withMessage('Valid document type is required')
], async (req, res) => {
  console.log('📥 UPLOAD ENDPOINT HIT:', {
    method: req.method,
    url: req.url,
    body: req.body,
    file: req.file ? 'File received' : 'No file',
    timestamp: new Date().toISOString()
  });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const { document_type } = req.body;

    // Upload to Cloudinary
    const resourceType = cloudinaryService.getResourceType(req.file.mimetype);
    console.log('📤 UPLOADING TO CLOUDINARY:', {
      fileName: req.file.originalname,
      mimetype: req.file.mimetype,
      resourceType: resourceType,
      fileSize: req.file.size,
      isPDF: req.file.mimetype === 'application/pdf'
    });
    
    // ✅ Use dedicated document upload method for PDFs
    const uploadResult = await cloudinaryService.uploadDocument(req.file.buffer, {
      folder: 'shipsarthi/documents',
      mimetype: req.file.mimetype  // ✅ Pass mimetype for proper resource type
    });

    if (!uploadResult.success) {
      console.error('❌ CLOUDINARY UPLOAD FAILED:', uploadResult);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload document to cloud storage',
        details: uploadResult.error || 'Unknown error'
      });
    }
    
    console.log('✅ CLOUDINARY UPLOAD SUCCESS:', {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      resourceType: uploadResult.resource_type
    });

    // Update user document
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Remove existing document of same type
    user.documents = user.documents.filter(doc => doc.document_type !== document_type);

    // Add new document
    user.documents.push({
      document_type: document_type,
      document_status: 'uploaded',
      file_url: uploadResult.url,
      upload_date: new Date()
    });

    await user.save();

    res.json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        document_type,
        file_url: uploadResult.url,
        document_status: 'uploaded'
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error uploading document'
    });
  }
});

// @desc    Get user documents
// @route   GET /api/users/documents
// @access  Private
router.get('/documents', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('documents');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: user.documents || []
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching documents'
    });
  }
});

// @desc    Reset password
// @route   POST /api/users/reset-password
// @access  Private
router.post('/reset-password', auth, [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const { current_password, new_password } = req.body;

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(current_password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = new_password;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error updating password'
    });
  }
});

// @desc    Get API keys
// @route   GET /api/users/api-keys
// @access  Private
router.get('/api-keys', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('api_details');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        public_key: user.api_details.public_key,
        private_key: user.api_details.private_key,
        api_documentation_version: user.api_details.api_documentation_version
      }
    });

  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching API keys'
    });
  }
});

// @desc    Regenerate API keys
// @route   POST /api/users/regenerate-api-keys
// @access  Private
router.post('/regenerate-api-keys', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate new API keys
    const crypto = require('crypto');
    const newPublicKey = `pk_${crypto.randomBytes(16).toString('hex')}`;
    const newPrivateKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

    user.api_details.public_key = newPublicKey;
    user.api_details.private_key = newPrivateKey;
    user.api_details.last_key_reset = new Date();

    await user.save();

    res.json({
      status: 'success',
      message: 'API keys regenerated successfully',
      data: {
        public_key: newPublicKey,
        private_key: newPrivateKey
      }
    });

  } catch (error) {
    console.error('Regenerate API keys error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error regenerating API keys'
    });
  }
});

// @desc    Get KYC status
// @route   GET /api/users/kyc-status
// @access  Private
router.get('/kyc-status', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('kyc_status documents');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check document requirements
    const requiredDocuments = ['gst_certificate', 'photo_selfie', 'pan_card', 'aadhaar_card'];
    const uploadedDocuments = user.documents.map(doc => doc.document_type);
    const missingDocuments = requiredDocuments.filter(doc => !uploadedDocuments.includes(doc));

    res.json({
      status: 'success',
      data: {
        status: user.kyc_status.status,
        verified_date: user.kyc_status.verified_date,
        requirements: missingDocuments
      }
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching KYC status'
    });
  }
});

// @desc    Submit KYC for verification
// @route   POST /api/users/submit-kyc
// @access  Private
router.post('/submit-kyc', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if all required documents are uploaded
    const requiredDocuments = ['gst_certificate', 'photo_selfie', 'pan_card', 'aadhaar_card'];
    const uploadedDocuments = user.documents.map(doc => doc.document_type);
    const missingDocuments = requiredDocuments.filter(doc => !uploadedDocuments.includes(doc));

    if (missingDocuments.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload all required documents before submitting KYC',
        missing_documents: missingDocuments
      });
    }

    // Update KYC status to pending
    user.kyc_status.status = 'pending';
    await user.save();

    res.json({
      status: 'success',
      message: 'KYC submitted for verification'
    });

  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error submitting KYC'
    });
  }
});

module.exports = router;
