// Test script to verify Delhivery API Key is loaded correctly
require('dotenv').config({ path: './.env' });

console.log('🔍 Testing Delhivery API Key Configuration...\n');

const apiKey = process.env.DELHIVERY_API_KEY;
const apiURL = process.env.DELHIVERY_API_URL;

console.log('Environment Variables:');
console.log('DELHIVERY_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'NOT FOUND');
console.log('DELHIVERY_API_KEY Length:', apiKey?.length || 0);
console.log('DELHIVERY_API_URL:', apiURL || 'NOT FOUND');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('');

if (!apiKey || apiKey === 'your-delhivery-api-key') {
    console.log('❌ ERROR: DELHIVERY_API_KEY not configured properly!');
    console.log('Please check your .env file and ensure DELHIVERY_API_KEY is set.');
    process.exit(1);
}

if (apiKey.length < 20) {
    console.log('⚠️ WARNING: API Key seems too short. Expected length > 20 characters.');
}

console.log('✅ API Key found!');
console.log('');

// Test Fetch WayBill API
const axios = require('axios');

async function testFetchWaybill() {
    try {
        console.log('🧪 Testing Fetch WayBill API...');
        console.log('URL: https://track.delhivery.com/waybill/api/bulk/json/');
        console.log('Token:', `${apiKey.substring(0, 10)}...`);
        console.log('');
        
        const response = await axios.get('https://track.delhivery.com/waybill/api/bulk/json/', {
            params: {
                token: apiKey,
                count: 1
            },
            headers: {
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ SUCCESS! Waybill fetched:');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            console.log('\n🎉 Waybill Number:', response.data[0]);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.response?.status || error.code);
        console.log('Error Message:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n⚠️ 401 Unauthorized - API Key might be invalid or expired.');
            console.log('Please verify the API key in Delhivery dashboard.');
        }
    }
}

testFetchWaybill();

