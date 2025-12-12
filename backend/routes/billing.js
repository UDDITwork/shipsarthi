const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');
const crypto = require('crypto');
const hdfcPaymentService = require('../services/hdfcPaymentService');

const router = express.Router();

router.get('/wallet/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('wallet_balance');

        const pendingCredits = await Transaction.aggregate([
            {
                $match: {
                    user_id: req.user._id,
                    transaction_type: 'credit',
                    status: 'pending'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const pendingDebits = await Transaction.aggregate([
            {
                $match: {
                    user_id: req.user._id,
                    transaction_type: 'debit',
                    status: 'pending'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const availableBalance = user.wallet_balance || 0;
        const pendingCreditAmount = pendingCredits[0]?.total || 0;
        const pendingDebitAmount = pendingDebits[0]?.total || 0;

        res.json({
            success: true,
            data: {
                available_balance: parseFloat(availableBalance.toFixed(2)),
                pending_credits: parseFloat(pendingCreditAmount.toFixed(2)),
                pending_debits: parseFloat(pendingDebitAmount.toFixed(2)),
                effective_balance: parseFloat((availableBalance - pendingDebitAmount).toFixed(2)),
                currency: 'INR'
            }
        });
    } catch (error) {
        console.error('Get wallet balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// @desc    Get wallet transactions with order details
// @route   GET /api/billing/wallet-transactions
// @access  Private
router.get('/wallet-transactions', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const skip = (page - 1) * limit;

        // Get user info for account details
        const user = await User.findById(req.user._id).select('email your_name');

        // Build filter query
        const filterQuery = { user_id: req.user._id };

        // IMPORTANT: Only show completed transactions by default
        // Pending/failed wallet recharges should not appear in the transaction list
        // as they don't affect the wallet balance
        filterQuery.status = 'completed';

        // Filter by transaction type if provided
        if (req.query.type && req.query.type !== 'all') {
            filterQuery.transaction_type = req.query.type;
        }

        // Filter by transaction category if provided
        if (req.query.category && req.query.category !== 'all') {
            filterQuery.transaction_category = req.query.category;
        }

        // Filter by date range if provided
        if (req.query.date_from || req.query.date_to) {
            filterQuery.transaction_date = {};
            if (req.query.date_from) {
                filterQuery.transaction_date.$gte = new Date(req.query.date_from);
            }
            if (req.query.date_to) {
                // Add one day to include the entire end date
                const endDate = new Date(req.query.date_to);
                endDate.setDate(endDate.getDate() + 1);
                filterQuery.transaction_date.$lt = endDate;
            }
        }

        // Get transactions with populated order info
        const [transactions, totalCount] = await Promise.all([
            Transaction.find(filterQuery)
                .sort({ transaction_date: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'related_order_id',
                    select: 'order_id delhivery_data package_info order_date',
                    model: 'Order'
                })
                .lean(),
            Transaction.countDocuments(filterQuery)
        ]);

        // Calculate wallet summary
        const [credits, debits] = await Promise.all([
            Transaction.aggregate([
                { $match: { user_id: req.user._id, transaction_type: 'credit', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Transaction.aggregate([
                { $match: { user_id: req.user._id, transaction_type: 'debit', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ])
        ]);

        const totalCredits = credits[0]?.total || 0;
        const totalDebits = debits[0]?.total || 0;
        const currentBalance = user?.wallet_balance || 0;

        // Transform transactions for frontend
        const transformedTransactions = transactions.map(txn => ({
            transaction_id: txn.transaction_id,
            transaction_type: txn.transaction_type,
            transaction_category: txn.transaction_category || 'unknown',
            amount: txn.amount,
            description: txn.description,
            status: txn.status,
            transaction_date: txn.transaction_date,
            // Account details (constant for user)
            account_name: user?.your_name || 'N/A',
            account_email: user?.email || 'N/A',
            // Order details
            order_id: txn.order_info?.order_id || txn.related_order_id?.order_id || '',
            awb_number: txn.order_info?.awb_number || txn.related_order_id?.delhivery_data?.waybill || '',
            weight: txn.order_info?.weight || (txn.related_order_id?.package_info?.weight ? txn.related_order_id.package_info.weight * 1000 : null), // Convert kg to grams
            zone: txn.order_info?.zone || '',
            // Balance info
            closing_balance: txn.balance_info?.closing_balance || 0
        }));

        res.json({
            success: true,
            data: {
                transactions: transformedTransactions,
                summary: {
                    current_balance: currentBalance,
                    total_credits: totalCredits,
                    total_debits: totalDebits
                },
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalCount / limit),
                    total_count: totalCount,
                    per_page: limit
                }
            }
        });
    } catch (error) {
        console.error('Get wallet transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// ============================================
// HDFC SMARTGATEWAY WALLET RECHARGE ENDPOINTS
// ============================================

/**
 * Handle HDFC payment gateway return/callback
 * This endpoint receives POST/GET from HDFC after payment and redirects to frontend
 * GET/POST /api/billing/wallet/payment-return
 */
const handlePaymentReturn = async (req, res) => {
    try {
        // HDFC sends order_id in the response (could be in body or query)
        const orderId = req.body?.order_id || req.query?.order_id ||
                        req.body?.orderId || req.query?.orderId;
        const status = req.body?.status || req.query?.status || 'unknown';

        console.log('HDFC Payment Return:', { orderId, status, body: req.body, query: req.query });

        // Determine frontend URL
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? 'https://shipsarthi.com'
            : 'http://localhost:3000';

        // If we have an order ID, process and redirect with status
        if (orderId) {
            // Find the transaction
            const transaction = await Transaction.findOne({
                'payment_info.gateway_order_id': orderId
            });

            if (transaction) {
                try {
                    // Get order status from HDFC
                    const orderStatus = await hdfcPaymentService.getOrderStatus(orderId);
                    const isSuccess = hdfcPaymentService.isPaymentSuccessful(orderStatus.status);
                    const internalStatus = hdfcPaymentService.mapPaymentStatus(orderStatus.status);

                    // Update transaction
                    transaction.payment_info.payment_status = internalStatus;
                    transaction.payment_info.gateway_transaction_id = orderStatus.txnId;
                    transaction.payment_info.bank_ref_no = orderStatus.bankRefNo;
                    transaction.payment_info.payment_method = orderStatus.paymentMethod;
                    transaction.payment_info.payment_date = new Date();
                    transaction.updated_at = new Date();

                    if (isSuccess) {
                        transaction.status = 'completed';

                        // Credit wallet
                        const user = await User.findById(transaction.user_id);
                        if (user) {
                            const openingBalance = user.wallet_balance || 0;
                            // Use Math.round to avoid floating-point precision issues
                            user.wallet_balance = Math.round((openingBalance + transaction.amount) * 100) / 100;
                            await user.save();

                            transaction.balance_info = {
                                opening_balance: openingBalance,
                                closing_balance: user.wallet_balance
                            };
                        }
                        transaction.transaction_date = new Date();
                    } else if (internalStatus === 'failed') {
                        transaction.status = 'failed';
                        transaction.notes = orderStatus.errorMessage || 'Payment failed';
                    }

                    await transaction.save();

                    // Redirect to frontend with status
                    const redirectStatus = isSuccess ? 'success' : (internalStatus === 'failed' ? 'failed' : 'pending');
                    return res.redirect(`${frontendUrl}/billing?payment_status=${redirectStatus}&order_id=${orderId}`);
                } catch (statusError) {
                    console.error('Error checking order status:', statusError);
                    return res.redirect(`${frontendUrl}/billing?payment_status=error&order_id=${orderId}`);
                }
            }
        }

        // Fallback redirect if no order ID
        return res.redirect(`${frontendUrl}/billing?payment_status=unknown`);
    } catch (error) {
        console.error('Payment return error:', error);
        const frontendUrl = process.env.NODE_ENV === 'production'
            ? 'https://shipsarthi.com'
            : 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/billing?payment_status=error`);
    }
};

// Handle both GET and POST from HDFC
router.get('/wallet/payment-return', handlePaymentReturn);
router.post('/wallet/payment-return', handlePaymentReturn);

/**
 * Initiate wallet recharge via HDFC SmartGateway
 * POST /api/billing/wallet/initiate-payment
 */
router.post('/wallet/initiate-payment',
    auth,
    [
        body('amount').isFloat({ min: 10, max: 50000 }).withMessage('Amount must be between ₹10 and ₹50,000')
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

            const { amount } = req.body;
            const user = await User.findById(req.user._id).select('email phone your_name wallet_balance');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Generate internal transaction ID
            const transactionId = `CR_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            // Create pending transaction record
            const transaction = new Transaction({
                transaction_id: transactionId,
                user_id: req.user._id,
                transaction_type: 'credit',
                transaction_category: 'wallet_recharge',
                amount: amount,
                description: `Wallet recharge via HDFC SmartGateway`,
                payment_info: {
                    payment_method: 'hdfc_smartgateway',
                    payment_gateway: 'hdfc',
                    payment_status: 'pending'
                },
                status: 'pending',
                balance_info: {
                    opening_balance: user.wallet_balance || 0,
                    closing_balance: 0
                },
                transaction_date: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            });

            await transaction.save();

            // Create HDFC order session
            const orderSession = await hdfcPaymentService.createOrderSession({
                amount: amount,
                customerId: req.user._id.toString(),
                customerEmail: user.email || '',
                customerPhone: user.phone || '',
                transactionId: transactionId
            });

            // Update transaction with HDFC order details
            transaction.payment_info.gateway_order_id = orderSession.orderId;
            transaction.payment_info.gateway_session_id = orderSession.orderSessionId;
            await transaction.save();

            res.json({
                success: true,
                message: 'Payment initiated successfully',
                data: {
                    transaction_id: transactionId,
                    order_id: orderSession.orderId,
                    payment_link: orderSession.paymentLink,
                    sdk_payload: orderSession.sdkPayload,
                    amount: amount,
                    currency: 'INR'
                }
            });
        } catch (error) {
            console.error('Initiate payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initiate payment',
                error: error.message
            });
        }
    }
);

/**
 * Handle payment response after HDFC redirect
 * POST /api/billing/wallet/handle-payment-response
 */
router.post('/wallet/handle-payment-response',
    auth,
    [
        body('order_id').notEmpty().withMessage('Order ID is required')
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

            const { order_id } = req.body;

            // Find the transaction by HDFC order ID
            const transaction = await Transaction.findOne({
                'payment_info.gateway_order_id': order_id,
                user_id: req.user._id
            });

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            // Check if already processed
            if (transaction.status === 'completed') {
                const user = await User.findById(req.user._id).select('wallet_balance');
                return res.json({
                    success: true,
                    message: 'Payment already processed',
                    data: {
                        transaction_id: transaction.transaction_id,
                        status: 'CHARGED',
                        amount: transaction.amount,
                        new_balance: user.wallet_balance || 0
                    }
                });
            }

            // Get order status from HDFC
            const orderStatus = await hdfcPaymentService.getOrderStatus(order_id);
            const internalStatus = hdfcPaymentService.mapPaymentStatus(orderStatus.status);
            const isSuccess = hdfcPaymentService.isPaymentSuccessful(orderStatus.status);

            // Update transaction with payment details
            transaction.payment_info.payment_status = internalStatus;
            transaction.payment_info.gateway_transaction_id = orderStatus.txnId;
            transaction.payment_info.bank_ref_no = orderStatus.bankRefNo;
            transaction.payment_info.payment_method = orderStatus.paymentMethod;
            transaction.payment_info.gateway_reference_id = orderStatus.gatewayReferenceId;
            transaction.payment_info.payment_date = new Date();
            transaction.updated_at = new Date();

            if (isSuccess) {
                // Payment successful - update wallet
                transaction.status = 'completed';

                const user = await User.findById(req.user._id);
                const openingBalance = user.wallet_balance || 0;
                // Use Math.round to avoid floating-point precision issues
                user.wallet_balance = Math.round((openingBalance + transaction.amount) * 100) / 100;
                await user.save();

                // Get live updated balance
                const updatedUser = await User.findById(req.user._id).select('wallet_balance');
                const newBalance = updatedUser.wallet_balance || 0;

                // Update balance info
                transaction.balance_info = {
                    opening_balance: openingBalance,
                    closing_balance: newBalance
                };
                transaction.transaction_date = new Date();

                await transaction.save();

                res.json({
                    success: true,
                    message: 'Payment successful. Wallet credited.',
                    data: {
                        transaction_id: transaction.transaction_id,
                        status: orderStatus.status,
                        amount: transaction.amount,
                        new_balance: newBalance,
                        txn_id: orderStatus.txnId
                    }
                });
            } else if (internalStatus === 'failed') {
                // Payment failed
                transaction.status = 'failed';
                transaction.notes = orderStatus.errorMessage || 'Payment failed';
                await transaction.save();

                res.json({
                    success: false,
                    message: orderStatus.errorMessage || 'Payment failed',
                    data: {
                        transaction_id: transaction.transaction_id,
                        status: orderStatus.status,
                        error_code: orderStatus.errorCode
                    }
                });
            } else {
                // Payment still pending
                await transaction.save();

                res.json({
                    success: true,
                    message: 'Payment is still being processed',
                    data: {
                        transaction_id: transaction.transaction_id,
                        status: orderStatus.status,
                        is_pending: true
                    }
                });
            }
        } catch (error) {
            console.error('Handle payment response error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify payment',
                error: error.message
            });
        }
    }
);

/**
 * Check payment status
 * GET /api/billing/wallet/payment-status/:order_id
 */
router.get('/wallet/payment-status/:order_id', auth, async (req, res) => {
    try {
        const { order_id } = req.params;

        // Find the transaction
        const transaction = await Transaction.findOne({
            'payment_info.gateway_order_id': order_id,
            user_id: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // If already completed, return cached status
        if (transaction.status === 'completed') {
            return res.json({
                success: true,
                data: {
                    transaction_id: transaction.transaction_id,
                    status: 'CHARGED',
                    internal_status: 'completed',
                    amount: transaction.amount
                }
            });
        }

        // Get fresh status from HDFC
        const orderStatus = await hdfcPaymentService.getOrderStatus(order_id);

        res.json({
            success: true,
            data: {
                transaction_id: transaction.transaction_id,
                status: orderStatus.status,
                internal_status: hdfcPaymentService.mapPaymentStatus(orderStatus.status),
                amount: transaction.amount,
                is_successful: hdfcPaymentService.isPaymentSuccessful(orderStatus.status)
            }
        });
    } catch (error) {
        console.error('Payment status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check payment status',
            error: error.message
        });
    }
});

// ============================================
// LEGACY RAZORPAY ENDPOINTS (kept for backward compatibility)
// ============================================

router.post('/wallet/add-money',
    auth,
    [
        body('amount').isFloat({ min: 10, max: 50000 }).withMessage('Amount must be between ₹10 and ₹50,000'),
        body('payment_method').isIn(['upi', 'netbanking', 'card', 'wallet']).withMessage('Invalid payment method'),
        body('payment_details.upi_id').optional().matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/).withMessage('Invalid UPI ID'),
        body('payment_details.card_last4').optional().isLength({ min: 4, max: 4 }).withMessage('Invalid card details')
    ],
    async (req, res) => {
        // Redirect to new HDFC flow
        return res.status(410).json({
            success: false,
            message: 'This endpoint is deprecated. Please use /wallet/initiate-payment for HDFC SmartGateway.',
            redirect_to: '/api/billing/wallet/initiate-payment'
        });
    }
);

router.post('/wallet/verify-payment',
    auth,
    [
        body('transaction_id').notEmpty().withMessage('Transaction ID is required'),
        body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID is required'),
        body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID is required'),
        body('razorpay_signature').notEmpty().withMessage('Razorpay signature is required')
    ],
    async (req, res) => {
        // Redirect to new HDFC flow
        return res.status(410).json({
            success: false,
            message: 'This endpoint is deprecated. Please use /wallet/handle-payment-response for HDFC SmartGateway.',
            redirect_to: '/api/billing/wallet/handle-payment-response'
        });
    }
);

router.get('/transactions',
    auth,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('type').optional().isIn(['credit', 'debit', 'all']),
        query('status').optional().isIn(['pending', 'completed', 'failed', 'all']),
        query('category').optional().isIn(['wallet_recharge', 'shipping_charge', 'cod_collection', 'refund', 'penalty', 'all']),
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

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const filterQuery = { user_id: req.user._id };

            if (req.query.type && req.query.type !== 'all') {
                filterQuery.transaction_type = req.query.type;
            }

            if (req.query.status && req.query.status !== 'all') {
                filterQuery.status = req.query.status;
            }

            if (req.query.category && req.query.category !== 'all') {
                filterQuery.transaction_category = req.query.category;
            }

            if (req.query.date_from || req.query.date_to) {
                filterQuery.transaction_date = {};
                if (req.query.date_from) {
                    filterQuery.transaction_date.$gte = new Date(req.query.date_from);
                }
                if (req.query.date_to) {
                    filterQuery.transaction_date.$lte = new Date(req.query.date_to);
                }
            }

            const [transactions, totalCount] = await Promise.all([
                Transaction.find(filterQuery)
                    .sort({ transaction_date: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Transaction.countDocuments(filterQuery)
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            const summary = await Transaction.aggregate([
                { $match: filterQuery },
                {
                    $group: {
                        _id: '$transaction_type',
                        total_amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const summaryData = {
                total_credits: summary.find(s => s._id === 'credit')?.total_amount || 0,
                total_debits: summary.find(s => s._id === 'debit')?.total_amount || 0,
                credit_count: summary.find(s => s._id === 'credit')?.count || 0,
                debit_count: summary.find(s => s._id === 'debit')?.count || 0
            };

            res.json({
                success: true,
                data: {
                    transactions: transactions.map(txn => ({
                        transaction_id: txn.transaction_id,
                        type: txn.transaction_type,
                        category: txn.transaction_category,
                        amount: txn.amount,
                        description: txn.description,
                        status: txn.status,
                        payment_method: txn.payment_info?.payment_method || null,
                        created_at: txn.transaction_date || txn.created_at,
                        completed_at: txn.updated_at,
                        order_id: txn.related_order_id || null
                    })),
                    pagination: {
                        current_page: page,
                        total_pages: totalPages,
                        total_count: totalCount,
                        has_next: page < totalPages,
                        has_prev: page > 1
                    },
                    summary: summaryData
                }
            });
        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/cod/collections',
    auth,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('status').optional().isIn(['pending', 'remitted', 'all']),
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

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const filterQuery = {
                user_id: req.user._id,
                'payment_info.payment_mode': 'cod',
                order_status: { $in: ['delivered'] }
            };

            if (req.query.status && req.query.status !== 'all') {
                if (req.query.status === 'pending') {
                    filterQuery['payment_info.cod_remitted'] = { $ne: true };
                } else if (req.query.status === 'remitted') {
                    filterQuery['payment_info.cod_remitted'] = true;
                }
            }

            if (req.query.date_from || req.query.date_to) {
                filterQuery.delivery_date = {};
                if (req.query.date_from) {
                    filterQuery.delivery_date.$gte = new Date(req.query.date_from);
                }
                if (req.query.date_to) {
                    filterQuery.delivery_date.$lte = new Date(req.query.date_to);
                }
            }

            const [orders, totalCount] = await Promise.all([
                Order.find(filterQuery)
                    .sort({ delivery_date: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Order.countDocuments(filterQuery)
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            const summary = await Order.aggregate([
                { $match: filterQuery },
                {
                    $group: {
                        _id: '$payment_info.cod_remitted',
                        total_amount: { $sum: '$payment_info.cod_amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const summaryData = {
                total_pending: summary.find(s => s._id !== true)?.total_amount || 0,
                total_remitted: summary.find(s => s._id === true)?.total_amount || 0,
                pending_count: summary.find(s => s._id !== true)?.count || 0,
                remitted_count: summary.find(s => s._id === true)?.count || 0
            };

            res.json({
                success: true,
                data: {
                    cod_collections: orders.map(order => ({
                        order_id: order.order_id,
                        customer_name: order.customer_info.buyer_name,
                        cod_amount: order.payment_info.cod_amount,
                        delivery_date: order.delivery_date,
                        remitted: order.payment_info.cod_remitted || false,
                        remittance_date: order.payment_info.cod_remittance_date,
                        utr_number: order.payment_info.cod_utr_number,
                        waybill: order.shipping_info.waybill
                    })),
                    pagination: {
                        current_page: page,
                        total_pages: totalPages,
                        total_count: totalCount,
                        has_next: page < totalPages,
                        has_prev: page > 1
                    },
                    summary: summaryData
                }
            });
        } catch (error) {
            console.error('Get COD collections error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/invoice/:invoice_id', auth, async (req, res) => {
    try {
        const { invoice_id } = req.params;

        const invoice = await Transaction.findOne({
            transaction_id: invoice_id,
            user_id: req.user._id
        }).populate('user_id', 'name email business_name gst_number');

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const invoiceData = {
            invoice_number: invoice.transaction_id,
            invoice_date: invoice.created_at,
            due_date: new Date(invoice.created_at.getTime() + (30 * 24 * 60 * 60 * 1000)),
            customer_details: {
                name: invoice.user_id.name,
                business_name: invoice.user_id.business_name,
                email: invoice.user_id.email,
                gst_number: invoice.user_id.gst_number
            },
            line_items: [{
                description: invoice.description,
                quantity: 1,
                rate: invoice.amount,
                amount: invoice.amount
            }],
            subtotal: invoice.amount,
            tax_amount: 0,
            total_amount: invoice.amount,
            payment_status: invoice.status,
            payment_method: invoice.payment_method
        };

        res.json({
            success: true,
            data: invoiceData
        });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

router.get('/pricing/calculator',
    auth,
    [
        query('weight').isFloat({ min: 0.1 }).withMessage('Valid weight is required'),
        query('distance_zone').isIn(['local', 'metro', 'rest_of_india']).withMessage('Valid distance zone is required'),
        query('service_type').optional().isIn(['standard', 'express']),
        query('cod_amount').optional().isFloat({ min: 0 })
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

            const { weight, distance_zone, service_type = 'standard', cod_amount = 0 } = req.query;

            const pricingRules = {
                local: { base: 30, per_kg: 8, cod_rate: 0.02 },
                metro: { base: 45, per_kg: 12, cod_rate: 0.025 },
                rest_of_india: { base: 60, per_kg: 15, cod_rate: 0.03 }
            };

            const rule = pricingRules[distance_zone];
            const baseCharge = rule.base;
            const weightCharge = (parseFloat(weight) - 0.5) > 0 ? (parseFloat(weight) - 0.5) * rule.per_kg : 0;
            const codCharge = parseFloat(cod_amount) * rule.cod_rate;
            const serviceCharge = service_type === 'express' ? baseCharge * 0.5 : 0;

            const subtotal = baseCharge + weightCharge + codCharge + serviceCharge;
            const gst = subtotal * 0.18;
            const total = subtotal + gst;

            res.json({
                success: true,
                data: {
                    weight: parseFloat(weight),
                    distance_zone,
                    service_type,
                    cod_amount: parseFloat(cod_amount),
                    breakdown: {
                        base_charge: parseFloat(baseCharge.toFixed(2)),
                        weight_charge: parseFloat(weightCharge.toFixed(2)),
                        cod_charge: parseFloat(codCharge.toFixed(2)),
                        service_charge: parseFloat(serviceCharge.toFixed(2)),
                        subtotal: parseFloat(subtotal.toFixed(2)),
                        gst: parseFloat(gst.toFixed(2)),
                        total: parseFloat(total.toFixed(2))
                    },
                    currency: 'INR'
                }
            });
        } catch (error) {
            console.error('Pricing calculator error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.post('/deduct-wallet',
    auth,
    [
        body('amount').isFloat({ min: 0.1 }).withMessage('Valid amount is required'),
        body('order_id').notEmpty().withMessage('Order ID is required'),
        body('description').notEmpty().withMessage('Description is required')
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

            const { amount, order_id, description } = req.body;

            const user = await User.findById(req.user._id);

            if (!user.wallet_balance || user.wallet_balance < amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance'
                });
            }

            const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const transaction = new Transaction({
                transaction_id: transactionId,
                user_id: req.user._id,
                related_order_id: order_id,
                transaction_type: 'debit',
                transaction_category: 'shipping_charge',
                amount: amount,
                description: description,
                status: 'completed',
                balance_info: {
                    opening_balance: 0,
                    closing_balance: 0
                },
                transaction_date: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            });

            // Use Math.round to avoid floating-point precision issues
            user.wallet_balance = Math.round((user.wallet_balance - amount) * 100) / 100;

            await Promise.all([
                transaction.save(),
                user.save()
            ]);

            // CRITICAL: Retrieve the live updated wallet balance from database
            const updatedUser = await User.findById(req.user._id).select('wallet_balance');
            const liveUpdatedBalance = updatedUser.wallet_balance || 0;

            res.json({
                success: true,
                message: 'Amount deducted successfully',
                data: {
                    transaction_id: transactionId,
                    amount_deducted: amount,
                    remaining_balance: liveUpdatedBalance // Use live database balance
                }
            });
        } catch (error) {
            console.error('Deduct wallet error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
);

router.get('/reports/monthly', auth, async (req, res) => {
    try {
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const [transactionSummary, orderSummary] = await Promise.all([
            Transaction.aggregate([
                {
                    $match: {
                        user_id: req.user._id,
                        created_at: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            type: '$transaction_type',
                            category: '$category'
                        },
                        total_amount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        user_id: req.user._id,
                        created_at: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: '$payment_info.payment_mode',
                        total_orders: { $sum: 1 },
                        total_value: { $sum: '$payment_info.order_value' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                period: {
                    year: parseInt(year),
                    month: parseInt(month),
                    start_date: startDate,
                    end_date: endDate
                },
                transaction_summary: transactionSummary,
                order_summary: orderSummary
            }
        });
    } catch (error) {
        console.error('Monthly report error:', error);
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
        message: 'Billing and Wallet API is healthy',
        timestamp: new Date().toISOString(),
        services: {
            wallet_management: 'operational',
            payment_processing: 'operational',
            cod_tracking: 'operational',
            invoice_generation: 'operational'
        }
    });
});

module.exports = router;