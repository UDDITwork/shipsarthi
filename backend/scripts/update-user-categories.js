const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function updateUserCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users without user_category
    const usersWithoutCategory = await User.find({
      user_category: { $exists: false }
    });

    console.log(`Found ${usersWithoutCategory.length} users without user_category`);

    if (usersWithoutCategory.length > 0) {
      // Update all users without category to 'Basic User'
      const result = await User.updateMany(
        { user_category: { $exists: false } },
        { 
          $set: { 
            user_category: 'Basic User',
            updated_at: new Date()
          } 
        }
      );

      console.log(`Updated ${result.modifiedCount} users with default category 'Basic User'`);
    }

    // Verify the update
    const allUsers = await User.find({}).select('client_id company_name user_category');
    console.log('All users with categories:');
    allUsers.forEach(user => {
      console.log(`- ${user.client_id} (${user.company_name}): ${user.user_category || 'No category'}`);
    });

    console.log('User category update completed successfully!');
    
  } catch (error) {
    console.error('Error updating user categories:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updateUserCategories();
