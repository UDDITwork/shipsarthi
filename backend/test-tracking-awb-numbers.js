// Script to test Delhivery Tracking API with AWB numbers
// This script will extract all possible field values from the tracking API response

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// AWB numbers from the screenshot
const AWB_NUMBERS = [
  '44800710001492',
  '44800710001643',
  '44800710001632',
  '44800710001982'
];

// Delhivery API Configuration
const DELHIVERY_API_KEY = process.env.DELHIVERY_API_KEY || '';
const TRACKING_URL = 'https://track.delhivery.com/api/v1/packages/json/';

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  awbNumbers: AWB_NUMBERS,
  responses: [],
  allFields: new Set(),
  allStatusValues: new Set(),
  errors: []
};

/**
 * Extract all field paths from a nested object
 */
function extractAllFields(obj, prefix = '', fields = new Set()) {
  if (obj === null || obj === undefined) {
    return fields;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      extractAllFields(item, `${prefix}[${index}]`, fields);
    });
    return fields;
  }

  if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      fields.add(fullPath);
      extractAllFields(obj[key], fullPath, fields);
    });
    return fields;
  }

  return fields;
}

/**
 * Extract all status values from the response
 */
function extractStatusValues(obj, statusValues = new Set()) {
  if (obj === null || obj === undefined) {
    return statusValues;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => extractStatusValues(item, statusValues));
    return statusValues;
  }

  if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      
      // Check for status-related fields
      if (key.toLowerCase().includes('status')) {
        if (typeof value === 'string') {
          statusValues.add(value);
        } else if (typeof value === 'object' && value !== null) {
          // If status is an object, extract its properties
          if (value.Status) {
            statusValues.add(value.Status);
          }
          if (value.status) {
            statusValues.add(value.status);
          }
        }
      }
      
      // Recursively check nested objects
      if (typeof value === 'object' && value !== null) {
        extractStatusValues(value, statusValues);
      }
    });
    return statusValues;
  }

  return statusValues;
}

/**
 * Track a single AWB number
 */
async function trackAWB(awbNumber) {
  try {
    console.log(`\n🔍 Tracking AWB: ${awbNumber}`);
    
    if (!DELHIVERY_API_KEY || DELHIVERY_API_KEY === 'your-delhivery-api-key') {
      throw new Error('Delhivery API Key not configured. Please set DELHIVERY_API_KEY in .env file');
    }

    const params = {
      waybill: awbNumber,
      ref_ids: '' // Optional, can be order_id if available
    };

    const response = await axios.get(TRACKING_URL, {
      params: params,
      headers: {
        'Authorization': `Token ${DELHIVERY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Check if response is HTML (error page)
    if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
      throw new Error('API returned HTML error page - waybill may not exist');
    }

    const responseData = response.data;
    
    console.log(`✅ Successfully tracked AWB: ${awbNumber}`);
    console.log(`📊 Response structure:`, Object.keys(responseData));

    // Extract all fields
    const fields = extractAllFields(responseData);
    fields.forEach(field => results.allFields.add(field));

    // Extract all status values
    const statusValues = extractStatusValues(responseData);
    statusValues.forEach(status => results.allStatusValues.add(status));

    // Store the complete response
    results.responses.push({
      awb: awbNumber,
      success: true,
      data: responseData,
      fields: Array.from(fields),
      statusValues: Array.from(statusValues)
    });

    // Pretty print the response structure
    console.log(`\n📋 Fields found:`, Array.from(fields).slice(0, 20));
    console.log(`📋 Status values found:`, Array.from(statusValues));

    return responseData;

  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    const statusCode = error.response?.status;
    
    console.error(`❌ Error tracking AWB ${awbNumber}:`, errorMessage);
    
    results.errors.push({
      awb: awbNumber,
      error: errorMessage,
      statusCode: statusCode,
      timestamp: new Date().toISOString()
    });

    results.responses.push({
      awb: awbNumber,
      success: false,
      error: errorMessage,
      statusCode: statusCode
    });

    return null;
  }
}

/**
 * Main function to test all AWB numbers
 */
async function testAllAWBs() {
  console.log('🚀 Starting AWB Tracking Test');
  console.log('='.repeat(60));
  console.log(`📦 Total AWB numbers to test: ${AWB_NUMBERS.length}`);
  console.log(`🔑 API Key configured: ${DELHIVERY_API_KEY ? 'Yes' : 'No'}`);
  console.log('='.repeat(60));

  // Track each AWB number
  for (const awb of AWB_NUMBERS) {
    await trackAWB(awb);
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.responses.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.errors.length}`);
  console.log(`📋 Total unique fields found: ${results.allFields.size}`);
  console.log(`📋 Total unique status values found: ${results.allStatusValues.size}`);

  // Save results to file
  const outputDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `tracking-test-results-${timestamp}.json`);
  
  // Create a comprehensive report
  const report = {
    ...results,
    allFields: Array.from(results.allFields).sort(),
    allStatusValues: Array.from(results.allStatusValues).sort(),
    summary: {
      totalAWBs: AWB_NUMBERS.length,
      successful: results.responses.filter(r => r.success).length,
      failed: results.errors.length,
      uniqueFields: results.allFields.size,
      uniqueStatusValues: results.allStatusValues.size
    },
    fieldAnalysis: {
      statusFields: Array.from(results.allFields).filter(f => f.toLowerCase().includes('status')),
      locationFields: Array.from(results.allFields).filter(f => f.toLowerCase().includes('location') || f.toLowerCase().includes('city') || f.toLowerCase().includes('address')),
      dateFields: Array.from(results.allFields).filter(f => f.toLowerCase().includes('date') || f.toLowerCase().includes('time')),
      waybillFields: Array.from(results.allFields).filter(f => f.toLowerCase().includes('waybill') || f.toLowerCase().includes('awb'))
    }
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`\n💾 Results saved to: ${outputFile}`);

  // Print all unique fields
  console.log('\n' + '='.repeat(60));
  console.log('📋 ALL UNIQUE FIELDS FOUND:');
  console.log('='.repeat(60));
  Array.from(results.allFields).sort().forEach(field => {
    console.log(`  - ${field}`);
  });

  // Print all unique status values
  console.log('\n' + '='.repeat(60));
  console.log('📋 ALL UNIQUE STATUS VALUES FOUND:');
  console.log('='.repeat(60));
  Array.from(results.allStatusValues).sort().forEach(status => {
    console.log(`  - ${status}`);
  });

  // Print sample response structure
  const successfulResponse = results.responses.find(r => r.success);
  if (successfulResponse) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 SAMPLE RESPONSE STRUCTURE:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(successfulResponse.data, null, 2).substring(0, 2000));
    if (JSON.stringify(successfulResponse.data, null, 2).length > 2000) {
      console.log('\n... (truncated, see full response in saved file)');
    }
  }

  console.log('\n✅ Test completed!');
}

// Run the test
testAllAWBs().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

