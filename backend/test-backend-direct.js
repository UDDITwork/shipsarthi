// Simple test to check if backend is working
const axios = require('axios');

async function testBackendDirectly() {
    console.log('🔍 Testing Backend API Directly');
    console.log('===============================');
    
    try {
        const response = await axios.get('http://localhost:5000/api/tools/pincode-info/110001');
        console.log('✅ Backend Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.city === 'Delhi' && response.data.state === 'DL') {
            console.log('🎉 SUCCESS! Backend is returning real Delhivery data!');
        } else if (response.data.city === 'Unknown') {
            console.log('⚠️ Backend is using fallback data - server needs restart');
        } else {
            console.log('❓ Unexpected response format');
        }
        
    } catch (error) {
        console.log('❌ Backend Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Server is not running. Start it with: node server.js');
        }
    }
}

testBackendDirectly();
