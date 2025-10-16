const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const delhiveryService = require('../services/delhiveryService');

const router = express.Router();

// @desc    Get all orders with filters and pagination
// @route   GET /api/orders
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn([
    'new', 'ready_to_ship', 'pickup_pending', 'manifested',
    'in_transit', 'out_for_delivery', 'delivered', 'ndr', 'rto', 'cancelled', 'lost'
  ]),
  query('payment_mode').optional().isIn(['prepaid', 'cod']),
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
      filterQuery['order_status.current_status'] = req.query.status;
    }

    if (req.query.payment_mode) {
      filterQuery['payment_info.payment_mode'] = req.query.payment_mode;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filterQuery.$or = [
        { order_id: searchRegex },
        { reference_id: searchRegex },
        { 'shipping_info.awb_number': searchRegex },
        { 'customer_info.buyer_name': searchRegex },
        { 'customer_info.phone': searchRegex }
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

    // Get orders with pagination
    const orders = await Order.find(filterQuery)
      .populate('pickup_info.warehouse_id', 'title name address')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalOrders = await Order.countDocuments(filterQuery);

    res.json({
      status: 'success',
      data: {
        orders,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalOrders / limit),
          total_orders: totalOrders,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching orders'
    });
  }
});

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).populate('pickup_info.warehouse_id', 'title name address contact_info');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching order'
    });
  }
});

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', auth, [
  body('customer_info.buyer_name').trim().notEmpty().withMessage('Buyer name is required'),
  body('customer_info.phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('customer_info.email').optional().isEmail().withMessage('Valid email is required'),
  body('delivery_address.full_address').trim().notEmpty().withMessage('Delivery address is required'),
  body('delivery_address.pincode').matches(/^[1-9][0-9]{5}$/).withMessage('Valid pincode is required'),
  body('delivery_address.city').trim().notEmpty().withMessage('City is required'),
  body('delivery_address.state').trim().notEmpty().withMessage('State is required'),
  body('pickup_info.warehouse_id').isMongoId().withMessage('Valid warehouse ID is required'),
  body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('products.*.product_name').trim().notEmpty().withMessage('Product name is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('products.*.unit_price').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  body('package_info.weight').isFloat({ min: 0.1 }).withMessage('Valid weight is required'),
  body('package_info.dimensions.length').isFloat({ min: 1 }).withMessage('Valid length is required'),
  body('package_info.dimensions.width').isFloat({ min: 1 }).withMessage('Valid width is required'),
  body('package_info.dimensions.height').isFloat({ min: 1 }).withMessage('Valid height is required'),
  body('payment_info.payment_mode').isIn(['prepaid', 'cod']).withMessage('Valid payment mode is required'),
  body('payment_info.order_value').isFloat({ min: 0 }).withMessage('Valid order value is required')
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

    // Verify warehouse belongs to user
    const warehouse = await Warehouse.findOne({
      _id: req.body.pickup_info.warehouse_id,
      user_id: userId,
      'status.warehouse_status': 'active'
    });

    if (!warehouse) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid warehouse or warehouse not active'
      });
    }

    // Create order
    const orderData = {
      ...req.body,
      user_id: userId
    };

    const order = new Order(orderData);
    await order.save();

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error creating order'
    });
  }
});

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
router.put('/:id', auth, [
  body('customer_info.buyer_name').optional().trim().notEmpty(),
  body('customer_info.phone').optional().matches(/^[6-9]\d{9}$/),
  body('customer_info.email').optional().isEmail(),
  body('delivery_address.full_address').optional().trim().notEmpty(),
  body('delivery_address.pincode').optional().matches(/^[1-9][0-9]{5}$/),
  body('payment_info.payment_mode').optional().isIn(['prepaid', 'cod']),
  body('payment_info.order_value').optional().isFloat({ min: 0 })
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

    const order = await Order.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check if order can be updated
    if (['delivered', 'rto', 'cancelled'].includes(order.order_status.current_status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update order in current status'
      });
    }

    // Update order fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        order[key] = req.body[key];
      }
    });

    await order.save();

    res.json({
      status: 'success',
      message: 'Order updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating order'
    });
  }
});

// @desc    Cancel order
// @route   DELETE /api/orders/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'rto', 'cancelled'].includes(order.order_status.current_status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot cancel order in current status'
      });
    }

    await order.updateStatus('cancelled', 'Order cancelled by user', '', 'user');

    res.json({
      status: 'success',
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error cancelling order'
    });
  }
});

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private
router.patch('/:id/status', auth, [
  body('status').isIn([
    'new', 'ready_to_ship', 'pickup_pending', 'manifested',
    'in_transit', 'out_for_delivery', 'delivered', 'ndr', 'rto', 'cancelled'
  ]).withMessage('Valid status is required'),
  body('remarks').optional().trim(),
  body('location').optional().trim()
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

    const order = await Order.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    const { status, remarks = '', location = '' } = req.body;

    await order.updateStatus(status, remarks, location, 'user');

    res.json({
      status: 'success',
      message: 'Order status updated successfully',
      data: {
        order_id: order.order_id,
        current_status: order.order_status.current_status,
        last_updated: order.order_status.last_updated
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating order status'
    });
  }
});

