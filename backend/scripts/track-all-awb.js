// Location: backend/scripts/track-all-awb.js
// Script to extract all AWB numbers from orders and track them using Delhivery API

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Order = require('../models/Order');
const delhiveryService = require('../services/delhiveryService');
const { connectDB } = require('../config/db');

async function trackAllAWB() {
    try {
        console.log('🚀 Starting AWB tracking script...\n');
        
        // Connect to database
        console.log('📡 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected successfully\n');
        
        // Extract all AWB numbers from orders
        console.log('📋 Extracting AWB numbers from orders...');
        const orders = await Order.find({
            'delhivery_data.waybill': { $exists: true, $ne: null, $ne: '' }
        }).select('order_id delhivery_data.waybill');
        
        const awbNumbers = orders
            .map(order => ({
                orderId: order.order_id,
                awb: order.delhivery_data?.waybill
            }))
            .filter(item => item.awb && item.awb.trim() !== '');
        
        console.log(`✅ Found ${awbNumbers.length} orders with AWB numbers\n`);
        
        if (awbNumbers.length === 0) {
            console.log('⚠️ No AWB numbers found in the database.');
            await mongoose.connection.close();
            process.exit(0);
        }
        
        // Display summary
        console.log('📊 Summary:');
        console.log(`   Total orders with AWB: ${awbNumbers.length}`);
        console.log(`   Unique AWB numbers: ${new Set(awbNumbers.map(a => a.awb)).size}\n`);
        
        // Track each AWB number
        console.log('🔍 Starting to track AWB numbers...\n');
        
        const results = {
            total: awbNumbers.length,
            successful: 0,
            failed: 0,
            errors: [],
            trackingResults: [] // Store all tracking results with status
        };
        
        // Process in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < awbNumbers.length; i += batchSize) {
            const batch = awbNumbers.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(awbNumbers.length / batchSize);
            
            console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} AWB numbers)...`);
            
            // Process batch in parallel
            const batchPromises = batch.map(async (item) => {
                try {
                    console.log(`   🔍 Tracking AWB: ${item.awb} (Order: ${item.orderId})`);
                    
                    const trackingResult = await delhiveryService.trackShipment(item.awb, item.orderId);
                    
                    if (trackingResult.success) {
                        results.successful++;
                        
                        // Extract status information from response
                        const statusInfo = extractStatusInfo(trackingResult.data);
                        
                        console.log(`   ✅ Success: ${item.awb} - Status: ${statusInfo.status || 'N/A'}`);
                        
                        const result = {
                            awb: item.awb,
                            orderId: item.orderId,
                            success: true,
                            status: statusInfo.status,
                            statusType: statusInfo.statusType,
                            statusLocation: statusInfo.statusLocation,
                            statusDateTime: statusInfo.statusDateTime,
                            statusInstructions: statusInfo.statusInstructions,
                            origin: statusInfo.origin,
                            destination: statusInfo.destination,
                            scanCount: statusInfo.scanCount,
                            lastScan: statusInfo.lastScan,
                            allScans: statusInfo.allScans,
                            referenceNumber: statusInfo.referenceNumber,
                            expectedDeliveryDate: statusInfo.expectedDeliveryDate,
                            pickupDate: statusInfo.pickupDate,
                            deliveryDate: statusInfo.deliveryDate,
                            consigneeName: statusInfo.consigneeName,
                            consigneeAddress: statusInfo.consigneeAddress,
                            consigneePhone: statusInfo.consigneePhone,
                            paymentMode: statusInfo.paymentMode,
                            codAmount: statusInfo.codAmount,
                            declaredValue: statusInfo.declaredValue,
                            weight: statusInfo.weight,
                            fullData: trackingResult.data
                        };
                        
                        results.trackingResults.push(result);
                        return result;
                    } else {
                        results.failed++;
                        const errorMsg = trackingResult.error || 'Unknown error';
                        console.log(`   ❌ Failed: ${item.awb} - ${errorMsg}`);
                        
                        const errorResult = {
                            awb: item.awb,
                            orderId: item.orderId,
                            success: false,
                            error: errorMsg,
                            errorType: trackingResult.errorType
                        };
                        
                        results.errors.push(errorResult);
                        results.trackingResults.push(errorResult);
                        return errorResult;
                    }
                } catch (error) {
                    results.failed++;
                    const errorMsg = error.message || 'Unknown error';
                    console.log(`   ❌ Exception: ${item.awb} - ${errorMsg}`);
                    
                    const errorResult = {
                        awb: item.awb,
                        orderId: item.orderId,
                        success: false,
                        error: errorMsg,
                        errorType: 'EXCEPTION'
                    };
                    
                    results.errors.push(errorResult);
                    results.trackingResults.push(errorResult);
                    return errorResult;
                }
            });
            
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid rate limiting
            if (i + batchSize < awbNumbers.length) {
                console.log('   ⏳ Waiting 2 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Display final results
        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL RESULTS');
        console.log('='.repeat(80));
        console.log(`Total AWB numbers processed: ${results.total}`);
        console.log(`✅ Successful: ${results.successful}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`Success rate: ${((results.successful / results.total) * 100).toFixed(2)}%\n`);
        
        // Display status summary
        if (results.trackingResults.filter(r => r.success).length > 0) {
            console.log('📋 STATUS SUMMARY:');
            console.log('-'.repeat(80));
            
            const statusGroups = {};
            results.trackingResults.filter(r => r.success).forEach(result => {
                const status = result.status || 'Unknown';
                if (!statusGroups[status]) {
                    statusGroups[status] = [];
                }
                statusGroups[status].push(result);
            });
            
            Object.keys(statusGroups).sort().forEach(status => {
                console.log(`\n${status} (${statusGroups[status].length} orders):`);
                statusGroups[status].forEach(result => {
                    console.log(`   - AWB: ${result.awb} | Order: ${result.orderId} | Location: ${result.statusLocation || 'N/A'} | Date: ${result.statusDateTime || 'N/A'}`);
                });
            });
        }
        
        // Display detailed table
        console.log('\n' + '='.repeat(80));
        console.log('📋 DETAILED TRACKING RESULTS:');
        console.log('='.repeat(80));
        console.log('AWB Number'.padEnd(18) + 'Order ID'.padEnd(22) + 'Status'.padEnd(20) + 'Location'.padEnd(25) + 'Date/Time');
        console.log('-'.repeat(80));
        
        results.trackingResults.forEach(result => {
            if (result.success) {
                const awb = (result.awb || '').padEnd(18);
                const orderId = (result.orderId || '').padEnd(22);
                const status = (result.status || 'N/A').padEnd(20);
                const location = (result.statusLocation || 'N/A').padEnd(25);
                const dateTime = result.statusDateTime || 'N/A';
                console.log(`${awb}${orderId}${status}${location}${dateTime}`);
            } else {
                const awb = (result.awb || '').padEnd(18);
                const orderId = (result.orderId || '').padEnd(22);
                const error = (result.error || 'Unknown error').substring(0, 50);
                console.log(`${awb}${orderId}❌ ERROR: ${error}`);
            }
        });
        
        if (results.errors.length > 0) {
            console.log('\n❌ ERRORS ENCOUNTERED:');
            console.log('-'.repeat(80));
            results.errors.slice(0, 10).forEach(err => {
                console.log(`   - AWB ${err.awb} (Order: ${err.orderId}): ${err.error}`);
            });
            if (results.errors.length > 10) {
                console.log(`   ... and ${results.errors.length - 10} more errors`);
            }
        }
        
        // Save results to JSON file
        const outputDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(outputDir, `awb-tracking-results-${timestamp}.json`);
        
        const exportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total: results.total,
                successful: results.successful,
                failed: results.failed,
                successRate: `${((results.successful / results.total) * 100).toFixed(2)}%`
            },
            results: results.trackingResults.map(r => ({
                awb: r.awb,
                orderId: r.orderId,
                success: r.success,
                status: r.status || null,
                statusType: r.statusType || null,
                statusLocation: r.statusLocation || null,
                statusDateTime: r.statusDateTime || null,
                origin: r.origin || null,
                destination: r.destination || null,
                scanCount: r.scanCount || 0,
                lastScan: r.lastScan || null,
                error: r.error || null,
                errorType: r.errorType || null,
                fullData: r.fullData || null
            }))
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
        console.log(`\n💾 JSON Results saved to: ${outputFile}`);
        
        // Export to Excel format
        const excelData = results.trackingResults.map(r => {
            const row = {
                'AWB Number': r.awb || '',
                'Order ID': r.orderId || '',
                'Status': r.status || '',
                'Status Type': r.statusType || '',
                'Status Location': r.statusLocation || '',
                'Status Date/Time': r.statusDateTime || '',
                'Status Instructions': r.statusInstructions || '',
                'Origin': r.origin || '',
                'Destination': r.destination || '',
                'Reference Number': r.referenceNumber || '',
                'Expected Delivery Date': r.expectedDeliveryDate || '',
                'Pickup Date': r.pickupDate || '',
                'Delivery Date': r.deliveryDate || '',
                'Consignee Name': r.consigneeName || '',
                'Consignee Address': r.consigneeAddress || '',
                'Consignee Phone': r.consigneePhone || '',
                'Payment Mode': r.paymentMode || '',
                'COD Amount': r.codAmount || '',
                'Declared Value': r.declaredValue || '',
                'Weight': r.weight || '',
                'Scan Count': r.scanCount || 0,
                'Last Scan Type': r.lastScan?.scanType || '',
                'Last Scan Location': r.lastScan?.scanLocation || '',
                'Last Scan Date/Time': r.lastScan?.scanDateTime || '',
                'Last Scan Remarks': r.lastScan?.remarks || '',
                'Tracking Success': r.success ? 'Yes' : 'No',
                'Error': r.error || '',
                'Error Type': r.errorType || ''
            };
            
            // Add all scans as a summary
            if (r.allScans && Array.isArray(r.allScans) && r.allScans.length > 0) {
                const scansSummary = r.allScans.map(scan => 
                    `${scan.scanType || 'N/A'} - ${scan.scanLocation || 'N/A'} (${scan.scanDateTime || 'N/A'})`
                ).join('; ');
                row['All Scans Summary'] = scansSummary;
            }
            
            // Add error response details if available
            if (r.fullData) {
                try {
                    if (r.fullData.Error) {
                        row['API Error'] = typeof r.fullData.Error === 'string' ? r.fullData.Error : JSON.stringify(r.fullData.Error);
                    }
                    if (r.fullData.rmk) {
                        row['API Remarks'] = r.fullData.rmk;
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
            
            return row;
        });
        
        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        
        // Set column widths for better readability
        const colWidths = [
            { wch: 18 }, // AWB Number
            { wch: 22 }, // Order ID
            { wch: 25 }, // Status
            { wch: 15 }, // Status Type
            { wch: 40 }, // Status Location
            { wch: 22 }, // Status Date/Time
            { wch: 40 }, // Status Instructions
            { wch: 30 }, // Origin
            { wch: 30 }, // Destination
            { wch: 20 }, // Reference Number
            { wch: 22 }, // Expected Delivery Date
            { wch: 22 }, // Pickup Date
            { wch: 22 }, // Delivery Date
            { wch: 25 }, // Consignee Name
            { wch: 40 }, // Consignee Address
            { wch: 15 }, // Consignee Phone
            { wch: 15 }, // Payment Mode
            { wch: 12 }, // COD Amount
            { wch: 12 }, // Declared Value
            { wch: 12 }, // Weight
            { wch: 12 }, // Scan Count
            { wch: 20 }, // Last Scan Type
            { wch: 30 }, // Last Scan Location
            { wch: 22 }, // Last Scan Date/Time
            { wch: 40 }, // Last Scan Remarks
            { wch: 50 }, // All Scans Summary
            { wch: 15 }, // Tracking Success
            { wch: 50 }, // Error
            { wch: 20 }, // Error Type
            { wch: 50 }, // API Error
            { wch: 50 }  // API Remarks
        ];
        worksheet['!cols'] = colWidths;
        
        // Add the worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'AWB Tracking Results');
        
        // Save Excel file
        const excelFileName = `awb-tracking-results-${timestamp}.xlsx`;
        const excelFilePath = path.join(outputDir, excelFileName);
        XLSX.writeFile(workbook, excelFilePath);
        
        console.log(`📊 Excel file saved to: ${excelFilePath}`);
        
        console.log('\n✅ Script completed successfully!');
        
    } catch (error) {
        console.error('❌ Script failed with error:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n📴 Database connection closed');
        }
        process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    trackAllAWB();
}

/**
 * Extract status information from Delhivery API response
 */
function extractStatusInfo(apiResponse) {
    const statusInfo = {
        status: null,
        statusType: null,
        statusLocation: null,
        statusDateTime: null,
        statusInstructions: null,
        origin: null,
        destination: null,
        scanCount: 0,
        lastScan: null,
        allScans: [],
        referenceNumber: null,
        expectedDeliveryDate: null,
        pickupDate: null,
        deliveryDate: null,
        consigneeName: null,
        consigneeAddress: null,
        consigneePhone: null,
        paymentMode: null,
        codAmount: null,
        declaredValue: null,
        weight: null
    };
    
    try {
        // Primary path: ShipmentData[0].Shipment.Status
        if (apiResponse.ShipmentData && Array.isArray(apiResponse.ShipmentData) && apiResponse.ShipmentData.length > 0) {
            const shipmentData = apiResponse.ShipmentData[0];
            const shipment = shipmentData.Shipment || shipmentData;
            
            // Extract from Shipment.Status object
            if (shipment.Status) {
                const statusObj = shipment.Status;
                
                statusInfo.status = statusObj.Status || null;
                statusInfo.statusType = statusObj.StatusType || null;
                statusInfo.statusLocation = statusObj.StatusLocation || null;
                statusInfo.statusDateTime = statusObj.StatusDateTime || null;
                statusInfo.statusInstructions = statusObj.Instructions || null;
            }
            
            // Extract shipment details
            statusInfo.origin = shipment.Origin || shipmentData.Origin || null;
            statusInfo.destination = shipment.Destination || shipmentData.Destination || null;
            statusInfo.referenceNumber = shipment.ReferenceNumber || shipmentData.ReferenceNumber || null;
            statusInfo.expectedDeliveryDate = shipment.ExpectedDeliveryDate || shipmentData.ExpectedDeliveryDate || null;
            statusInfo.pickupDate = shipment.PickupDate || shipmentData.PickupDate || null;
            statusInfo.deliveryDate = shipment.DeliveryDate || shipmentData.DeliveryDate || null;
            statusInfo.consigneeName = shipment.ConsigneeName || shipmentData.ConsigneeName || null;
            statusInfo.consigneeAddress = shipment.ConsigneeAddress || shipmentData.ConsigneeAddress || null;
            statusInfo.consigneePhone = shipment.ConsigneePhone || shipmentData.ConsigneePhone || null;
            statusInfo.paymentMode = shipment.PaymentMode || shipmentData.PaymentMode || null;
            statusInfo.codAmount = shipment.CODAmount || shipmentData.CODAmount || null;
            statusInfo.declaredValue = shipment.DeclaredValue || shipmentData.DeclaredValue || null;
            statusInfo.weight = shipment.Weight || shipmentData.Weight || null;
            
            // Extract scans information
            const scans = shipment.Scans || shipmentData.Scans;
            if (scans && Array.isArray(scans)) {
                statusInfo.scanCount = scans.length;
                statusInfo.allScans = scans.map(scan => ({
                    scanType: scan.ScanType || scan.Scan || null,
                    scanDateTime: scan.ScanDateTime || null,
                    scanLocation: scan.ScanLocation || scan.ScannedLocation || null,
                    remarks: scan.Remarks || scan.Instructions || null
                }));
                
                if (scans.length > 0) {
                    statusInfo.lastScan = statusInfo.allScans[scans.length - 1];
                }
            }
        }
        
        // Fallback: Check for error response
        if (apiResponse.Error) {
            statusInfo.status = typeof apiResponse.Error === 'string' ? apiResponse.Error : 'Error';
        }
        
        // Fallback: Check for rmk/remarks
        if (apiResponse.rmk) {
            statusInfo.status = apiResponse.rmk;
        }
        
    } catch (error) {
        console.error('Error extracting status info:', error);
    }
    
    return statusInfo;
}

module.exports = trackAllAWB;

