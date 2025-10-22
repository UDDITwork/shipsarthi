// Location: backend/routes/warehouses.js
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const Warehouse = require('../models/Warehouse');
const delhiveryService = require('../services/delhiveryService');

const router = express.Router();

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
router.get('/', auth, [
  query('status').optional().isIn(['active', 'inactive', 'all'])
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
    const filterQuery = { user_id: userId };

    // Status filter
    if (req.query.status === 'active') {
      filterQuery.is_active = true;
    } else if (req.query.status === 'inactive') {
      filterQuery.is_active = false;
    }

    const warehouses = await Warehouse.find(filterQuery)
      .sort({ is_default: -1, createdAt: -1 });

    res.json({
      status: 'success',
      data: {
        warehouses,
        total_count: warehouses.length
      }
    });

  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching warehouses'
    });
  }
});

// @desc    Get warehouses for dropdown (active warehouses only)
// @route   GET /api/warehouses/dropdown
// @access  Private
router.get('/dropdown', auth, async (req, res) => {
  try {
    const warehouses = await Warehouse.find({
      user_id: req.user._id,
      is_active: true
    })
    .select('_id name title address.city address.state address.pincode')
    .sort({ is_default: -1, createdAt: -1 });

    res.json({
      status: 'success',
      data: warehouses
    });
  } catch (error) {
    console.error('Get warehouses dropdown error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching warehouses for dropdown'
    });
  }
});

// @desc    Get single warehouse by ID
// @route   GET /api/warehouses/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!warehouse) {
      return res.status(404).json({
        status: 'error',
        message: 'Warehouse not found'
      });
    }

    res.json({
      status: 'success',
      data: warehouse
    });

  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching warehouse'
    });
  }
});

// @desc    Create new warehouse
// @route   POST /api/warehouses
// @access  Private
router.post('/', auth, [
  body('name').notEmpty().trim().withMessage('Warehouse name is required'),
  body('title').optional().trim(),
  body('registered_name').optional().trim(),
  body('contact_person.name').notEmpty().trim().withMessage('Contact person name is required'),
  body('contact_person.phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('contact_person.alternative_phone').optional().matches(/^[6-9]\d{9}$/),
  body('contact_person.email').optional().isEmail(),
  body('address.full_address').notEmpty().trim().withMessage('Address is required'),
  body('address.landmark').optional().trim(),
  body('address.city').notEmpty().trim().withMessage('City is required'),
  body('address.state').notEmpty().trim().withMessage('State is required'),
  body('address.pincode').matches(/^\d{6}$/).withMessage('Valid 6-digit pincode is required'),
  body('address.country').optional().trim(),
  body('return_address.full_address').optional().trim(),
  body('return_address.city').optional().trim(),
  body('return_address.state').optional().trim(),
  body('return_address.pincode').optional().matches(/^\d{6}$/),
  body('return_address.country').optional().trim(),
  body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
  body('support_contact.email').optional().isEmail(),
  body('support_contact.phone').optional().matches(/^[6-9]\d{9}$/),
  body('is_default').optional().isBoolean(),
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

    const userId = req.user._id;

    // Check if warehouse name already exists for this user
    const existingWarehouse = await Warehouse.findOne({
      user_id: userId,
      name: req.body.name
    });

    if (existingWarehouse) {
      return res.status(400).json({
        status: 'error',
        message: 'Warehouse with this name already exists'
      });
    }

    // Create warehouse in database
    const warehouse = new Warehouse({
      ...req.body,
      user_id: userId
    });

    await warehouse.save();

    // Register with Delhivery
    const delhiveryData = warehouse.toDelhiveryFormat();
    
    const delhiveryResult = await delhiveryService.createWarehouse(delhiveryData);

    if (delhiveryResult.success) {
      warehouse.delhivery_registered = true;
      warehouse.delhivery_response = delhiveryResult.data;
      warehouse.delhivery_warehouse_id = delhiveryResult.data.data?.name; // Store Delhivery warehouse name
      await warehouse.save();

      res.status(201).json({
        status: 'success',
        message: 'Warehouse created and registered with Delhivery successfully',
        data: {
          warehouse,
          delhivery_response: delhiveryResult.data,
          business_hours: delhiveryResult.data.data?.business_hours,
          business_days: delhiveryResult.data.data?.business_days
        }
      });
    } else {
      // Mark as not registered but keep in database
      warehouse.delhivery_registered = false;
      warehouse.delhivery_response = {
        error: delhiveryResult.error,
        timestamp: new Date()
      };
      await warehouse.save();

      res.status(201).json({
        status: 'partial_success',
        message: 'Warehouse created in database but failed to register with Delhivery',
        data: {
          warehouse,
          delhivery_error: delhiveryResult.error
        }
      });
    }

  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error creating warehouse'
    });
  }
});

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private
router.put('/:id', auth, [
  body('name').optional().notEmpty().trim(),
  body('title').optional().trim(),
  body('contact_person.name').optional().notEmpty().trim(),
  body('contact_person.phone').optional().matches(/^[6-9]\d{9}$/),
  body('contact_person.alternative_phone').optional().matches(/^[6-9]\d{9}$/),
  body('contact_person.email').optional().isEmail(),
  body('address.full_address').optional().notEmpty().trim(),
  body('address.city').optional().notEmpty().trim(),
  body('address.state').optional().notEmpty().trim(),
  body('address.pincode').optional().matches(/^\d{6}$/),
  body('return_address.full_address').optional().notEmpty().trim(),
  body('return_address.city').optional().notEmpty().trim(),
  body('return_address.state').optional().notEmpty().trim(),
  body('return_address.pincode').optional().matches(/^\d{6}$/),
  body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
  body('is_active').optional().isBoolean(),
  body('is_default').optional().isBoolean(),
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

    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!warehouse) {
      return res.status(404).json({
        status: 'error',
        message: 'Warehouse not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        warehouse[key] = req.body[key];
      }
    });

    await warehouse.save();

    res.json({
      status: 'success',
      message: 'Warehouse updated successfully',
      data: warehouse
    });

  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error updating warehouse'
    });
  }
});

