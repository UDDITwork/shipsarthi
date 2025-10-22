// Final test to check the complete API flow
// This will test the actual API endpoint with proper error handling

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Order = require('./models/Order');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Function to authenticate user and get JWT token
const authenticateUser = async (email, password) => {
  try {
    console.log(`🔍 Searching for user with email: ${email}`);
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found with this email address');
      return null;
    }
    
    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      company_name: user.company_name,
      your_name: user.your_name,
      phone_number: user.phone_number,
      account_status: user.account_status
    });
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password provided');
      return null;
    }
    
    console.log('✅ Password verified successfully');
    
    // Generate JWT token (same as backend auth route)
    const token = jwt.sign(
      { 
        id: user._id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log('✅ JWT token generated');
    return { user, token };
    
  } catch (error) {
    console.error('❌ Error authenticating user:', error.message);
    return null;
  }
};

// Function to test the actual API endpoint with detailed error handling
const testAPIEndpoint = async (token) => {
  try {
    console.log(`\n🌐 Testing actual API endpoint with token`);
    
    const apiUrl = 'http://localhost:5000/api/orders';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('📡 Making API call to:', apiUrl);
    console.log('🔑 Using token:', token.substring(0, 20) + '...');
    
    try {
      const response = await axios.get(apiUrl, { 
        headers,
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('📊 API Response Data:', JSON.stringify(response.data, null, 2));
      
      // Check the structure
      if (response.data && response.data.data && response.data.data.orders) {
        console.log(`\n📋 Orders found: ${response.data.data.orders.length}`);
        if (response.data.data.orders.length > 0) {
          console.log('📦 First order details:');
          const firstOrder = response.data.data.orders[0];
          console.log('   Order ID:', firstOrder.order_id);
          console.log('   Status:', firstOrder.status);
          console.log('   Customer:', firstOrder.customer_info?.buyer_name);
          console.log('   Amount:', firstOrder.payment_info?.total_amount);
        }
        
        console.log('\n✅ SUCCESS: API is working and returning orders!');
        console.log('🔧 The frontend should now display orders.');
        return true;
      } else {
        console.log('❌ Unexpected response structure');
        console.log('Expected: response.data.data.orders');
        console.log('Got:', Object.keys(response.data));
        return false;
      }
      
    } catch (apiError) {
      console.log('❌ API Call Failed:', apiError.message);
      if (apiError.response) {
        console.log('📊 API Error Response:', {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: apiError.response.data
        });
        
        // Try to get more details about the error
        if (apiError.response.status === 500) {
          console.log('🔍 500 Error Details:');
          console.log('   This is a server error. Check backend logs.');
          console.log('   Possible causes:');
          console.log('   - Database connection issues');
          console.log('   - Field name mismatches');
          console.log('   - Missing environment variables');
          console.log('   - Code errors in the route handler');
        }
      } else if (apiError.code === 'ECONNREFUSED') {
        console.log('🔍 Connection Refused:');
        console.log('   Backend server is not running on port 5000');
        console.log('   Start the server with: npm run dev');
      } else if (apiError.code === 'ECONNABORTED') {
        console.log('🔍 Request Timeout:');
        console.log('   The request took too long to complete');
        console.log('   This might indicate a database or server issue');
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
    return false;
  }
};

// Function to test with different query parameters
const testAPIWithFilters = async (token) => {
  try {
    console.log(`\n🔍 Testing API with different filters`);
    
    const baseUrl = 'http://localhost:5000/api/orders';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: No filters
    console.log('\n📋 Test 1: No filters');
    try {
      const response1 = await axios.get(baseUrl, { headers });
      console.log('   Status:', response1.status);
      console.log('   Orders count:', response1.data?.data?.orders?.length || 0);
    } catch (error) {
      console.log('   Error:', error.message);
      if (error.response) {
        console.log('   Response:', error.response.status, error.response.data);
      }
    }
    
    // Test 2: Status filter
    console.log('\n📋 Test 2: Status filter (new)');
    try {
      const response2 = await axios.get(`${baseUrl}?status=new`, { headers });
      console.log('   Status:', response2.status);
      console.log('   Orders count:', response2.data?.data?.orders?.length || 0);
    } catch (error) {
      console.log('   Error:', error.message);
      if (error.response) {
        console.log('   Response:', error.response.status, error.response.data);
      }
    }
    
    // Test 3: All orders
    console.log('\n📋 Test 3: All orders');
    try {
      const response3 = await axios.get(`${baseUrl}?status=all`, { headers });
      console.log('   Status:', response3.status);
      console.log('   Orders count:', response3.data?.data?.orders?.length || 0);
    } catch (error) {
      console.log('   Error:', error.message);
      if (error.response) {
        console.log('   Response:', error.response.status, error.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API filters:', error.message);
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting Final API Test');
    console.log('='.repeat(50));
    
    // Connect to database
    await connectDB();
    
    // Test credentials
    const testEmail = 'udditalerts247@gmail.com';
    const testPassword = 'jpmcA123';
    
    console.log(`\n🔐 Testing authentication for: ${testEmail}`);
    
    // Authenticate user
    const authResult = await authenticateUser(testEmail, testPassword);
    
    if (!authResult) {
      console.log('\n❌ Authentication failed. Cannot proceed with API test.');
      return;
    }
    
    const { user, token } = authResult;
    console.log('\n✅ Authentication successful!');
    
    // Test the API endpoint
    const apiSuccess = await testAPIEndpoint(token);
    
    // Test with different filters
    await testAPIWithFilters(token);
    
    // Summary
    console.log('\n📋 FINAL API TEST SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ User authenticated: ${user.email}`);
    console.log(`🔑 JWT token generated: ${token ? 'Yes' : 'No'}`);
    console.log(`🌐 API endpoint working: ${apiSuccess ? 'Yes' : 'No'}`);
    
    if (apiSuccess) {
      console.log('\n🎉 SUCCESS: API is working correctly!');
      console.log('🔧 The frontend should now display orders.');
      console.log('💡 The issue was in the field name mismatches we fixed.');
    } else {
      console.log('\n❌ API is still not working.');
      console.log('🔧 Check the backend server logs for more details.');
      console.log('💡 Make sure the backend server is running with: npm run dev');
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n📴 Database connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { authenticateUser, testAPIEndpoint, testAPIWithFilters };
