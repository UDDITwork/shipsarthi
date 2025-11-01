const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const delhiveryService = require('../services/delhiveryService');
const websocketService = require('../services/websocketService');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to determine zone from pincodes
function getZoneFromPincode(pickupPincode, deliveryPincode) {
  if (!pickupPincode || !deliveryPincode || pickupPincode.length !== 6 || deliveryPincode.length !== 6) {
    return '';
  }
  
  // Same pincode = Zone A (Local)
  if (pickupPincode === deliveryPincode) return 'A';
  
  const pickupFirstDigit = pickupPincode[0];
  const deliveryFirstDigit = deliveryPincode[0];
  
  // Within same first digit = Zone B (Regional)
  if (pickupFirstDigit === deliveryFirstDigit) return 'B';
  
  // Metro to Metro
  if (['1', '2', '3', '4'].includes(pickupFirstDigit) && ['1', '2', '3', '4'].includes(deliveryFirstDigit)) return 'C1';
  if (['5', '6', '7', '8', '9'].includes(pickupFirstDigit) && ['5', '6', '7', '8', '9'].includes(deliveryFirstDigit)) return 'C2';
  
  // Rest of India
  return 'D1'; // Default zone
}

// @desc    Get all orders with filters and pagination
// @route   GET /api/orders
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn([
    'new', 'ready_to_ship', 'pickup_pending', 'manifested',
    'in_transit', 'out_for_delivery', 'delivered', 'ndr', 'rto', 'cancelled', 'lost', 'all'
  ]),
  query('order_type').optional().isIn(['forward', 'reverse']),
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
      filterQuery['status'] = req.query.status;
    }

    // Apply order type filter if provided
    if (req.query.order_type) {
      filterQuery['order_type'] = req.query.order_type;
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
      filterQuery.createdAt = {};
      if (req.query.date_from) {
        filterQuery.createdAt.$gte = new Date(req.query.date_from);
      }
      if (req.query.date_to) {
        filterQuery.createdAt.$lte = new Date(req.query.date_to);
      }
    }

    // Get orders with pagination
    const orders = await Order.find(filterQuery)
      .sort({ createdAt: -1 })
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

