const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing registration with OTP...');
    
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const testData = {
      user_type: 'individual-shippers',
      monthly_shipments: '300-1000',
      company_name: 'TEST COMPANY',
      your_name: 'TEST USER',
      state: 'Uttar Pradesh',
      phone_number: `9876543${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      email: `test${uniqueId}@example.com`,
      password: 'testpass123',
      reference_code: '',
      terms_accepted: true
    };

    console.log('📤 Sending registration request...');
    console.log('Email:', testData.email);
    console.log('Phone:', testData.phone_number);
    
    const response = await axios.post('http://localhost:5000/api/auth/register', testData);
    
    console.log('✅ Registration Response:');
    console.log('Status:', response.status);
    console.log('requires_otp_verification:', response.data.requires_otp_verification);
    
    if (response.data.requires_otp_verification) {
      console.log('🎉 SUCCESS: OTP verification flag is present!');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ FAILED: OTP verification flag is missing');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testRegistration();
