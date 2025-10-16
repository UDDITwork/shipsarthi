const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const SupportTicket = require('../models/Support');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/support/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images, documents, audio, and video files
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/mpeg', 'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// @desc    Get all tickets with filters and pagination
// @route   GET /api/support
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'escalated']),
  query('category').optional(),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filterQuery = { user_id: userId };

    if (req.query.status && req.query.status !== 'all') {
      filterQuery.status = req.query.status;
    }

    if (req.query.category) {
      filterQuery.category = req.query.category;
    }

    if (req.query.priority) {
      filterQuery.priority = req.query.priority;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filterQuery.$or = [
        { ticket_id: searchRegex },
        { subject: searchRegex },
        { description: searchRegex },
        { awb_numbers: { $in: [searchRegex] } }
      ];
    }

    if (req.query.date_from || req.query.date_to) {
      filterQuery.created_at = {};
      if (req.query.date_from) {
        filterQuery.created_at.$gte = new Date(req.query.date_from);
      }
      if (req.query.date_to) {
        filterQuery.created_at.$lte = new Date(req.query.date_to);
      }
    }

    // Get tickets with pagination
    const tickets = await SupportTicket.find(filterQuery)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalTickets = await SupportTicket.countDocuments(filterQuery);

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

// @desc    Get single ticket by ID
// @route   GET /api/support/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).populate('related_orders', 'order_id customer_info.buyer_name');

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

// @desc    Create new ticket
// @route   POST /api/support
// @access  Private
router.post('/', auth, upload.array('attachments', 5), [
  body('category').isIn([
    'pickup_delivery', 'shipment_ndr_rto', 'edit_shipment_info', 'shipment_dispute',
    'finance', 'billing_taxation', 'claims', 'kyc_bank_verification',
    'technical_support', 'others'
  ]).withMessage('Valid category is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('subject').trim().notEmpty().isLength({ max: 200 }).withMessage('Subject is required and must be less than 200 characters'),
  body('description').trim().notEmpty().isLength({ max: 5000 }).withMessage('Description is required and must be less than 5000 characters'),
  body('awb_numbers').optional().isArray({ max: 10 }),
  body('contact_preference').optional().isIn(['email', 'phone', 'whatsapp', 'portal'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const user = req.user;

    // Process file attachments
    const attachments = [];
    if (req.files) {
      req.files.forEach(file => {
        let fileType = 'document';
        if (file.mimetype.startsWith('image/')) fileType = 'image';
        else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
        else if (file.mimetype.startsWith('video/')) fileType = 'video';

        attachments.push({
          file_name: file.originalname,
          file_url: file.path,
          file_type: fileType,
          file_size: file.size
        });
      });
    }

    // Create ticket
    const ticketData = {
      ...req.body,
      user_id: userId,
      customer_info: {
        name: user.your_name,
        email: user.email,
        phone: user.phone_number,
        company_name: user.company_name
      },
      attachments,
      awb_numbers: req.body.awb_numbers || []
    };

    const ticket = new SupportTicket(ticketData);
    await ticket.save();

    // Add initial message to conversation
    await ticket.addMessage('user', user.your_name, req.body.description, attachments);

    res.status(201).json({
      status: 'success',
      message: 'Ticket created successfully',
      data: {
        ticket_id: ticket.ticket_id,
        _id: ticket._id,
        status: ticket.status,
        priority: ticket.priority
      }
    });

  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error creating ticket'
    });
  }
});

// @desc    Add message to ticket conversation
// @route   POST /api/support/:id/messages
// @access  Private
router.post('/:id/messages', auth, upload.array('attachments', 5), [
  body('message').trim().notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
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

    // Process file attachments
    const attachments = [];
    if (req.files) {
      req.files.forEach(file => {
        let fileType = 'document';
        if (file.mimetype.startsWith('image/')) fileType = 'image';
        else if (file.mimetype.startsWith('audio/')) fileType = 'audio';
        else if (file.mimetype.startsWith('video/')) fileType = 'video';

        attachments.push({
          file_name: file.originalname,
          file_url: file.path,
          file_type: fileType,
          file_size: file.size
        });
      });
    }

    await ticket.addMessage('user', req.user.your_name, req.body.message, attachments);

    // Update ticket status if it was resolved/closed
    if (['resolved', 'closed'].includes(ticket.status)) {
      ticket.status = 'open';
      ticket.metrics.reopened_count += 1;
      await ticket.save();
    }

    res.json({
      status: 'success',
      message: 'Message added successfully',
      data: {
        ticket_id: ticket.ticket_id,
        status: ticket.status,
        last_message: ticket.conversation[ticket.conversation.length - 1]
      }
    });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error adding message'
    });
  }
});

