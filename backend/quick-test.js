// Quick test to verify the current API response
const axios = require('axios');

async function quickTest() {
    console.log('🔍 Quick API Response Test');
    console.log('==========================');
    
    try {
        const response = await axios.get('http://localhost:5000/api/tools/pincode-info/110001');
        console.log('✅ Response:', JSON.stringify(response.data, null, 2));
        
        // Check if it has the data wrapper
        if (response.data.data) {
            console.log('❌ PROBLEM: Response still has data wrapper!');
            console.log('   Expected: { success: true, city: "...", state: "..." }');
            console.log('   Actual:   { success: true, data: { city: "...", state: "..." } }');
        } else {
            console.log('✅ GOOD: Response format is correct!');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

quickTest();
