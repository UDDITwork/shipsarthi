// Sync ALL orders from Delhivery API
// This script processes all TrackingOrders and updates their status from Delhivery API
// Works for ALL statuses: in_transit, out_for_delivery, delivered, etc.

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Order = require('../models/Order');
const TrackingOrder = require('../models/TrackingOrder');
const delhiveryService = require('../services/delhiveryService');
const trackingService = require('../services/trackingService');
const logger = require('../utils/logger');

async function syncAllOrdersFromDelhivery(awbNumbers = null) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipsarthi', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    console.log('='.repeat(80));
    console.log('🔄 SYNCING ALL ORDERS FROM DELHIVERY API');
    console.log('='.repeat(80));
    console.log();
    
    let trackingOrders = [];
    
    if (awbNumbers && awbNumbers.length > 0) {
      // Process specific AWB numbers
      console.log(`📋 Processing ${awbNumbers.length} specific AWB numbers...\n`);
      
      for (const awb of awbNumbers) {
        const trackingOrder = await TrackingOrder.findOne({ awb_number: awb.trim() });
        if (trackingOrder) {
          trackingOrders.push(trackingOrder);
        } else {
          // Try to find by order_id or create from Order
          const order = await Order.findOne({
            $or: [
              { 'delhivery_data.waybill': awb.trim() },
              { 'shipping_info.awb_number': awb.trim() }
            ]
          });
          
          if (order) {
            // Create TrackingOrder if it doesn't exist
            if (order.delhivery_data?.pickup_request_id && order.delhivery_data?.waybill) {
              try {
                const newTrackingOrder = await TrackingOrder.createFromOrder(order);
                trackingOrders.push(newTrackingOrder);
                console.log(`✅ Created TrackingOrder for AWB: ${awb}`);
              } catch (error) {
                console.log(`⚠️  Could not create TrackingOrder for AWB ${awb}: ${error.message}`);
              }
            }
          } else {
            console.log(`⚠️  Order not found for AWB: ${awb}`);
          }
        }
      }
    } else {
      // Process ALL active TrackingOrders
      console.log('📋 Fetching ALL active TrackingOrders...\n');
      trackingOrders = await TrackingOrder.find({
        is_tracking_active: true
      });
      
      console.log(`Found ${trackingOrders.length} active tracking orders\n`);
    }
    
    if (trackingOrders.length === 0) {
      console.log('❌ No tracking orders found to process');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    console.log(`🔄 Processing ${trackingOrders.length} orders...\n`);
    console.log('='.repeat(80));
    console.log();
    
    let successCount = 0;
    let errorCount = 0;
    let statusUpdates = {
      delivered: 0,
      in_transit: 0,
      out_for_delivery: 0,
      pickups_manifests: 0,
      ndr: 0,
      rto: 0,
      cancelled: 0,
      lost: 0,
      no_change: 0
    };
    
    // Process each tracking order
    for (let i = 0; i < trackingOrders.length; i++) {
      const trackingOrder = trackingOrders[i];
      const awbNumber = trackingOrder.awb_number;
      const orderId = trackingOrder.order_id;
      
      console.log(`[${i + 1}/${trackingOrders.length}] Processing AWB: ${awbNumber}`);
      console.log(`   Order ID: ${orderId}`);
      console.log(`   Current Status: ${trackingOrder.current_status}`);
      
      try {
        // Call Delhivery Tracking API
        const trackingResult = await delhiveryService.trackShipment(
          awbNumber, 
          trackingOrder.reference_id || orderId
        );
        
        if (!trackingResult.success) {
          console.log(`   ❌ API Error: ${trackingResult.error}`);
          errorCount++;
          console.log();
          continue;
        }
        
        // Extract status from API response
        const extractedStatus = trackingService.extractStatusFromResponse(trackingResult.data);
        
        if (!extractedStatus.apiStatus) {
          console.log(`   ⚠️  Could not extract status from API response`);
          errorCount++;
          console.log();
          continue;
        }
        
        // Map Delhivery status to internal status
        const mappedStatus = trackingService.mapDelhiveryStatus(extractedStatus.apiStatus);
        
        if (!mappedStatus) {
          console.log(`   ⚠️  Could not map status: ${extractedStatus.apiStatus}`);
          errorCount++;
          console.log();
          continue;
        }
        
        console.log(`   📊 API Status: ${extractedStatus.apiStatus}`);
        console.log(`   📊 Mapped Status: ${mappedStatus}`);
        
        // Update TrackingOrder
        const oldTrackingStatus = trackingOrder.current_status;
        trackingOrder.current_status = mappedStatus;
        trackingOrder.api_status = extractedStatus.apiStatus;
        trackingOrder.delhivery_status = extractedStatus.apiStatus;
        trackingOrder.last_tracked_at = new Date();
        trackingOrder.last_tracking_response = trackingResult.data;
        
        if (mappedStatus === 'delivered') {
          trackingOrder.is_delivered = true;
          trackingOrder.is_tracking_active = false;
          if (extractedStatus.statusDateTime) {
            trackingOrder.delivered_at = new Date(extractedStatus.statusDateTime);
          }
          trackingOrder.delivery_location = extractedStatus.statusLocation;
        }
        
        // Add to status history
        trackingOrder.status_history = trackingOrder.status_history || [];
        trackingOrder.status_history.push({
          status: extractedStatus.apiStatus,
          status_type: extractedStatus.statusType,
          status_date_time: extractedStatus.statusDateTime ? new Date(extractedStatus.statusDateTime) : new Date(),
          status_location: extractedStatus.statusLocation,
          instructions: '',
          tracked_at: new Date()
        });
        
        await trackingOrder.save();
        
        // Update Order model
        const order = await Order.findOne({ order_id: orderId });
        
        if (order) {
          const oldOrderStatus = order.status;
          
          // ALWAYS update Order status with the latest from API
          order.status = mappedStatus;
          
          if (mappedStatus === 'delivered') {
            if (extractedStatus.statusDateTime) {
              order.delivered_date = new Date(extractedStatus.statusDateTime);
            }
          }
          
          order.status_history = order.status_history || [];
          order.status_history.push({
            status: mappedStatus,
            timestamp: new Date(),
            remarks: `Status updated from Delhivery API: ${extractedStatus.apiStatus}`,
            source: 'delhivery_tracking_api',
            location: extractedStatus.statusLocation
          });
          
          await order.save();
          
          if (oldOrderStatus !== mappedStatus) {
            console.log(`   ✅ Status updated: ${oldOrderStatus} → ${mappedStatus}`);
            statusUpdates[mappedStatus] = (statusUpdates[mappedStatus] || 0) + 1;
          } else {
            console.log(`   ℹ️  Status unchanged: ${mappedStatus}`);
            statusUpdates.no_change++;
          }
        } else {
          console.log(`   ⚠️  Order not found for order_id: ${orderId}`);
        }
        
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
      
      console.log();
      
      // Small delay to avoid rate limiting
      if (i < trackingOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(80));
    console.log();
    console.log(`Total Processed: ${trackingOrders.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log();
    console.log('Status Updates:');
    console.log(`   Delivered: ${statusUpdates.delivered}`);
    console.log(`   In Transit: ${statusUpdates.in_transit}`);
    console.log(`   Out for Delivery: ${statusUpdates.out_for_delivery}`);
    console.log(`   Pickups & Manifests: ${statusUpdates.pickups_manifests}`);
    console.log(`   NDR: ${statusUpdates.ndr}`);
    console.log(`   RTO: ${statusUpdates.rto}`);
    console.log(`   Cancelled: ${statusUpdates.cancelled}`);
    console.log(`   Lost: ${statusUpdates.lost}`);
    console.log(`   No Change: ${statusUpdates.no_change}`);
    console.log();
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get AWB numbers from command line arguments or process all
const args = process.argv.slice(2);

if (args.length > 0) {
  // Process specific AWB numbers
  const awbNumbers = args;
  console.log(`📋 Processing ${awbNumbers.length} AWB numbers from command line...\n`);
  syncAllOrdersFromDelhivery(awbNumbers);
} else {
  // Process all active TrackingOrders
  console.log('📋 Processing ALL active TrackingOrders...\n');
  syncAllOrdersFromDelhivery();
}

