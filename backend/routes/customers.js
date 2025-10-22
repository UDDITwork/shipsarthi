// Location: backend/routes/customers.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

const router = express.Router();

// @desc    Get all customers with pagination and search
// @route   GET /api/customers
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'active',
      channel = '',
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      channel,
      sortBy,
      sortOrder: parseInt(sortOrder)
    };

    const customers = await Customer.getCustomersByUser(req.user._id, options);
    const totalCustomers = await Customer.countDocuments({ user_id: req.user._id });
    const stats = await Customer.getCustomerStats(req.user._id);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCustomers / parseInt(limit)),
          total_items: totalCustomers,
          items_per_page: parseInt(limit)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customers'
    });
  }
});

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).select('-__v');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer's order history
    const orders = await Order.find({
      user_id: req.user._id,
      'customer_info.phone': customer.phone
    })
    .select('order_id order_date status payment_info.order_value delivery_address.city')
    .sort({ order_date: -1 })
    .limit(10);

    res.json({
      success: true,
      data: {
        customer,
        recent_orders: orders
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer'
    });
  }
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
router.post('/', 
  auth,
  [
    body('name').trim().notEmpty().withMessage('Customer name is required'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('address.full_address').notEmpty().withMessage('Full address is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.state').notEmpty().withMessage('State is required'),
    body('address.pincode').matches(/^\d{6}$/).withMessage('Valid pincode is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const customerData = {
        ...req.body,
        user_id: req.user._id,
        channel: req.body.channel || 'custom'
      };

      const customer = await Customer.findOrCreate(req.user._id, customerData);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating customer'
      });
    }
  }
);

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
router.put('/:id',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('Customer name cannot be empty'),
    body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('address.pincode').optional().matches(/^\d{6}$/).withMessage('Valid pincode is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const customer = await Customer.findOne({
        _id: req.params.id,
        user_id: req.user._id
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Update customer fields
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined && req.body[key] !== null) {
          customer[key] = req.body[key];
        }
      });

      await customer.save();

      res.json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating customer'
      });
    }
  }
);

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has orders
    const orderCount = await Order.countDocuments({
      user_id: req.user._id,
      'customer_info.phone': customer.phone
    });

    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing orders. You can deactivate instead.'
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting customer'
    });
  }
});

// @desc    Update customer status (activate/deactivate)
// @route   PATCH /api/customers/:id/status
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or blocked'
      });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { status },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: `Customer ${status === 'active' ? 'activated' : status + 'd'} successfully`,
      data: customer
    });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating customer status'
    });
  }
});

// @desc    Get customer statistics
// @route   GET /api/customers/stats/overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Customer.getCustomerStats(req.user._id);
    
    // Get additional stats
    const totalOrders = await Order.countDocuments({ user_id: req.user._id });
    const totalOrderValue = await Order.aggregate([
      { $match: { user_id: req.user._id } },
      { $group: { _id: null, total: { $sum: '$payment_info.total_amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        total_orders_all: totalOrders,
        total_order_value_all: totalOrderValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer statistics'
    });
  }
});

// @desc    Search customers
// @route   GET /api/customers/search
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const customers = await Customer.find({
      user_id: req.user._id,
      status: 'active',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name phone email address.city')
    .limit(parseInt(limit))
    .sort({ name: 1 });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Search customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching customers'
    });
  }
});

module.exports = router;
