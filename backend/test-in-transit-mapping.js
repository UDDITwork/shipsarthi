// Location: backend/test-in-transit-mapping.js
// Test script to verify "In Transit" status mapping with actual API response format

const mongoose = require('mongoose');
const Order = require('./models/Order');
const TrackingOrder = require('./models/TrackingOrder');
const trackingService = require('./services/trackingService');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Mock the actual API response format from Delhivery (based on provided example)
const mockApiResponse = {
    "ShipmentData": [
        {
            "Shipment": {
                "PickUpDate": "2025-11-29T13:34:46",
                "Destination": "Rajpur",
                "DestRecieveDate": null,
                "Scans": [
                    {
                        "ScanDetail": {
                            "ScanDateTime": "2025-11-29T13:03:03.874",
                            "ScanType": "UD",
                            "Scan": "Manifested",
                            "StatusDateTime": "2025-11-29T13:03:03.874",
                            "ScannedLocation": "Bikaner_Pawanpuri_D (Rajasthan)",
                            "StatusCode": "X-UCI",
                            "Instructions": "Manifest uploaded"
                        }
                    },
                    {
                        "ScanDetail": {
                            "ScanDateTime": "2025-11-29T13:34:46",
                            "ScanType": "UD",
                            "Scan": "In Transit",
                            "StatusDateTime": "2025-11-29T13:34:46",
                            "ScannedLocation": "Bikaner_Pawanpuri_D (Rajasthan)",
                            "StatusCode": "X-PPOM",
                            "Instructions": "Shipment picked up"
                        }
                    },
                    {
                        "ScanDetail": {
                            "ScanDateTime": "2025-11-29T13:55:15.517",
                            "ScanType": "UD",
                            "Scan": "In Transit",
                            "StatusDateTime": "2025-11-29T13:55:15.517",
                            "ScannedLocation": "Bikaner_MurlidharColony_I (Rajasthan)",
                            "StatusCode": "X-PIOM",
                            "Instructions": "Shipment Recieved at Origin Center"
                        }
                    },
                    {
                        "ScanDetail": {
                            "ScanDateTime": "2025-11-29T17:52:35.617",
                            "ScanType": "UD",
                            "Scan": "In Transit",
                            "StatusDateTime": "2025-11-29T17:52:35.617",
                            "ScannedLocation": "Bikaner_MurlidharColony_I (Rajasthan)",
                            "StatusCode": "X-DBL1F",
                            "Instructions": "Added to Bag"
                        }
                    }
                ],
                "Status": {
                    "Status": "In Transit",  // THIS IS THE KEY FIELD - with space and capitals
                    "StatusLocation": "Bikaner_MurlidharColony_I (Rajasthan)",
                    "StatusDateTime": "2025-11-29T17:52:35.617",
                    "RecievedBy": "",
                    "StatusCode": "X-DBL1F",
                    "StatusType": "UD",
                    "Instructions": "Added to Bag"
                },
                "AWB": "44800710003135",
                "ExpectedDeliveryDate": "2025-12-06T23:59:59",
                "PromisedDeliveryDate": "2025-12-06T23:59:59"
            }
        }
    ]
};

