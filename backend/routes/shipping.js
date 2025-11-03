const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const delhiveryService = require('../services/delhiveryService');
const Order = require('../models/Order');
const NDR = require('../models/NDR');
const { body, validationResult } = require('express-validator');

router.post('/create-shipment',
    auth,
    [
        body('order_id').notEmpty().withMessage('Order ID is required'),
        body('customer_info.buyer_name').notEmpty().withMessage('Buyer name is required'),
        body('customer_info.phone').isMobilePhone('en-IN').withMessage('Valid phone number is required'),
        body('delivery_address.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pincode is required'),
        body('package_info.weight').isFloat({ min: 0.1 }).withMessage('Valid weight is required')
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

            if (!delhiveryService.validateApiKey()) {
                return res.status(503).json({
                    success: false,
                    message: 'Delhivery API not configured'
                });
            }

            const order = await Order.findOne({
                order_id: req.body.order_id,
                user_id: req.user.id
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (order.shipping_info.waybill) {
                return res.status(400).json({
                    success: false,
                    message: 'Shipment already created for this order'
                });
            }

            const shipmentResult = await delhiveryService.createShipment({
                ...req.body,
                pickup_address: req.user.warehouse_address
            });

            if (shipmentResult.success) {
                order.shipping_info.waybill = shipmentResult.waybill;
                order.shipping_info.tracking_id = shipmentResult.tracking_id;
                order.shipping_info.label_url = shipmentResult.label_url;
                order.shipping_info.expected_delivery = shipmentResult.expected_delivery;
                order.order_status.current_status = 'Shipped';
                order.order_status.status_history.push({
                    status: 'Shipped',
                    timestamp: new Date(),
                    comment: 'Shipment created with Delhivery'
                });

                await order.save();

                res.json({
                    success: true,
                    message: 'Shipment created successfully',
                    data: {
                        waybill: shipmentResult.waybill,
                        tracking_id: shipmentResult.tracking_id,
                        label_url: shipmentResult.label_url,
                        expected_delivery: shipmentResult.expected_delivery
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create shipment',
                    error: shipmentResult.error
                });
            }
        } catch (error) {
            console.error('Create shipment error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

// Public tracking endpoint (no authentication required)
router.get('/public/track/:waybill', async (req, res) => {
    try {
        if (!delhiveryService.validateApiKey()) {
            return res.status(503).json({
                success: false,
                message: 'Delhivery API not configured'
            });
        }

        const trackingResult = await delhiveryService.trackShipment(req.params.waybill);

        if (trackingResult.success) {
            res.json({
                success: true,
                data: trackingResult
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to track shipment',
                error: trackingResult.error
            });
        }
    } catch (error) {
        console.error('Public track shipment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Authenticated tracking endpoint (for logged-in users)
router.get('/track/:waybill', auth, async (req, res) => {
    try {
        if (!delhiveryService.validateApiKey()) {
            return res.status(503).json({
                success: false,
                message: 'Delhivery API not configured'
            });
        }

        const order = await Order.findOne({
            'shipping_info.waybill': req.params.waybill,
            user_id: req.user.id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const trackingResult = await delhiveryService.trackShipment(req.params.waybill);

        if (trackingResult.success) {
            if (order.order_status.current_status !== trackingResult.status) {
                order.order_status.current_status = trackingResult.status;
                order.order_status.status_history.push({
                    status: trackingResult.status,
                    timestamp: new Date(),
                    comment: trackingResult.current_location
                });
                await order.save();
            }

            res.json({
                success: true,
                data: trackingResult
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to track shipment',
                error: trackingResult.error
            });
        }
    } catch (error) {
        console.error('Track shipment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/cancel/:waybill', auth, async (req, res) => {
    try {
        if (!delhiveryService.validateApiKey()) {
            return res.status(503).json({
                success: false,
                message: 'Delhivery API not configured'
            });
        }

        const order = await Order.findOne({
            'shipping_info.waybill': req.params.waybill,
            user_id: req.user.id
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (['Delivered', 'RTO', 'Cancelled'].includes(order.order_status.current_status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel shipment in current status'
            });
        }

        const cancelResult = await delhiveryService.cancelShipment(req.params.waybill);

        if (cancelResult.success) {
            order.order_status.current_status = 'Cancelled';
            order.order_status.status_history.push({
                status: 'Cancelled',
                timestamp: new Date(),
                comment: req.body.reason || 'Shipment cancelled by user'
            });
            await order.save();

            res.json({
                success: true,
                message: cancelResult.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to cancel shipment',
                error: cancelResult.error
            });
        }
    } catch (error) {
        console.error('Cancel shipment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get('/serviceability/:pincode', auth, async (req, res) => {
    try {
        if (!delhiveryService.validateApiKey()) {
            return res.status(503).json({
                success: false,
                message: 'Delhivery API not configured'
            });
        }

        const serviceabilityResult = await delhiveryService.getServiceability(req.params.pincode);

        res.json({
            success: true,
            data: serviceabilityResult
        });
    } catch (error) {
        console.error('Check serviceability error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/rates',
    auth,
    [
        body('pickup_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pickup pincode is required'),
        body('delivery_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid delivery pincode is required'),
        body('weight').isFloat({ min: 0.1 }).withMessage('Valid weight is required')
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

            if (!delhiveryService.validateApiKey()) {
                return res.status(503).json({
                    success: false,
                    message: 'Delhivery API not configured'
                });
            }

            const { pickup_pincode, delivery_pincode, weight, cod_amount } = req.body;

            const ratesResult = await delhiveryService.getRates(
                pickup_pincode,
                delivery_pincode,
                weight,
                cod_amount || 0
            );

            res.json({
                success: true,
                data: ratesResult
            });
        } catch (error) {
            console.error('Get rates error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.post('/schedule-pickup',
    auth,
    [
        body('pickup_date').isISO8601().withMessage('Valid pickup date is required'),
        body('pickup_time').notEmpty().withMessage('Pickup time is required'),
        body('pickup_location').notEmpty().withMessage('Pickup location is required'),
        body('expected_package_count').isInt({ min: 1 }).withMessage('Valid package count is required')
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

            if (!delhiveryService.validateApiKey()) {
                return res.status(503).json({
                    success: false,
                    message: 'Delhivery API not configured'
                });
            }

            const pickupData = {
                pickup_time: req.body.pickup_time,
                pickup_date: req.body.pickup_date,
                pickup_location: req.body.pickup_location,
                expected_package_count: req.body.expected_package_count
            };

            const pickupResult = await delhiveryService.schedulePickup(pickupData);

            res.json({
                success: pickupResult.success,
                message: pickupResult.message,
                data: pickupResult.pickup_id ? { pickup_id: pickupResult.pickup_id } : null
            });
        } catch (error) {
            console.error('Schedule pickup error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/waybill', auth, async (req, res) => {
    try {
        if (!delhiveryService.validateApiKey()) {
            return res.status(503).json({
                success: false,
                message: 'Delhivery API not configured'
            });
        }

        const waybillResult = await delhiveryService.getWaybill();

        res.json({
            success: waybillResult.success,
            data: waybillResult.success ? { waybill: waybillResult.waybill } : null,
            error: waybillResult.error
        });
    } catch (error) {
        console.error('Get waybill error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/initiate-rto/:waybill',
    auth,
    [
        body('reason').notEmpty().withMessage('RTO reason is required')
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

            if (!delhiveryService.validateApiKey()) {
                return res.status(503).json({
                    success: false,
                    message: 'Delhivery API not configured'
                });
            }

            const order = await Order.findOne({
                'shipping_info.waybill': req.params.waybill,
                user_id: req.user.id
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const rtoResult = await delhiveryService.initiateRTO(req.params.waybill, req.body.reason);

            if (rtoResult.success) {
                order.order_status.current_status = 'RTO Initiated';
                order.order_status.status_history.push({
                    status: 'RTO Initiated',
                    timestamp: new Date(),
                    comment: req.body.reason
                });

                const ndr = await NDR.findOne({ waybill: req.params.waybill });
                if (ndr) {
                    ndr.rto_initiated = true;
                    ndr.rto_date = new Date();
                    ndr.rto_reason = req.body.reason;
                    await ndr.save();
                }

                await order.save();

                res.json({
                    success: true,
                    message: rtoResult.message
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to initiate RTO',
                    error: rtoResult.error
                });
            }
        } catch (error) {
            console.error('Initiate RTO error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

// Calculate shipping cost endpoint
router.post('/calculate-cost',
    auth,
    [
        body('billing_mode').optional().isIn(['E', 'S']).withMessage('Billing mode must be E (Express) or S (Surface)'),
        body('destination_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid destination pincode is required'),
        body('origin_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid origin pincode is required'),
        body('chargeable_weight').isInt({ min: 1 }).withMessage('Valid chargeable weight is required'),
        body('payment_type').optional().isIn(['Pre-paid', 'COD']).withMessage('Payment type must be Pre-paid or COD')
    ],
    async (req, res) => {
        try {
            // Check if Delhivery API is configured
            if (!delhiveryService.validateApiKey()) {
                return res.status(503).json({
                    success: false,
                    message: 'Delhivery API not configured'
                });
            }

            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const costData = {
                billing_mode: req.body.billing_mode || 'S',
                shipment_status: req.body.shipment_status || 'Delivered',
                destination_pincode: req.body.destination_pincode,
                origin_pincode: req.body.origin_pincode,
                chargeable_weight: req.body.chargeable_weight,
                payment_type: req.body.payment_type || 'Pre-paid'
            };

            const costResult = await delhiveryService.calculateShippingCost(costData);

            if (costResult.success) {
                res.json({
                    success: true,
                    message: 'Shipping cost calculated successfully',
                    data: {
                        calculated_cost: costResult.calculated_cost,
                        cost_details: costResult.data
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to calculate shipping cost',
                    error: costResult.error
                });
            }
        } catch (error) {
            console.error('Calculate shipping cost error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

// Calculate shipping cost based on rate card system
router.post('/calculate-rate-card',
    auth,
    [
        body('weight').isFloat({ min: 0.1 }).withMessage('Valid weight is required'),
        body('dimensions.length').isFloat({ min: 0.1 }).withMessage('Valid length is required'),
        body('dimensions.breadth').isFloat({ min: 0.1 }).withMessage('Valid breadth is required'),
        body('dimensions.height').isFloat({ min: 0.1 }).withMessage('Valid height is required'),
        body('zone').isIn(['A', 'B', 'C', 'D', 'E', 'F']).withMessage('Valid zone is required (C1, D1 removed - use C, D instead)'),
        body('cod_amount').optional().isFloat({ min: 0 }).withMessage('COD amount must be positive'),
        body('order_type').optional().isIn(['forward', 'rto']).withMessage('Order type must be "forward" or "rto"')
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

            const { weight, dimensions, zone, cod_amount, order_type = 'forward' } = req.body;
            const userCategory = req.user.user_category || 'Basic User';

            // SECURITY: Validate user category exists and is valid
            const RateCardService = require('../services/rateCardService');
            const availableCategories = RateCardService.getAvailableUserCategories();
            
            if (!availableCategories.includes(userCategory)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user category. Please contact admin to update your account.',
                    user_category: userCategory,
                    available_categories: availableCategories
                });
            }

            // Validate rate card exists for user category
            const rateCard = RateCardService.getRateCard(userCategory);
            if (!rateCard) {
                return res.status(400).json({
                    success: false,
                    message: `Rate card not available for your user category: ${userCategory}`,
                    user_category: userCategory
                });
            }

            // Validate order type
            if (!['forward', 'rto'].includes(order_type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order type. Must be "forward" or "rto"',
                    order_type: order_type
                });
            }

            // Calculate shipping charges with correct order type
            const result = RateCardService.calculateShippingCharges(
                userCategory,
                weight,
                dimensions,
                zone,
                cod_amount || 0,
                order_type
            );

            // Log rate calculation for audit
            console.log('💰 Rate calculated:', {
                user_id: req.user._id,
                user_category: userCategory,
                weight: weight,
                zone: zone,
                cod_amount: cod_amount || 0,
                total_charges: result.totalCharges,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'Shipping charges calculated successfully',
                data: {
                    ...result,
                    user_category: userCategory,
                    rate_card_applied: rateCard.userCategory
                }
            });
        } catch (error) {
            console.error('Calculate rate card cost error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

// Get rate card for user category
router.get('/rate-card/:userCategory', auth, async (req, res) => {
    try {
        const { userCategory } = req.params;
        const userCategoryFromToken = req.user.user_category || 'Basic User';
        
        // SECURITY: Validate that user can only access their own category's rate card
        // Handle "Advanced User" vs "Advanced" mismatch
        const normalizedUserCategory = userCategoryFromToken === 'Advanced User' ? 'Advanced' : userCategoryFromToken;
        const normalizedRequestedCategory = userCategory === 'Advanced User' ? 'Advanced' : userCategory;
        
        if (normalizedRequestedCategory !== normalizedUserCategory) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own user category rate card.',
                user_category: userCategoryFromToken,
                requested_category: userCategory
            });
        }
        
        // Import rate card service
        const RateCardService = require('../services/rateCardService');
        
        // Use normalized category for rate card lookup
        const rateCard = RateCardService.getRateCard(normalizedRequestedCategory);
        
        if (!rateCard) {
            return res.status(404).json({
                success: false,
                message: `Rate card not found for user category: ${userCategory}`,
                available_categories: RateCardService.getAvailableUserCategories()
            });
        }

        // Log rate card access for audit
        console.log('📊 Rate card accessed:', {
            user_id: req.user._id,
            user_category: userCategory,
            client_email: req.user.email,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: rateCard
        });
    } catch (error) {
        console.error('Get rate card error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get available user categories
router.get('/user-categories', auth, async (req, res) => {
    try {
        // Import rate card service
        const RateCardService = require('../services/rateCardService');
        
        const categories = RateCardService.getAvailableUserCategories();

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get user categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get('/health', async (req, res) => {
    try {
        const healthStatus = delhiveryService.getHealthStatus();
        res.json({
            success: true,
            data: healthStatus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get health status',
            error: error.message
        });
    }
});

module.exports = router;