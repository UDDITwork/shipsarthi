const axios = require('axios');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function testLoginWithoutOTP() {
  console.log('🧪 Testing Login Without OTP Verification...\n');

  try {
    // Step 1: Register a new user
    console.log('📝 Step 1: Registering new user...');
    const registerData = {
      user_type: 'e-commerce-sellers',
      monthly_shipments: '10-300',
      company_name: 'Test Company',
      your_name: 'Test User',
      state: 'Test State',
      phone_number: '9876543210',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      terms_accepted: true
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('📱 Requires OTP verification:', registerResponse.data.requires_otp_verification);
    console.log('👤 User ID:', registerResponse.data.user._id);
    console.log('📞 Phone:', registerResponse.data.user.phone_number);
    console.log('🔐 Account Status:', registerResponse.data.user.account_status);
    console.log('');

    // Step 2: Test login without OTP verification (should now succeed)
    console.log('🔐 Step 2: Testing login without OTP verification...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      console.log('✅ Login successful without OTP verification!');
      console.log('🎫 Token received:', loginResponse.data.token ? 'Yes' : 'No');
      console.log('👤 User data:', {
        id: loginResponse.data.user._id,
        email: loginResponse.data.user.email,
        company_name: loginResponse.data.user.company_name,
        account_status: loginResponse.data.user.account_status,
        otp_verified: loginResponse.data.user.otp_verified
      });
    } catch (loginError) {
      console.log('❌ Login failed:', loginError.response?.data?.message);
      console.log('📊 Status:', loginError.response?.status);
      console.log('📋 Response:', loginError.response?.data);
    }
    console.log('');

    // Step 3: Test with wrong password (should fail)
    console.log('🔐 Step 3: Testing with wrong password...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: 'wrongpassword'
      });
      console.log('❌ Login should have failed with wrong password');
    } catch (loginError) {
      console.log('✅ Correctly rejected wrong password:', loginError.response?.data?.message);
    }
    console.log('');

    // Step 4: Test with non-existent user (should fail)
    console.log('🔐 Step 4: Testing with non-existent user...');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'nonexistent@example.com',
        password: TEST_PASSWORD
      });
      console.log('❌ Login should have failed with non-existent user');
    } catch (loginError) {
      console.log('✅ Correctly rejected non-existent user:', loginError.response?.data?.message);
    }

    console.log('\n🎉 Login without OTP verification test completed!');
    console.log('✅ Users can now login without phone verification');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response:', error.response.data);
    }
  }
}

// Run the test
testLoginWithoutOTP();