// @desc    Update ticket status
// @route   PATCH /api/support/:id/status
// @access  Private
router.patch('/:id/status', auth, [
  body('status').isIn(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).withMessage('Valid status is required'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
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

    const { status, reason = '' } = req.body;
    const previousStatus = ticket.status;

    if (status === 'closed' && !['resolved'].includes(previousStatus)) {
      return res.status(400).json({
        status: 'error',
        message: 'Ticket must be resolved before closing'
      });
    }

    ticket.status = status;

    // Add system message about status change
    const statusMessage = `Ticket status changed from "${previousStatus}" to "${status}"${reason ? `. Reason: ${reason}` : ''}`;
    await ticket.addMessage('system', 'System', statusMessage, [], true);

    res.json({
      status: 'success',
      message: 'Ticket status updated successfully',
      data: {
        ticket_id: ticket.ticket_id,
        previous_status: previousStatus,
        current_status: ticket.status
      }
    });

  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating ticket status'
    });
  }
});

// @desc    Rate ticket resolution
// @route   POST /api/support/:id/rating
// @access  Private
router.post('/:id/rating', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
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

    if (!['resolved', 'closed'].includes(ticket.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Can only rate resolved or closed tickets'
      });
    }

    // Update resolution rating
    ticket.resolution.customer_satisfaction = {
      rating: req.body.rating,
      feedback: req.body.feedback || '',
      survey_date: new Date()
    };

    await ticket.save();

    res.json({
      status: 'success',
      message: 'Rating submitted successfully',
      data: {
        ticket_id: ticket.ticket_id,
        rating: req.body.rating
      }
    });

  } catch (error) {
    console.error('Rate ticket error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error submitting rating'
    });
  }
});

// @desc    Get ticket statistics
// @route   GET /api/support/statistics/overview
// @access  Private
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query;
    const startDate = moment().subtract(parseInt(period), 'days').startOf('day');

    const stats = await SupportTicket.getTicketStats(userId, startDate.toDate(), new Date());
    const categoryStats = await SupportTicket.getCategoryStats(startDate.toDate(), new Date());

    const summary = {
      total_tickets: 0,
      avg_resolution_time: 0,
      status_breakdown: {},
      category_breakdown: categoryStats.filter(cat => cat._id) // Filter out null categories
    };

    stats.forEach(stat => {
      summary.total_tickets += stat.count;
      summary.status_breakdown[stat._id] = {
        count: stat.count,
        avg_resolution_time: stat.avg_resolution_time || 0
      };
    });

    if (stats.length > 0) {
      summary.avg_resolution_time = stats.reduce((acc, stat) => acc + (stat.avg_resolution_time || 0), 0) / stats.length;
    }

    res.json({
      status: 'success',
      data: {
        period_days: parseInt(period),
        summary,
        detailed_stats: stats
      }
    });

  } catch (error) {
    console.error('Ticket statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching ticket statistics'
    });
  }
});

// @desc    Get SLA report
// @route   GET /api/support/sla-report
// @access  Private
router.get('/sla-report', auth, async (req, res) => {
  try {
    const slaReport = await SupportTicket.getSLAReport();

    // Filter by user
    const userSLAData = slaReport.filter(ticket => ticket.user_id && ticket.user_id.toString() === req.user._id.toString());

    const slaMetrics = {
      total_tickets: userSLAData.length,
      sla_breached: userSLAData.filter(t => t.breached_sla).length,
      avg_response_time: 0,
      on_time_percentage: 0
    };

    if (userSLAData.length > 0) {
      const totalResponseTime = userSLAData.reduce((acc, ticket) => acc + (ticket.response_time_minutes || 0), 0);
      slaMetrics.avg_response_time = totalResponseTime / userSLAData.length;
      slaMetrics.on_time_percentage = ((userSLAData.length - slaMetrics.sla_breached) / userSLAData.length * 100).toFixed(2);
    }

    res.json({
      status: 'success',
      data: {
        metrics: slaMetrics,
        detailed_tickets: userSLAData
      }
    });

  } catch (error) {
    console.error('SLA report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching SLA report'
    });
  }
});

// @desc    Reopen ticket
// @route   POST /api/support/:id/reopen
// @access  Private
router.post('/:id/reopen', auth, [
  body('reason').trim().notEmpty().withMessage('Reason for reopening is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
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

    if (!['resolved', 'closed'].includes(ticket.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Can only reopen resolved or closed tickets'
      });
    }

    await ticket.reopen(req.body.reason, req.user.your_name);

    res.json({
      status: 'success',
      message: 'Ticket reopened successfully',
      data: {
        ticket_id: ticket.ticket_id,
        status: ticket.status,
        reopened_count: ticket.metrics.reopened_count
      }
    });

  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error reopening ticket'
    });
  }
});

module.exports = router;