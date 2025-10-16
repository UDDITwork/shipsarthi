const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { auth } = require('../middleware/auth');
const NDR = require('../models/NDR');
const Order = require('../models/Order');

const router = express.Router();

// @desc    Get all NDRs with filters and pagination
// @route   GET /api/ndr
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn([
    'new_ndr', 'customer_contacted', 'reattempt_scheduled', 'customer_response_pending',
    'address_updated', 'payment_updated', 'delivered', 'rto_initiated', 'rto_in_transit',
    'rto_delivered', 'closed'
  ]),
  query('reason').optional(),
  query('days_in_ndr_min').optional().isInt({ min: 0 }),
  query('days_in_ndr_max').optional().isInt({ min: 0 }),
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
      filterQuery['ndr_status.current_status'] = req.query.status;
    }

    if (req.query.reason) {
      filterQuery.ndr_reason = new RegExp(req.query.reason, 'i');
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filterQuery.$or = [
        { awb_number: searchRegex },
        { 'customer_info.name': searchRegex },
        { 'customer_info.phone': searchRegex }
      ];
    }

    if (req.query.days_in_ndr_min || req.query.days_in_ndr_max) {
      filterQuery['metrics.days_in_ndr'] = {};
      if (req.query.days_in_ndr_min) {
        filterQuery['metrics.days_in_ndr'].$gte = parseInt(req.query.days_in_ndr_min);
      }
      if (req.query.days_in_ndr_max) {
        filterQuery['metrics.days_in_ndr'].$lte = parseInt(req.query.days_in_ndr_max);
      }
    }

    if (req.query.date_from || req.query.date_to) {
      filterQuery.ndr_date = {};
      if (req.query.date_from) {
        filterQuery.ndr_date.$gte = new Date(req.query.date_from);
      }
      if (req.query.date_to) {
        filterQuery.ndr_date.$lte = new Date(req.query.date_to);
      }
    }

    // Get NDRs with pagination
    const ndrs = await NDR.find(filterQuery)
      .populate('order_id', 'order_id payment_info.order_value')
      .sort({ ndr_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalNDRs = await NDR.countDocuments(filterQuery);

    res.json({
      status: 'success',
      data: {
        ndrs,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalNDRs / limit),
          total_ndrs: totalNDRs,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get NDRs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching NDRs'
    });
  }
});

// @desc    Get single NDR by ID
// @route   GET /api/ndr/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const ndr = await NDR.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).populate('order_id', 'order_id customer_info payment_info delivery_address');

    if (!ndr) {
      return res.status(404).json({
        status: 'error',
        message: 'NDR not found'
      });
    }

    res.json({
      status: 'success',
      data: ndr
    });

  } catch (error) {
    console.error('Get NDR error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching NDR'
    });
  }
});

// @desc    Update NDR status
// @route   PATCH /api/ndr/:id/status
// @access  Private
router.patch('/:id/status', auth, [
  body('status').isIn([
    'new_ndr', 'customer_contacted', 'reattempt_scheduled', 'customer_response_pending',
    'address_updated', 'payment_updated', 'delivered', 'rto_initiated', 'rto_in_transit',
    'rto_delivered', 'closed'
  ]).withMessage('Valid status is required'),
  body('resolution_action').optional().isIn([
    'reattempt_delivery', 'update_address', 'customer_pickup', 'initiate_rto',
    'refund_initiated', 'delivered', 'cancelled'
  ]),
  body('notes').optional().trim()
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

    const ndr = await NDR.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ndr) {
      return res.status(404).json({
        status: 'error',
        message: 'NDR not found'
      });
    }

    const { status, resolution_action, notes = '' } = req.body;

    await ndr.updateStatus(status, resolution_action, notes);

    res.json({
      status: 'success',
      message: 'NDR status updated successfully',
      data: {
        ndr_id: ndr._id,
        current_status: ndr.ndr_status.current_status,
        resolution_action: ndr.ndr_status.resolution_action
      }
    });

  } catch (error) {
    console.error('Update NDR status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating NDR status'
    });
  }
});

