const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const Warehouse = require('../models/Warehouse');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const warehouses = await Warehouse.find({ user_id: req.user._id })
            .sort({ is_primary: -1, created_at: -1 })
            .lean();

        const warehousesWithStats = await Promise.all(warehouses.map(async (warehouse) => {
            const stats = await Order.aggregate([
                {
                    $match: {
                        user_id: req.user._id,
                        pickup_warehouse_id: warehouse._id,
                        created_at: {
                            $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_orders: { $sum: 1 },
                        total_value: { $sum: '$payment_info.order_value' }
                    }
                }
            ]);

            return {
                ...warehouse,
                stats: {
                    orders_last_30_days: stats[0]?.total_orders || 0,
                    value_last_30_days: stats[0]?.total_value || 0
                }
            };
        }));

        res.json({
            success: true,
            data: {
                warehouses: warehousesWithStats,
                total_count: warehouses.length
            }
        });
    } catch (error) {
        console.error('Get warehouses error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/',
    auth,
    [
        body('warehouse_name').trim().isLength({ min: 2, max: 100 }).withMessage('Warehouse name must be 2-100 characters'),
        body('contact_person').trim().isLength({ min: 2, max: 50 }).withMessage('Contact person name must be 2-50 characters'),
        body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('address.line1').trim().isLength({ min: 5, max: 200 }).withMessage('Address line 1 must be 5-200 characters'),
        body('address.city').trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
        body('address.state').trim().isLength({ min: 2, max: 50 }).withMessage('State must be 2-50 characters'),
        body('address.pincode').isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits'),
        body('operating_hours.monday.open').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format'),
        body('operating_hours.monday.close').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format'),
        body('pickup_config.advance_booking_hours').optional().isInt({ min: 2, max: 72 }).withMessage('Advance booking must be 2-72 hours'),
        body('pickup_config.cut_off_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format')
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

            const existingWarehouses = await Warehouse.countDocuments({ user_id: req.user._id });
            const isPrimary = existingWarehouses === 0;

            const warehouseId = `WH${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

            const warehouse = new Warehouse({
                warehouse_id: warehouseId,
                user_id: req.user._id,
                warehouse_name: req.body.warehouse_name,
                contact_person: req.body.contact_person,
                phone: req.body.phone,
                email: req.body.email,
                address: req.body.address,
                is_primary: isPrimary,
                is_active: true,
                operating_hours: req.body.operating_hours || {
                    monday: { open: '09:00', close: '18:00', is_working: true },
                    tuesday: { open: '09:00', close: '18:00', is_working: true },
                    wednesday: { open: '09:00', close: '18:00', is_working: true },
                    thursday: { open: '09:00', close: '18:00', is_working: true },
                    friday: { open: '09:00', close: '18:00', is_working: true },
                    saturday: { open: '09:00', close: '18:00', is_working: true },
                    sunday: { open: '10:00', close: '16:00', is_working: false }
                },
                pickup_config: {
                    advance_booking_hours: req.body.pickup_config?.advance_booking_hours || 24,
                    cut_off_time: req.body.pickup_config?.cut_off_time || '16:00',
                    max_packages_per_pickup: req.body.pickup_config?.max_packages_per_pickup || 50,
                    weight_limit_kg: req.body.pickup_config?.weight_limit_kg || 100
                },
                created_at: new Date(),
                updated_at: new Date()
            });

            await warehouse.save();

            if (isPrimary) {
                await User.findByIdAndUpdate(req.user._id, {
                    primary_warehouse_id: warehouse._id
                });
            }

            res.status(201).json({
                success: true,
                message: 'Warehouse created successfully',
                data: {
                    warehouse_id: warehouseId,
                    is_primary: isPrimary
                }
            });
        } catch (error) {
            console.error('Create warehouse error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/:warehouse_id', auth, async (req, res) => {
    try {
        const warehouse = await Warehouse.findOne({
            warehouse_id: req.params.warehouse_id,
            user_id: req.user._id
        }).lean();

        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found'
            });
        }

        const [orderStats, recentOrders] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        user_id: req.user._id,
                        pickup_warehouse_id: warehouse._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        total_orders: { $sum: 1 },
                        total_value: { $sum: '$payment_info.order_value' },
                        delivered_orders: {
                            $sum: {
                                $cond: [{ $eq: ['$order_status.current_status', 'delivered'] }, 1, 0]
                            }
                        },
                        avg_order_value: { $avg: '$payment_info.order_value' }
                    }
                }
            ]),
            Order.find({
                user_id: req.user._id,
                pickup_warehouse_id: warehouse._id
            })
                .sort({ created_at: -1 })
                .limit(10)
                .select('order_id customer_info.buyer_name order_status.current_status payment_info.order_value created_at')
                .lean()
        ]);

        const warehouseDetails = {
            ...warehouse,
            performance: {
                total_orders: orderStats[0]?.total_orders || 0,
                total_value: orderStats[0]?.total_value || 0,
                delivered_orders: orderStats[0]?.delivered_orders || 0,
                avg_order_value: orderStats[0]?.avg_order_value || 0,
                delivery_rate: orderStats[0]?.total_orders > 0
                    ? ((orderStats[0]?.delivered_orders || 0) / orderStats[0].total_orders * 100).toFixed(2)
                    : 0
            },
            recent_orders: recentOrders
        };

        res.json({
            success: true,
            data: warehouseDetails
        });
    } catch (error) {
        console.error('Get warehouse details error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.put('/:warehouse_id',
    auth,
    [
        body('warehouse_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Warehouse name must be 2-100 characters'),
        body('contact_person').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Contact person name must be 2-50 characters'),
        body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian phone number is required'),
        body('email').optional().isEmail().withMessage('Valid email is required'),
        body('address.line1').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Address line 1 must be 5-200 characters'),
        body('address.city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
        body('address.state').optional().trim().isLength({ min: 2, max: 50 }).withMessage('State must be 2-50 characters'),
        body('address.pincode').optional().isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits')
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

            const warehouse = await Warehouse.findOne({
                warehouse_id: req.params.warehouse_id,
                user_id: req.user._id
            });

            if (!warehouse) {
                return res.status(404).json({
                    success: false,
                    message: 'Warehouse not found'
                });
            }

            const updateFields = {};
            const allowedFields = [
                'warehouse_name', 'contact_person', 'phone', 'email',
                'address', 'operating_hours', 'pickup_config'
            ];

            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateFields[field] = req.body[field];
                }
            });

            updateFields.updated_at = new Date();

            await Warehouse.findByIdAndUpdate(warehouse._id, updateFields);

            res.json({
                success: true,
                message: 'Warehouse updated successfully'
            });
        } catch (error) {
            console.error('Update warehouse error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.post('/:warehouse_id/set-primary', auth, async (req, res) => {
    try {
        const warehouse = await Warehouse.findOne({
            warehouse_id: req.params.warehouse_id,
            user_id: req.user._id
        });

        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found'
            });
        }

        await Warehouse.updateMany(
            { user_id: req.user._id },
            { is_primary: false }
        );

        warehouse.is_primary = true;
        await warehouse.save();

        await User.findByIdAndUpdate(req.user._id, {
            primary_warehouse_id: warehouse._id
        });

        res.json({
            success: true,
            message: 'Primary warehouse updated successfully'
        });
    } catch (error) {
        console.error('Set primary warehouse error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.post('/:warehouse_id/toggle-status', auth, async (req, res) => {
    try {
        const warehouse = await Warehouse.findOne({
            warehouse_id: req.params.warehouse_id,
            user_id: req.user._id
        });

        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found'
            });
        }

        if (warehouse.is_primary && warehouse.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate primary warehouse'
            });
        }

        warehouse.is_active = !warehouse.is_active;
        warehouse.updated_at = new Date();
        await warehouse.save();

        res.json({
            success: true,
            message: `Warehouse ${warehouse.is_active ? 'activated' : 'deactivated'} successfully`,
            data: {
                is_active: warehouse.is_active
            }
        });
    } catch (error) {
        console.error('Toggle warehouse status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.delete('/:warehouse_id', auth, async (req, res) => {
    try {
        const warehouse = await Warehouse.findOne({
            warehouse_id: req.params.warehouse_id,
            user_id: req.user._id
        });

        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found'
            });
        }

        if (warehouse.is_primary) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete primary warehouse. Set another warehouse as primary first.'
            });
        }

        const ordersCount = await Order.countDocuments({
            user_id: req.user._id,
            pickup_warehouse_id: warehouse._id,
            'order_status.current_status': { $in: ['new', 'ready_to_ship', 'pickup_pending', 'manifested', 'in_transit'] }
        });

        if (ordersCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete warehouse. ${ordersCount} active orders are using this warehouse.`
            });
        }

        await Warehouse.findByIdAndDelete(warehouse._id);

        res.json({
            success: true,
            message: 'Warehouse deleted successfully'
        });
    } catch (error) {
        console.error('Delete warehouse error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get('/:warehouse_id/pickup-schedule', auth, async (req, res) => {
    try {
        const warehouse = await Warehouse.findOne({
            warehouse_id: req.params.warehouse_id,
            user_id: req.user._id
        });

        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found'
            });
        }

        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'lowercase' });

        const daySchedule = warehouse.operating_hours[dayName];

        if (!daySchedule || !daySchedule.is_working) {
            return res.json({
                success: true,
                data: {
                    date: targetDate.toISOString().split('T')[0],
                    is_working_day: false,
                    available_slots: [],
                    message: 'Warehouse is closed on this day'
                }
            });
        }

        const currentTime = new Date();
        const isToday = targetDate.toDateString() === currentTime.toDateString();

        const openTime = new Date(targetDate);
        const [openHour, openMinute] = daySchedule.open.split(':');
        openTime.setHours(parseInt(openHour), parseInt(openMinute), 0, 0);

        const closeTime = new Date(targetDate);
        const [closeHour, closeMinute] = daySchedule.close.split(':');
        closeTime.setHours(parseInt(closeHour), parseInt(closeMinute), 0, 0);

        const cutOffTime = new Date(targetDate);
        const [cutOffHour, cutOffMinute] = warehouse.pickup_config.cut_off_time.split(':');
        cutOffTime.setHours(parseInt(cutOffHour), parseInt(cutOffMinute), 0, 0);

        const slots = [];
        const slotDuration = 2;

        for (let time = new Date(openTime); time < cutOffTime; time.setHours(time.getHours() + slotDuration)) {
            const slotStart = new Date(time);
            const slotEnd = new Date(time.getTime() + (slotDuration * 60 * 60 * 1000));

            const isAvailable = !isToday || slotStart > new Date(currentTime.getTime() + (warehouse.pickup_config.advance_booking_hours * 60 * 60 * 1000));

            slots.push({
                start_time: slotStart.toTimeString().substr(0, 5),
                end_time: slotEnd.toTimeString().substr(0, 5),
                is_available: isAvailable,
                max_packages: warehouse.pickup_config.max_packages_per_pickup
            });
        }

        res.json({
            success: true,
            data: {
                date: targetDate.toISOString().split('T')[0],
                is_working_day: true,
                warehouse_hours: {
                    open: daySchedule.open,
                    close: daySchedule.close
                },
                pickup_config: {
                    cut_off_time: warehouse.pickup_config.cut_off_time,
                    advance_booking_hours: warehouse.pickup_config.advance_booking_hours,
                    max_packages: warehouse.pickup_config.max_packages_per_pickup
                },
                available_slots: slots
            }
        });
    } catch (error) {
        console.error('Get pickup schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get('/:warehouse_id/orders',
    auth,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn(['new', 'ready_to_ship', 'pickup_pending', 'in_transit', 'delivered', 'all']),
        query('date_from').optional().isISO8601(),
        query('date_to').optional().isISO8601()
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

            const warehouse = await Warehouse.findOne({
                warehouse_id: req.params.warehouse_id,
                user_id: req.user._id
            });

            if (!warehouse) {
                return res.status(404).json({
                    success: false,
                    message: 'Warehouse not found'
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const filterQuery = {
                user_id: req.user._id,
                pickup_warehouse_id: warehouse._id
            };

            if (req.query.status && req.query.status !== 'all') {
                filterQuery['order_status.current_status'] = req.query.status;
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

            const [orders, totalCount] = await Promise.all([
                Order.find(filterQuery)
                    .sort({ created_at: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('order_id customer_info order_status payment_info shipping_info created_at')
                    .lean(),
                Order.countDocuments(filterQuery)
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            res.json({
                success: true,
                data: {
                    warehouse_id: req.params.warehouse_id,
                    orders: orders,
                    pagination: {
                        current_page: page,
                        total_pages: totalPages,
                        total_count: totalCount,
                        has_next: page < totalPages,
                        has_prev: page > 1
                    }
                }
            });
        } catch (error) {
            console.error('Get warehouse orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/analytics/overview', auth, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const warehouseAnalytics = await Warehouse.aggregate([
            {
                $match: { user_id: req.user._id }
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { warehouseId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$pickup_warehouse_id', '$$warehouseId'] },
                                        { $gte: ['$created_at', startDate] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'orders'
                }
            },
            {
                $project: {
                    warehouse_id: 1,
                    warehouse_name: 1,
                    is_primary: 1,
                    is_active: 1,
                    total_orders: { $size: '$orders' },
                    total_value: {
                        $sum: '$orders.payment_info.order_value'
                    },
                    delivered_orders: {
                        $size: {
                            $filter: {
                                input: '$orders',
                                cond: { $eq: ['$$this.order_status.current_status', 'delivered'] }
                            }
                        }
                    },
                    pending_orders: {
                        $size: {
                            $filter: {
                                input: '$orders',
                                cond: {
                                    $in: ['$$this.order_status.current_status', ['new', 'ready_to_ship', 'pickup_pending']]
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    delivery_rate: {
                        $cond: [
                            { $eq: ['$total_orders', 0] },
                            0,
                            { $multiply: [{ $divide: ['$delivered_orders', '$total_orders'] }, 100] }
                        ]
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                period_days: days,
                start_date: startDate,
                warehouses: warehouseAnalytics
            }
        });
    } catch (error) {
        console.error('Warehouse analytics error:', error);
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
        message: 'Warehouse Management API is healthy',
        timestamp: new Date().toISOString(),
        services: {
            warehouse_management: 'operational',
            pickup_scheduling: 'operational',
            order_tracking: 'operational',
            analytics: 'operational'
        }
    });
});

module.exports = router;