// Location: backend/services/trackingService.js
const cron = require('node-cron');
const Order = require('../models/Order');
const TrackingOrder = require('../models/TrackingOrder');
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
     * Only tracks orders whose pickup request has been created and are not delivered
     */
    async trackAllShipments() {
        try {
            // Get all tracking orders with pickup requests that are active and not delivered
            const trackingOrders = await TrackingOrder.getActiveTrackingOrders();

            logger.info(`🔍 Found ${trackingOrders.length} orders with pickup requests to track`);

            let successCount = 0;
            let failureCount = 0;
            let deliveredCount = 0;

            for (const trackingOrder of trackingOrders) {
                try {
                    const result = await this.trackSingleTrackingOrder(trackingOrder);
                    
                    if (result.success) {
                        successCount++;
                        if (result.delivered) {
                            deliveredCount++;
                        }
                    } else {
                        failureCount++;
                    }
                    
                    // Add delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    logger.error(`❌ Error tracking order ${trackingOrder.order_id}:`, error.message);
                    failureCount++;
                }
            }

            logger.info('✅ Completed scheduled shipment tracking', {
                total: trackingOrders.length,
                successful: successCount,
                failed: failureCount,
                delivered: deliveredCount
            });
        } catch (error) {
            logger.error('❌ Error in trackAllShipments:', error);
        }
    }

    /**
     * Track a single tracking order (new method using TrackingOrder model)
     * Extracts status from Delhivery API response and updates tracking order
     */
    async trackSingleTrackingOrder(trackingOrder) {
        const awbNumber = trackingOrder.awb_number;
        const orderId = trackingOrder.order_id;
        
        if (!awbNumber) {
            logger.warn('⚠️ No AWB number found for tracking order', {
                orderId: orderId
            });
            return { success: false, error: 'No AWB number' };
        }
        
        try {
            logger.info('🔍 Tracking shipment', {
                orderId: orderId,
                awb: awbNumber,
                currentStatus: trackingOrder.current_status
            });

            // Track with Delhivery API
            const trackingResult = await delhiveryService.trackShipment(awbNumber, trackingOrder.reference_id || '');
            
            if (trackingResult.success && trackingResult.data) {
                const apiResponse = trackingResult.data;
                
                // Extract status from API response
                // Format: Status.Status or ShipmentData[0].Status.Status
                const extractedStatus = this.extractStatusFromResponse(apiResponse);
                
                // Update tracking order
                trackingOrder.last_tracked_at = new Date();
                trackingOrder.last_tracking_response = apiResponse;
                trackingOrder.tracking_count = (trackingOrder.tracking_count || 0) + 1;
                
                // Store raw status from API
                if (extractedStatus.apiStatus) {
                    trackingOrder.api_status = extractedStatus.apiStatus;
                    trackingOrder.delhivery_status = extractedStatus.apiStatus;
                }
                
                // Process ShipmentData if available
                if (apiResponse.ShipmentData && Array.isArray(apiResponse.ShipmentData) && apiResponse.ShipmentData.length > 0) {
                    const shipmentData = apiResponse.ShipmentData[0];
                    
                    // Extract status from Shipment.Status (PRIMARY STATUS FIELD)
                    // Path: ShipmentData[0].Shipment.Status.Status
                    if (shipmentData.Shipment && shipmentData.Shipment.Status) {
                        const statusObj = shipmentData.Shipment.Status;
                        const statusValue = statusObj.Status || extractedStatus.apiStatus;
                        
                        if (statusValue) {
                            // Store raw API status
                            trackingOrder.api_status = statusValue;
                            trackingOrder.delhivery_status = statusValue;
                            
                            // Map to internal status for classification
                            const mappedStatus = this.mapDelhiveryStatus(statusValue);
                            
                            if (mappedStatus && mappedStatus !== trackingOrder.current_status) {
                                const oldStatus = trackingOrder.current_status;
                                trackingOrder.current_status = mappedStatus;
                                
                                logger.info('✅ Status updated', {
                                    orderId: orderId,
                                    awb: awbNumber,
                                    oldStatus: oldStatus,
                                    newStatus: mappedStatus,
                                    apiStatus: statusValue,
                                    category: this.getStatusCategory(mappedStatus)
                                });
                            }
                            
                            // Add to status history
                            trackingOrder.addStatusToHistory({
                                status: statusValue,
                                status_type: statusObj.StatusType || extractedStatus.statusType,
                                status_date_time: statusObj.StatusDateTime || extractedStatus.statusDateTime || new Date(),
                                status_location: statusObj.StatusLocation || extractedStatus.statusLocation,
                                instructions: statusObj.Instructions,
                                nsl_code: null, // Not in Status object
                                sort_code: null, // Not in Status object
                                raw_data: {
                                    Status: statusObj,
                                    Shipment: shipmentData.Shipment
                                }
                            });
                            
                            // Check if we should stop tracking (final statuses)
                            if (this.shouldStopTracking(mappedStatus)) {
                                if (mappedStatus === 'delivered' && !trackingOrder.is_delivered) {
                                    // Mark as delivered and stop tracking
                                    await trackingOrder.markAsDelivered({
                                        delivered_at: new Date(statusObj.StatusDateTime || extractedStatus.statusDateTime || new Date()),
                                        delivered_by: statusObj.RecievedBy || '',
                                        delivery_location: statusObj.StatusLocation || extractedStatus.statusLocation
                                    });
                                    
                                    // Update main Order model
                                    await this.updateOrderStatus(orderId, 'delivered', {
                                        delivered_at: trackingOrder.delivered_at,
                                        delivered_by: trackingOrder.delivered_by,
                                        delivery_location: trackingOrder.delivery_location
                                    });
                                    
                                    logger.info('✅ Order marked as delivered - tracking stopped', {
                                        orderId: orderId,
                                        awb: awbNumber
                                    });
                                    
                                    return { success: true, delivered: true, status: mappedStatus };
                                }
                                
                                if (mappedStatus === 'cancelled' && trackingOrder.current_status !== 'cancelled') {
                                    await trackingOrder.markAsCancelled({
                                        cancelled_at: new Date(statusObj.StatusDateTime || new Date()),
                                        reason: 'Cancelled via tracking API'
                                    });
                                    await this.updateOrderStatus(orderId, 'cancelled');
                                    return { success: true, cancelled: true, status: mappedStatus };
                                }
                                
                                if (mappedStatus === 'rto' && trackingOrder.current_status !== 'rto') {
                                    await trackingOrder.markAsRTO({
                                        rto_at: new Date(statusObj.StatusDateTime || new Date()),
                                        reason: 'RTO via tracking API'
                                    });
                                    await this.updateOrderStatus(orderId, 'rto');
                                    return { success: true, rto: true, status: mappedStatus };
                                }
                                
                                if (mappedStatus === 'lost' && trackingOrder.current_status !== 'lost') {
                                    trackingOrder.is_tracking_active = false;
                                    trackingOrder.current_status = 'lost';
                                    await trackingOrder.save();
                                    await this.updateOrderStatus(orderId, 'lost');
                                    return { success: true, lost: true, status: mappedStatus };
                                }
                            }
                        }
                    }
                }
                
                await trackingOrder.save();
                
                return { success: true, delivered: false };
                
            } else {
                // Handle tracking failures
                const errorType = trackingResult.errorType || 'UNKNOWN_ERROR';
                const errorMessage = trackingResult.error || 'Unknown tracking error';
                
                logger.warn('⚠️ Failed to track order', {
                    orderId: orderId,
                    awb: awbNumber,
                    errorType: errorType,
                    errorMessage: errorMessage,
                    statusCode: trackingResult.statusCode
                });

                // Update tracking failure info
                trackingOrder.tracking_failures = trackingOrder.tracking_failures || [];
                trackingOrder.tracking_failures.push({
                    timestamp: new Date(),
                    error: errorMessage,
                    error_type: errorType,
                    status_code: trackingResult.statusCode
                });

                // Keep only last 10 failures
                if (trackingOrder.tracking_failures.length > 10) {
                    trackingOrder.tracking_failures = trackingOrder.tracking_failures.slice(-10);
                }

                await trackingOrder.save();

                return { success: false, error: errorMessage };
            }
        } catch (error) {
            logger.error('❌ Error tracking order', {
                orderId: orderId,
                awb: awbNumber,
                error: error.message,
                stack: error.stack
            });

            // Update tracking failure info
            trackingOrder.tracking_failures = trackingOrder.tracking_failures || [];
            trackingOrder.tracking_failures.push({
                timestamp: new Date(),
                error: error.message,
                error_type: 'SYSTEM_ERROR',
                status_code: null
            });

            // Keep only last 10 failures
            if (trackingOrder.tracking_failures.length > 10) {
                trackingOrder.tracking_failures = trackingOrder.tracking_failures.slice(-10);
            }

            await trackingOrder.save();
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Track a single shipment (legacy method - kept for backward compatibility)
     */
    async trackSingleShipment(order) {
        const waybill = order.delhivery_data?.waybill;
        
        if (!waybill) {
            logger.warn('⚠️ No waybill found for order', {
                orderId: order.order_id,
                delhiveryData: order.delhivery_data
            });
            return;
        }
        
        // Check if pickup request exists - if yes, use TrackingOrder model
        if (order.delhivery_data?.pickup_request_id) {
            try {
                let trackingOrder = await TrackingOrder.findOne({ order_id: order.order_id });
                
                if (!trackingOrder) {
                    // Create tracking order from order
                    trackingOrder = await TrackingOrder.createFromOrder(order);
                }
                
                return await this.trackSingleTrackingOrder(trackingOrder);
            } catch (error) {
                logger.error('❌ Error creating/updating tracking order:', error);
            }
        }
        
        // Fallback to old method if no pickup request
        try {
            logger.info('🔍 Tracking shipment (legacy method)', {
                orderId: order.order_id,
                waybill: waybill,
                currentStatus: order.status
            });

            const trackingResult = await delhiveryService.trackShipment(waybill);
            
            if (trackingResult.success && trackingResult.data) {
                const trackingData = trackingResult.data;
                const extractedStatus = this.extractStatusFromResponse(trackingData);
                const newStatus = this.mapDelhiveryStatus(extractedStatus.apiStatus);
                const oldStatus = order.status;
                
                if (newStatus && newStatus !== oldStatus) {
                    order.status = newStatus;
                    
                    order.status_history = order.status_history || [];
                    order.status_history.push({
                        status: newStatus,
                        timestamp: new Date(),
                        comment: `Status updated via tracking: ${extractedStatus.apiStatus}`,
                        location: trackingData.location || '',
                        source: 'delhivery_tracking'
                    });
                    
                    if (newStatus === 'delivered') {
                        order.delivered_date = new Date();
                    }
                    
                    order.delhivery_data.tracking_data = trackingData;
                    order.delhivery_data.last_tracked = new Date();
                    
                    await order.save();
                    
                    logger.info('✅ Order status updated', {
                        orderId: order.order_id,
                        waybill: waybill,
                        oldStatus: oldStatus,
                        newStatus: newStatus
                    });
                }
            }
        } catch (error) {
            logger.error('❌ Error tracking order', {
                orderId: order.order_id,
                waybill: waybill,
                error: error.message
            });
        }
    }

    /**
     * Extract status from Delhivery API response
     * Primary path: ShipmentData[0].Shipment.Status.Status
     * This is the main status field that determines order classification
     */
    extractStatusFromResponse(apiResponse) {
        let apiStatus = null;
        let statusType = null;
        let statusLocation = null;
        let statusDateTime = null;
        
        // Primary extraction path: ShipmentData[0].Shipment.Status.Status
        if (apiResponse.ShipmentData && Array.isArray(apiResponse.ShipmentData) && apiResponse.ShipmentData.length > 0) {
            const shipmentData = apiResponse.ShipmentData[0];
            
            // Extract from Shipment.Status object (PRIMARY STATUS)
            if (shipmentData.Shipment && shipmentData.Shipment.Status) {
                const statusObj = shipmentData.Shipment.Status;
                
                // Main status field - this is what we use for classification
                if (statusObj.Status) {
                    apiStatus = statusObj.Status;
                } else if (typeof statusObj === 'string') {
                    apiStatus = statusObj;
                }
                
                // Additional status metadata
                statusType = statusObj.StatusType || null;
                statusLocation = statusObj.StatusLocation || null;
                statusDateTime = statusObj.StatusDateTime || null;
            }
            
            // Fallback: Check if Status is directly on shipmentData
            if (!apiStatus && shipmentData.Status) {
                if (shipmentData.Status.Status) {
                    apiStatus = shipmentData.Status.Status;
                    statusType = shipmentData.Status.StatusType || null;
                    statusLocation = shipmentData.Status.StatusLocation || null;
                    statusDateTime = shipmentData.Status.StatusDateTime || null;
                } else if (typeof shipmentData.Status === 'string') {
                    apiStatus = shipmentData.Status;
                }
            }
        }
        
        // Fallback: Try root level Status
        if (!apiStatus && apiResponse.Status) {
            if (apiResponse.Status.Status) {
                apiStatus = apiResponse.Status.Status;
                statusType = apiResponse.Status.StatusType || null;
            } else if (typeof apiResponse.Status === 'string') {
                apiStatus = apiResponse.Status;
            }
        }
        
        return { 
            apiStatus, 
            statusType, 
            statusLocation, 
            statusDateTime 
        };
    }

    /**
     * Map Delhivery status to internal status
     * Based on actual API response structure from tracking test results
     * Status values found: "Delivered", "Pending", "In Transit", "Dispatched", "Manifested"
     */
    mapDelhiveryStatus(delhiveryStatus) {
        if (!delhiveryStatus) return null;
        
        // Normalize status string (case-insensitive matching)
        const normalizedStatus = String(delhiveryStatus).trim();
        const lowerStatus = normalizedStatus.toLowerCase();
        
        const statusMap = {
            // Delivered - FINAL STATUS (stops tracking)
            'delivered': 'delivered',
            
            // Pending - Waiting at destination facility (still tracking)
            'pending': 'in_transit',
            
            // In Transit - Shipment is moving (still tracking)
            'in transit': 'in_transit',
            'intransit': 'in_transit',
            'in-transit': 'in_transit',
            
            // Dispatched - Out for delivery (still tracking)
            'dispatched': 'out_for_delivery',
            
            // Manifested - Initial status (still tracking)
            'manifested': 'pickups_manifests',
            
            // RTO - Return to Origin (stops tracking)
            'rto': 'rto',
            'return to origin': 'rto',
            'returned': 'rto',
            
            // Cancelled (stops tracking)
            'cancelled': 'cancelled',
            'canceled': 'cancelled',
            
            // NDR - Non-Delivery Report (still tracking)
            'ndr': 'ndr',
            'non-delivery report': 'ndr',
            
            // Lost (stops tracking)
            'lost': 'lost',
            
            // Pickup/Manifest (still tracking)
            'pickup': 'pickups_manifests',
            'manifest': 'pickups_manifests',
            'pickup and manifest': 'pickups_manifests'
        };
        
        // Direct lookup (case-insensitive)
        return statusMap[lowerStatus] || null;
    }

    /**
     * Get status category for frontend classification
     * Returns the category section where order should be displayed
     */
    getStatusCategory(status) {
        const categoryMap = {
            'new': 'NEW',
            'ready_to_ship': 'READY_TO_SHIP',
            'pickups_manifests': 'PICKUPS_AND_MANIFESTS',
            'in_transit': 'IN_TRANSIT',
            'out_for_delivery': 'IN_TRANSIT', // Out for delivery is still in transit
            'delivered': 'DELIVERED',
            'ndr': 'NDR',
            'rto': 'RTO',
            'cancelled': 'CANCELLED',
            'lost': 'LOST'
        };
        
        return categoryMap[status] || 'IN_TRANSIT';
    }

    /**
     * Check if order should stop tracking based on status
     * Once delivered, cancelled, RTO, or lost - stop tracking
     */
    shouldStopTracking(status) {
        const finalStatuses = ['delivered', 'cancelled', 'rto', 'lost'];
        return finalStatuses.includes(status);
    }

    /**
     * Check if status indicates delivered
     */
    isStatusDelivered(status) {
        if (!status) return false;
        const normalized = String(status).trim().toLowerCase();
        return normalized === 'delivered';
    }

    /**
     * Check if status indicates cancelled
     */
    isStatusCancelled(status) {
        if (!status) return false;
        const normalized = String(status).trim().toLowerCase();
        return normalized === 'cancelled' || normalized === 'canceled';
    }

    /**
     * Check if status indicates RTO
     */
    isStatusRTO(status) {
        if (!status) return false;
        const normalized = String(status).trim().toUpperCase();
        return normalized === 'RTO' || normalized.includes('RETURN');
    }

    /**
     * Update main Order model status
     */
    async updateOrderStatus(orderId, status, additionalData = {}) {
        try {
            const order = await Order.findOne({ order_id: orderId });
            if (order) {
                order.status = status;
                
                if (status === 'delivered' && additionalData.delivered_at) {
                    order.delivered_date = additionalData.delivered_at;
                }
                
                if (status === 'cancelled') {
                    order.cancelled_date = new Date();
                }
                
                order.status_history = order.status_history || [];
                order.status_history.push({
                    status: status,
                    timestamp: new Date(),
                    remarks: `Status updated via automated tracking`,
                    source: 'automated_tracking'
                });
                
                await order.save();
            }
        } catch (error) {
            logger.error('❌ Error updating order status:', error);
        }
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