// @desc    Add delivery attempt
// @route   POST /api/ndr/:id/attempts
// @access  Private
router.post('/:id/attempts', auth, [
  body('attempt_date').isISO8601().withMessage('Valid attempt date is required'),
  body('delivery_partner').optional().trim(),
  body('delivery_boy_name').optional().trim(),
  body('delivery_boy_phone').optional().matches(/^[6-9]\d{9}$/),
  body('attempt_status').isIn(['failed', 'customer_not_available', 'rescheduled']).withMessage('Valid attempt status is required'),
  body('failure_reason').optional().trim(),
  body('customer_feedback').optional().trim(),
  body('next_attempt_date').optional().isISO8601()
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

    const ndr = await NDR.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ndr) {
      return res.status(404).json({
        status: 'error',
        message: 'NDR not found'
      });
    }

    await ndr.addDeliveryAttempt(req.body);

    res.json({
      status: 'success',
      message: 'Delivery attempt added successfully',
      data: {
        total_attempts: ndr.metrics.total_attempts,
        last_attempt: ndr.delivery_attempts[ndr.delivery_attempts.length - 1]
      }
    });

  } catch (error) {
    console.error('Add delivery attempt error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error adding delivery attempt'
    });
  }
});

// @desc    Add customer communication
// @route   POST /api/ndr/:id/communication
// @access  Private
router.post('/:id/communication', auth, [
  body('type').isIn(['sms_sent', 'calls_made', 'emails_sent', 'whatsapp_messages']).withMessage('Valid communication type is required'),
  body('message_text').optional().trim(),
  body('call_duration').optional().isInt({ min: 0 }),
  body('call_status').optional().isIn(['connected', 'not_reachable', 'busy', 'switched_off']),
  body('call_notes').optional().trim(),
  body('agent_name').optional().trim(),
  body('email_subject').optional().trim(),
  body('email_content').optional().trim()
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

    const ndr = await NDR.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ndr) {
      return res.status(404).json({
        status: 'error',
        message: 'NDR not found'
      });
    }

    const { type, ...communicationData } = req.body;
    await ndr.addCustomerCommunication(type, communicationData);

    res.json({
      status: 'success',
      message: 'Communication logged successfully'
    });

  } catch (error) {
    console.error('Add communication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error adding communication'
    });
  }
});

// @desc    Initiate RTO
// @route   POST /api/ndr/:id/rto
// @access  Private
router.post('/:id/rto', auth, [
  body('reason').optional().trim().isLength({ max: 500 })
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

    const ndr = await NDR.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ndr) {
      return res.status(404).json({
        status: 'error',
        message: 'NDR not found'
      });
    }

    const { reason = 'Multiple delivery attempts failed' } = req.body;
    await ndr.initiateRTO(reason);

    res.json({
      status: 'success',
      message: 'RTO initiated successfully',
      data: {
        rto_status: ndr.rto_info.rto_status,
        rto_initiated_date: ndr.rto_info.rto_initiated_date
      }
    });

  } catch (error) {
    console.error('Initiate RTO error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error initiating RTO'
    });
  }
});

// @desc    Update customer response
// @route   PATCH /api/ndr/:id/customer-response
// @access  Private
router.patch('/:id/customer-response', auth, [
  body('response_type').isIn(['call', 'sms', 'email', 'whatsapp', 'portal']).withMessage('Valid response type is required'),
  body('customer_preference').isIn(['reattempt', 'reschedule', 'change_address', 'customer_pickup', 'cancel_order']).withMessage('Valid customer preference is required'),
  body('preferred_delivery_date').optional().isISO8601(),
  body('preferred_delivery_time').optional().trim(),
  body('updated_address').optional().trim(),
  body('updated_phone').optional().matches(/^[6-9]\d{9}$/),
  body('customer_notes').optional().trim()
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

    const ndr = await NDR.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!ndr) {
      return res.status(404).json({
        status: 'error',
        message: 'NDR not found'
      });
    }

    // Update customer response
    ndr.customer_response = {
      response_received: true,
      response_date: new Date(),
      ...req.body
    };

    // Update NDR status based on customer preference
    let newStatus = 'customer_response_pending';
    switch (req.body.customer_preference) {
      case 'reattempt':
      case 'reschedule':
        newStatus = 'reattempt_scheduled';
        break;
      case 'change_address':
        newStatus = 'address_updated';
        break;
      case 'customer_pickup':
        newStatus = 'customer_pickup';
        break;
      case 'cancel_order':
        newStatus = 'rto_initiated';
        break;
    }

    ndr.ndr_status.current_status = newStatus;
    await ndr.save();

    res.json({
      status: 'success',
      message: 'Customer response updated successfully',
      data: {
        current_status: ndr.ndr_status.current_status,
        customer_preference: ndr.customer_response.customer_preference
      }
    });

  } catch (error) {
    console.error('Update customer response error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating customer response'
    });
  }
});

