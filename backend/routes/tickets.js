// Location: backend/routes/tickets.js
const express = require('express');
const multer = require('multer');
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const SupportTicket = require('../models/Support');
const Order = require('../models/Order');
const cloudinaryService = require('../services/cloudinaryService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/mp3',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, audio, video, and documents allowed.'));
    }
  }
});

// @desc    Get all tickets with filters
// @route   GET /api/tickets
// @access  Private
router.get('/', auth, [
  query('status').optional().isIn(['open', 'resolved', 'closed', 'all']),
  query('category').optional(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { user_id: userId };
    
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { ticket_id: new RegExp(req.query.search, 'i') },
        { comment: new RegExp(req.query.search, 'i') },
        { awb_numbers: new RegExp(req.query.search, 'i') }
      ];
    }

    const tickets = await SupportTicket.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('related_orders', 'order_id delhivery_data.waybill');

    const totalTickets = await SupportTicket.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        tickets,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalTickets / limit),
          total_tickets: totalTickets,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching tickets'
    });
  }
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).populate('related_orders', 'order_id delhivery_data.waybill customer_info');

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found'
      });
    }

    res.json({
      status: 'success',
      data: ticket
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching ticket'
    });
  }
});

// @desc    Create new ticket with file attachments
// @route   POST /api/tickets
// @access  Private
router.post('/', auth, upload.array('files', 5), [
  body('category').isIn([
    'pickup_delivery', 'shipment_ndr_rto', 'edit_shipment_info',
    'shipment_dispute', 'finance', 'billing_taxation', 'claims',
    'kyc_bank_verification', 'technical_support', 'others'
  ]).withMessage('Valid category is required'),
  body('awb_numbers').optional().custom((value, { req }) => {
    // Categories that require AWB numbers
    const categoriesRequiringAWB = [
      'pickup_delivery',
      'shipment_ndr_rto',
      'edit_shipment_info',
      'shipment_dispute',
      'claims'
    ];
    
    const category = req.body.category;
    
    // If category requires AWB, ensure it's provided
    if (categoriesRequiringAWB.includes(category)) {
      if (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '')) {
        throw new Error('AWB numbers are required for this category');
      }
      
      // Validate AWB count if array
      if (Array.isArray(value) && value.length > 10) {
        throw new Error('Maximum 10 AWB numbers allowed');
      }
    }
    
    return true;
  }),
  body('comment').notEmpty().trim().isLength({ min: 10, max: 5000 }).withMessage('Please provide a detailed description (minimum 10 characters, maximum 5000 characters)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { category, awb_numbers, comment } = req.body;

    // Categories that require AWB numbers
    const categoriesRequiringAWB = [
      'pickup_delivery',
      'shipment_ndr_rto',
      'edit_shipment_info',
      'shipment_dispute',
      'claims'
    ];
    
    const requiresAWB = categoriesRequiringAWB.includes(category);
    
    // Parse AWB numbers - handle both array and string formats
    let awbArray = [];
    if (awb_numbers) {
      if (Array.isArray(awb_numbers)) {
        awbArray = awb_numbers.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof awb_numbers === 'string') {
        awbArray = awb_numbers.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      // Validate count
      if (awbArray.length > 10) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum 10 AWB numbers allowed'
        });
      }
    }
    
    // If category requires AWB but none provided, return error
    if (requiresAWB && awbArray.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'AWB numbers are required for this ticket category'
      });
    }

    // Upload files to Cloudinary
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Validate file
        const validation = cloudinaryService.validateFile(file);
        if (!validation.valid) {
          return res.status(400).json({
            status: 'error',
            message: validation.error
          });
        }

        // Upload to Cloudinary
        const resourceType = cloudinaryService.getResourceType(file.mimetype);
        const uploadResult = await cloudinaryService.uploadFile(file.buffer, {
          folder: 'shipsarthi/tickets',
          resource_type: resourceType
        });

        if (uploadResult.success) {
          attachments.push({
            file_url: uploadResult.url,
            file_type: cloudinaryService.getFileType(file.mimetype),
            file_name: file.originalname,
            file_size: file.size,
            cloudinary_public_id: uploadResult.public_id
          });
        }
      }
    }

    // Find related orders by AWB (only if AWB numbers provided)
    let relatedOrders = [];
    if (awbArray.length > 0) {
      relatedOrders = await Order.find({
        user_id: userId,
        'delhivery_data.waybill': { $in: awbArray }
      }).select('_id');
    }

    // Create ticket data object
    const ticketData = {
      user_id: userId,
      category,
      subject: `Support Request - ${category}`,
      description: comment,
      attachments,
      related_orders: relatedOrders.length > 0 ? relatedOrders.map(o => o._id) : [], // Empty array if no orders found
      customer_info: {
        name: req.user.your_name,
        email: req.user.email,
        phone: req.user.phone_number,
        company_name: req.user.company_name
      }
    };

    // Only include AWB numbers if provided (not undefined/empty)
    if (awbArray.length > 0) {
      ticketData.awb_numbers = awbArray;
    }

    // Create ticket
    const ticket = new SupportTicket(ticketData);

    // Save ticket first to generate ticket_id and validate
    await ticket.save();

    // Add initial message to conversation (addMessage returns a promise that saves)
    await ticket.addMessage('user', req.user.your_name, comment, attachments);

    res.status(201).json({
      status: 'success',
      message: 'Ticket created successfully',
      data: ticket
    });

  } catch (error) {
    logger.error('Create ticket error', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      category: req.body.category
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error creating ticket'
    });
  }
});

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comment
// @access  Private
router.post('/:id/comment', auth, upload.array('files', 3), [
  body('comment').notEmpty().trim().withMessage('Comment is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found'
      });
    }

    // Upload attachments if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resourceType = cloudinaryService.getResourceType(file.mimetype);
        const uploadResult = await cloudinaryService.uploadFile(file.buffer, {
          folder: 'shipsarthi/tickets',
          resource_type: resourceType
        });

        if (uploadResult.success) {
          attachments.push({
            file_url: uploadResult.url,
            file_type: cloudinaryService.getFileType(file.mimetype),
            file_name: file.originalname
          });
        }
      }
    }

    // Add comment using SupportTicket method
    await ticket.addMessage('user', req.user.your_name, req.body.comment, attachments);

    res.json({
      status: 'success',
      message: 'Comment added successfully',
      data: ticket
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error adding comment'
    });
  }
});

