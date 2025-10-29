// Debug script to find users in database
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function findUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 SEARCHING FOR USERS');
    console.log('======================');

    // Search for users with similar email patterns
    const searchPatterns = [
      'udditalerts247',
      'udditalerts',
      '247@mail.com',
      'mail.com'
    ];

    for (const pattern of searchPatterns) {
      console.log(`\n📋 Searching for: ${pattern}`);
      const users = await User.find({
        email: { $regex: pattern, $options: 'i' }
      }).select('email company_name wallet_balance _id');

      if (users.length > 0) {
        console.log(`✅ Found ${users.length} users:`);
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} - ${user.company_name} - ₹${user.wallet_balance || 0}`);
        });
      } else {
        console.log('❌ No users found');
      }
    }

    // Get all users to see what's in the database
    console.log('\n📋 ALL USERS IN DATABASE:');
    console.log('==========================');
    const allUsers = await User.find({}).select('email company_name wallet_balance _id').limit(20);
    
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.company_name} - ₹${user.wallet_balance || 0}`);
    });

    // Check if there are any users with wallet balance > 0
    console.log('\n📋 USERS WITH WALLET BALANCE > 0:');
    console.log('==================================');
    const usersWithBalance = await User.find({
      wallet_balance: { $gt: 0 }
    }).select('email company_name wallet_balance _id');

    if (usersWithBalance.length > 0) {
      console.log(`Found ${usersWithBalance.length} users with balance:`);
      usersWithBalance.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} - ${user.company_name} - ₹${user.wallet_balance}`);
      });
    } else {
      console.log('❌ No users have wallet balance > 0');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findUsers();