async function testInTransitMapping() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Use the exported trackingService instance (singleton)
        // Stop the cron job if it's running (we're just testing mapping functions)
        if (trackingService.isRunning) {
            trackingService.stopTracking();
            console.log('⚠️  Stopped tracking service for testing\n');
        }

        // Test 1: Extract status from API response
        console.log('='.repeat(80));
        console.log('TEST 1: Extract Status from API Response');
        console.log('='.repeat(80));
        const extractedStatus = trackingService.extractStatusFromResponse(mockApiResponse);
        console.log('Extracted Status:', JSON.stringify(extractedStatus, null, 2));
        console.log();

        // Test 2: Map "In Transit" to internal status
        console.log('='.repeat(80));
        console.log('TEST 2: Map "In Transit" Status');
        console.log('='.repeat(80));
        
        const testStatuses = [
            "In Transit",      // With space and capitals (actual API format)
            "IN TRANSIT",      // All caps
            "in transit",      // All lowercase
            "In-Transit",      // With hyphen
            "in_transit",      // With underscore
            "In  Transit",     // Double space
            "Intransit"        // No space
        ];
        
        console.log('Testing various "In Transit" variations:\n');
        testStatuses.forEach(status => {
            const mapped = trackingService.mapDelhiveryStatus(status);
            const result = mapped === 'in_transit' ? '✅ PASS' : '❌ FAIL';
            console.log(`${result} | "${status}" → "${mapped}"`);
        });
        console.log();

        // Test 3: Complete flow test with actual AWB
        console.log('='.repeat(80));
        console.log('TEST 3: Complete Flow Test with Database');
        console.log('='.repeat(80));
        
        const testAWB = '44800710003135';
        
        // Find or create a test TrackingOrder
        let trackingOrder = await TrackingOrder.findOne({ awb_number: testAWB });
        
        if (!trackingOrder) {
            // Try to find by AWB in Order model
            const order = await Order.findOne({ 
                'delhivery_data.waybill': testAWB 
            });
            
            if (order) {
                console.log(`📦 Found Order: ${order.order_id}`);
                trackingOrder = await TrackingOrder.createFromOrder(order);
                console.log(`✅ Created TrackingOrder for testing\n`);
            } else {
                console.log(`⚠️  No order found with AWB: ${testAWB}`);
                console.log(`   Creating mock TrackingOrder for testing...\n`);
                
                // Create a mock tracking order for testing
                trackingOrder = new TrackingOrder({
                    order_id: 'TEST_ORDER_' + Date.now(),
                    awb_number: testAWB,
                    user_id: new mongoose.Types.ObjectId(),
                    current_status: 'pickups_manifests',
                    is_tracking_active: true,
                    is_delivered: false
                });
                await trackingOrder.save();
            }
        }
        
        // Simulate the tracking flow with mock API response
        console.log('📊 Current Status:', trackingOrder.current_status);
        console.log('📊 Current API Status:', trackingOrder.api_status);
        console.log();
        
        // Simulate status extraction and mapping
        const extracted = trackingService.extractStatusFromResponse(mockApiResponse);
        console.log('🔍 Extracted Status:', extracted.apiStatus);
        
        const mapped = trackingService.mapDelhiveryStatus(extracted.apiStatus);
        console.log('🔄 Mapped Status:', mapped);
        console.log();
        
        if (mapped === 'in_transit') {
            console.log('✅ SUCCESS: "In Transit" correctly mapped to "in_transit"');
            
            // Test updating TrackingOrder
            const oldStatus = trackingOrder.current_status;
            trackingOrder.current_status = mapped;
            trackingOrder.api_status = extracted.apiStatus;
            trackingOrder.delhivery_status = extracted.apiStatus;
            trackingOrder.last_tracked_at = new Date();
            
            await trackingOrder.save();
            
            console.log(`✅ TrackingOrder updated: ${oldStatus} → ${mapped}`);
            
            // Test updating Order model
            const order = await Order.findOne({ order_id: trackingOrder.order_id });
            if (order) {
                const oldOrderStatus = order.status;
                order.status = mapped;
                await order.save();
                
                console.log(`✅ Order model updated: ${oldOrderStatus} → ${mapped}`);
                
                // Verify the order can be queried
                const foundOrders = await Order.find({ status: 'in_transit' });
                const foundOrder = foundOrders.find(o => o.order_id === order.order_id);
                
                if (foundOrder) {
                    console.log(`✅ Order can be found with status='in_transit' query`);
                } else {
                    console.log(`❌ Order NOT found with status='in_transit' query`);
                }
            } else {
                console.log(`⚠️  Order not found for order_id: ${trackingOrder.order_id}`);
            }
        } else {
            console.log('❌ FAILED: "In Transit" did not map correctly!');
            console.log(`   Expected: "in_transit"`);
            console.log(`   Got: "${mapped}"`);
        }
        
        console.log();
        
        // Test 4: Query test
        console.log('='.repeat(80));
        console.log('TEST 4: Frontend Query Simulation');
        console.log('='.repeat(80));
        
        const inTransitOrders = await Order.find({ status: 'in_transit' }).limit(5);
        console.log(`Found ${inTransitOrders.length} orders with status='in_transit':`);
        inTransitOrders.forEach((order, index) => {
            console.log(`  ${index + 1}. Order ID: ${order.order_id}`);
            console.log(`     AWB: ${order.delhivery_data?.waybill || 'N/A'}`);
            console.log(`     Status: ${order.status}`);
            console.log();
        });

        console.log('='.repeat(80));
        console.log('✅ All tests completed!');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error during testing:', error);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
testInTransitMapping();

