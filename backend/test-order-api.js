const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function testOrderAPI() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find your specific order
        const yourOrder = await Order.findOne({ order_id: 'ORD1761512735974270' });
        
        if (yourOrder) {
            console.log('🎯 YOUR ORDER DETAILS:');
            console.log('Order ID:', yourOrder.order_id);
            console.log('Status:', yourOrder.status);
            console.log('AWB:', yourOrder.delhivery_data?.waybill);
            console.log('Created:', yourOrder.createdAt);
            console.log('Updated:', yourOrder.updatedAt);
            
            // Check if it would appear in API response
            const recentOrders = await Order.find({ user_id: yourOrder.user_id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('order_id status delhivery_data.waybill createdAt');
            
            console.log('\n📋 RECENT ORDERS (as API would return):');
            recentOrders.forEach((order, index) => {
                const isYourOrder = order.order_id === 'ORD1761512735974270';
                console.log(`${index + 1}. ${order.order_id} ${isYourOrder ? '← YOUR ORDER' : ''}`);
                console.log(`   Status: ${order.status}`);
                console.log(`   AWB: ${order.delhivery_data?.waybill || 'NO AWB'}`);
                console.log(`   Created: ${order.createdAt}`);
                console.log('   ' + '-'.repeat(50));
            });
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

testOrderAPI();