// @desc    Get NDR statistics
// @route   GET /api/ndr/statistics/overview
// @access  Private
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query;
    const startDate = moment().subtract(parseInt(period), 'days').startOf('day');

    const stats = await NDR.getNDRStats(userId, startDate.toDate(), new Date());
    const reasonStats = await NDR.getNDRsByReason(userId);

    const summary = {
      total_ndrs: 0,
      avg_days_in_ndr: 0,
      status_breakdown: {},
      reason_breakdown: reasonStats
    };

    stats.forEach(stat => {
      summary.total_ndrs += stat.count;
      summary.status_breakdown[stat._id] = {
        count: stat.count,
        avg_days: stat.avg_days_in_ndr || 0
      };
    });

    if (stats.length > 0) {
      summary.avg_days_in_ndr = stats.reduce((acc, stat) => acc + (stat.avg_days_in_ndr || 0), 0) / stats.length;
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
    console.error('NDR statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching NDR statistics'
    });
  }
});

// @desc    Get escalation candidates
// @route   GET /api/ndr/escalation-candidates
// @access  Private
router.get('/escalation-candidates', auth, async (req, res) => {
  try {
    const candidates = await NDR.getEscalationCandidates();

    // Filter by user
    const userCandidates = candidates.filter(ndr => ndr.user_id.toString() === req.user._id.toString());

    res.json({
      status: 'success',
      data: {
        candidates: userCandidates,
        total_count: userCandidates.length
      }
    });

  } catch (error) {
    console.error('Get escalation candidates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching escalation candidates'
    });
  }
});

// @desc    Bulk NDR actions
// @route   PATCH /api/ndr/bulk-action
// @access  Private
router.patch('/bulk-action', auth, [
  body('ndr_ids').isArray({ min: 1 }).withMessage('NDR IDs array is required'),
  body('ndr_ids.*').isMongoId().withMessage('Valid NDR IDs are required'),
  body('action').isIn(['initiate_rto', 'mark_delivered', 'schedule_reattempt']).withMessage('Valid action is required'),
  body('notes').optional().trim()
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

    const { ndr_ids, action, notes = '' } = req.body;
    const userId = req.user._id;

    const ndrs = await NDR.find({
      _id: { $in: ndr_ids },
      user_id: userId
    });

    if (ndrs.length !== ndr_ids.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some NDRs not found or access denied'
      });
    }

    const results = [];

    for (const ndr of ndrs) {
      try {
        switch (action) {
          case 'initiate_rto':
            await ndr.initiateRTO(notes);
            break;
          case 'mark_delivered':
            await ndr.updateStatus('delivered', 'delivered', notes);
            break;
          case 'schedule_reattempt':
            await ndr.updateStatus('reattempt_scheduled', 'reattempt_delivery', notes);
            break;
        }

        results.push({
          ndr_id: ndr._id,
          awb_number: ndr.awb_number,
          status: 'success',
          new_status: ndr.ndr_status.current_status
        });
      } catch (error) {
        results.push({
          ndr_id: ndr._id,
          awb_number: ndr.awb_number,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      status: 'success',
      message: 'Bulk action completed',
      data: results
    });

  } catch (error) {
    console.error('Bulk NDR action error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error performing bulk action'
    });
  }
});

module.exports = router;