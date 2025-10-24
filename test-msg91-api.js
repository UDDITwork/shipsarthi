const axios = require('axios');

async function testMSG91API() {
  try {
    console.log('🧪 Testing MSG91 API with correct format...');
    
    const testData = {
      phone_number: '9876543210' // Test phone number
    };

    console.log('📤 Sending OTP request...');
    const response = await axios.post('http://localhost:5000/api/otp/send', testData);
    
    console.log('✅ OTP Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'success') {
      console.log('🎉 SUCCESS: MSG91 API is working correctly!');
    } else {
      console.log('❌ FAILED: MSG91 API returned error');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMSG91API();