// @desc    Update ticket status
// @route   PATCH /api/tickets/:id/status
// @access  Private
router.patch('/:id/status', auth, [
  body('status').isIn(['open', 'resolved', 'closed']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found'
      });
    }

    const { status } = req.body;

    if (status === 'resolved') {
      await ticket.resolve(
        req.body.resolution_text || 'Issue resolved',
        'issue_resolved',
        req.body.internal_notes || ''
      );
    } else if (status === 'closed') {
      await ticket.close(req.body.closure_reason || '');
    } else {
      ticket.status = status;
      await ticket.save();
    }

    res.json({
      status: 'success',
      message: `Ticket ${status} successfully`,
      data: ticket
    });

  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating ticket status'
    });
  }
});

// @desc    Add rating to ticket
// @route   POST /api/tickets/:id/rating
// @access  Private
router.post('/:id/rating', auth, [
  body('score').isInt({ min: 1, max: 5 }).withMessage('Score must be between 1 and 5'),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found'
      });
    }

    ticket.resolution.customer_satisfaction = {
      rating: req.body.score,
      feedback: req.body.feedback || '',
      survey_date: new Date()
    };
    await ticket.save();

    res.json({
      status: 'success',
      message: 'Rating added successfully',
      data: ticket
    });

  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error adding rating'
    });
  }
});

// @desc    Get ticket statistics
// @route   GET /api/tickets/statistics/overview
// @access  Private
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = {
      open: await SupportTicket.countDocuments({ user_id: userId, status: 'open' }),
      resolved: await SupportTicket.countDocuments({ user_id: userId, status: 'resolved' }),
      closed: await SupportTicket.countDocuments({ user_id: userId, status: 'closed' })
    };
    
    stats.all = stats.open + stats.resolved + stats.closed;

    // Category breakdown
    const categoryStats = await SupportTicket.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        status_counts: stats,
        category_breakdown: categoryStats
      }
    });

  } catch (error) {
    console.error('Ticket statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching statistics'
    });
  }
});

module.exports = router;