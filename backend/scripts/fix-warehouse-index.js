// Script to fix duplicate key error on warehouse_id index
// This removes the problematic unique index on warehouse_id field

const mongoose = require('mongoose');
require('dotenv').config();

async function fixWarehouseIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 Using URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('warehouses');

    // Get all indexes
    console.log('\n📋 Current indexes on warehouses collection:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Check if warehouse_id index exists
    const warehouseIdIndex = indexes.find(idx => 
      idx.key && idx.key.warehouse_id !== undefined
    );

    if (warehouseIdIndex) {
      console.log('\n⚠️ Found warehouse_id index, removing it...');
      await collection.dropIndex(warehouseIdIndex.name);
      console.log('✅ Successfully removed warehouse_id index');
    } else {
      console.log('\n✅ No warehouse_id index found');
    }

    // Also check for any null warehouse_id documents
    const nullWarehouseIdDocs = await collection.countDocuments({ warehouse_id: null });
    if (nullWarehouseIdDocs > 0) {
      console.log(`\n⚠️ Found ${nullWarehouseIdDocs} documents with warehouse_id: null`);
      console.log('Removing warehouse_id field from these documents...');
      await collection.updateMany(
        { warehouse_id: null },
        { $unset: { warehouse_id: "" } }
      );
      console.log('✅ Cleaned up null warehouse_id fields');
    }

    // Show final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log('\n✅ Index fix completed successfully!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error fixing warehouse index:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    
    // Try to close connection
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

fixWarehouseIndex();

