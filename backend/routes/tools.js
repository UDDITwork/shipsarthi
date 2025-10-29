const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const delhiveryService = require('../services/delhiveryService');
const Order = require('../models/Order');

const router = express.Router();

// Zone mapping function (simplified - in production, use proper zone mapping service)
function getZoneFromPincode(pickupPincode, deliveryPincode) {
    // This is a simplified zone mapping
    // In production, you should use a proper zone mapping service
    const pickupState = getStateFromPincode(pickupPincode);
    const deliveryState = getStateFromPincode(deliveryPincode);
    
    // Zone mapping logic (simplified)
    if (pickupState === deliveryState) {
        return 'A'; // Same state
    } else if (isNeighboringState(pickupState, deliveryState)) {
        return 'B'; // Neighboring state
    } else {
        return 'C1'; // Default for other cases
    }
}

function getStateFromPincode(pincode) {
    // Simplified state mapping based on pincode ranges
    const pincodeNum = parseInt(pincode);
    if (pincodeNum >= 110000 && pincodeNum <= 119999) return 'Delhi';
    if (pincodeNum >= 400000 && pincodeNum <= 499999) return 'Maharashtra';
    if (pincodeNum >= 500000 && pincodeNum <= 599999) return 'Telangana';
    if (pincodeNum >= 600000 && pincodeNum <= 699999) return 'Tamil Nadu';
    if (pincodeNum >= 700000 && pincodeNum <= 799999) return 'West Bengal';
    return 'Other';
}

function isNeighboringState(state1, state2) {
    const neighboringStates = {
        'Delhi': ['Haryana', 'Uttar Pradesh'],
        'Maharashtra': ['Gujarat', 'Madhya Pradesh', 'Karnataka'],
        'Telangana': ['Andhra Pradesh', 'Maharashtra', 'Karnataka'],
        'Tamil Nadu': ['Kerala', 'Karnataka', 'Andhra Pradesh'],
        'West Bengal': ['Odisha', 'Jharkhand', 'Bihar']
    };
    return neighboringStates[state1]?.includes(state2) || false;
}

