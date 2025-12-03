// Location: backend/extract-awb-only.js
const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

async function extractAWBNumbersOnly() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Extract all orders with AWB/waybill numbers
        const orders = await Order.find({
            'delhivery_data.waybill': { $exists: true, $ne: null, $ne: '' }
        })
        .select('delhivery_data.waybill mps_data')
        .lean();
        
        const awbNumbers = new Set();
        
        // Extract main waybill numbers
        orders.forEach(order => {
            if (order.delhivery_data?.waybill) {
                awbNumbers.add(order.delhivery_data.waybill);
            }
            
            // Extract MPS master and child waybills
            if (order.mps_data?.master_waybill) {
                awbNumbers.add(order.mps_data.master_waybill);
            }
            
            if (order.mps_data?.child_waybills && Array.isArray(order.mps_data.child_waybills)) {
                order.mps_data.child_waybills.forEach(awb => {
                    if (awb) awbNumbers.add(awb);
                });
            }
            
            if (order.mps_data?.packages && Array.isArray(order.mps_data.packages)) {
                order.mps_data.packages.forEach(pkg => {
                    if (pkg.waybill) awbNumbers.add(pkg.waybill);
                });
            }
        });
        
        // Output only AWB numbers, one per line
        const awbArray = Array.from(awbNumbers).sort();
        awbArray.forEach(awb => {
            console.log(awb);
        });
        
        // Optional: Also output count to stderr (so it doesn't interfere with piping)
        console.error(`\n✅ Extracted ${awbArray.length} unique AWB numbers`);
        
    } catch (error) {
        console.error('❌ Error extracting AWB numbers:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

extractAWBNumbersOnly();

