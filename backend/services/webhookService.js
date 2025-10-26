// Location: backend/services/webhookService.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const ShipmentTrackingEvent = require('../models/ShipmentTrackingEvent');
const ShipmentDocument = require('../models/ShipmentDocument');
const logger = require('../utils/logger');
const websocketService = require('./websocketService');

class WebhookService {
  /**
   * Map Delhivery status to internal status
   */
  mapDelhiveryStatus(delhiveryStatus) {
    const statusMapping = {
      'Manifested': 'pickups_manifests',
      'Pickup Exception': 'pickups_manifests',
      'In Transit': 'in_transit',
      'Reached at destination': 'in_transit',
      'Reached Destination City': 'in_transit',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'Undelivered': 'ndr',
      'Customer not available': 'ndr',
      'Customer refused': 'ndr',
      'Incomplete address': 'ndr',
      'Cash not ready': 'ndr',
      'Consignee not available': 'ndr',
      'Delivery attempted': 'ndr',
      'RTO': 'rto',
      'RTO Initiated': 'rto',
      'RTO Delivered': 'rto',
      'Lost': 'lost',
      'Damaged': 'lost',
      'Cancelled': 'cancelled'
    };

    return statusMapping[delhiveryStatus] || 'in_transit';
  }

  /**
   * Process Scan Push Webhook with transaction support
   */
  async processScanPushWebhook(payload) {
    const startTime = Date.now();
    
    try {
      const shipment = payload.Shipment;
      if (!shipment) {
        throw new Error('Invalid payload: Shipment data missing');
      }

      const statusData = shipment.Status;
      const waybill = shipment.AWB;
      const referenceNo = shipment.ReferenceNo || null;

      if (!waybill) {
        throw new Error('Invalid payload: AWB/Waybill missing');
      }

      logger.info('📦 Processing scan push webhook', {
        waybill,
        referenceNo,
        status: statusData?.Status,
        statusType: statusData?.StatusType
      });

      // Check if event already exists (prevent duplicates) - BEFORE transaction
      const existingEvent = await ShipmentTrackingEvent.eventExists(
        waybill,
        statusData?.Status,
        statusData?.StatusDateTime ? new Date(statusData.StatusDateTime) : new Date()
      );

      if (existingEvent) {
        logger.info('⚠️ Duplicate webhook event ignored', {
          waybill,
          status: statusData?.Status,
          eventId: existingEvent._id
        });
        return {
          success: true,
          message: 'Event already processed',
          duplicate: true,
          waybill
        };
      }

      // Use transaction for data consistency
      const session = await mongoose.startSession();
      let result;
      
      try {
        await session.withTransaction(async () => {
          // Save tracking event
          const trackingEvent = new ShipmentTrackingEvent({
            waybill,
            order_id: referenceNo,
            reference_no: referenceNo,
            status: statusData?.Status || 'Unknown',
            status_type: statusData?.StatusType || '',
            status_date_time: statusData?.StatusDateTime ? new Date(statusData.StatusDateTime) : new Date(),
            status_location: statusData?.StatusLocation || '',
            instructions: statusData?.Instructions || '',
            nsl_code: shipment.NSLCode || '',
            sort_code: shipment.Sortcode || '',
            pickup_date: shipment.PickUpDate ? new Date(shipment.PickUpDate) : null,
            raw_payload: payload
          });

          await trackingEvent.save({ session });

          // Find and update order if exists
          let order = null;
          if (referenceNo) {
            order = await Order.findOne({ order_id: referenceNo }).session(session);
          }
          
          if (!order && waybill) {
            order = await Order.findOne({ 'delhivery_data.waybill': waybill }).session(session);
          }

          if (order) {
            const mappedStatus = this.mapDelhiveryStatus(statusData?.Status || '');
            
            // Update order status if changed
            if (order.status !== mappedStatus) {
              const oldStatus = order.status;
              order.status = mappedStatus;

              // Add to status history
              if (!order.status_history) {
                order.status_history = [];
              }
              
              order.status_history.push({
                status: mappedStatus,
                timestamp: new Date(),
                location: statusData?.StatusLocation || '',
                remarks: statusData?.Instructions || `Status updated via webhook: ${statusData?.Status}`
              });

              // Update specific dates based on status
              if (mappedStatus === 'delivered') {
                order.delivered_date = new Date();
              }

              // Update Delhivery data
              if (!order.delhivery_data) {
                order.delhivery_data = {};
              }
              order.delhivery_data.last_status_update = new Date();
              order.delhivery_data.current_status = statusData?.Status;

              await order.save({ session });

              logger.info('✅ Order status updated', {
                orderId: order.order_id,
                waybill,
                oldStatus,
                newStatus: mappedStatus
              });

              // Link tracking event to order
              trackingEvent.order_ref = order._id;
              await trackingEvent.save({ session });

              // Store order reference for WebSocket (outside transaction)
              const orderUserId = order.user_id.toString();
              const orderData = {
                order_id: order.order_id,
                waybill,
                status: mappedStatus,
                old_status: oldStatus,
                location: statusData?.StatusLocation
              };

              // Emit WebSocket event after transaction completes
              setImmediate(() => {
                try {
                  websocketService.sendNotificationToClient(orderUserId, {
                    type: 'order_status_update',
                    ...orderData,
                    timestamp: new Date()
                  });
                } catch (wsError) {
                  logger.warn('WebSocket broadcast failed', { error: wsError.message });
                }
              });
            } else {
              logger.debug('Order status unchanged', {
                orderId: order.order_id,
                waybill,
                status: mappedStatus
              });
            }
          } else {
            logger.warn('⚠️ Order not found for webhook', {
              waybill,
              referenceNo
            });
          }

          // Mark event as processed
          trackingEvent.processed = true;
          await trackingEvent.save({ session });
          
          // Store result for return
          result = {
            success: true,
            waybill,
            orderUpdated: !!order
          };
        });
      } finally {
        await session.endSession();
      }

      const duration = Date.now() - startTime;
      
      logger.info('✅ Scan push webhook processed successfully', {
        waybill,
        referenceNo,
        duration: `${duration}ms`
      });

      return {
        success: true,
        message: 'Webhook processed successfully',
        waybill,
        duration
      };

    } catch (error) {
      logger.error('❌ Scan push webhook processing failed', {
        error: error.message,
        stack: error.stack,
        payload: JSON.stringify(payload).substring(0, 500)
      });

      throw error;
    }
  }