// @desc    Get single order by order_id
// @route   GET /api/orders/order/:orderId
// @access  Private
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      order_id: req.params.orderId,
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
    console.error('Get order by order_id error:', error);
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
  // Order Details
  body('order_date').optional().isISO8601().withMessage('Valid order date is required'),
  body('reference_id').optional().trim(),
  body('invoice_number').optional().trim(),
  
  // Customer Information
  body('customer_info.buyer_name').trim().notEmpty().withMessage('Buyer name is required'),
  body('customer_info.phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('customer_info.alternate_phone').optional().custom((value) => {
    // Allow empty/undefined/null, but if provided, validate format
    if (!value || value.trim() === '') {
      return true; // Empty is allowed
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
      throw new Error('Valid alternate phone number is required');
    }
    return true;
  }),
  body('customer_info.email').optional().custom((value) => {
    // Allow empty/undefined/null, but if provided, validate email format
    if (!value || value.trim() === '') {
      return true; // Empty is allowed
    }
    // Basic email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Valid email is required');
    }
    return true;
  }),
  body('customer_info.gstin').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(value)) {
        throw new Error('GSTIN must be in format: 22AAAAA0000A1Z5');
      }
    }
    return true;
  }),
  
  // Delivery Address
  body('delivery_address.address_line_1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('delivery_address.address_line_2').optional().trim(),
  body('delivery_address.pincode').matches(/^[1-9][0-9]{5}$/).withMessage('Valid pincode is required'),
  body('delivery_address.city').trim().notEmpty().withMessage('City is required'),
  body('delivery_address.state').trim().notEmpty().withMessage('State is required'),
  
  // Warehouse/Pickup Address
  body('pickup_address.warehouse_id').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!mongoIdRegex.test(value)) {
        throw new Error('Valid warehouse ID is required');
      }
    }
    return true;
  }),
  body('pickup_address.name').optional().trim().notEmpty().withMessage('Warehouse name is required'),
  body('pickup_address.full_address').optional().trim().notEmpty().withMessage('Warehouse address is required'),
  body('pickup_address.city').optional().trim().notEmpty().withMessage('Warehouse city is required'),
  body('pickup_address.state').optional().trim().notEmpty().withMessage('Warehouse state is required'),
  body('pickup_address.pincode').optional().matches(/^[1-9][0-9]{5}$/).withMessage('Valid warehouse pincode is required'),
  body('pickup_address.phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid warehouse phone is required'),
  
  // Products
  body('products').isArray({ min: 1 }).withMessage('At least one product is required'),
  body('products.*.product_name').trim().notEmpty().withMessage('Product name is required'),
  body('products.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('products.*.unit_price').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  body('products.*.hsn_code').optional().trim(),
  body('products.*.category').optional().trim(),
  body('products.*.sku').optional().trim(),
  body('products.*.discount').optional().isFloat({ min: 0 }).withMessage('Valid discount is required'),
  body('products.*.tax').optional().isFloat({ min: 0 }).withMessage('Valid tax is required'),
  
  // Package Information
  body('package_info.package_type').isIn(['Single Package (B2C)', 'Multiple Package (B2C)', 'Multiple Package (B2B)']).withMessage('Valid package type is required'),
  body('package_info.weight').isFloat({ min: 0.1 }).withMessage('Valid weight is required'),
  body('package_info.dimensions.length').isFloat({ min: 1 }).withMessage('Valid length is required'),
  body('package_info.dimensions.width').isFloat({ min: 1 }).withMessage('Valid width is required'),
  body('package_info.dimensions.height').isFloat({ min: 1 }).withMessage('Valid height is required'),
  body('package_info.number_of_boxes').optional().isInt({ min: 1 }).withMessage('Valid number of boxes is required'),
  body('package_info.weight_per_box').optional().custom((value, { req }) => {
    // If weight_per_box is not provided, calculate it from total weight and number of boxes
    if (!value || value === 0) {
      const totalWeight = parseFloat(req.body.package_info?.weight) || 0;
      const numberOfBoxes = parseInt(req.body.package_info?.number_of_boxes) || 1;
      const calculatedWeightPerBox = totalWeight / numberOfBoxes;
      
      if (calculatedWeightPerBox < 0.1) {
        throw new Error('Weight per box must be at least 0.1 kg');
      }
    } else {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0.1) {
        throw new Error('Weight per box must be at least 0.1 kg');
      }
    }
    return true;
  }),
  body('package_info.rov_type').optional().trim(),
  body('package_info.rov_owner').optional().trim(),
  
  // Payment Information
  body('payment_info.payment_mode').isIn(['Prepaid', 'COD']).withMessage('Valid payment mode is required'),
  body('payment_info.order_value').isFloat({ min: 0 }).withMessage('Valid order value is required'),
  body('payment_info.total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
  body('payment_info.shipping_charges').optional().isFloat({ min: 0 }).withMessage('Valid shipping charges is required'),
  body('payment_info.grand_total').optional().isFloat({ min: 0 }).withMessage('Valid grand total is required'),
  body('payment_info.cod_amount').optional().isFloat({ min: 0 }).withMessage('Valid COD amount is required'),
  
  // Seller Information
  body('seller_info.name').optional().trim(),
  body('seller_info.gst_number').optional().custom((value) => {
    if (value && value.trim() !== '') {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(value)) {
        throw new Error('Seller GST number must be in format: 22AAAAA0000A1Z5');
      }
    }
    return true;
  }),
  body('seller_info.reseller_name').optional().trim(),
  body('order_id').optional().trim()
], async (req, res) => {
  const { generateOrderId } = require('../utils/orderIdGenerator');
  // Use the Order ID from frontend if provided, otherwise generate one
  const orderId = req.body.order_id || generateOrderId();
  
  try {
    console.log('🚀 ORDER CREATION STARTED', {
      orderId,
      userId: req.user._id,
      timestamp: new Date().toISOString(),
      formData: req.body
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ VALIDATION FAILED', {
        orderId,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log('✅ VALIDATION PASSED', {
      orderId,
      timestamp: new Date().toISOString()
    });

    const userId = req.user._id;

    // Handle warehouse selection
    let warehouse = null;
    let pickupAddress = {};

    if (req.body.pickup_address.warehouse_id) {
      // Use existing warehouse
      warehouse = await Warehouse.findOne({
        _id: req.body.pickup_address.warehouse_id,
        user_id: userId,
        is_active: true
      });

      if (!warehouse) {
        return res.status(400).json({
          status: 'error',
          message: 'Warehouse not found or not active'
        });
      }

      // Validate warehouse data completeness
      if (!warehouse.address?.full_address || !warehouse.contact_person?.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Warehouse data is incomplete. Please contact support.'
        });
      }

      // Validate required fields
      const requiredFields = ['name', 'address.full_address', 'address.city', 'address.state', 'address.pincode', 'contact_person.phone'];
      const missingFields = requiredFields.filter(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], warehouse);
        return !value || value.trim() === '';
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Warehouse is missing required fields: ${missingFields.join(', ')}`
        });
      }

      pickupAddress = {
        name: warehouse.name,
        full_address: warehouse.address.full_address,
        city: warehouse.address.city,
        state: warehouse.address.state,
        pincode: warehouse.address.pincode,
        phone: warehouse.contact_person.phone,
        country: warehouse.address.country || 'India'
      };
    } else {
      // Use manually entered warehouse details
      // Validate manual address fields
      const requiredManualFields = ['name', 'full_address', 'city', 'state', 'pincode', 'phone'];
      const missingManualFields = requiredManualFields.filter(field => {
        const value = req.body.pickup_address[field];
        return !value || value.trim() === '';
      });

      if (missingManualFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Missing required pickup address fields: ${missingManualFields.join(', ')}`
        });
      }

      // Validate phone number format
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(req.body.pickup_address.phone)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid phone number format for pickup address'
        });
      }

      // Validate pincode format
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(req.body.pickup_address.pincode)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid pincode format for pickup address'
        });
      }

      pickupAddress = {
        name: req.body.pickup_address.name,
        full_address: req.body.pickup_address.full_address,
        city: req.body.pickup_address.city,
        state: req.body.pickup_address.state,
        pincode: req.body.pickup_address.pincode,
        phone: req.body.pickup_address.phone,
        country: req.body.pickup_address.country || 'India'
      };
    }

    // Build full address from address lines
    const fullDeliveryAddress = `${req.body.delivery_address.address_line_1}${req.body.delivery_address.address_line_2 ? ', ' + req.body.delivery_address.address_line_2 : ''}`;

    // Create order data
    const orderData = {
      user_id: userId,
      order_id: orderId,
      order_date: req.body.order_date ? new Date(req.body.order_date) : new Date(),
      reference_id: req.body.reference_id && req.body.reference_id.trim() ? req.body.reference_id.trim() : undefined, // Set to undefined if empty to avoid duplicate key error
      invoice_number: req.body.invoice_number && req.body.invoice_number.trim() ? req.body.invoice_number.trim() : undefined,
      
      customer_info: {
        buyer_name: req.body.customer_info.buyer_name,
        phone: req.body.customer_info.phone,
        // Convert empty strings to undefined for optional fields
        alternate_phone: req.body.customer_info.alternate_phone && req.body.customer_info.alternate_phone.trim() !== '' 
          ? req.body.customer_info.alternate_phone.trim() 
          : undefined,
        email: req.body.customer_info.email && req.body.customer_info.email.trim() !== '' 
          ? req.body.customer_info.email.trim().toLowerCase() 
          : undefined,
        gstin: req.body.customer_info.gstin && req.body.customer_info.gstin.trim() !== '' 
          ? req.body.customer_info.gstin.trim() 
          : undefined
      },
      
      delivery_address: {
        address_line_1: req.body.delivery_address.address_line_1,
        address_line_2: req.body.delivery_address.address_line_2,
        full_address: fullDeliveryAddress,
        city: req.body.delivery_address.city,
        state: req.body.delivery_address.state,
        pincode: req.body.delivery_address.pincode,
        country: req.body.delivery_address.country || 'India',
        address_type: req.body.delivery_address.address_type || 'home'
      },
      
      pickup_address: pickupAddress,
      
      products: req.body.products.map(product => ({
        product_name: product.product_name,
        product_description: product.product_description,
        quantity: product.quantity,
        unit_price: product.unit_price,
        hsn_code: product.hsn_code,
        category: product.category,
        sku: product.sku,
        discount: product.discount || 0,
        tax: product.tax || 0,
        tax_rate: product.tax_rate
      })),
      
      package_info: {
        package_type: req.body.package_info.package_type,
        weight: req.body.package_info.weight,
        dimensions: req.body.package_info.dimensions,
        number_of_boxes: req.body.package_info.number_of_boxes || 1,
        weight_per_box: req.body.package_info.weight_per_box,
        rov_type: req.body.package_info.rov_type,
        rov_owner: req.body.package_info.rov_owner,
        weight_photo_url: req.body.package_info.weight_photo_url,
        dimensions_photo_url: req.body.package_info.dimensions_photo_url,
        save_dimensions: req.body.package_info.save_dimensions || false
      },
      
      payment_info: {
        payment_mode: req.body.payment_info.payment_mode,
        order_value: req.body.payment_info.order_value,
        total_amount: req.body.payment_info.total_amount,
        shipping_charges: req.body.payment_info.shipping_charges || 0,
        grand_total: req.body.payment_info.grand_total || req.body.payment_info.total_amount,
        cod_amount: req.body.payment_info.payment_mode === 'COD' ? req.body.payment_info.cod_amount : 0
      },
      
      seller_info: {
        name: req.body.seller_info?.name,
        gst_number: req.body.seller_info?.gst_number,
        reseller_name: req.body.seller_info?.reseller_name,
        address: warehouse ? warehouse.address.full_address : pickupAddress.full_address
      },
      
      shipping_mode: req.body.shipping_mode || 'Surface',
      status: 'new'
    };

    // Create order object but DON'T save to database yet
    const order = new Order(orderData);
    
    console.log('📋 ORDER PREPARED (NOT SAVED YET)', {
      orderId: order.order_id,
      timestamp: new Date().toISOString()
    });

    // Create shipment with Delhivery API FIRST
    let delhiveryResult = null;
    try {
      // STEP 1: Fetch waybill from Delhivery BEFORE creating shipment
      console.log('📋 FETCHING WAYBILL FROM DELHIVERY', {
        orderId: order.order_id,
        timestamp: new Date().toISOString()
      });

      const waybillResult = await delhiveryService.getWaybill(1);
      let preFetchedWaybill = null;

      if (waybillResult.success && waybillResult.waybills && waybillResult.waybills.length > 0) {
        preFetchedWaybill = waybillResult.waybills[0]; // Get first waybill from array
        console.log('✅ WAYBILL FETCHED', {
          orderId: order.order_id,
          waybill: preFetchedWaybill,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('⚠️ WAYBILL FETCH FAILED, Delhivery will auto-generate', {
          orderId: order.order_id,
          error: waybillResult.error,
          timestamp: new Date().toISOString()
        });
        // Continue without pre-fetched waybill - Delhivery will generate
      }

      // STEP 2: Prepare order data for Delhivery API (service expects order structure, not formatted shipment data)
      const orderDataForDelhivery = {
        order_id: order.order_id,
        customer_info: {
          buyer_name: order.customer_info.buyer_name,
          phone: order.customer_info.phone,
          email: order.customer_info.email || ''
        },
        delivery_address: {
          full_address: order.delivery_address.full_address,
          pincode: order.delivery_address.pincode,
          city: order.delivery_address.city,
          state: order.delivery_address.state,
          country: order.delivery_address.country || 'India',
          address_type: order.delivery_address.address_type || 'home'
        },
        pickup_address: {
          name: pickupAddress.name || 'SHIPSARTHI C2C',
          full_address: pickupAddress.full_address,
          city: pickupAddress.city,
          state: pickupAddress.state,
          pincode: pickupAddress.pincode,
          phone: pickupAddress.phone,
          country: pickupAddress.country || 'India'
        },
        products: order.products.map(p => ({
          product_name: p.product_name,
          quantity: p.quantity,
          hsn_code: p.hsn_code || '',
          unit_price: p.unit_price || 0
        })),
        package_info: {
          weight: order.package_info.weight, // in kg
          dimensions: {
            width: order.package_info.dimensions.width,
            height: order.package_info.dimensions.height,
            length: order.package_info.dimensions.length || order.package_info.dimensions.width
          }
        },
        payment_info: {
          payment_mode: order.payment_info.payment_mode,
          cod_amount: order.payment_info.cod_amount || 0,
          order_value: order.payment_info.order_value || order.payment_info.total_amount || 0
        },
        seller_info: {
          name: order.seller_info?.name || 'SHIPSARTHI',
          gst_number: order.seller_info?.gst_number || ''
        },
        invoice_number: order.invoice_number || `INV${order.order_id}`,
        shipping_mode: order.shipping_mode || 'Surface',
        address_type: order.delivery_address.address_type || 'home',
        waybill: preFetchedWaybill || undefined // Send pre-fetched waybill if available
      };

      console.log('🌐 CALLING DELHIVERY API', {
        orderId: order.order_id,
        orderData: {
          order_id: orderDataForDelhivery.order_id,
          customer_name: orderDataForDelhivery.customer_info.buyer_name,
          delivery_pincode: orderDataForDelhivery.delivery_address.pincode,
          pickup_pincode: orderDataForDelhivery.pickup_address.pincode
        },
        timestamp: new Date().toISOString()
      });

      // Call Delhivery API to create shipment
      delhiveryResult = await delhiveryService.createShipment(orderDataForDelhivery);

      console.log('📥 DELHIVERY RESULT RECEIVED', {
        orderId: order.order_id,
        success: delhiveryResult?.success,
        hasWaybill: !!delhiveryResult?.waybill,
        hasPackages: !!delhiveryResult?.packages,
        packagesLength: delhiveryResult?.packages?.length || 0,
        fullResult: JSON.stringify(delhiveryResult),
        timestamp: new Date().toISOString()
      });

      if (delhiveryResult.success) {
        // Extract AWB/waybill from response - handle multiple response formats
        let awbNumber = null;
        let packageData = null;

        // Try to get AWB from packages array first
        if (delhiveryResult.packages && Array.isArray(delhiveryResult.packages) && delhiveryResult.packages.length > 0) {
          packageData = delhiveryResult.packages[0];
          awbNumber = packageData.waybill || packageData.AWB || packageData.wb || null;
        }
        
        // Fallback to direct waybill property
        if (!awbNumber && delhiveryResult.waybill) {
          awbNumber = delhiveryResult.waybill;
          packageData = packageData || { waybill: awbNumber, status: 'Success' };
        }

        // Fallback to tracking_id
        if (!awbNumber && delhiveryResult.tracking_id) {
          awbNumber = delhiveryResult.tracking_id;
          packageData = packageData || { waybill: awbNumber, status: 'Success' };
        }

        if (awbNumber) {
          console.log('✅ DELHIVERY API SUCCESS - SHIPMENT CREATED', {
            orderId: order.order_id,
            awb: awbNumber,
            source: delhiveryResult.packages ? 'packages' : 'waybill',
            delhiveryResponse: delhiveryResult,
            timestamp: new Date().toISOString()
          });
          
          // Update order with Delhivery response
          order.delhivery_data = {
            waybill: awbNumber,
            package_id: packageData?.refnum || order.order_id,
            upload_wbn: delhiveryResult.upload_wbn || null,
            status: packageData?.status || 'Success',
            serviceable: packageData?.serviceable,
            sort_code: packageData?.sort_code,
            remarks: packageData?.remarks || [],
            cod_amount: packageData?.cod_amount || 0,
            payment: packageData?.payment,
            label_url: delhiveryResult.label_url || packageData?.label_url || null,
            expected_delivery_date: delhiveryResult.expected_delivery || packageData?.expected_delivery_date || null
          };

          // Update order status based on Delhivery response
          if (packageData?.status === 'Success' || !packageData?.status) {
            order.status = 'ready_to_ship';
          } else {
            order.status = 'new';
          }
          
          // NOW SAVE TO DATABASE - Only after Delhivery confirms shipment creation
          await order.save();
          
          console.log('💾 ORDER SAVED TO DATABASE AFTER DELHIVERY SUCCESS', {
            orderId: order.order_id,
            awb: awbNumber,
            status: order.status,
            timestamp: new Date().toISOString()
          });
          
          // Create or update customer record AFTER successful order save
          try {
            const customerData = {
              name: order.customer_info.buyer_name,
              phone: order.customer_info.phone,
              alternate_phone: order.customer_info.alternate_phone,
              email: order.customer_info.email,
              gstin: order.customer_info.gstin,
              address: {
                address_line_1: order.delivery_address.address_line_1,
                address_line_2: order.delivery_address.address_line_2,
                full_address: order.delivery_address.full_address,
                landmark: order.delivery_address.landmark,
                city: order.delivery_address.city,
                state: order.delivery_address.state,
                pincode: order.delivery_address.pincode,
                country: order.delivery_address.country,
                address_type: order.delivery_address.address_type
              },
              channel: 'order_creation'
            };

            const customer = await Customer.findOrCreate(userId, customerData);
            
            // Update customer order statistics
            await customer.updateOrderStats(order.payment_info.total_amount);
            
            console.log('👤 CUSTOMER CREATED/UPDATED AFTER ORDER SUCCESS', {
              orderId: order.order_id,
              customerId: customer._id,
              customerName: customer.name,
              customerPhone: customer.phone,
              timestamp: new Date().toISOString()
            });
          } catch (customerError) {
            console.error('❌ CUSTOMER CREATION FAILED', {
              orderId: order.order_id,
              error: customerError.message,
              timestamp: new Date().toISOString()
            });
            // Don't fail the order creation if customer creation fails
          }
          
          // Deduct wallet and create transaction AFTER successful order save
          try {
            const shippingCharges = order.payment_info.shipping_charges || 0;
            
            if (shippingCharges > 0) {
              console.log('💳 DEDUCTING WALLET FOR ORDER', {
                orderId: order.order_id,
                shippingCharges,
                timestamp: new Date().toISOString()
              });
              
              // Get current wallet balance
              const user = await User.findById(userId);
              const openingBalance = user.wallet_balance || 0;
              
              if (openingBalance < shippingCharges) {
                console.error('❌ INSUFFICIENT WALLET BALANCE', {
                  orderId: order.order_id,
                  required: shippingCharges,
                  available: openingBalance,
                  timestamp: new Date().toISOString()
                });
                throw new Error('Insufficient wallet balance');
              }
              
              // Deduct from wallet
              const closingBalance = openingBalance - shippingCharges;
              user.wallet_balance = closingBalance;
              await user.save();
              
              // Calculate zone from pickup and delivery pincodes
              const zone = getZoneFromPincode(
                order.pickup_address.pincode,
                order.delivery_address.pincode
              );
              
              // Create transaction record
              const transaction = new Transaction({
                transaction_id: `DR${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
                user_id: userId,
                transaction_type: 'debit',
                transaction_category: 'shipping_charge',
                amount: shippingCharges,
                description: `Shipping charges for order ${order.order_id}`,
                related_order_id: order._id,
                status: 'completed',
                transaction_date: new Date(),
                balance_info: {
                  opening_balance: openingBalance,
                  closing_balance: closingBalance
                },
                order_info: {
                  order_id: order.order_id,
                  awb_number: awbNumber,
                  weight: order.package_info.weight * 1000, // Convert kg to grams
                  zone: zone || 'D1', // Calculate zone from pincode
                  order_date: order.order_date
                }
              });
              
              await transaction.save();
              
              // Send WebSocket notifications for wallet deduction
              try {
                // Notification for wallet deduction
                websocketService.sendNotificationToClient(String(userId), {
                  type: 'wallet_deduction',
                  title: 'Wallet Deducted',
                  message: `₹${shippingCharges} deducted for order ${order.order_id}. New balance: ₹${closingBalance}`,
                  client_id: userId,
                  amount: shippingCharges,
                  transaction_type: 'debit',
                  new_balance: closingBalance,
                  order_id: order.order_id,
                  created_at: new Date()
                });
                
                // Real-time wallet balance update
                websocketService.sendNotificationToClient(String(userId), {
                  type: 'wallet_balance_update',
                  balance: closingBalance,
                  currency: 'INR',
                  previous_balance: openingBalance,
                  amount: shippingCharges,
                  transaction_id: transaction.transaction_id,
                  timestamp: new Date().toISOString()
                });
                
                console.log('📡 WALLET NOTIFICATIONS SENT:', {
                  orderId: order.order_id,
                  transactionId: transaction.transaction_id,
                  userId: userId,
                  amount: shippingCharges,
                  closing_balance: closingBalance
                });
              } catch (notifError) {
                console.error('Failed to send wallet notifications:', notifError);
              }
              
              console.log('✅ WALLET DEDUCTED SUCCESSFULLY', {
                orderId: order.order_id,
                transactionId: transaction.transaction_id,
                amount: shippingCharges,
                oldBalance: openingBalance,
                newBalance: closingBalance,
                zone: zone,
                userCategory: user.user_category,
                timestamp: new Date().toISOString()
              });
            }
          } catch (walletError) {
            console.error('❌ WALLET DEDUCTION FAILED', {
              orderId: order.order_id,
              error: walletError.message,
              timestamp: new Date().toISOString()
            });
            // Don't fail the order creation if wallet deduction fails
          }
          
          console.log('✅ Shipment created successfully for order:', order.order_id, 'AWB:', awbNumber);
        } else {
          console.log('⚠️ DELHIVERY API SUCCESS BUT NO AWB FOUND - ORDER NOT SAVED', {
            orderId: order.order_id,
            delhiveryResponse: delhiveryResult,
            hasWaybill: !!delhiveryResult?.waybill,
            hasPackages: !!delhiveryResult?.packages,
            hasTrackingId: !!delhiveryResult?.tracking_id,
            delhiveryResultKeys: Object.keys(delhiveryResult || {}),
            timestamp: new Date().toISOString()
          });
          
          // Don't save order if no AWB was generated
          return res.status(400).json({
            status: 'error',
            message: 'Shipment creation failed - No AWB number generated by Delhivery',
            debug_info: {
              delhivery_success: delhiveryResult?.success || false,
              has_waybill: !!delhiveryResult?.waybill,
              has_packages: !!delhiveryResult?.packages,
              response_keys: Object.keys(delhiveryResult || {})
            }
          });
        }
      } else {
        console.log('❌ DELHIVERY API FAILED - ORDER NOT SAVED', {
          orderId: order.order_id,
          delhiveryResponse: delhiveryResult,
          error: delhiveryResult.error,
          timestamp: new Date().toISOString()
        });
        
        // Return error - don't save order if Delhivery fails
        return res.status(400).json({
          status: 'error',
          message: 'Shipment creation failed with Delhivery',
          error: delhiveryResult.error || 'Unknown Delhivery API error',
          debug_info: {
            delhivery_success: delhiveryResult?.success || false,
            response_data: delhiveryResult
          }
        });
      }
    } catch (delhiveryError) {
      console.error('❌ DELHIVERY API ERROR - ORDER NOT SAVED:', {
        orderId: order.order_id,
        error: delhiveryError.message,
        timestamp: new Date().toISOString()
      });
      
      // Return error - don't save order if Delhivery API fails
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create shipment with Delhivery',
        error: delhiveryError.message,
        debug_info: {
          error_type: 'DELHIVERY_API_ERROR',
          order_id: order.order_id
        }
      });
    }

    // Save package template if requested
    if (req.body.package_info.save_dimensions) {
      try {
        const Package = require('../models/Package');
        const packageTemplate = new Package({
          user_id: userId,
          name: `${order.products[0]?.product_name || 'Package'} - ${order.package_info.package_type}`,
          description: `Auto-saved from order ${order.order_id}`,
          category: order.products[0]?.category || 'General',
          package_type: order.package_info.package_type,
          dimensions: order.package_info.dimensions,
          weight: order.package_info.weight,
          number_of_boxes: order.package_info.number_of_boxes,
          weight_per_box: order.package_info.weight_per_box,
          rov_type: order.package_info.rov_type,
          rov_owner: order.package_info.rov_owner,
          product_name: order.products[0]?.product_name || 'Product',
          hsn_code: order.products[0]?.hsn_code,
          unit_price: order.products[0]?.unit_price,
          weight_photo_url: order.package_info.weight_photo_url,
          dimensions_photo_url: order.package_info.dimensions_photo_url,
          tags: [order.products[0]?.category || 'General', order.package_info.package_type]
        });

        await packageTemplate.save();
        console.log('✅ Package template saved for future use');
      } catch (packageError) {
        console.error('❌ Error saving package template:', packageError.message);
      }
    }

    // Refresh order from database to get the latest delhivery_data
    await order.populate('user_id', 'name email');
    
    const awbNumber = order.delhivery_data?.waybill || delhiveryResult?.waybill || null;
    
    // Only reach here if Delhivery API succeeded and order was saved
    console.log('🎉 ORDER AND SHIPMENT CREATION COMPLETED', {
      orderId: order.order_id,
      awb: order.delhivery_data?.waybill || 'N/A',
      status: order.status,
      delhiverySuccess: delhiveryResult?.success || false,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      status: 'success',
      message: 'Order and shipment created successfully',
      data: {
        order: order,
        awb_number: order.delhivery_data?.waybill || null,
        shipment_info: order.delhivery_data || null,
        delhivery_confirmation: {
          success: true,
          awb: order.delhivery_data?.waybill,
          status: order.delhivery_data?.status,
          serviceable: order.delhivery_data?.serviceable,
          label_url: order.delhivery_data?.label_url,
          expected_delivery: order.delhivery_data?.expected_delivery_date
        }
      }
    });

  } catch (error) {
    console.log('💥 ORDER CREATION ERROR', {
      orderId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
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
    if (['delivered', 'rto', 'cancelled'].includes(order.status)) {
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
    if (['delivered', 'rto', 'cancelled'].includes(order.status)) {
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
        current_status: order.status,
        last_updated: order.updatedAt
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
        current_status: order.status,
        status_history: order.status_history,
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

// @desc    Request pickup for an order
// @route   POST /api/orders/:id/request-pickup
// @access  Private
router.post('/:id/request-pickup', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const orderId = req.params.id;

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      user_id: userId
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Validate order status
    if (order.status !== 'ready_to_ship') {
      return res.status(400).json({
        status: 'error',
        message: 'Order must be in ready_to_ship status to request pickup'
      });
    }

    // Validate AWB exists
    if (!order.delhivery_data?.waybill) {
      return res.status(400).json({
        status: 'error',
        message: 'AWB number is required for pickup request'
      });
    }

    // Extract warehouse details from pickup_address
    if (!order.pickup_address || !order.pickup_address.name) {
      return res.status(400).json({
        status: 'error',
        message: 'Pickup location is not configured for this order'
      });
    }

    // Calculate pickup date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
    const pickupTime = '11:00:00';

    logger.info('🚚 Requesting pickup from Delhivery', {
      orderId: order.order_id,
      waybill: order.delhivery_data.waybill,
      pickupLocation: order.pickup_address.name,
      pickupDate,
      pickupTime
    });

    // Call Delhivery Pickup API
    const pickupResult = await delhiveryService.schedulePickup({
      pickup_time: pickupTime,
      pickup_date: pickupDate,
      pickup_location: order.pickup_address.name,
      expected_package_count: 1
    });

    if (!pickupResult.success) {
      logger.error('❌ Pickup request failed', {
        orderId: order.order_id,
        waybill: order.delhivery_data.waybill,
        error: pickupResult.error
      });

      return res.status(500).json({
        status: 'error',
        message: pickupResult.error || 'Failed to request pickup from Delhivery'
      });
    }

    // Update order status and pickup information
    order.status = 'pickups_manifests';
    order.delhivery_data.pickup_request_status = 'scheduled';
    order.delhivery_data.pickup_request_date = new Date(pickupDate);
    order.delhivery_data.pickup_request_time = pickupTime;

    if (pickupResult.pickup_id) {
      order.delhivery_data.pickup_request_id = pickupResult.pickup_id;
    }

    await order.save();

    logger.info('✅ Pickup requested successfully', {
      orderId: order.order_id,
      waybill: order.delhivery_data.waybill,
      pickupRequestId: order.delhivery_data.pickup_request_id,
      pickupDate,
      pickupTime
    });

    res.json({
      status: 'success',
      message: 'Pickup requested successfully',
      data: {
        order_id: order.order_id,
        status: order.status,
        pickup_request_id: order.delhivery_data.pickup_request_id,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        pickup_status: order.delhivery_data.pickup_request_status
      }
    });

  } catch (error) {
    logger.error('❌ Request pickup error', {
      orderId: req.params.id,
      userId: req.user._id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      status: 'error',
      message: 'Server error requesting pickup'
    });
  }
});

module.exports = router;