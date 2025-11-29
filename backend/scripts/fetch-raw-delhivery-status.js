// Fetch RAW status from Delhivery API for all orders
// No parsing, no mapping - just save what Delhivery sends
// This script helps understand the exact format of Delhivery API responses

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Order = require('../models/Order');
const TrackingOrder = require('../models/TrackingOrder');
const delhiveryService = require('../services/delhiveryService');
const fs = require('fs');
const path = require('path');

/**
 * Extract ALL status-related variables from Delhivery API response
 * Searches in all possible locations
 */
function extractStatusVariables(apiResponse) {
  const statusInfo = {
    status: null,
    statusType: null,
    statusLocation: null,
    statusDateTime: null,
    scans: [],
    allStatusPaths: []
  };
  
  if (!apiResponse) return statusInfo;
  
  // Search in ShipmentData[0].Shipment.Status (PRIMARY LOCATION)
  if (apiResponse.ShipmentData && Array.isArray(apiResponse.ShipmentData) && apiResponse.ShipmentData.length > 0) {
    const shipmentData = apiResponse.ShipmentData[0];
    
    if (shipmentData.Shipment) {
      const shipment = shipmentData.Shipment;
      
      // Check Status object
      if (shipment.Status) {
        const statusObj = shipment.Status;
        
        if (statusObj.Status) {
          statusInfo.status = {
            value: statusObj.Status,
            location: 'ShipmentData[0].Shipment.Status.Status'
          };
          statusInfo.allStatusPaths.push({
            path: 'ShipmentData[0].Shipment.Status.Status',
            value: statusObj.Status
          });
        }
        
        if (statusObj.StatusType) {
          statusInfo.statusType = {
            value: statusObj.StatusType,
            location: 'ShipmentData[0].Shipment.Status.StatusType'
          };
        }
        
        if (statusObj.StatusLocation) {
          statusInfo.statusLocation = {
            value: statusObj.StatusLocation,
            location: 'ShipmentData[0].Shipment.Status.StatusLocation'
          };
        }
        
        if (statusObj.StatusDateTime) {
          statusInfo.statusDateTime = {
            value: statusObj.StatusDateTime,
            location: 'ShipmentData[0].Shipment.Status.StatusDateTime'
          };
        }
      }
      
      // Check Scans array
      if (shipment.Scans && Array.isArray(shipment.Scans)) {
        statusInfo.scans = shipment.Scans.map((scan, idx) => ({
          index: idx,
          scanType: scan.ScanType || scan.Scan || null,
          scan: scan.Scan || scan.ScanDetail?.Scan || null,
          scanDateTime: scan.ScanDateTime || scan.ScanDetail?.ScanDateTime || scan.StatusDateTime || null,
          scannedLocation: scan.ScannedLocation || scan.ScanDetail?.ScannedLocation || scan.StatusLocation || null,
          status: scan.Status || scan.ScanDetail?.Status || null,
          fullScan: scan
        }));
      }
      
      // Check if Status is directly on Shipment
      if (shipment.Status && typeof shipment.Status === 'string') {
        statusInfo.allStatusPaths.push({
          path: 'ShipmentData[0].Shipment.Status (string)',
          value: shipment.Status
        });
        if (!statusInfo.status) {
          statusInfo.status = {
            value: shipment.Status,
            location: 'ShipmentData[0].Shipment.Status (string)'
          };
        }
      }
    }
    
    // Check if Status is directly on ShipmentData[0]
    if (shipmentData.Status) {
      if (typeof shipmentData.Status === 'string') {
        statusInfo.allStatusPaths.push({
          path: 'ShipmentData[0].Status (string)',
          value: shipmentData.Status
        });
        if (!statusInfo.status) {
          statusInfo.status = {
            value: shipmentData.Status,
            location: 'ShipmentData[0].Status (string)'
          };
        }
      } else if (shipmentData.Status.Status) {
        statusInfo.allStatusPaths.push({
          path: 'ShipmentData[0].Status.Status',
          value: shipmentData.Status.Status
        });
        if (!statusInfo.status) {
          statusInfo.status = {
            value: shipmentData.Status.Status,
            location: 'ShipmentData[0].Status.Status'
          };
        }
      }
    }
  }
  
  // Search in root level Status
  if (apiResponse.Status) {
    if (typeof apiResponse.Status === 'string') {
      statusInfo.allStatusPaths.push({
        path: 'Status (root string)',
        value: apiResponse.Status
      });
      if (!statusInfo.status) {
        statusInfo.status = {
          value: apiResponse.Status,
          location: 'Status (root string)'
        };
      }
    } else if (apiResponse.Status.Status) {
      statusInfo.allStatusPaths.push({
        path: 'Status.Status (root)',
        value: apiResponse.Status.Status
      });
      if (!statusInfo.status) {
        statusInfo.status = {
          value: apiResponse.Status.Status,
          location: 'Status.Status (root)'
        };
      }
    }
  }
  
  // Search in other common locations
  if (apiResponse.status) {
    statusInfo.allStatusPaths.push({
      path: 'status (lowercase root)',
      value: apiResponse.status
    });
    if (!statusInfo.status) {
      statusInfo.status = {
        value: apiResponse.status,
        location: 'status (lowercase root)'
      };
    }
  }
  
  if (apiResponse.currentStatus) {
    statusInfo.allStatusPaths.push({
      path: 'currentStatus',
      value: apiResponse.currentStatus
    });
  }
  
  if (apiResponse.orderStatus) {
    statusInfo.allStatusPaths.push({
      path: 'orderStatus',
      value: apiResponse.orderStatus
    });
  }
  
  return statusInfo;
}

