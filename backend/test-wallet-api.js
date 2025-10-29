// Test wallet balance API for the correct user
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testWalletAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const correctEmail = 'udditalerts247@gmail.com';
    console.log(`\n🔍 TESTING WALLET API FOR: ${correctEmail}`);
    console.log('==========================================');

    // Find user
    const user = await User.findOne({ email: correctEmail });
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:');
    console.log(`   - User ID: ${user._id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Company: ${user.company_name}`);
    console.log(`   - Wallet Balance: ₹${user.wallet_balance || 0}`);

    // Simulate API response
    const apiResponse = {
      success: true,
      data: {
        balance: user.wallet_balance || 0,
        currency: 'INR'
      }
    };

    console.log('\n📊 WALLET BALANCE API RESPONSE:');
    console.log('================================');
    console.log(JSON.stringify(apiResponse, null, 2));

    // Check if balance is correct
    if (user.wallet_balance >= 700) {
      console.log('\n✅ WALLET RECHARGE SUCCESSFUL!');
      console.log(`   - Expected: ₹700`);
      console.log(`   - Actual: ₹${user.wallet_balance}`);
      console.log(`   - Status: ${user.wallet_balance >= 700 ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log('\n❌ WALLET RECHARGE FAILED!');
      console.log(`   - Expected: ₹700`);
      console.log(`   - Actual: ₹${user.wallet_balance}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testWalletAPI();
