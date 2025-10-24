const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Test users to delete
const testUsers = [
  {
    email: 'udditkantsinha5@gmail.com',
    phone_number: '8171514146'
  },
  {
    phone_number: '8368824707'
  }
];

async function deleteTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI);
    console.log('✅ Connected to MongoDB');

    let deletedCount = 0;

    for (const userData of testUsers) {
      console.log(`\n🔍 Searching for user:`, userData);
      
      // Find users matching the criteria
      const users = await User.find(userData);
      
      if (users.length === 0) {
        console.log('❌ No users found with these credentials');
        continue;
      }

      console.log(`📋 Found ${users.length} user(s):`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user._id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Phone: ${user.phone_number}`);
        console.log(`      Company: ${user.company_name}`);
        console.log(`      Created: ${user.created_at}`);
      });

      // Delete the users
      const deleteResult = await User.deleteMany(userData);
      deletedCount += deleteResult.deletedCount;
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} user(s)`);
    }

    console.log(`\n🎉 Total users deleted: ${deletedCount}`);
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    for (const userData of testUsers) {
      const remainingUsers = await User.find(userData);
      if (remainingUsers.length === 0) {
        console.log(`✅ No users found with ${userData.email || userData.phone_number} - Successfully deleted`);
      } else {
        console.log(`❌ ${remainingUsers.length} users still exist with ${userData.email || userData.phone_number}`);
      }
    }

  } catch (error) {
    console.error('❌ Error deleting users:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  console.log('🗑️  Starting user deletion script...');
  console.log('⚠️  WARNING: This will permanently delete the specified users!');
  console.log('📋 Users to be deleted:');
  testUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email || 'Email: N/A'} | Phone: ${user.phone_number}`);
  });
  
  // Add a small delay to allow user to cancel if needed
  setTimeout(() => {
    deleteTestUsers();
  }, 2000);
}

module.exports = { deleteTestUsers };
