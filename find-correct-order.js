const mongoose = require('mongoose');
const Order = require('./backend/models/Order');
require('dotenv').config();

async function findCorrectOrder() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find the correct order with AWB
        const correctOrder = await Order.findOne({ order_id: 'ORD1761512735974270' });
        
        if (correctOrder) {
            console.log('🎯 CORRECT ORDER FOUND:', {
                order_id: correctOrder.order_id,
                status: correctOrder.status,
                awb: correctOrder.delhivery_data?.waybill,
                customer_name: correctOrder.customer_info?.buyer_name,
                product: correctOrder.products?.[0]?.product_name,
                created_at: correctOrder.createdAt,
                updated_at: correctOrder.updatedAt
            });
            
            // Find all orders for this user to see the list
            const userOrders = await Order.find({ user_id: correctOrder.user_id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('order_id delhivery_data.waybill status customer_info.buyer_name products.product_name createdAt');
            
            console.log('\n📋 RECENT ORDERS FOR THIS USER:');
            userOrders.forEach((order, index) => {
                const isCorrect = order.order_id === 'ORD1761512735974270';
                console.log(`${index + 1}. ${order.order_id} ${isCorrect ? '← THIS IS YOUR ORDER' : ''}`);
                console.log(`   Customer: ${order.customer_info?.buyer_name || 'N/A'}`);
                console.log(`   Product: ${order.products?.[0]?.product_name || 'N/A'}`);
                console.log(`   AWB: ${order.delhivery_data?.waybill || 'NO AWB'}`);
                console.log(`   Status: ${order.status}`);
                console.log(`   Created: ${order.createdAt}`);
                console.log('   ' + '-'.repeat(50));
            });
        } else {
            console.log('❌ Order not found');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findCorrectOrder();
