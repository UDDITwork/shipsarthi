const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const NDR = require('../models/NDR');
const crypto = require('crypto');

router.post('/delhivery/status-update', async (req, res) => {
    try {
        const { waybill, status, expected_delivery, scans } = req.body;

        if (!waybill) {
            return res.status(400).json({
                success: false,
                message: 'Waybill is required'
            });
        }

        const order = await Order.findOne({
            'shipping_info.waybill': waybill
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const oldStatus = order.order_status.current_status;
        const newStatus = mapDelhiveryStatus(status);

        if (oldStatus !== newStatus) {
            order.order_status.current_status = newStatus;
            order.order_status.status_history.push({
                status: newStatus,
                timestamp: new Date(),
                comment: `Status updated via Delhivery webhook: ${status}`,
                location: scans && scans.length > 0 ? scans[scans.length - 1].location : ''
            });

            if (expected_delivery) {
                order.shipping_info.expected_delivery = new Date(expected_delivery);
            }

            if (isNDRStatus(status)) {
                await handleNDRCreation(order, scans);
            }

            if (newStatus === 'delivered') {
                order.delivery_info = {
                    delivered_date: new Date(),
                    delivered_to: scans && scans.length > 0 ? scans[scans.length - 1].delivered_to : '',
                    delivery_comment: scans && scans.length > 0 ? scans[scans.length - 1].comment : ''
                };
            }

            await order.save();

            console.log(`Order ${order.order_id} status updated from ${oldStatus} to ${newStatus}`);
        }

        res.json({
            success: true,
            message: 'Status updated successfully'
        });

    } catch (error) {
        console.error('Delhivery webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

function mapDelhiveryStatus(delhiveryStatus) {
    const statusMapping = {
        'Shipped': 'in_transit',
        'In Transit': 'in_transit',
        'Reached at destination': 'in_transit',
        'Out for Delivery': 'out_for_delivery',
        'Delivered': 'delivered',
        'Undelivered': 'ndr',
        'Customer not available': 'ndr',
        'Customer refused': 'ndr',
        'Incomplete address': 'ndr',
        'Cash not ready': 'ndr',
        'RTO': 'rto',
        'RTO Initiated': 'rto',
        'RTO Delivered': 'rto',
        'Lost': 'lost',
        'Damaged': 'lost',
        'Cancelled': 'cancelled'
    };

    return statusMapping[delhiveryStatus] || 'in_transit';
}

function isNDRStatus(status) {
    const ndrStatuses = [
        'Undelivered',
        'Customer not available',
        'Customer refused',
        'Incomplete address',
        'Cash not ready',
        'Consignee not available',
        'Delivery attempted'
    ];
    return ndrStatuses.includes(status);
}

async function handleNDRCreation(order, scans) {
    try {
        let ndr = await NDR.findOne({ waybill: order.shipping_info.waybill });

        const latestScan = scans && scans.length > 0 ? scans[scans.length - 1] : null;

        if (!ndr) {
            ndr = new NDR({
                order_id: order.order_id,
                waybill: order.shipping_info.waybill,
                user_id: order.user_id,
                customer_info: order.customer_info,
                delivery_address: order.delivery_address,
                ndr_reason: latestScan ? latestScan.comment : 'Delivery failed',
                attempt_count: 1,
                first_attempt_date: new Date(),
                last_attempt_date: new Date(),
                next_attempt_date: calculateNextAttemptDate(1),
                ndr_status: 'open',
                customer_contacted: false,
                escalation_level: 'L1',
                created_at: new Date(),
                updated_at: new Date()
            });
        } else {
            ndr.attempt_count += 1;
            ndr.last_attempt_date = new Date();
            ndr.next_attempt_date = calculateNextAttemptDate(ndr.attempt_count);
            ndr.ndr_reason = latestScan ? latestScan.comment : ndr.ndr_reason;
            ndr.updated_at = new Date();

            if (ndr.attempt_count >= 3) {
                ndr.escalation_level = 'L2';
                ndr.rto_eligible = true;
            }
        }

        ndr.delivery_attempts.push({
            attempt_date: new Date(),
            reason: latestScan ? latestScan.comment : 'Delivery failed',
            location: latestScan ? latestScan.location : '',
            next_attempt_date: ndr.next_attempt_date
        });

        await ndr.save();
        console.log(`NDR created/updated for order ${order.order_id}`);

    } catch (error) {
        console.error('Error handling NDR creation:', error);
    }
}

function calculateNextAttemptDate(attemptCount) {
    if (attemptCount >= 3) {
        return null;
    }

    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
}

router.post('/delhivery/cod-remittance', async (req, res) => {
    try {
        const { waybill, cod_amount, remittance_date, utr_number } = req.body;

        const order = await Order.findOne({
            'shipping_info.waybill': waybill
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.payment_info.cod_remitted = true;
        order.payment_info.cod_remittance_date = new Date(remittance_date);
        order.payment_info.cod_utr_number = utr_number;
        order.payment_info.cod_remitted_amount = cod_amount;

        await order.save();

        console.log(`COD remittance updated for order ${order.order_id}: ${cod_amount}`);

        res.json({
            success: true,
            message: 'COD remittance updated successfully'
        });

    } catch (error) {
        console.error('COD remittance webhook error:', error);
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
        message: 'Webhook endpoints are healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;