// Test script to check orders for specific user account
// Email: udditalerts247@gmail.com
// Password: jpmcA123

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
      account_status: user.account_status,
      created_at: user.created_at
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

// Function to get orders for user
const getUserOrders = async (userId) => {
  try {
    console.log(`\n🔍 Searching for orders for user ID: ${userId}`);
    
    // Get all orders for the user
    const orders = await Order.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate('user_id', 'email company_name your_name phone_number');
    
    console.log(`\n📊 Found ${orders.length} orders for this user`);
    
    if (orders.length === 0) {
      console.log('ℹ️ No orders found for this account');
      return [];
    }
    
    // Display order details
    console.log('\n📋 ORDER DETAILS:');
    console.log('='.repeat(80));
    
    orders.forEach((order, index) => {
      console.log(`\n📦 Order #${index + 1}:`);
      console.log(`   Order ID: ${order.order_id}`);
      console.log(`   Reference ID: ${order.reference_id || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Order Date: ${order.order_date}`);
      console.log(`   Created At: ${order.createdAt}`);
      console.log(`   Updated At: ${order.updatedAt}`);
      
      // Customer Information
      console.log(`   Customer: ${order.customer_info.buyer_name}`);
      console.log(`   Phone: ${order.customer_info.phone}`);
      console.log(`   Email: ${order.customer_info.email || 'N/A'}`);
      
      // Delivery Address
      console.log(`   Delivery Address: ${order.delivery_address.full_address}`);
      console.log(`   City: ${order.delivery_address.city}, ${order.delivery_address.state}`);
      console.log(`   Pincode: ${order.delivery_address.pincode}`);
      
      // Products
      console.log(`   Products (${order.products.length}):`);
      order.products.forEach((product, pIndex) => {
        console.log(`     ${pIndex + 1}. ${product.product_name} (Qty: ${product.quantity})`);
      });
      
      // Payment Information
      console.log(`   Payment Mode: ${order.payment_info.payment_mode}`);
      console.log(`   Order Value: ₹${order.payment_info.order_value}`);
      console.log(`   Total Amount: ₹${order.payment_info.total_amount}`);
      
      // Delhivery Integration
      if (order.delhivery_data && order.delhivery_data.waybill) {
        console.log(`   Waybill: ${order.delhivery_data.waybill}`);
        console.log(`   Tracking URL: ${order.delhivery_data.tracking_url || 'N/A'}`);
      }
      
      console.log(`   ${'─'.repeat(60)}`);
    });
    
    // Get order statistics
    const orderStats = await Order.getOrdersCountByStatus(userId);
    console.log('\n📈 ORDER STATISTICS:');
    console.log('='.repeat(40));
    Object.entries(orderStats).forEach(([status, count]) => {
      console.log(`   ${status.toUpperCase()}: ${count}`);
    });
    
    return orders;
    
  } catch (error) {
    console.error('❌ Error fetching orders:', error.message);
    return [];
  }
};

// Function to get recent orders (last 30 days)
const getRecentOrders = async (userId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log(`\n🔍 Searching for recent orders (last 30 days) for user ID: ${userId}`);
    
    const recentOrders = await Order.find({
      user_id: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${recentOrders.length} recent orders`);
    return recentOrders;
    
  } catch (error) {
    console.error('❌ Error fetching recent orders:', error.message);
    return [];
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting User Orders Test Script');
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
      console.log('\n❌ Authentication failed. Cannot proceed with order check.');
      return;
    }
    
    console.log('\n✅ Authentication successful!');
    
    // Get all orders for the user
    const orders = await getUserOrders(user._id);
    
    // Get recent orders
    const recentOrders = await getRecentOrders(user._id);
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('='.repeat(30));
    console.log(`✅ User authenticated: ${user.email}`);
    console.log(`📦 Total orders: ${orders.length}`);
    console.log(`📅 Recent orders (30 days): ${recentOrders.length}`);
    console.log(`🏢 Company: ${user.company_name}`);
    console.log(`👤 Contact: ${user.your_name}`);
    console.log(`📱 Phone: ${user.phone_number}`);
    
    if (orders.length > 0) {
      console.log('\n✅ Orders found for this account!');
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

module.exports = { authenticateUser, getUserOrders, getRecentOrders };
