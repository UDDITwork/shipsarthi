// Fix missing TrackingOrder for AWB 44800710001982
// This script finds the Order and creates/updates TrackingOrder

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const Order = require('./models/Order');
const TrackingOrder = require('./models/TrackingOrder');
const delhiveryService = require('./services/delhiveryService');
const trackingService = require('./services/trackingService');

async function fixMissingTrackingOrder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipsarthi', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const awbNumber = '44800710001982';
    
    console.log('='.repeat(80));
    console.log(`🔧 Fixing Missing TrackingOrder for AWB: ${awbNumber}`);
    console.log('='.repeat(80));
    console.log();
    
    // Step 1: Find Order by AWB
    console.log('📋 STEP 1: Finding Order by AWB...');
    const order = await Order.findOne({
      $or: [
        { 'delhivery_data.waybill': awbNumber },
        { 'shipping_info.awb_number': awbNumber }
      ]
    });
    
    if (!order) {
      console.log('❌ Order NOT FOUND for AWB:', awbNumber);
      console.log('   Please check if AWB number is correct.\n');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('✅ Order FOUND:');
    console.log('   Order ID:', order.order_id);
    console.log('   Current Status:', order.status);
    console.log('   AWB:', order.delhivery_data?.waybill || order.shipping_info?.awb_number);
    console.log('   User ID:', order.user_id);
    console.log('   Pickup Request ID:', order.delhivery_data?.pickup_request_id);
    console.log();
    
    // Step 2: Check if TrackingOrder exists by order_id
    console.log('📦 STEP 2: Checking for existing TrackingOrder...');
    let trackingOrder = await TrackingOrder.findOne({ order_id: order.order_id });
    
    if (trackingOrder) {
      console.log('✅ TrackingOrder EXISTS by order_id:');
      console.log('   Order ID:', trackingOrder.order_id);
      console.log('   AWB in TrackingOrder:', trackingOrder.awb_number);
      console.log('   Current Status:', trackingOrder.current_status);
      console.log();
      
      // Check if AWB matches
      if (trackingOrder.awb_number !== awbNumber) {
        console.log('⚠️  AWB MISMATCH!');
        console.log('   TrackingOrder AWB:', trackingOrder.awb_number);
        console.log('   Order AWB:', awbNumber);
        console.log('   Updating TrackingOrder AWB...');
        
        trackingOrder.awb_number = awbNumber;
        await trackingOrder.save();
        console.log('   ✅ TrackingOrder AWB updated\n');
      }
    } else {
      // Check if TrackingOrder exists by AWB
      trackingOrder = await TrackingOrder.findOne({ awb_number: awbNumber });
      
      if (trackingOrder) {
        console.log('✅ TrackingOrder EXISTS by AWB (but order_id mismatch):');
        console.log('   Order ID in TrackingOrder:', trackingOrder.order_id);
        console.log('   Order ID in Order:', order.order_id);
        console.log('   Updating TrackingOrder order_id...');
        
        trackingOrder.order_id = order.order_id;
        await trackingOrder.save();
        console.log('   ✅ TrackingOrder order_id updated\n');
      } else {
        // Create new TrackingOrder
        console.log('❌ TrackingOrder NOT FOUND - Creating new one...');
        
        if (!order.delhivery_data?.pickup_request_id) {
          console.log('⚠️  Order does not have pickup_request_id');
          console.log('   Cannot create TrackingOrder without pickup request');
          console.log('   Please create pickup request first.\n');
          await mongoose.disconnect();
          process.exit(1);
        }
        
        trackingOrder = new TrackingOrder({
          order_id: order.order_id,
          user_id: order.user_id,
          awb_number: awbNumber,
          reference_id: order.reference_id,
          pickup_request_id: order.delhivery_data.pickup_request_id,
          pickup_request_date: order.delhivery_data.pickup_request_date,
          pickup_request_status: order.delhivery_data.pickup_request_status || 'scheduled',
          current_status: order.status || 'pickups_manifests',
          is_tracking_active: true,
          is_delivered: false
        });
        
        await trackingOrder.save();
        console.log('   ✅ TrackingOrder CREATED\n');
      }
    }
    
    // Step 3: Call Delhivery Tracking API to get ACTUAL status
    console.log('🌐 STEP 3: Calling Delhivery Tracking API...');
    console.log('   AWB:', awbNumber);
    console.log('   Reference ID:', order.reference_id || order.order_id);
    console.log();
    
    const trackingResult = await delhiveryService.trackShipment(awbNumber, order.reference_id || order.order_id);
    
    if (!trackingResult.success) {
      console.log('❌ Failed to track from Delhivery API:');
      console.log('   Error:', trackingResult.error);
      console.log('   Will use existing status from database\n');
    } else {
      console.log('✅ Delhivery API Response received');
      console.log('   Response:', JSON.stringify(trackingResult.data, null, 2).substring(0, 500));
      console.log();
      
      // Extract status using trackingService method (it's an instance, so methods are available)
      const extractedStatus = trackingService.extractStatusFromResponse(trackingResult.data);
      console.log('📊 Extracted Status Info:');
      console.log('   API Status:', extractedStatus.apiStatus);
      console.log('   Status Type:', extractedStatus.statusType);
      console.log('   Status Location:', extractedStatus.statusLocation);
      console.log('   Status Date Time:', extractedStatus.statusDateTime);
      console.log();
      
      if (extractedStatus.apiStatus) {
        // Map Delhivery status to internal status
        const mappedStatus = trackingService.mapDelhiveryStatus(extractedStatus.apiStatus);
        console.log('🔄 Status Mapping:');
        console.log('   Delhivery Status:', extractedStatus.apiStatus);
        console.log('   Mapped Status:', mappedStatus);
        console.log();
        
        if (mappedStatus) {
          // Update TrackingOrder with REAL status from Delhivery
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
          if (trackingOrder.status_history) {
            trackingOrder.status_history.push({
              status: extractedStatus.apiStatus,
              status_type: extractedStatus.statusType,
              status_date_time: extractedStatus.statusDateTime ? new Date(extractedStatus.statusDateTime) : new Date(),
              status_location: extractedStatus.statusLocation,
              instructions: '',
              tracked_at: new Date()
            });
          }
          
          await trackingOrder.save();
          console.log('✅ TrackingOrder updated with REAL status from Delhivery:');
          console.log('   Old Status:', oldTrackingStatus);
          console.log('   New Status:', mappedStatus);
          console.log();
          
          // Step 4: Update Order model with REAL status
          console.log('🔄 STEP 4: Updating Order model with REAL status...');
          const oldOrderStatus = order.status;
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
          console.log('✅ Order model updated with REAL status:');
          console.log('   Old Status:', oldOrderStatus);
          console.log('   New Status:', mappedStatus);
          console.log();
        } else {
          console.log('⚠️  Could not map Delhivery status to internal status');
          console.log('   Using existing status from database\n');
        }
      } else {
        console.log('⚠️  Could not extract status from Delhivery API response');
        console.log('   Using existing status from database\n');
      }
    }
    
    // Step 5: Summary
    console.log('='.repeat(80));
    console.log('✅ SUMMARY:');
    console.log('='.repeat(80));
    console.log();
    console.log('Order ID:', order.order_id);
    console.log('AWB:', awbNumber);
    console.log('Order Status:', order.status);
    console.log('TrackingOrder Status:', trackingOrder.current_status);
    console.log();
    
    if (order.status === 'delivered') {
      console.log('✅ Order should now appear in "Delivered" tab');
    } else if (order.status === 'out_for_delivery') {
      console.log('✅ Order should now appear in "Out for Delivery" tab');
    } else {
      console.log(`✅ Order should now appear in "${order.status}" tab`);
    }
    console.log();
    
    await mongoose.disconnect();
    console.log('✅ Fix completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixMissingTrackingOrder();