  /**
   * Process EPOD Webhook
   */
  async processEPODWebhook(payload) {
    try {
      const { waybill, EPOD, orderID } = payload;

      if (!waybill || !EPOD) {
        throw new Error('Invalid payload: waybill and EPOD are required');
      }

      logger.info('📸 Processing EPOD webhook', {
        waybill,
        orderID,
        epodLength: EPOD?.length || 0
      });

      // Check if EPOD already exists
      // Note: We'll check after uploading to compare URLs

      // Upload image to Cloudinary
      const cloudinaryService = require('./cloudinaryService');
      
      // Handle base64 with or without data URL prefix
      let base64Data = EPOD;
      if (EPOD.includes(',')) {
        base64Data = EPOD.split(',')[1]; // Remove data:image/...;base64, prefix
      }
      
      const base64Buffer = Buffer.from(base64Data, 'base64');
      
      const uploadResult = await cloudinaryService.uploadFile(base64Buffer, {
        folder: 'shipsarthi/epod',
        resource_type: 'image',
        mimetype: 'image/jpeg'
      });

      if (!uploadResult.success) {
        throw new Error('Failed to upload EPOD image');
      }

      // Check if document already exists
      const existingDoc = await ShipmentDocument.documentExists(waybill, 'epod', uploadResult.url);
      
      if (existingDoc) {
        logger.info('⚠️ EPOD already exists', {
          waybill,
          documentId: existingDoc._id
        });
        return {
          success: true,
          message: 'EPOD already exists',
          duplicate: true,
          documentId: existingDoc._id
        };
      }

      // Find order
      let order = null;
      if (orderID) {
        order = await Order.findOne({ order_id: orderID });
      }
      if (!order && waybill) {
        order = await Order.findOne({ 'delhivery_data.waybill': waybill });
      }

      // Save document
      const document = new ShipmentDocument({
        waybill,
        order_id: orderID || null,
        document_type: 'epod',
        image_url: uploadResult.url,
        image_path: uploadResult.public_id,
        cloudinary_public_id: uploadResult.public_id,
        base64_data: EPOD, // Store for reprocessing if needed
        file_size: base64Buffer.length,
        mime_type: 'image/jpeg',
        processed: true
      });

      if (order) {
        document.order_ref = order._id;
      }

      await document.save();

      // Update order with EPOD URL if order exists
      if (order) {
        if (!order.delivery_info) {
          order.delivery_info = {};
        }
        order.delivery_info.epod_url = uploadResult.url;
        order.delivery_info.epod_date = new Date();
        await order.save();

        // Emit WebSocket event
        try {
          websocketService.sendNotificationToClient(order.user_id.toString(), {
            type: 'epod_received',
            order_id: order.order_id,
            waybill,
            epod_url: uploadResult.url,
            timestamp: new Date()
          });
        } catch (wsError) {
          logger.warn('WebSocket broadcast failed', { error: wsError.message });
        }
      }

      logger.info('✅ EPOD webhook processed successfully', {
        waybill,
        orderID,
        documentId: document._id
      });

      return {
        success: true,
        message: 'EPOD processed successfully',
        waybill,
        image_url: uploadResult.url,
        documentId: document._id
      };

    } catch (error) {
      logger.error('❌ EPOD webhook processing failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process Sorter Image Webhook
   */
  async processSorterImageWebhook(payload) {
    try {
      const { Waybill, Weight_images, doc } = payload;

      if (!Waybill || !Weight_images) {
        throw new Error('Invalid payload: Waybill and Weight_images are required');
      }

      logger.info('📸 Processing sorter image webhook', {
        waybill: Waybill,
        imageLength: Weight_images?.length || 0
      });

      // Upload image to Cloudinary
      const cloudinaryService = require('./cloudinaryService');
      
      // Handle base64 with or without data URL prefix
      let base64Data = Weight_images;
      if (Weight_images.includes(',')) {
        base64Data = Weight_images.split(',')[1];
      }
      
      const base64Buffer = Buffer.from(base64Data, 'base64');
      
      const uploadResult = await cloudinaryService.uploadFile(base64Buffer, {
        folder: 'shipsarthi/sorter-images',
        resource_type: 'image',
        mimetype: 'image/jpeg'
      });

      if (!uploadResult.success) {
        throw new Error('Failed to upload sorter image');
      }

      // Find order
      const order = await Order.findOne({ 'delhivery_data.waybill': Waybill });

      // Save document
      const document = new ShipmentDocument({
        waybill: Waybill,
        order_id: order?.order_id || null,
        document_type: 'sorter_image',
        image_url: uploadResult.url,
        image_path: uploadResult.public_id,
        cloudinary_public_id: uploadResult.public_id,
        base64_data: Weight_images,
        file_size: base64Buffer.length,
        mime_type: 'image/jpeg',
        processed: true
      });

      if (order) {
        document.order_ref = order._id;
        
        // Update order with sorter image URL
        if (!order.package_info) {
          order.package_info = {};
        }
        if (!order.package_info.weight_photo_url) {
          order.package_info.weight_photo_url = uploadResult.url;
          await order.save();
        }
      }

      await document.save();

      logger.info('✅ Sorter image webhook processed successfully', {
        waybill: Waybill,
        documentId: document._id
      });

      return {
        success: true,
        message: 'Sorter image processed successfully',
        waybill: Waybill,
        image_url: uploadResult.url,
        documentId: document._id
      };

    } catch (error) {
      logger.error('❌ Sorter image webhook processing failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Process QC Image Webhook
   */
  async processQCImageWebhook(payload) {
    try {
      const { waybillId, returnId, Image } = payload;

      if (!waybillId || !Image) {
        throw new Error('Invalid payload: waybillId and Image are required');
      }

      logger.info('📸 Processing QC image webhook', {
        waybill: waybillId,
        returnId,
        imageLength: Image?.length || 0
      });

      // Upload image to Cloudinary
      const cloudinaryService = require('./cloudinaryService');
      
      // Handle base64 with or without data URL prefix
      let base64Data = Image;
      if (Image.includes(',')) {
        base64Data = Image.split(',')[1];
      }
      
      const base64Buffer = Buffer.from(base64Data, 'base64');
      
      const uploadResult = await cloudinaryService.uploadFile(base64Buffer, {
        folder: 'shipsarthi/qc-images',
        resource_type: 'image',
        mimetype: 'image/jpeg'
      });

      if (!uploadResult.success) {
        throw new Error('Failed to upload QC image');
      }

      // Find order
      let order = null;
      if (returnId) {
        order = await Order.findOne({ order_id: returnId });
      }
      if (!order && waybillId) {
        order = await Order.findOne({ 'delhivery_data.waybill': waybillId });
      }

      // Save document
      const document = new ShipmentDocument({
        waybill: waybillId,
        order_id: returnId || null,
        return_id: returnId || null,
        document_type: 'qc_image',
        image_url: uploadResult.url,
        image_path: uploadResult.public_id,
        cloudinary_public_id: uploadResult.public_id,
        base64_data: Image,
        file_size: base64Buffer.length,
        mime_type: 'image/jpeg',
        processed: true
      });

      if (order) {
        document.order_ref = order._id;
      }

      await document.save();

      logger.info('✅ QC image webhook processed successfully', {
        waybill: waybillId,
        returnId,
        documentId: document._id
      });

      return {
        success: true,
        message: 'QC image processed successfully',
        waybill: waybillId,
        image_url: uploadResult.url,
        documentId: document._id
      };

    } catch (error) {
      logger.error('❌ QC image webhook processing failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new WebhookService();

