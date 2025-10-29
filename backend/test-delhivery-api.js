// Test script to check Delhivery API response format
// This script will help us understand the exact response structure

const axios = require('axios');
require('dotenv').config();

// Test pincodes - mix of serviceable and non-serviceable
const testPincodes = [
    '110001', // Delhi - should be serviceable
    '400001', // Mumbai - should be serviceable  
    '560001', // Bangalore - should be serviceable
    '999999', // Invalid/Non-serviceable pincode
    '194103'  // Example from documentation
];

async function testDelhiveryAPI() {
    console.log('🧪 Testing Delhivery API Response Format');
    console.log('=====================================\n');

    const apiKey = process.env.DELHIVERY_API_KEY;
    const baseURL = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';

    if (!apiKey || apiKey === 'your-delhivery-api-key') {
        console.error('❌ DELHIVERY_API_KEY not found in environment variables');
        console.log('Please set DELHIVERY_API_KEY in your .env file');
        return;
    }

    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`🌐 Base URL: ${baseURL}`);
    console.log(`📋 Testing ${testPincodes.length} pincodes\n`);

    for (const pincode of testPincodes) {
        console.log(`📍 Testing Pincode: ${pincode}`);
        console.log('─'.repeat(50));

        try {
            // Use the exact format from the official documentation
            const response = await axios.get(`${baseURL}/c/api/pin-codes/json/`, {
                params: {
                    filter_codes: pincode
                },
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            console.log(`✅ Status: ${response.status}`);
            console.log(`📊 Response Type: ${typeof response.data}`);
            console.log(`📦 Response Keys: ${Object.keys(response.data || {}).join(', ')}`);
            
            // Log the complete response structure
            console.log('\n📋 Complete Response:');
            console.log(JSON.stringify(response.data, null, 2));

            // Analyze the response structure
            if (response.data) {
                console.log('\n🔍 Response Analysis:');
                
                if (Array.isArray(response.data)) {
                    console.log(`   - Response is an array with ${response.data.length} items`);
                    if (response.data.length > 0) {
                        console.log(`   - First item keys: ${Object.keys(response.data[0]).join(', ')}`);
                    }
                } else if (response.data.delivery_codes) {
                    console.log(`   - Has 'delivery_codes' property`);
                    console.log(`   - delivery_codes type: ${typeof response.data.delivery_codes}`);
                    if (Array.isArray(response.data.delivery_codes)) {
                        console.log(`   - delivery_codes length: ${response.data.delivery_codes.length}`);
                        if (response.data.delivery_codes.length > 0) {
                            console.log(`   - First delivery_code keys: ${Object.keys(response.data.delivery_codes[0]).join(', ')}`);
                        }
                    }
                } else {
                    console.log(`   - Direct object response`);
                    console.log(`   - Available properties: ${Object.keys(response.data).join(', ')}`);
                }
            }

        } catch (error) {
            console.log(`❌ Error for pincode ${pincode}:`);
            console.log(`   Status: ${error.response?.status || 'No status'}`);
            console.log(`   Message: ${error.message}`);
            if (error.response?.data) {
                console.log(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');
        
        // Add delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('🏁 Test completed!');
}

// Run the test
testDelhiveryAPI().catch(console.error);
