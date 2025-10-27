// Location: backend/services/trackingService.js
const cron = require('node-cron');
const Order = require('../models/Order');
const delhiveryService = require('./delhiveryService');
const logger = require('../utils/logger');

class TrackingService {
    constructor() {
        this.isRunning = false;
        this.startTracking();
    }

    /**
     * Start the tracking cron job
     */
    startTracking() {
        if (this.isRunning) {
            logger.warn('⚠️ Tracking service already running');
            return;
        }

        // Run every 3 hours (0 */3 * * *)
        this.trackingJob = cron.schedule('0 */3 * * *', async () => {
            logger.info('🔄 Starting scheduled shipment tracking...');
            await this.trackAllShipments();
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        this.isRunning = true;
        logger.info('✅ Tracking service started - will run every 3 hours');
    }

    /**
     * Stop the tracking cron job
     */
    stopTracking() {
        if (this.trackingJob) {
            this.trackingJob.destroy();
            this.isRunning = false;
            logger.info('🛑 Tracking service stopped');
        }
    }

    /**
     * Track all active shipments
     */
    async trackAllShipments() {
        try {
            // Get all orders with AWB numbers that are not delivered
            const orders = await Order.find({
                'delhivery_data.waybill': { $exists: true, $ne: null },
                status: { $nin: ['delivered', 'rto', 'lost'] }
            });

            logger.info(`🔍 Found ${orders.length} orders to track`);

            for (const order of orders) {
                try {
                    await this.trackSingleShipment(order);
                    // Add delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    logger.error(`❌ Error tracking order ${order.order_id}:`, error.message);
                }
            }

            logger.info('✅ Completed scheduled shipment tracking');
        } catch (error) {
            logger.error('❌ Error in trackAllShipments:', error);
        }
    }

    /**
     * Track a single shipment
     */
    async trackSingleShipment(order) {
        const waybill = order.delhivery_data.waybill;
        
        if (!waybill) {
            logger.warn('⚠️ No waybill found for order', {
                orderId: order.order_id,
                delhiveryData: order.delhivery_data
            });
            return;
        }
        
        try {
            logger.info('🔍 Tracking shipment', {
                orderId: order.order_id,
                waybill: waybill,
                currentStatus: order.status
            });

            const trackingResult = await delhiveryService.trackShipment(waybill);
            
            if (trackingResult.success && trackingResult.data) {
                const trackingData = trackingResult.data;
                
                // Map Delhivery status to our internal status
                const newStatus = this.mapDelhiveryStatus(trackingData.status);
                const oldStatus = order.status;
                
                if (newStatus && newStatus !== oldStatus) {
                    // Update order status
                    order.status = newStatus;
                    
                    // Add to status history
                    order.status_history = order.status_history || [];
                    order.status_history.push({
                        status: newStatus,
                        timestamp: new Date(),
                        comment: `Status updated via tracking: ${trackingData.status}`,
                        location: trackingData.location || '',
                        source: 'delhivery_tracking'
                    });
                    
                    // Update delivery info if delivered
                    if (newStatus === 'delivered') {
                        order.delivery_info = {
                            delivered_at: new Date(),
                            delivered_by: trackingData.delivered_by || 'Courier',
                            delivery_location: trackingData.location || '',
                            delivery_attempts: trackingData.delivery_attempts || 1
                        };
                    }
                    
                    // Update tracking data
                    order.delhivery_data.tracking_data = trackingData;
                    order.delhivery_data.last_tracked = new Date();
                    
                    await order.save();
                    
                    logger.info('✅ Order status updated', {
                        orderId: order.order_id,
                        waybill: waybill,
                        oldStatus: oldStatus,
                        newStatus: newStatus,
                        trackingStatus: trackingData.status
                    });
                } else {
                    logger.info('📊 No status change needed', {
                        orderId: order.order_id,
                        waybill: waybill,
                        currentStatus: order.status,
                        trackingStatus: trackingData.status
                    });
                }
            } else {
                // Handle different types of tracking failures
                const errorType = trackingResult.errorType || 'UNKNOWN_ERROR';
                const errorMessage = trackingResult.error || 'Unknown tracking error';
                
                logger.warn('⚠️ Failed to track order', {
                    orderId: order.order_id,
                    waybill: waybill,
                    errorType: errorType,
                    errorMessage: errorMessage,
                    statusCode: trackingResult.statusCode
                });

                // Update tracking failure info
                order.delhivery_data.tracking_failures = order.delhivery_data.tracking_failures || [];
                order.delhivery_data.tracking_failures.push({
                    timestamp: new Date(),
                    errorType: errorType,
                    errorMessage: errorMessage,
                    statusCode: trackingResult.statusCode
                });

                // Keep only last 10 failures to prevent document size issues
                if (order.delhivery_data.tracking_failures.length > 10) {
                    order.delhivery_data.tracking_failures = order.delhivery_data.tracking_failures.slice(-10);
                }

                await order.save();

                // Don't throw error for tracking failures - just log and continue
                return;
            }
        } catch (error) {
            logger.error('❌ Error tracking order', {
                orderId: order.order_id,
                waybill: waybill,
                error: error.message,
                stack: error.stack
            });

            // Update tracking failure info
            order.delhivery_data.tracking_failures = order.delhivery_data.tracking_failures || [];
            order.delhivery_data.tracking_failures.push({
                timestamp: new Date(),
                errorType: 'SYSTEM_ERROR',
                errorMessage: error.message,
                statusCode: null
            });

            // Keep only last 10 failures
            if (order.delhivery_data.tracking_failures.length > 10) {
                order.delhivery_data.tracking_failures = order.delhivery_data.tracking_failures.slice(-10);
            }

            await order.save();
        }
    }

    /**
     * Map Delhivery status to internal status
     */
    mapDelhiveryStatus(delhiveryStatus) {
        const statusMap = {
            'InTransit': 'in_transit',
            'OutForDelivery': 'out_for_delivery',
            'Delivered': 'delivered',
            'RTO': 'rto',
            'Lost': 'lost',
            'NDR': 'ndr',
            'Pickup': 'pickups_manifests',
            'Manifest': 'pickups_manifests',
            'Dispatched': 'ready_to_ship'
        };
        
        return statusMap[delhiveryStatus] || null;
    }

    /**
     * Manually track a specific order
     */
    async trackOrderManually(orderId) {
        try {
            const order = await Order.findOne({ order_id: orderId });
            if (!order) {
                throw new Error('Order not found');
            }
            
            await this.trackSingleShipment(order);
            return { success: true, message: 'Order tracked successfully' };
        } catch (error) {
            logger.error(`❌ Manual tracking failed for order ${orderId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get tracking service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextRun: this.trackingJob ? this.trackingJob.nextDate() : null,
            service: 'Shipment Tracking Service'
        };
    }
}

module.exports = new TrackingService();
