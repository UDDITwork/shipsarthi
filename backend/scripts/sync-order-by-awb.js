// Quick script to sync a specific order by AWB number
// Usage: node backend/scripts/sync-order-by-awb.js <AWB_NUMBER>

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Order = require('../models/Order');
const TrackingOrder = require('../models/TrackingOrder');
const logger = require('../utils/logger');

async function syncOrderByAWB(awbNumber) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipsarthi', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find tracking order by AWB
    const trackingOrder = await TrackingOrder.findOne({ awb_number: awbNumber });
    
    if (!trackingOrder) {
      console.log(`❌ TrackingOrder not found for AWB: ${awbNumber}`);
      process.exit(1);
    }
    
    console.log(`📦 Found TrackingOrder:`, {
      order_id: trackingOrder.order_id,
      awb_number: trackingOrder.awb_number,
      current_status: trackingOrder.current_status,
      is_delivered: trackingOrder.is_delivered
    });
    
    // Find order by order_id first, then try AWB if not found
    let order = await Order.findOne({ order_id: trackingOrder.order_id });
    
    if (!order) {
      // Try finding by AWB number as fallback
      order = await Order.findOne({
        $or: [
          { 'delhivery_data.waybill': awbNumber },
          { 'shipping_info.awb_number': awbNumber }
        ]
      });
    }
    
    if (!order) {
      console.log(`❌ Order not found for AWB: ${awbNumber}, order_id: ${trackingOrder.order_id}`);
      process.exit(1);
    }
    
    console.log(`📋 Found Order:`, {
      order_id: order.order_id,
      current_status: order.status,
      awb: order.delhivery_data?.waybill || order.shipping_info?.awb_number
    });
    
    // Update if status is different
    if (order.status !== trackingOrder.current_status) {
      const oldStatus = order.status;
      order.status = trackingOrder.current_status;
      
      if (trackingOrder.current_status === 'delivered' && trackingOrder.delivered_at) {
        order.delivered_date = trackingOrder.delivered_at;
      }
      
      if (trackingOrder.current_status === 'cancelled') {
        order.cancelled_date = new Date();
      }
      
      order.status_history = order.status_history || [];
      order.status_history.push({
        status: trackingOrder.current_status,
        timestamp: new Date(),
        remarks: `Status synced from TrackingOrder via script`,
        source: 'manual_sync_script'
      });
      
      await order.save();
      
      console.log(`✅ Successfully synced order!`);
      console.log(`   Order ID: ${order.order_id}`);
      console.log(`   AWB: ${awbNumber}`);
      console.log(`   Status: ${oldStatus} → ${trackingOrder.current_status}`);
    } else {
      console.log(`ℹ️ Order already has correct status: ${trackingOrder.current_status}`);
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get AWB from command line
const awbNumber = process.argv[2];

if (!awbNumber) {
  console.log('Usage: node backend/scripts/sync-order-by-awb.js <AWB_NUMBER>');
  console.log('Example: node backend/scripts/sync-order-by-awb.js 44800710001982');
  process.exit(1);
}

syncOrderByAWB(awbNumber.trim());

