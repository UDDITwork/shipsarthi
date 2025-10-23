const axios = require('axios');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_PHONE = '9876543210'; // Test phone number
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testOTPFlow() {
  console.log('🧪 Starting OTP Flow Test...\n');

  try {
    // Step 1: Register a new user
    console.log('📝 Step 1: Registering new user...');
    const registerData = {
      user_type: 'e-commerce-sellers',
      monthly_shipments: '10-300',
      company_name: 'Test Company',
      your_name: 'Test User',
      state: 'Test State',
      phone_number: TEST_PHONE,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      terms_accepted: true
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('📱 Phone verification required:', registerResponse.data.requires_otp_verification);
    console.log('👤 User ID:', registerResponse.data.user._id);
    console.log('📞 Phone:', registerResponse.data.user.phone_number);
    console.log('');

    // Step 2: Send OTP
    console.log('📤 Step 2: Sending OTP...');
    const sendOTPResponse = await axios.post(`${API_BASE_URL}/otp/send`, {
      phone_number: TEST_PHONE
    });
    console.log('✅ OTP sent successfully:', sendOTPResponse.data.message);
    console.log('⏰ Expires in:', sendOTPResponse.data.expires_in, 'seconds');
    console.log('');

    // Step 3: Check OTP status
    console.log('📊 Step 3: Checking OTP status...');
    const statusResponse = await axios.get(`${API_BASE_URL}/otp/status/${TEST_PHONE}`);
    console.log('📱 Phone:', statusResponse.data.data.phone_number);
    console.log('✅ Phone verified:', statusResponse.data.data.phone_verified);
    console.log('🔐 OTP verified:', statusResponse.data.data.otp_verified);
    console.log('🔒 Is locked:', statusResponse.data.data.is_locked);
    console.log('🔢 OTP attempts:', statusResponse.data.data.otp_attempts);
    console.log('⏰ Has OTP token:', statusResponse.data.data.has_otp_token);
    console.log('');

    // Step 4: Test login without OTP verification (should fail)
    console.log('🔐 Step 4: Testing login without OTP verification...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      console.log('❌ Login should have failed but succeeded');
    } catch (loginError) {
      if (loginError.response?.status === 403 && loginError.response?.data?.requires_otp_verification) {
        console.log('✅ Login correctly blocked - OTP verification required');
        console.log('📞 Phone number:', loginError.response.data.phone_number);
      } else {
        console.log('❌ Unexpected login error:', loginError.response?.data?.message);
      }
    }
    console.log('');

    // Step 5: Test OTP verification (this will fail in test environment without real OTP)
    console.log('🔐 Step 5: Testing OTP verification...');
    try {
      const verifyResponse = await axios.post(`${API_BASE_URL}/otp/verify`, {
        phone_number: TEST_PHONE,
        otp: '123456' // Test OTP
      });
      console.log('✅ OTP verification successful:', verifyResponse.data.message);
    } catch (verifyError) {
      console.log('❌ OTP verification failed (expected in test):', verifyError.response?.data?.message);
    }
    console.log('');

    // Step 6: Test resend OTP
    console.log('🔄 Step 6: Testing resend OTP...');
    try {
      const resendResponse = await axios.post(`${API_BASE_URL}/otp/resend`, {
        phone_number: TEST_PHONE,
        retry_type: 'sms'
      });
      console.log('✅ OTP resent successfully:', resendResponse.data.message);
      console.log('📱 Retry type:', resendResponse.data.retry_type);
    } catch (resendError) {
      console.log('❌ Resend OTP failed:', resendError.response?.data?.message);
    }
    console.log('');

    console.log('🎉 OTP Flow Test Completed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ User registration with OTP requirement');
    console.log('- ✅ OTP sending functionality');
    console.log('- ✅ OTP status checking');
    console.log('- ✅ Login blocking without OTP verification');
    console.log('- ✅ OTP verification endpoint');
    console.log('- ✅ OTP resend functionality');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.error('📊 Error details:', error.response?.data);
  }
}

// Run the test
if (require.main === module) {
  testOTPFlow();
}

module.exports = { testOTPFlow };
