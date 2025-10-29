// Test with your actual Delhivery API key
const axios = require('axios');

async function testWithRealAPIKey() {
    console.log('🔑 Testing with Real Delhivery API Key');
    console.log('=====================================');
    
    // Replace this with your actual API key from the logs
    const apiKey = '216cb0f07ed46c5c6b5849257991f0509a96f852'; // Your actual API key from .env
    const pincode = '110001';
    const delhiveryURL = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`;
    
    console.log(`📍 Testing pincode: ${pincode}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
    console.log(`🌐 URL: ${delhiveryURL}`);
    console.log('');
    
    try {
        const response = await axios.get(delhiveryURL, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        console.log('✅ SUCCESS! Delhivery API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
        // Check if we got real data
        if (response.data && response.data.delivery_codes && response.data.delivery_codes.length > 0) {
            const serviceData = response.data.delivery_codes[0].postal_code;
            console.log('');
            console.log('🏙️ Real City Data:');
            console.log('  City:', serviceData.city);
            console.log('  State:', serviceData.state_code);
            console.log('  District:', serviceData.district);
            console.log('  COD Available:', serviceData.cod === 'Y' ? 'Yes' : 'No');
            console.log('  Prepaid Available:', serviceData.pre_paid === 'Y' ? 'Yes' : 'No');
            console.log('  Pickup Available:', serviceData.pickup === 'Y' ? 'Yes' : 'No');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Test our backend API with authentication
async function testBackendWithAuth() {
    console.log('');
    console.log('🔐 Testing Backend API with Authentication');
    console.log('==========================================');
    
    // You need to get this token from browser dev tools after login
    const jwtToken = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
    
    if (jwtToken === 'YOUR_JWT_TOKEN_HERE') {
        console.log('⚠️ Please get JWT token from browser dev tools and update the script');
        console.log('📝 Steps:');
        console.log('  1. Login to your app');
        console.log('  2. Open browser dev tools (F12)');
        console.log('  3. Go to Network tab');
        console.log('  4. Make any API request');
        console.log('  5. Look for Authorization header');
        console.log('  6. Copy the Bearer token');
        return;
    }
    
    try {
        const response = await axios.get('http://localhost:5000/api/tools/pincode-info/110001', {
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Backend API Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Backend Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run tests
async function main() {
    await testWithRealAPIKey();
    await testBackendWithAuth();
}

main().catch(console.error);