// Get pincode information
router.get('/pincode-info/:pincode', async (req, res) => {
    try {
        const { pincode } = req.params;
        
        if (!pincode || pincode.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Valid 6-digit pincode is required'
            });
        }

        // Use Delhivery serviceability to get pincode info
        if (delhiveryService.validateApiKey()) {
            try {
                const serviceabilityResult = await delhiveryService.getServiceability(pincode);
                
                if (serviceabilityResult && serviceabilityResult.success && serviceabilityResult.serviceable) {
                    return res.json({
                        success: true,
                        pincode: pincode,
                        city: serviceabilityResult.city || 'Unknown',
                        state: serviceabilityResult.state_code || 'Unknown',
                        serviceable: serviceabilityResult.serviceable || false
                    });
                } else if (serviceabilityResult && serviceabilityResult.success && !serviceabilityResult.serviceable) {
                    return res.json({
                        success: true,
                        pincode: pincode,
                        city: 'Not Serviceable',
                        state: 'Not Serviceable',
                        serviceable: false
                    });
                }
            } catch (error) {
                console.log('Delhivery serviceability check failed, using fallback:', error.message);
            }
        }

        // Fallback: Basic pincode validation
        res.json({
            success: true,
            pincode: pincode,
            city: 'Unknown',
            state: 'Unknown',
            serviceable: true
        });

    } catch (error) {
        console.error('Get pincode info error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/rate-calculator',
    auth,
    [
        body('pickup_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pickup pincode is required'),
        body('delivery_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid delivery pincode is required'),
        body('weight').isFloat({ min: 0.1, max: 50 }).withMessage('Weight must be between 0.1kg and 50kg'),
        body('length').optional().isFloat({ min: 1 }).withMessage('Length must be greater than 0'),
        body('width').optional().isFloat({ min: 1 }).withMessage('Width must be greater than 0'),
        body('height').optional().isFloat({ min: 1 }).withMessage('Height must be greater than 0'),
        body('cod_amount').optional().isFloat({ min: 0 }).withMessage('COD amount must be positive'),
        body('declared_value').optional().isFloat({ min: 0 }).withMessage('Declared value must be positive')
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

            const {
                pickup_pincode,
                delivery_pincode,
                weight,
                length = 10,
                width = 10,
                height = 10,
                cod_amount = 0,
                declared_value = 0
            } = req.body;

            // SECURITY: Validate user category before calculating rates
            const userCategory = req.user.user_category || 'Basic User';
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

            const pickupServiceability = await delhiveryService.getServiceability(pickup_pincode);
            const deliveryServiceability = await delhiveryService.getServiceability(delivery_pincode);

            if (!pickupServiceability.success || !pickupServiceability.serviceable) {
                return res.status(400).json({
                    success: false,
                    message: 'Pickup pincode is not serviceable'
                });
            }

            if (!deliveryServiceability.success || !deliveryServiceability.serviceable) {
                return res.status(400).json({
                    success: false,
                    message: 'Delivery pincode is not serviceable'
                });
            }

            if (cod_amount > 0 && !deliveryServiceability.cash_on_delivery) {
                return res.status(400).json({
                    success: false,
                    message: 'COD is not available for this delivery pincode'
                });
            }

            const volumetricWeight = (length * width * height) / 5000;
            const chargeableWeight = Math.max(weight, volumetricWeight);

            // CORRECT LOGIC: Use Rate Card Service instead of Delhivery API for accurate calculations
            
            // Get zone from pincode (simplified - in production, use proper zone mapping)
            const zone = getZoneFromPincode(pickup_pincode, delivery_pincode);
            
            // Calculate using rate card with forward order type
            const rateResult = RateCardService.calculateShippingCharges(
                userCategory,
                chargeableWeight,
                { length, breadth: width, height },
                zone,
                cod_amount || 0,
                'forward' // Default to forward orders
            );

            // Calculate additional charges
            const fuelSurcharge = rateResult.forwardCharges * 0.08;
            const gst = (rateResult.forwardCharges + rateResult.codCharges + fuelSurcharge) * 0.18;
            const totalAmount = rateResult.forwardCharges + rateResult.codCharges + fuelSurcharge + gst;

            // Log rate calculation for audit
            console.log('💰 Tools rate calculated:', {
                user_id: req.user._id,
                user_category: userCategory,
                pickup_pincode,
                delivery_pincode,
                weight: weight,
                cod_amount: cod_amount,
                total_amount: parseFloat(totalAmount.toFixed(2)),
                timestamp: new Date().toISOString()
            });

            const response = {
                success: true,
                data: {
                    route_info: {
                        pickup_pincode,
                        delivery_pincode,
                        pickup_city: pickupServiceability.city,
                        delivery_city: deliveryServiceability.city,
                        pickup_state: pickupServiceability.state_code,
                        delivery_state: deliveryServiceability.state_code
                    },
                    package_info: {
                        actual_weight: weight,
                        volumetric_weight: parseFloat(volumetricWeight.toFixed(2)),
                        chargeable_weight: parseFloat(chargeableWeight.toFixed(2)),
                        dimensions: { length, width, height }
                    },
                    pricing: {
                        forward_charges: parseFloat(rateResult.forwardCharges.toFixed(2)),
                        rto_charges: parseFloat(rateResult.rtoCharges.toFixed(2)),
                        cod_charge: parseFloat(rateResult.codCharges.toFixed(2)),
                        fuel_surcharge: parseFloat(fuelSurcharge.toFixed(2)),
                        gst: parseFloat(gst.toFixed(2)),
                        total_amount: parseFloat(totalAmount.toFixed(2)),
                        currency: 'INR',
                        order_type: 'forward'
                    },
                    service_info: {
                        expected_delivery_days: 3, // Default delivery days
                        cod_available: deliveryServiceability.cash_on_delivery,
                        pickup_available: pickupServiceability.pickup_available,
                        service_type: 'Surface',
                        zone: zone
                    },
                    estimated_delivery_date: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                    user_category: userCategory
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Rate calculator error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/track-shipment',
    auth,
    [
        query('waybill').optional().isLength({ min: 10 }).withMessage('Valid waybill number is required'),
        query('order_id').optional().notEmpty().withMessage('Valid order ID is required')
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

            const { waybill, order_id } = req.query;

            if (!waybill && !order_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Either waybill or order_id is required'
                });
            }

            let order;
            if (order_id) {
                order = await Order.findOne({
                    order_id: order_id,
                    user_id: req.user._id
                });

                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }
            } else {
                order = await Order.findOne({
                    'shipping_info.waybill': waybill,
                    user_id: req.user._id
                });

                if (!order) {
                    return res.status(404).json({
                        success: false,
                        message: 'Order not found for this waybill'
                    });
                }
            }

            const trackingWaybill = waybill || order.shipping_info.waybill;

            if (!trackingWaybill) {
                return res.status(400).json({
                    success: false,
                    message: 'No waybill found for this order'
                });
            }

            const trackingResult = await delhiveryService.trackShipment(trackingWaybill);

            if (!trackingResult.success) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to track shipment',
                    error: trackingResult.error
                });
            }

            if (order.order_status.current_status !== trackingResult.status) {
                order.order_status.current_status = trackingResult.status;
                order.order_status.status_history.push({
                    status: trackingResult.status,
                    timestamp: new Date(),
                    comment: trackingResult.current_location
                });
                await order.save();
            }

            const response = {
                success: true,
                data: {
                    order_info: {
                        order_id: order.order_id,
                        customer_name: order.customer_info.buyer_name,
                        delivery_address: order.delivery_address,
                        order_date: order.order_date,
                        expected_delivery: order.shipping_info.expected_delivery
                    },
                    tracking_info: {
                        waybill: trackingResult.waybill,
                        current_status: trackingResult.status,
                        current_location: trackingResult.current_location,
                        expected_delivery: trackingResult.expected_delivery,
                        is_delivered: trackingResult.delivery_details.is_delivered,
                        delivered_date: trackingResult.delivery_details.delivered_date,
                        delivered_to: trackingResult.delivery_details.delivered_to
                    },
                    tracking_history: trackingResult.scans.map(scan => ({
                        date: scan.date,
                        location: scan.location,
                        status: scan.status,
                        description: scan.instructions,
                        formatted_date: new Date(scan.date).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    })).reverse()
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Track shipment error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/check-serviceability/:pincode', auth, async (req, res) => {
    try {
        const pincode = req.params.pincode;

        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pincode format. Must be 6 digits'
            });
        }

        const serviceabilityResult = await delhiveryService.getServiceability(pincode);

        if (!serviceabilityResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to check serviceability',
                error: serviceabilityResult.error
            });
        }

        const response = {
            success: true,
            data: {
                pincode: pincode,
                serviceable: serviceabilityResult.serviceable,
                location_info: serviceabilityResult.serviceable ? {
                    city: serviceabilityResult.city,
                    district: serviceabilityResult.district,
                    state_code: serviceabilityResult.state_code
                } : null,
                services: serviceabilityResult.serviceable ? {
                    cash_on_delivery: serviceabilityResult.cash_on_delivery,
                    cash_pickup: serviceabilityResult.cash_pickup,
                    prepaid: serviceabilityResult.pre_paid,
                    pickup_available: serviceabilityResult.pickup_available
                } : null
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Check serviceability error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/estimate-delivery',
    auth,
    [
        body('pickup_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pickup pincode is required'),
        body('delivery_pincode').isLength({ min: 6, max: 6 }).withMessage('Valid delivery pincode is required'),
        body('pickup_date').optional().isISO8601().withMessage('Valid pickup date is required')
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

            const { pickup_pincode, delivery_pincode, pickup_date } = req.body;

            const pickupServiceability = await delhiveryService.getServiceability(pickup_pincode);
            const deliveryServiceability = await delhiveryService.getServiceability(delivery_pincode);

            if (!pickupServiceability.success || !pickupServiceability.serviceable) {
                return res.status(400).json({
                    success: false,
                    message: 'Pickup pincode is not serviceable'
                });
            }

            if (!deliveryServiceability.success || !deliveryServiceability.serviceable) {
                return res.status(400).json({
                    success: false,
                    message: 'Delivery pincode is not serviceable'
                });
            }

            const ratesResult = await delhiveryService.getRates(
                pickup_pincode,
                delivery_pincode,
                0.5,
                0
            );

            let estimatedDeliveryDate;
            if (pickup_date) {
                const pickup = new Date(pickup_date);
                estimatedDeliveryDate = new Date(pickup);
                estimatedDeliveryDate.setDate(pickup.getDate() + (ratesResult.expected_delivery_days || 3));
            } else {
                estimatedDeliveryDate = new Date();
                estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + (ratesResult.expected_delivery_days || 3));
            }

            const isWeekend = estimatedDeliveryDate.getDay() === 0 || estimatedDeliveryDate.getDay() === 6;
            if (isWeekend) {
                estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + (estimatedDeliveryDate.getDay() === 0 ? 1 : 2));
            }

            const response = {
                success: true,
                data: {
                    route_info: {
                        pickup_pincode,
                        delivery_pincode,
                        pickup_city: pickupServiceability.city,
                        delivery_city: deliveryServiceability.city,
                        pickup_state: pickupServiceability.state_code,
                        delivery_state: deliveryServiceability.state_code
                    },
                    delivery_estimate: {
                        expected_delivery_days: ratesResult.expected_delivery_days || 3,
                        estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0],
                        pickup_date: pickup_date || new Date().toISOString().split('T')[0],
                        transit_time: `${ratesResult.expected_delivery_days || 3} business days`,
                        service_type: 'Surface'
                    },
                    service_availability: {
                        cod_available: deliveryServiceability.cash_on_delivery,
                        pickup_available: pickupServiceability.pickup_available,
                        same_day_delivery: false,
                        next_day_delivery: (ratesResult.expected_delivery_days || 3) <= 1
                    }
                }
            };

            res.json(response);
        } catch (error) {
            console.error('Estimate delivery error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/shipping-zones', auth, async (req, res) => {
    try {
        const zones = {
            success: true,
            data: {
                zone_info: {
                    zone_a: {
                        name: 'Zone A (Metro Cities)',
                        cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'],
                        delivery_time: '1-2 business days',
                        coverage: 'Full coverage with multiple delivery attempts'
                    },
                    zone_b: {
                        name: 'Zone B (Tier 1 Cities)',
                        cities: ['Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam'],
                        delivery_time: '2-3 business days',
                        coverage: 'Full coverage with standard delivery options'
                    },
                    zone_c: {
                        name: 'Zone C (Tier 2 Cities)',
                        delivery_time: '3-4 business days',
                        coverage: 'Standard coverage with limited time slots'
                    },
                    zone_d: {
                        name: 'Zone D (Rural Areas)',
                        delivery_time: '4-7 business days',
                        coverage: 'Basic coverage, limited COD availability'
                    }
                },
                service_features: {
                    cash_on_delivery: 'Available in all zones with varying limits',
                    prepaid_shipments: 'Available everywhere',
                    reverse_pickup: 'Available in zones A, B, and selected C areas',
                    express_delivery: 'Available in zones A and B only'
                }
            }
        };

        res.json(zones);
    } catch (error) {
        console.error('Shipping zones error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Tools API is healthy',
        timestamp: new Date().toISOString(),
        services: {
            rate_calculator: 'operational',
            shipment_tracking: 'operational',
            serviceability_check: 'operational',
            delivery_estimation: 'operational'
        }
    });
});

module.exports = router;