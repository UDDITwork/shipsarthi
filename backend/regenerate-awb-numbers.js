const mongoose = require('mongoose');
const Order = require('./models/Order');
const delhiveryService = require('./services/delhiveryService');
require('dotenv').config();

async function regenerateAWBForFailedOrders() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Find orders that are in 'new' status and don't have AWB numbers
        const failedOrders = await Order.find({
            status: 'new',
            'delhivery_data.waybill': { $exists: false }
        }).limit(10); // Process max 10 orders at a time
        
        console.log(`📋 Found ${failedOrders.length} orders without AWB numbers`);
        
        if (failedOrders.length === 0) {
            console.log('✅ No orders need AWB regeneration');
            return;
        }
        
        for (const order of failedOrders) {
            console.log(`\n🔄 Processing order: ${order.order_id}`);
            
            try {
                // Prepare order data for Delhivery API
                const orderDataForDelhivery = {
                    order_id: order.order_id,
                    customer_info: {
                        buyer_name: order.customer_info.buyer_name,
                        phone: order.customer_info.phone,
                        email: order.customer_info.email || ''
                    },
                    delivery_address: {
                        full_address: order.delivery_address.full_address,
                        pincode: order.delivery_address.pincode,
                        city: order.delivery_address.city,
                        state: order.delivery_address.state,
                        country: order.delivery_address.country || 'India',
                        address_type: order.delivery_address.address_type || 'home'
                    },
                    pickup_address: {
                        name: order.pickup_address.name || 'SHIPSARTHI C2C',
                        full_address: order.pickup_address.full_address,
                        city: order.pickup_address.city,
                        state: order.pickup_address.state,
                        pincode: order.pickup_address.pincode,
                        phone: order.pickup_address.phone,
                        country: order.pickup_address.country || 'India'
                    },
                    products: order.products.map(p => ({
                        product_name: p.product_name,
                        quantity: p.quantity,
                        hsn_code: p.hsn_code || '',
                        unit_price: p.unit_price || 0
                    })),
                    package_info: {
                        weight: order.package_info.weight,
                        dimensions: {
                            width: order.package_info.dimensions.width,
                            height: order.package_info.dimensions.height,
                            length: order.package_info.dimensions.length || order.package_info.dimensions.width
                        }
                    },
                    payment_info: {
                        payment_mode: order.payment_info.payment_mode,
                        cod_amount: order.payment_info.cod_amount || 0,
                        order_value: order.payment_info.order_value || order.payment_info.total_amount || 0
                    },
                    seller_info: {
                        name: order.seller_info?.name || 'SHIPSARTHI',
                        gst_number: order.seller_info?.gst_number || ''
                    },
                    invoice_number: order.invoice_number || `INV${order.order_id}`,
                    shipping_mode: order.shipping_mode || 'Surface',
                    address_type: order.delivery_address.address_type || 'home'
                };

                console.log(`🌐 Calling Delhivery API for order: ${order.order_id}`);
                
                // Call Delhivery API to create shipment
                const delhiveryResult = await delhiveryService.createShipment(orderDataForDelhivery);
                
                if (delhiveryResult.success) {
                    // Extract AWB/waybill from response
                    let awbNumber = null;
                    let packageData = null;

                    // Try to get AWB from packages array first
                    if (delhiveryResult.packages && Array.isArray(delhiveryResult.packages) && delhiveryResult.packages.length > 0) {
                        packageData = delhiveryResult.packages[0];
                        awbNumber = packageData.waybill || packageData.AWB || packageData.wb || null;
                    }
                    
                    // Fallback to direct waybill property
                    if (!awbNumber && delhiveryResult.waybill) {
                        awbNumber = delhiveryResult.waybill;
                        packageData = packageData || { waybill: awbNumber, status: 'Success' };
                    }

                    // Fallback to tracking_id
                    if (!awbNumber && delhiveryResult.tracking_id) {
                        awbNumber = delhiveryResult.tracking_id;
                        packageData = packageData || { waybill: awbNumber, status: 'Success' };
                    }

                    if (awbNumber) {
                        console.log(`✅ AWB generated: ${awbNumber}`);
                        
                        // Update order with Delhivery response
                        order.delhivery_data = {
                            waybill: awbNumber,
                            package_id: packageData?.refnum || order.order_id,
                            upload_wbn: delhiveryResult.upload_wbn || null,
                            status: packageData?.status || 'Success',
                            serviceable: packageData?.serviceable,
                            sort_code: packageData?.sort_code,
                            remarks: packageData?.remarks || [],
                            cod_amount: packageData?.cod_amount || 0,
                            payment: packageData?.payment,
                            label_url: delhiveryResult.label_url || packageData?.label_url || null,
                            expected_delivery_date: delhiveryResult.expected_delivery || packageData?.expected_delivery_date || null
                        };

                        // Update order status
                        order.status = 'ready_to_ship';
                        
                        // Save the updated order
                        await order.save();
                        
                        console.log(`💾 Order ${order.order_id} updated successfully with AWB: ${awbNumber}`);
                    } else {
                        console.log(`❌ No AWB found in Delhivery response for order: ${order.order_id}`);
                        console.log('Delhivery response:', JSON.stringify(delhiveryResult, null, 2));
                    }
                } else {
                    console.log(`❌ Delhivery API failed for order: ${order.order_id}`);
                    console.log('Error:', delhiveryResult.error);
                }
                
                // Add delay between API calls to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Error processing order ${order.order_id}:`, error.message);
            }
        }
        
        console.log('\n✅ AWB regeneration process completed');
        
        // Show updated status
        const updatedOrders = await Order.find({
            order_id: { $in: failedOrders.map(o => o.order_id) }
        }).select('order_id delhivery_data.waybill status');
        
        console.log('\n📊 Updated orders status:');
        updatedOrders.forEach(o => {
            console.log(`- ${o.order_id}: ${o.delhivery_data?.waybill || 'NO AWB'} (${o.status})`);
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the function
regenerateAWBForFailedOrders();
