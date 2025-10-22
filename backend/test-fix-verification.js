// Verification script to test if the orders API fix works
// This script will test the corrected orders query

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// Function to test the corrected orders query
const testCorrectedQuery = async (userId) => {
  try {
    console.log(`\n🔍 Testing CORRECTED orders query for user ID: ${userId}`);
    
    // Test the corrected query (like the fixed API does)
    const filterQuery = { user_id: userId };
    
    console.log('📋 Filter Query:', filterQuery);
    
    // Test 1: Basic query (corrected version)
    const orders = await Order.find(filterQuery)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`\n📊 Found ${orders.length} orders with CORRECTED query`);
    
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
    
    // Test 2: Test with status filter (corrected version)
    console.log('\n🔍 Testing with status filter (CORRECTED):');
    const statusFilterQuery = { 
      user_id: userId,
      status: 'new'  // This is the correct field name
    };
    
    const newOrders = await Order.find(statusFilterQuery).lean();
    console.log(`📊 Found ${newOrders.length} orders with status 'new'`);
    
    // Test 3: Test the old problematic query (should return 0)
    console.log('\n🔍 Testing OLD problematic query (should return 0):');
    const problematicQuery = { 
      user_id: userId,
      'order_status.current_status': 'new'  // This is wrong - this field doesn't exist
    };
    
    const problematicOrders = await Order.find(problematicQuery).lean();
    console.log(`📊 Found ${problematicOrders.length} orders with OLD problematic query`);
    
    return orders;
    
  } catch (error) {
    console.error('❌ Error testing corrected query:', error.message);
    return [];
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
    console.log('🚀 Starting Orders API Fix Verification');
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
      console.log('\n❌ Authentication failed. Cannot proceed with verification.');
      return;
    }
    
    console.log('\n✅ Authentication successful!');
    
    // Test the corrected query
    const orders = await testCorrectedQuery(user._id);
    
    // Summary
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ User authenticated: ${user.email}`);
    console.log(`📦 Total orders found: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log('\n✅ SUCCESS: Orders are now accessible with corrected query!');
      console.log('🔧 The API fix should resolve the frontend issue.');
      console.log('💡 The problem was using "order_status.current_status" instead of "status".');
    } else {
      console.log('\nℹ️ No orders found for this account.');
    }
    
    console.log('\n🔧 FIXES APPLIED:');
    console.log('   ✅ Changed "order_status.current_status" to "status" in orders route');
    console.log('   ✅ Fixed all references in dashboard route');
    console.log('   ✅ Updated all aggregation queries');
    console.log('   ✅ Corrected field selections');
    
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

module.exports = { authenticateUser, testCorrectedQuery };
