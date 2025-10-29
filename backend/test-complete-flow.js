// Comprehensive test for the complete flow
const axios = require('axios');

async function testCompleteFlow() {
    console.log('🧪 COMPREHENSIVE API TEST');
    console.log('=========================');
    
    const testPincodes = ['110001', '110008', '400001'];
    
    for (const pincode of testPincodes) {
        console.log(`\n📍 Testing Pincode: ${pincode}`);
        console.log('─'.repeat(40));
        
        try {
            const response = await axios.get(`http://localhost:5000/api/tools/pincode-info/${pincode}`);
            
            console.log('✅ Response Status:', response.status);
            console.log('📦 Response Data:');
            console.log(JSON.stringify(response.data, null, 2));
            
            // Check if we got real data or fallback
            if (response.data.city === 'Unknown') {
                console.log('⚠️ Using fallback data (Delhivery API not working)');
            } else {
                console.log('🎉 Real Delhivery data received!');
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Error:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }
    
    console.log('\n🎯 FRONTEND EXPECTATIONS:');
    console.log('========================');
    console.log('Frontend expects:');
    console.log('  - success: boolean');
    console.log('  - pincode: string');
    console.log('  - city: string');
    console.log('  - state: string');
    console.log('  - serviceable: boolean');
    console.log('');
    console.log('✅ If all responses have this format, frontend validation will work!');
}

testCompleteFlow().catch(console.error);