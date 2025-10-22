// Test script to check orders API endpoint directly
// This will help identify why orders are not showing in frontend

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('✅ JWT token generated');
    return { user, token };
    
  } catch (error) {
    console.error('❌ Error authenticating user:', error.message);
    return null;
  }
};

// Function to test orders API query
const testOrdersQuery = async (userId) => {
  try {
    console.log(`\n🔍 Testing orders query for user ID: ${userId}`);
    
    // Test the exact query from the orders route
    const filterQuery = { user_id: userId };
    
    console.log('📋 Filter Query:', filterQuery);
    
    // Test 1: Basic query (like the API does)
    const orders = await Order.find(filterQuery)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`\n📊 Found ${orders.length} orders with basic query`);
    
    if (orders.length > 0) {
      console.log('\n📦 Order Details:');
      orders.forEach((order, index) => {
        console.log(`   ${index + 1}. Order ID: ${order.order_id}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Created: ${order.createdAt}`);
        console.log(`      Customer: ${order.customer_info.buyer_name}`);
        console.log(`      Amount: ₹${order.payment_info.total_amount}`);
        console.log(`      ────────────────────────────────────────────`);
      });
    }
    
    // Test 2: Check if there are any status-related issues
    console.log('\n🔍 Testing status field access:');
    orders.forEach((order, index) => {
      console.log(`   Order ${index + 1}:`);
      console.log(`      order.status: ${order.status}`);
      console.log(`      order.order_status: ${order.order_status || 'undefined'}`);
      if (order.order_status) {
        console.log(`      order.order_status.current_status: ${order.order_status.current_status || 'undefined'}`);
      }
    });
    
    // Test 3: Test with status filter (like the API might do)
    console.log('\n🔍 Testing with status filter:');
    const statusFilterQuery = { 
      user_id: userId,
      status: 'new'  // This is the correct field name
    };
    
    const newOrders = await Order.find(statusFilterQuery).lean();
    console.log(`📊 Found ${newOrders.length} orders with status 'new'`);
    
    // Test 4: Test the problematic query from the API
    console.log('\n🔍 Testing problematic API query:');
    const problematicQuery = { 
      user_id: userId,
      'order_status.current_status': 'new'  // This is wrong - this field doesn't exist
    };
    
    const problematicOrders = await Order.find(problematicQuery).lean();
    console.log(`📊 Found ${problematicOrders.length} orders with problematic query`);
    
    return orders;
    
  } catch (error) {
    console.error('❌ Error testing orders query:', error.message);
    return [];
  }
};

// Function to simulate the exact API call
const simulateOrdersAPI = async (userId, token) => {
  try {
    console.log(`\n🌐 Simulating Orders API call for user ID: ${userId}`);
    
    // This simulates what the frontend would do
    const axios = require('axios');
    
    const apiUrl = 'http://localhost:5000/api/orders';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('📡 Making API call to:', apiUrl);
    console.log('🔑 Using token:', token.substring(0, 20) + '...');
    
    try {
      const response = await axios.get(apiUrl, { headers });
      console.log('✅ API Response Status:', response.status);
      console.log('📊 API Response Data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (apiError) {
      console.log('❌ API Call Failed:', apiError.message);
      if (apiError.response) {
        console.log('📊 API Error Response:', apiError.response.status, apiError.response.data);
      }
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error simulating API call:', error.message);
    return null;
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting Orders API Test Script');
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
    
    // Test orders query directly
    const orders = await testOrdersQuery(user._id);
    
    // Test API call (if server is running)
    console.log('\n🌐 Testing API call...');
    console.log('ℹ️ Note: This requires the backend server to be running on port 5000');
    
    try {
      const apiResult = await simulateOrdersAPI(user._id, token);
      if (apiResult) {
        console.log('\n✅ API call successful!');
      } else {
        console.log('\n❌ API call failed - check if server is running');
      }
    } catch (error) {
      console.log('\n⚠️ API call test skipped (server not running)');
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`✅ User authenticated: ${user.email}`);
    console.log(`📦 Total orders found: ${orders.length}`);
    console.log(`🔑 JWT token generated: ${token ? 'Yes' : 'No'}`);
    
    if (orders.length > 0) {
      console.log('\n✅ Orders exist in database!');
      console.log('🔍 The issue is likely in the API query logic.');
      console.log('💡 Check the orders route for field name mismatches.');
    } else {
      console.log('\nℹ️ No orders found for this account.');
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

module.exports = { authenticateUser, testOrdersQuery, simulateOrdersAPI };
