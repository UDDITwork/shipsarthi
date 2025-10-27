const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function checkOrder() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const order = await Order.findOne({ order_id: 'ORD1761507793887446' });
        
        if (order) {
            console.log('📋 Order found:', {
                order_id: order.order_id,
                status: order.status,
                has_delhivery_data: !!order.delhivery_data,
                waybill: order.delhivery_data?.waybill || 'NOT SET',
                delhivery_data_keys: order.delhivery_data ? Object.keys(order.delhivery_data) : 'NO DELHIVERY DATA',
                created_at: order.createdAt,
                updated_at: order.updatedAt
            });
            
            // Check if there are any orders with AWB numbers for this user
            const userOrders = await Order.find({ user_id: order.user_id }).select('order_id delhivery_data.waybill status');
            console.log('\n📊 All orders for this user:');
            userOrders.forEach(o => {
                console.log(`- ${o.order_id}: ${o.delhivery_data?.waybill || 'NO AWB'} (${o.status})`);
            });
        } else {
            console.log('❌ Order not found');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkOrder();
