// Location: backend/routes/tickets.js
const express = require('express');
const multer = require('multer');
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const cloudinaryService = require('../services/cloudinaryService');

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

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('related_orders', 'order_id delhivery_data.waybill');

    const totalTickets = await Ticket.countDocuments(filter);

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
    const ticket = await Ticket.findOne({
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
  body('awb_numbers').optional().isString(),
  body('comment').notEmpty().trim().isLength({ max: 500 }).withMessage('Comment is required (max 500 chars)')
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

    // Parse AWB numbers
    const awbArray = awb_numbers ? awb_numbers.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    if (awbArray.length > 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 10 AWB numbers allowed'
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

    // Find related orders by AWB
    const relatedOrders = await Order.find({
      user_id: userId,
      'delhivery_data.waybill': { $in: awbArray }
    }).select('_id');

    // Create ticket
    const ticket = new Ticket({
      user_id: userId,
      category,
      awb_numbers: awbArray,
      comment,
      attachments,
      related_orders: relatedOrders.map(o => o._id),
      metadata: {
        browser: req.headers['user-agent'],
        ip_address: req.ip
      }
    });

    await ticket.save();

    res.status(201).json({
      status: 'success',
      message: 'Ticket created successfully',
      data: ticket
    });

  } catch (error) {
    console.error('Create ticket error:', error);
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

    const ticket = await Ticket.findOne({
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

    // Add comment
    await ticket.addComment({
      comment_by: 'user',
      comment_text: req.body.comment,
      attachments
    });

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

    const ticket = await Ticket.findOne({
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
      await ticket.resolveTicket({
        resolved_by: req.user.name || req.user.email,
        resolution_text: req.body.resolution_text || 'Issue resolved'
      });
    } else if (status === 'closed') {
      await ticket.closeTicket();
    } else if (status === 'open') {
      await ticket.reopenTicket();
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

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        status: 'error',
        message: 'Ticket not found'
      });
    }

    await ticket.addRating({
      score: req.body.score,
      feedback: req.body.feedback
    });

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
      open: await Ticket.countDocuments({ user_id: userId, status: 'open' }),
      resolved: await Ticket.countDocuments({ user_id: userId, status: 'resolved' }),
      closed: await Ticket.countDocuments({ user_id: userId, status: 'closed' })
    };
    
    stats.all = stats.open + stats.resolved + stats.closed;

    // Category breakdown
    const categoryStats = await Ticket.aggregate([
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