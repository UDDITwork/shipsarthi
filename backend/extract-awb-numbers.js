// Location: backend/extract-awb-numbers.js
const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function extractAWBNumbers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Extract all orders with AWB/waybill numbers
        const ordersWithAWB = await Order.find({
            'delhivery_data.waybill': { $exists: true, $ne: null, $ne: '' }
        })
        .select('order_id delhivery_data.waybill status createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean();
        
        console.log(`\n📋 Found ${ordersWithAWB.length} orders with AWB numbers:\n`);
        
        // Display AWB numbers in a clean format
        ordersWithAWB.forEach((order, index) => {
            console.log(`${index + 1}. Order ID: ${order.order_id}`);
            console.log(`   AWB Number: ${order.delhivery_data.waybill}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Created: ${order.createdAt}`);
            console.log(`   Updated: ${order.updatedAt}`);
            console.log('   ' + '-'.repeat(50));
        });
        
        // Extract just the AWB numbers for easy copying
        const awbNumbers = ordersWithAWB.map(order => order.delhivery_data.waybill);
        
        console.log('\n📝 AWB Numbers Only (for easy copying):');
        console.log('='.repeat(60));
        awbNumbers.forEach((awb, index) => {
            console.log(`${index + 1}. ${awb}`);
        });
        
        // Group by status
        const statusGroups = {};
        ordersWithAWB.forEach(order => {
            const status = order.status;
            if (!statusGroups[status]) {
                statusGroups[status] = [];
            }
            statusGroups[status].push({
                orderId: order.order_id,
                awb: order.delhivery_data.waybill,
                createdAt: order.createdAt
            });
        });
        
        console.log('\n📊 AWB Numbers by Status:');
        console.log('='.repeat(60));
        Object.keys(statusGroups).forEach(status => {
            console.log(`\n${status.toUpperCase()} (${statusGroups[status].length} orders):`);
            statusGroups[status].forEach(order => {
                console.log(`  - ${order.awb} (${order.orderId}) - ${order.createdAt}`);
            });
        });
        
        // Export to JSON file
        const fs = require('fs');
        const exportData = {
            totalOrders: ordersWithAWB.length,
            extractedAt: new Date().toISOString(),
            orders: ordersWithAWB.map(order => ({
                orderId: order.order_id,
                awbNumber: order.delhivery_data.waybill,
                status: order.status,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            })),
            awbNumbersOnly: awbNumbers,
            statusGroups: statusGroups
        };
        
        const filename = `awb-numbers-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 Data exported to: ${filename}`);
        
        // Summary
        console.log('\n📈 Summary:');
        console.log(`- Total orders with AWB: ${ordersWithAWB.length}`);
        console.log(`- Unique AWB numbers: ${new Set(awbNumbers).size}`);
        console.log(`- Status distribution:`);
        Object.keys(statusGroups).forEach(status => {
            console.log(`  - ${status}: ${statusGroups[status].length} orders`);
        });
        
    } catch (error) {
        console.error('❌ Error extracting AWB numbers:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

extractAWBNumbers();
