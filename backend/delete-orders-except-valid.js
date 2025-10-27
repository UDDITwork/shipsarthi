const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function deleteAllOrdersExceptValid() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find the valid order first
        const validOrder = await Order.findOne({ 
            'delhivery_data.waybill': '44800710000361' 
        });
        
        if (!validOrder) {
            console.log('❌ Valid order with AWB 44800710000361 not found');
            return;
        }
        
        console.log('🎯 VALID ORDER FOUND:', {
            order_id: validOrder.order_id,
            awb: validOrder.delhivery_data.waybill,
            status: validOrder.status,
            customer: validOrder.customer_info.buyer_name,
            created: validOrder.createdAt
        });
        
        // Count total orders for this user
        const totalOrders = await Order.countDocuments({ user_id: validOrder.user_id });
        console.log(`\n📊 Total orders for this user: ${totalOrders}`);
        
        // Find all orders except the valid one
        const ordersToDelete = await Order.find({
            user_id: validOrder.user_id,
            _id: { $ne: validOrder._id }
        }).select('order_id delhivery_data.waybill status customer_info.buyer_name createdAt');
        
        console.log(`\n🗑️ Orders to be deleted: ${ordersToDelete.length}`);
        
        if (ordersToDelete.length === 0) {
            console.log('✅ No orders to delete');
            return;
        }
        
        // Show orders that will be deleted
        console.log('\n📋 ORDERS TO BE DELETED:');
        ordersToDelete.forEach((order, index) => {
            console.log(`${index + 1}. ${order.order_id}`);
            console.log(`   AWB: ${order.delhivery_data?.waybill || 'NO AWB'}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Customer: ${order.customer_info?.buyer_name || 'N/A'}`);
            console.log(`   Created: ${order.createdAt}`);
            console.log('   ' + '-'.repeat(50));
        });
        
        // Confirmation prompt
        console.log('\n⚠️ WARNING: This will permanently delete all orders except the valid one!');
        console.log('Valid order to keep:', validOrder.order_id, 'with AWB:', validOrder.delhivery_data.waybill);
        
        // Delete all orders except the valid one
        const deleteResult = await Order.deleteMany({
            user_id: validOrder.user_id,
            _id: { $ne: validOrder._id }
        });
        
        console.log(`\n✅ DELETION COMPLETED:`);
        console.log(`- Orders deleted: ${deleteResult.deletedCount}`);
        console.log(`- Valid order kept: ${validOrder.order_id}`);
        
        // Verify the result
        const remainingOrders = await Order.find({ user_id: validOrder.user_id });
        console.log(`\n📊 REMAINING ORDERS: ${remainingOrders.length}`);
        
        remainingOrders.forEach((order, index) => {
            console.log(`${index + 1}. ${order.order_id} - AWB: ${order.delhivery_data?.waybill || 'NO AWB'}`);
        });
        
        await mongoose.disconnect();
        console.log('\n✅ Database disconnected');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the deletion
deleteAllOrdersExceptValid();
