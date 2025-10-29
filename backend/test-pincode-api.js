const axios = require('axios');

// Test script to check pincode API response format
async function testPincodeAPI() {
    console.log('🧪 Testing Pincode API Response Format...\n');
    
    const testPincodes = ['110001', '110008', '400001'];
    const baseURL = 'http://localhost:5000'; // Adjust if your server runs on different port
    
    for (const pincode of testPincodes) {
        console.log(`📍 Testing pincode: ${pincode}`);
        console.log('─'.repeat(50));
        
        try {
            // Test the pincode-info endpoint
            const response = await axios.get(`${baseURL}/api/tools/pincode-info/${pincode}`, {
                headers: {
                    'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // Replace with actual token
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            console.log('✅ Status:', response.status);
            console.log('📦 Response Headers:', JSON.stringify(response.headers, null, 2));
            console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
            console.log('📊 Data Type:', typeof response.data);
            console.log('🔍 Data Keys:', Object.keys(response.data || {}));
            
            // Check specific fields
            if (response.data) {
                console.log('\n🔎 Field Analysis:');
                console.log('  - success:', response.data.success);
                console.log('  - city:', response.data.city);
                console.log('  - state:', response.data.state);
                console.log('  - serviceable:', response.data.serviceable);
                console.log('  - pincode:', response.data.pincode);
                
                // Check if data is wrapped
                if (response.data.data) {
                    console.log('  - data.city:', response.data.data.city);
                    console.log('  - data.state:', response.data.data.state);
                    console.log('  - data.serviceable:', response.data.data.serviceable);
                }
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
            if (error.response) {
                console.log('📉 Error Status:', error.response.status);
                console.log('📉 Error Data:', JSON.stringify(error.response.data, null, 2));
            }
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
    }
}

// Test without authentication (to see if auth is the issue)
async function testWithoutAuth() {
    console.log('🔓 Testing without authentication...\n');
    
    const pincode = '110001';
    const baseURL = 'http://localhost:5000';
    
    try {
        const response = await axios.get(`${baseURL}/api/tools/pincode-info/${pincode}`, {
            timeout: 10000
        });
        
        console.log('✅ Status:', response.status);
        console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('📉 Error Status:', error.response.status);
            console.log('📉 Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Test direct Delhivery API
async function testDirectDelhiveryAPI() {
    console.log('🌐 Testing Direct Delhivery API...\n');
    
    const pincode = '110001';
    const apiKey = process.env.DELHIVERY_API_KEY || '216cb0f07e...'; // Replace with your actual API key
    const delhiveryURL = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`;
    
    try {
        const response = await axios.get(delhiveryURL, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        console.log('✅ Delhivery Status:', response.status);
        console.log('📋 Delhivery Response:', JSON.stringify(response.data, null, 2));
        console.log('📊 Response Type:', typeof response.data);
        
        // Check if it's HTML
        if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
            console.log('⚠️ WARNING: Response is HTML, not JSON!');
            console.log('📄 HTML Preview:', response.data.substring(0, 200) + '...');
        }
        
    } catch (error) {
        console.log('❌ Delhivery Error:', error.message);
        if (error.response) {
            console.log('📉 Delhivery Error Status:', error.response.status);
            console.log('📉 Delhivery Error Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting API Response Format Test\n');
    
    // Test 1: Direct Delhivery API
    await testDirectDelhiveryAPI();
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 2: Our API without auth
    await testWithoutAuth();
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Test 3: Our API with auth (if you have a token)
    console.log('🔐 To test with authentication, replace YOUR_JWT_TOKEN_HERE with actual token');
    console.log('📝 You can get a token by logging in to your app and checking browser dev tools\n');
    
    // Uncomment the line below if you have a JWT token
    // await testPincodeAPI();
}

// Run the tests
main().catch(console.error);
