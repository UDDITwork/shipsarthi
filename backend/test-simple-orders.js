// Simple test to check orders API without authentication
// This will help isolate the issue

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

// Function to test direct database query
const testDirectQuery = async (userId) => {
  try {
    console.log(`\n🔍 Testing direct database query for user ID: ${userId}`);
    
    // Test the exact query from the orders route
    const filterQuery = { user_id: userId };
    
    console.log('📋 Filter Query:', filterQuery);
    
    // Test 1: Basic query
    const orders = await Order.find(filterQuery)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`\n📊 Found ${orders.length} orders with direct query`);
    
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
    
    return orders;
    
  } catch (error) {
    console.error('❌ Error testing direct query:', error.message);
    console.error('❌ Error stack:', error.stack);
    return [];
  }
};

// Function to test the exact orders route logic
const testOrdersRouteLogic = async (userId) => {
  try {
    console.log(`\n🔍 Testing orders route logic for user ID: ${userId}`);
    
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    // Build filter query (exact same as orders route)
    const filterQuery = { user_id: userId };
    
    console.log('📋 Filter Query:', filterQuery);
    console.log('📋 Pagination:', { page, limit, skip });
    
    // Test the exact query from orders route
    const orders = await Order.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const totalOrders = await Order.countDocuments(filterQuery);
    
    console.log(`\n📊 Query Results:`);
    console.log(`   Orders found: ${orders.length}`);
    console.log(`   Total orders: ${totalOrders}`);
    
    // Test the response structure
    const responseData = {
      orders,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalOrders / limit),
        total_orders: totalOrders,
        per_page: limit
      }
    };
    
    console.log('\n📋 Response Structure:');
    console.log('   Status: success');
    console.log('   Data:', JSON.stringify(responseData, null, 2));
    
    return responseData;
    
  } catch (error) {
    console.error('❌ Error testing orders route logic:', error.message);
    console.error('❌ Error stack:', error.stack);
    return null;
  }
};

// Function to authenticate user
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
    return user;
    
  } catch (error) {
    console.error('❌ Error authenticating user:', error.message);
    return null;
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting Simple Orders Test');
    console.log('='.repeat(50));
    
    // Connect to database
    await connectDB();
    
    // Test credentials
    const testEmail = 'udditalerts247@gmail.com';
    const testPassword = 'jpmcA123';
    
    console.log(`\n🔐 Testing authentication for: ${testEmail}`);
    
    // Authenticate user
    const user = await authenticateUser(testEmail, testPassword);
    
    if (!user) {
      console.log('\n❌ Authentication failed. Cannot proceed with test.');
      return;
    }
    
    console.log('\n✅ Authentication successful!');
    
    // Test direct database query
    const orders = await testDirectQuery(user._id);
    
    // Test orders route logic
    const routeResult = await testOrdersRouteLogic(user._id);
    
    // Summary
    console.log('\n📋 SIMPLE TEST SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ User authenticated: ${user.email}`);
    console.log(`📦 Orders found in database: ${orders.length}`);
    console.log(`🔧 Route logic test: ${routeResult ? 'Success' : 'Failed'}`);
    
    if (orders.length > 0) {
      console.log('\n✅ SUCCESS: Orders exist in database!');
      console.log('🔧 The issue is likely in the API route implementation.');
    } else {
      console.log('\nℹ️ No orders found for this account.');
    }
    
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
    console.error('❌ Error stack:', error.stack);
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

module.exports = { authenticateUser, testDirectQuery, testOrdersRouteLogic };