// @desc    Bulk update orders
// @route   PATCH /api/orders/bulk-update
// @access  Private
router.patch('/bulk-update', auth, [
  body('order_ids').isArray({ min: 1 }).withMessage('Order IDs array is required'),
  body('order_ids.*').isMongoId().withMessage('Valid order IDs are required'),
  body('action').isIn(['cancel', 'ready_to_ship', 'pickup_pending']).withMessage('Valid action is required'),
  body('remarks').optional().trim()
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

    const { order_ids, action, remarks = '' } = req.body;
    const userId = req.user._id;

    const orders = await Order.find({
      _id: { $in: order_ids },
      user_id: userId
    });

    if (orders.length !== order_ids.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some orders not found or access denied'
      });
    }

    const results = [];

    for (const order of orders) {
      try {
        let newStatus;
        switch (action) {
          case 'cancel':
            newStatus = 'cancelled';
            break;
          case 'ready_to_ship':
            newStatus = 'ready_to_ship';
            break;
          case 'pickup_pending':
            newStatus = 'pickup_pending';
            break;
        }

        await order.updateStatus(newStatus, remarks, '', 'user');
        results.push({
          order_id: order.order_id,
          status: 'success',
          new_status: newStatus
        });
      } catch (error) {
        results.push({
          order_id: order.order_id,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      status: 'success',
      message: 'Bulk update completed',
      data: results
    });

  } catch (error) {
    console.error('Bulk update orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating orders'
    });
  }
});

// @desc    Get order statistics
// @route   GET /api/orders/statistics
// @access  Private
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '30' } = req.query;
    const startDate = moment().subtract(parseInt(period), 'days').startOf('day');

    const stats = await Order.getOrderStats(userId, startDate.toDate(), new Date());

    const summary = {
      total_orders: 0,
      total_value: 0,
      status_breakdown: {}
    };

    stats.forEach(stat => {
      summary.total_orders += stat.count;
      summary.total_value += stat.total_value || 0;
      summary.status_breakdown[stat._id] = {
        count: stat.count,
        value: stat.total_value || 0
      };
    });

    res.json({
      status: 'success',
      data: {
        period_days: parseInt(period),
        summary,
        detailed_stats: stats
      }
    });

  } catch (error) {
    console.error('Order statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching order statistics'
    });
  }
});

// @desc    Track order by AWB or Order ID
// @route   GET /api/orders/track/:identifier
// @access  Public
router.get('/track/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    const order = await Order.findOne({
      $or: [
        { order_id: identifier },
        { 'shipping_info.awb_number': identifier }
      ]
    }).select('order_id shipping_info order_status customer_info.buyer_name delivery_address payment_info.payment_mode');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        order_id: order.order_id,
        awb_number: order.shipping_info.awb_number,
        current_status: order.order_status.current_status,
        status_history: order.order_status.status_history,
        customer_name: order.customer_info.buyer_name,
        delivery_city: order.delivery_address.city,
        payment_mode: order.payment_info.payment_mode
      }
    });

  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error tracking order'
    });
  }
});

// @desc    Generate shipping label
// @route   GET /api/orders/:id/label
// @access  Private
router.get('/:id/label', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).populate('pickup_info.warehouse_id');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    if (!order.shipping_info.awb_number) {
      return res.status(400).json({
        status: 'error',
        message: 'AWB number not assigned yet'
      });
    }

    // Generate label data
    const labelData = {
      awb_number: order.shipping_info.awb_number,
      order_id: order.order_id,
      sender: {
        name: order.pickup_info.warehouse_id.name,
        address: order.pickup_info.warehouse_id.address.full_address,
        city: order.pickup_info.warehouse_id.address.city,
        pincode: order.pickup_info.warehouse_id.address.pincode,
        phone: order.pickup_info.warehouse_id.contact_info.phone
      },
      receiver: {
        name: order.customer_info.buyer_name,
        address: order.delivery_address.full_address,
        city: order.delivery_address.city,
        pincode: order.delivery_address.pincode,
        phone: order.customer_info.phone
      },
      package_info: {
        weight: order.package_info.weight,
        dimensions: order.package_info.dimensions
      },
      payment_mode: order.payment_info.payment_mode,
      cod_amount: order.payment_info.cod_amount || 0,
      service_type: order.shipping_info.service_type
    };

    res.json({
      status: 'success',
      data: labelData
    });

  } catch (error) {
    console.error('Generate label error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error generating label'
    });
  }
});

module.exports = router;