async function fetchRawDelhiveryStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipsarthi', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    console.log('='.repeat(80));
    console.log('📡 FETCHING RAW STATUS FROM DELHIVERY API');
    console.log('='.repeat(80));
    console.log();
    
    // Get AWB numbers from command line arguments or use specific list
    const args = process.argv.slice(2);
    let awbNumbers = [];
    
    if (args.length > 0) {
      // Use AWB numbers from command line
      awbNumbers = args.map(awb => awb.trim());
      console.log(`📋 Using ${awbNumbers.length} AWB numbers from command line\n`);
    } else {
      // Use specific AWB numbers from user's list
      awbNumbers = [
        '44800710000663',
        '44800710000685',
        '44800710000696',
        '44800710000700',
        '44800710000722',
        '44800710000803',
        '44800710000840',
        '44800710001050',
        '44800710000910',
        '44800710001094',
        '44800710000582',
        '44800710001341',
        '44800710001256',
        '44800710001315',
        '44800710001223',
        '44800710001326',
        '44800710001466',
        '44800710001503',
        '44800710000232',
        '44800710000490'
      ];
      console.log(`📋 Using ${awbNumbers.length} specific AWB numbers from list\n`);
    }
    
    // Build tracking orders array
    const trackingOrders = [];
    
    for (const awb of awbNumbers) {
      // Try to find in TrackingOrder first
      let trackingOrder = await TrackingOrder.findOne({ awb_number: awb }).select('awb_number order_id reference_id');
      
      if (!trackingOrder) {
        // Try to find in Order model
        const order = await Order.findOne({
          $or: [
            { 'delhivery_data.waybill': awb },
            { 'shipping_info.awb_number': awb }
          ]
        }).select('order_id reference_id delhivery_data.waybill');
        
        if (order) {
          trackingOrder = {
            awb_number: awb,
            order_id: order.order_id,
            reference_id: order.reference_id || order.order_id
          };
        } else {
          // Create a dummy entry if not found in database
          trackingOrder = {
            awb_number: awb,
            order_id: `UNKNOWN-${awb}`,
            reference_id: awb
          };
        }
      }
      
      trackingOrders.push(trackingOrder);
    }
    
    console.log(`📋 Processing ${trackingOrders.length} AWB numbers\n`);
    
    if (trackingOrders.length === 0) {
      console.log('❌ No AWB numbers to process');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, '../logs/delhivery-raw-responses');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `raw-responses-${timestamp}.json`);
    
    const results = {
      timestamp: new Date().toISOString(),
      total_awbs: trackingOrders.length,
      successful: 0,
      failed: 0,
      responses: []
    };
    
    console.log(`🔄 Processing ${trackingOrders.length} AWB numbers...\n`);
    console.log(`📁 Saving responses to: ${outputFile}\n`);
    console.log('='.repeat(80));
    console.log();
    
    // Process each AWB
    for (let i = 0; i < trackingOrders.length; i++) {
      const trackingOrder = trackingOrders[i];
      const awbNumber = trackingOrder.awb_number;
      const orderId = trackingOrder.order_id;
      const referenceId = trackingOrder.reference_id || orderId;
      
      console.log(`[${i + 1}/${trackingOrders.length}] AWB: ${awbNumber}`);
      console.log(`   Order ID: ${orderId}`);
      
      try {
        // Call Delhivery API - NO PARSING, just get raw response
        const trackingResult = await delhiveryService.trackShipment(awbNumber, referenceId);
        
        const responseEntry = {
          awb_number: awbNumber,
          order_id: orderId,
          reference_id: referenceId,
          timestamp: new Date().toISOString(),
          success: trackingResult.success,
          error: trackingResult.error || null,
          raw_response: trackingResult.data || null,
          // Also save the full trackingResult object
          full_result: trackingResult
        };
        
        results.responses.push(responseEntry);
        
        if (trackingResult.success) {
          results.successful++;
          console.log(`   ✅ Success`);
          
          // Extract and display ALL status-related variables
          const statusInfo = extractStatusVariables(trackingResult.data);
          responseEntry.status_variables = statusInfo;
          
          // Display status variables found
          console.log(`   📊 STATUS VARIABLES FOUND:`);
          if (statusInfo.status) {
            console.log(`      ✅ Status: ${statusInfo.status.value} (from: ${statusInfo.status.location})`);
          } else {
            console.log(`      ❌ Status: NOT FOUND`);
          }
          
          if (statusInfo.statusType) {
            console.log(`      ✅ StatusType: ${statusInfo.statusType.value} (from: ${statusInfo.statusType.location})`);
          }
          
          if (statusInfo.statusLocation) {
            console.log(`      ✅ StatusLocation: ${statusInfo.statusLocation.value} (from: ${statusInfo.statusLocation.location})`);
          }
          
          if (statusInfo.statusDateTime) {
            console.log(`      ✅ StatusDateTime: ${statusInfo.statusDateTime.value} (from: ${statusInfo.statusDateTime.location})`);
          }
          
          if (statusInfo.scans && statusInfo.scans.length > 0) {
            console.log(`      ✅ Scans: ${statusInfo.scans.length} scan entries found`);
            if (statusInfo.scans[0]) {
              console.log(`         Latest Scan: ${JSON.stringify(statusInfo.scans[0], null, 2).substring(0, 200)}`);
            }
          }
          
          // Log all paths where status might be
          if (statusInfo.allStatusPaths && statusInfo.allStatusPaths.length > 0) {
            console.log(`      📍 All Status Paths Found:`);
            statusInfo.allStatusPaths.forEach((path, idx) => {
              console.log(`         ${idx + 1}. ${path.path}: ${path.value}`);
            });
          }
        } else {
          results.failed++;
          console.log(`   ❌ Failed: ${trackingResult.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        results.failed++;
        console.log(`   ❌ Error: ${error.message}`);
        
        results.responses.push({
          awb_number: awbNumber,
          order_id: orderId,
          reference_id: referenceId,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message,
          raw_response: null,
          full_result: null
        });
      }
      
      console.log();
      
      // Small delay to avoid rate limiting
      if (i < trackingOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Save results to file
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
    
    // Also save a summary file with status variables
    const summaryFile = path.join(outputDir, `summary-${timestamp}.txt`);
    
    // Collect all unique status variables found
    const statusVariablesSummary = [];
    results.responses.forEach((resp, idx) => {
      if (resp.success && resp.status_variables) {
        statusVariablesSummary.push({
          awb: resp.awb_number,
          status: resp.status_variables.status?.value || 'NOT FOUND',
          statusLocation: resp.status_variables.status?.location || 'N/A',
          allPaths: resp.status_variables.allStatusPaths || []
        });
      }
    });
    
    const summary = `
================================================================================
DELHIVERY RAW STATUS FETCH SUMMARY
================================================================================

Timestamp: ${results.timestamp}
Total AWB Numbers: ${results.total_awbs}
Successful: ${results.successful}
Failed: ${results.failed}

Output File: ${outputFile}

================================================================================
STATUS VARIABLES FOUND (Per AWB)
================================================================================

${statusVariablesSummary.map((item, idx) => `
[${idx + 1}] AWB: ${item.awb}
   Status: ${item.status}
   Location: ${item.statusLocation}
   All Status Paths:
${item.allPaths.map((p, i) => `      ${i + 1}. ${p.path}: ${p.value}`).join('\n') || '      None found'}
`).join('\n')}

================================================================================
SAMPLE RESPONSE STRUCTURE (First Successful)
================================================================================

${results.responses.length > 0 && results.responses[0].raw_response 
  ? JSON.stringify(results.responses[0].raw_response, null, 2).substring(0, 3000)
  : 'No successful responses to show'
}

================================================================================
STATUS VARIABLES DETAIL (First Successful)
================================================================================

${results.responses.length > 0 && results.responses[0].status_variables
  ? JSON.stringify(results.responses[0].status_variables, null, 2)
  : 'No status variables found'
}

================================================================================
`;
    
    fs.writeFileSync(summaryFile, summary, 'utf8');
    
    // Print summary
    console.log('='.repeat(80));
    console.log('✅ FETCH COMPLETE');
    console.log('='.repeat(80));
    console.log();
    console.log(`Total AWB Numbers: ${results.total_awbs}`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log();
    console.log(`📁 Full responses saved to: ${outputFile}`);
    console.log(`📁 Summary saved to: ${summaryFile}`);
    console.log();
    
    // Show status variables summary
    console.log('='.repeat(80));
    console.log('📊 STATUS VARIABLES SUMMARY:');
    console.log('='.repeat(80));
    
    const statusSummary = results.responses
      .filter(r => r.success && r.status_variables)
      .map(r => ({
        awb: r.awb_number,
        status: r.status_variables.status?.value || 'NOT FOUND',
        location: r.status_variables.status?.location || 'N/A'
      }));
    
    if (statusSummary.length > 0) {
      statusSummary.forEach((item, idx) => {
        console.log(`${idx + 1}. AWB: ${item.awb}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Location: ${item.location}`);
        console.log();
      });
    } else {
      console.log('No status variables found in any response');
      console.log();
    }
    
    // Show first successful response structure
    const firstSuccess = results.responses.find(r => r.success && r.raw_response);
    if (firstSuccess) {
      console.log('='.repeat(80));
      console.log('📊 SAMPLE RESPONSE STRUCTURE (First Successful):');
      console.log('='.repeat(80));
      console.log(JSON.stringify(firstSuccess.raw_response, null, 2));
      console.log();
      
      if (firstSuccess.status_variables) {
        console.log('='.repeat(80));
        console.log('📊 STATUS VARIABLES EXTRACTED (First Successful):');
        console.log('='.repeat(80));
        console.log(JSON.stringify(firstSuccess.status_variables, null, 2));
        console.log();
      }
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
fetchRawDelhiveryStatus();

