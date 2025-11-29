// Test script to check order status flow for AWB 44800710001982
// This script checks: TrackingOrder -> Order -> Frontend flow

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const Order = require('./models/Order');
const TrackingOrder = require('./models/TrackingOrder');

async function testOrderStatusFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipsarthi', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const awbNumber = '44800710001982';
    
    console.log('='.repeat(80));
    console.log(`🔍 Testing Order Status Flow for AWB: ${awbNumber}`);
    console.log('='.repeat(80));
    console.log();
    
    // Step 1: Check TrackingOrder
    console.log('📦 STEP 1: Checking TrackingOrder...');
    const trackingOrder = await TrackingOrder.findOne({ awb_number: awbNumber });
    
    if (!trackingOrder) {
      console.log('❌ TrackingOrder NOT FOUND for AWB:', awbNumber);
      console.log('   This means the order was never tracked or AWB is wrong.\n');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('✅ TrackingOrder FOUND:');
    console.log('   Order ID:', trackingOrder.order_id);
    console.log('   AWB Number:', trackingOrder.awb_number);
    console.log('   Current Status:', trackingOrder.current_status);
    console.log('   Is Delivered:', trackingOrder.is_delivered);
    console.log('   Is Tracking Active:', trackingOrder.is_tracking_active);
    console.log('   API Status:', trackingOrder.api_status);
    console.log('   Last Tracked At:', trackingOrder.last_tracked_at);
    console.log();
    
    // Step 2: Check Order by order_id
    console.log('📋 STEP 2: Checking Order by order_id...');
    let order = await Order.findOne({ order_id: trackingOrder.order_id });
    
    if (!order) {
      console.log('❌ Order NOT FOUND by order_id:', trackingOrder.order_id);
      console.log('   Trying to find by AWB number...\n');
      
      // Step 2b: Try finding by AWB
      order = await Order.findOne({
        $or: [
          { 'delhivery_data.waybill': awbNumber },
          { 'shipping_info.awb_number': awbNumber }
        ]
      });
      
      if (!order) {
        console.log('❌ Order NOT FOUND by AWB either:', awbNumber);
        console.log('   Order model is missing!\n');
        await mongoose.disconnect();
        process.exit(1);
      } else {
        console.log('✅ Order FOUND by AWB (but order_id mismatch!)');
        console.log('   Order ID in Order model:', order.order_id);
        console.log('   Order ID in TrackingOrder:', trackingOrder.order_id);
        console.log('   ⚠️  MISMATCH DETECTED!\n');
      }
    } else {
      console.log('✅ Order FOUND by order_id:');
    }
    
    console.log('   Order ID:', order.order_id);
    console.log('   Current Status:', order.status);
    console.log('   AWB in delhivery_data:', order.delhivery_data?.waybill);
    console.log('   AWB in shipping_info:', order.shipping_info?.awb_number);
    console.log('   User ID:', order.user_id);
    console.log();
    
    // Step 3: Compare statuses
    console.log('🔍 STEP 3: Comparing Statuses...');
    console.log('   TrackingOrder Status:', trackingOrder.current_status);
    console.log('   Order Status:', order.status);
    
    if (trackingOrder.current_status === order.status) {
      console.log('   ✅ Statuses MATCH');
    } else {
      console.log('   ❌ Statuses DO NOT MATCH!');
      console.log('   ⚠️  This is the problem - Order model has wrong status!');
    }
    console.log();
    
    // Step 4: Check what frontend would query
    console.log('🌐 STEP 4: Simulating Frontend Query...');
    console.log('   Frontend queries: GET /api/orders?status=delivered');
    console.log('   This filters Order model where status = "delivered"');
    console.log();
    
    const deliveredOrders = await Order.find({
      user_id: order.user_id,
      status: 'delivered'
    }).select('order_id status delhivery_data.waybill').lean();
    
    console.log(`   Found ${deliveredOrders.length} orders with status="delivered"`);
    
    const ourOrderInDelivered = deliveredOrders.find(o => 
      o.order_id === order.order_id || 
      o.delhivery_data?.waybill === awbNumber
    );
    
    if (ourOrderInDelivered) {
      console.log('   ✅ Our order WOULD appear in "Delivered" tab');
    } else {
      console.log('   ❌ Our order WOULD NOT appear in "Delivered" tab');
      console.log('   ⚠️  This is why it\'s not showing!');
    }
    console.log();
    
    // Step 5: Check for "out_for_delivery"
    if (trackingOrder.current_status === 'out_for_delivery') {
      console.log('🚚 STEP 5: Checking "Out for Delivery" tab...');
      const outForDeliveryOrders = await Order.find({
        user_id: order.user_id,
        status: 'out_for_delivery'
      }).select('order_id status').lean();
      
      console.log(`   Found ${outForDeliveryOrders.length} orders with status="out_for_delivery"`);
      
      const ourOrderInOutForDelivery = outForDeliveryOrders.find(o => 
        o.order_id === order.order_id
      );
      
      if (ourOrderInOutForDelivery) {
        console.log('   ✅ Our order WOULD appear in "Out for Delivery" tab');
      } else {
        console.log('   ❌ Our order WOULD NOT appear in "Out for Delivery" tab');
      }
      console.log();
    }
    
    // Step 6: Summary and Fix
    console.log('='.repeat(80));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(80));
    console.log();
    
    if (trackingOrder.current_status !== order.status) {
      console.log('❌ PROBLEM FOUND:');
      console.log(`   TrackingOrder has status: "${trackingOrder.current_status}"`);
      console.log(`   Order model has status: "${order.status}"`);
      console.log();
      console.log('🔧 FIX NEEDED:');
      console.log('   Update Order model status to match TrackingOrder');
      console.log();
      console.log('💡 SOLUTION:');
      console.log('   1. Run: node backend/scripts/sync-order-by-awb.js 44800710001982');
      console.log('   2. Or click "Sync Order" button in frontend');
      console.log('   3. Or wait for next cron job run (every 5 minutes)');
      console.log();
    } else {
      console.log('✅ Statuses match - order should appear in correct tab');
      console.log(`   Both have status: "${trackingOrder.current_status}"`);
      console.log();
      
      if (trackingOrder.current_status === 'delivered') {
        console.log('   Checking if order appears in delivered tab...');
        if (ourOrderInDelivered) {
          console.log('   ✅ Order should appear in "Delivered" tab');
        } else {
          console.log('   ❌ Order still not appearing - check frontend query logic');
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testOrderStatusFlow();

