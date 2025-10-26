// Location: backend/routes/webhooks.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const NDR = require('../models/NDR');
const { webhookAuth } = require('../middleware/webhookAuth');
const { validateScanPush, validateEPOD, validateSorterImage, validateQCImage } = require('../middleware/webhookValidation');
const webhookService = require('../services/webhookService');
const webhookQueue = require('../utils/webhookQueue');
const logger = require('../utils/logger');

// ============================================
// NEW DELHIVERY B2C WEBHOOKS (v1)
// ============================================

/**
 * Scan Push Webhook - Real-time shipment status updates
 * Endpoint: POST /api/v1/webhooks/delhivery/scan-status
 */
router.post('/v1/delhivery/scan-status', webhookAuth, validateScanPush, async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('📥 Scan push webhook received', {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      payloadSize: JSON.stringify(req.body).length,
      waybill: req.body.Shipment?.AWB
    });

    // Queue webhook for processing (production-level async handling)
    const jobId = await webhookQueue.enqueue('scan-status', req.body, {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      receivedAt: new Date()
    });

    const responseTime = Date.now() - startTime;
    
    // Respond immediately (< 300ms target)
    res.status(200).json({
      status: 'success',
      message: 'Webhook received',
      requestId,
      queued: true,
      jobId
    });

    logger.info('✅ Scan push webhook queued', {
      requestId,
      jobId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logger.error('❌ Scan push webhook error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    // Still return 200 OK to prevent Delhivery retries
    res.status(200).json({
      status: 'success',
      message: 'Webhook received (processing error logged)',
      requestId
    });
  }
});

/**
 * EPOD Webhook - Electronic Proof of Delivery
 * Endpoint: POST /api/v1/webhooks/delhivery/epod
 */
router.post('/v1/delhivery/epod', webhookAuth, validateEPOD, async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('📥 EPOD webhook received', {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      waybill: req.body.waybill
    });

    // Queue webhook for processing
    const jobId = await webhookQueue.enqueue('epod', req.body, {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      receivedAt: new Date()
    });

    const responseTime = Date.now() - startTime;

    // Respond immediately
    res.status(200).json({
      status: 'success',
      message: 'EPOD received',
      requestId,
      queued: true,
      jobId
    });

    logger.info('✅ EPOD webhook queued', {
      requestId,
      jobId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logger.error('❌ EPOD webhook error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(200).json({
      status: 'success',
      message: 'EPOD received (processing error logged)',
      requestId
    });
  }
});

/**
 * Sorter Image Webhook - Warehouse sorting images
 * Endpoint: POST /api/v1/webhooks/delhivery/sorter-image
 */
router.post('/v1/delhivery/sorter-image', webhookAuth, validateSorterImage, async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('📥 Sorter image webhook received', {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      waybill: req.body.Waybill
    });

    // Queue webhook for processing
    const jobId = await webhookQueue.enqueue('sorter-image', req.body, {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      receivedAt: new Date()
    });

    const responseTime = Date.now() - startTime;

    // Respond immediately
    res.status(200).json({
      status: 'success',
      message: 'Sorter image received',
      requestId,
      queued: true,
      jobId
    });

    logger.info('✅ Sorter image webhook queued', {
      requestId,
      jobId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logger.error('❌ Sorter image webhook error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(200).json({
      status: 'success',
      message: 'Sorter image received (processing error logged)',
      requestId
    });
  }
});

/**
 * QC Image Webhook - Quality check images
 * Endpoint: POST /api/v1/webhooks/delhivery/qc-image
 */
router.post('/v1/delhivery/qc-image', webhookAuth, validateQCImage, async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('📥 QC image webhook received', {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      waybill: req.body.waybillId
    });

    // Queue webhook for processing
    const jobId = await webhookQueue.enqueue('qc-image', req.body, {
      requestId,
      ip: req.webhookMetadata?.clientIP,
      receivedAt: new Date()
    });

    const responseTime = Date.now() - startTime;

    // Respond immediately
    res.status(200).json({
      status: 'success',
      message: 'QC image received',
      requestId,
      queued: true,
      jobId
    });

    logger.info('✅ QC image webhook queued', {
      requestId,
      jobId,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    logger.error('❌ QC image webhook error', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    res.status(200).json({
      status: 'success',
      message: 'QC image received (processing error logged)',
      requestId
    });
  }
});

// ============================================
// LEGACY WEBHOOKS (kept for backward compatibility)
// ============================================

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
            'delhivery_data.waybill': waybill
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const oldStatus = order.status;
        const newStatus = mapDelhiveryStatus(status);

        if (oldStatus !== newStatus) {
            order.status = newStatus;
            order.status_history.push({
                status: newStatus,
                timestamp: new Date(),
                comment: `Status updated via Delhivery webhook: ${status}`,
                location: scans && scans.length > 0 ? scans[scans.length - 1].location : ''
            });

            if (expected_delivery) {
                order.delhivery_data.expected_delivery_date = new Date(expected_delivery);
            }

            if (isNDRStatus(status)) {
                await handleNDRCreation(order, scans);
            }

            if (newStatus === 'delivered') {
                order.delivered_date = new Date();
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

router.post('/delhivery/cod-remittance', async (req, res) => {
    try {
        const { waybill, cod_amount, remittance_date, utr_number } = req.body;

        const order = await Order.findOne({
            'delhivery_data.waybill': waybill
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

// Helper functions for legacy webhooks
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
        let ndr = await NDR.findOne({ waybill: order.delhivery_data.waybill });

        const latestScan = scans && scans.length > 0 ? scans[scans.length - 1] : null;

        if (!ndr) {
            ndr = new NDR({
                order_id: order.order_id,
                waybill: order.delhivery_data.waybill,
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

// Health check endpoint
router.get('/health', (req, res) => {
    const queueStats = webhookQueue.getStats();
    
    res.json({
        success: true,
        message: 'Webhook endpoints are healthy',
        timestamp: new Date().toISOString(),
        queue: queueStats,
        endpoints: {
            'scan-status': '/api/webhooks/v1/delhivery/scan-status',
            'epod': '/api/webhooks/v1/delhivery/epod',
            'sorter-image': '/api/webhooks/v1/delhivery/sorter-image',
            'qc-image': '/api/webhooks/v1/delhivery/qc-image'
        }
    });
});

// Queue statistics endpoint (for monitoring)
router.get('/v1/stats', webhookAuth, (req, res) => {
    const stats = webhookQueue.getStats();
    
    res.json({
        success: true,
        stats: stats.stats,
        queueSize: stats.queueSize,
        processing: stats.processing,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