// @desc    Set warehouse as default
// @route   PATCH /api/warehouses/:id/set-default
// @access  Private
router.patch('/:id/set-default', auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!warehouse) {
      return res.status(404).json({
        status: 'error',
        message: 'Warehouse not found'
      });
    }

    // Set as default (pre-save hook will handle removing default from others)
    warehouse.is_default = true;
    await warehouse.save();

    res.json({
      status: 'success',
      message: 'Warehouse set as default successfully',
      data: warehouse
    });

  } catch (error) {
    console.error('Set default warehouse error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error setting default warehouse'
    });
  }
});

// @desc    Toggle warehouse status (active/inactive)
// @route   PATCH /api/warehouses/:id/toggle-status
// @access  Private
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!warehouse) {
      return res.status(404).json({
        status: 'error',
        message: 'Warehouse not found'
      });
    }

    // Toggle status
    warehouse.is_active = !warehouse.is_active;
    await warehouse.save();

    res.json({
      status: 'success',
      message: `Warehouse ${warehouse.is_active ? 'activated' : 'deactivated'} successfully`,
      data: warehouse
    });

  } catch (error) {
    console.error('Toggle warehouse status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error toggling warehouse status'
    });
  }
});

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!warehouse) {
      return res.status(404).json({
        status: 'error',
        message: 'Warehouse not found'
      });
    }

    // Check if warehouse is being used in any orders
    const Order = require('../models/Order');
    const ordersCount = await Order.countDocuments({
      user_id: req.user._id,
      'pickup_address.name': warehouse.name
    });

    if (ordersCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete warehouse. It is being used in ${ordersCount} order(s). Please deactivate it instead.`
      });
    }

    await warehouse.deleteOne();

    res.json({
      status: 'success',
      message: 'Warehouse deleted successfully'
    });

  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error deleting warehouse'
    });
  }
});

// @desc    Get warehouse statistics
// @route   GET /api/warehouses/statistics/overview
// @access  Private
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = {
      total_warehouses: await Warehouse.countDocuments({ user_id: userId }),
      active_warehouses: await Warehouse.countDocuments({ user_id: userId, is_active: true }),
      inactive_warehouses: await Warehouse.countDocuments({ user_id: userId, is_active: false }),
      delhivery_registered: await Warehouse.countDocuments({ user_id: userId, delhivery_registered: true })
    };

    const defaultWarehouse = await Warehouse.findOne({
      user_id: userId,
      is_default: true,
      is_active: true
    });

    res.json({
      status: 'success',
      data: {
        stats,
        default_warehouse: defaultWarehouse
      }
    });

  } catch (error) {
    console.error('Warehouse statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching warehouse statistics'
    });
  }
});

module.exports = router;