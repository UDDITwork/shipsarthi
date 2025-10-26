// Script to remove the problematic warehouse_id unique index
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  // Try root .env
  const rootEnvPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
  } else {
    console.warn('⚠️ No .env file found, using default MongoDB URI');
  }
}

async function removeWarehouseIdIndex() {
  try {
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;
    console.log('🔍 Checking for MONGODB_URI...');
    console.log('MONGODB_URI exists:', !!mongoUri);
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('Please ensure .env file exists with MONGODB_URI');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    console.log('MongoDB URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
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
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });

    // Find warehouse_id index
    const warehouseIdIndex = indexes.find(idx => 
      idx.key && idx.key.warehouse_id !== undefined
    );

    if (warehouseIdIndex) {
      console.log(`\n⚠️ Found warehouse_id index: ${warehouseIdIndex.name}`);
      console.log(`   Key pattern: ${JSON.stringify(warehouseIdIndex.key)}`);
      console.log(`   Unique: ${warehouseIdIndex.unique}`);
      
      try {
        await collection.dropIndex(warehouseIdIndex.name);
        console.log(`✅ Successfully removed warehouse_id index: ${warehouseIdIndex.name}`);
      } catch (dropError) {
        console.error(`❌ Error dropping index: ${dropError.message}`);
        throw dropError;
      }
    } else {
      console.log('\n✅ No warehouse_id index found - may have already been removed');
    }

    // Check for documents with warehouse_id field
    const docsWithWarehouseId = await collection.countDocuments({ warehouse_id: { $exists: true } });
    if (docsWithWarehouseId > 0) {
      console.log(`\n⚠️ Found ${docsWithWarehouseId} documents with warehouse_id field`);
      console.log('Removing warehouse_id field from these documents...');
      const result = await collection.updateMany(
        { warehouse_id: { $exists: true } },
        { $unset: { warehouse_id: "" } }
      );
      console.log(`✅ Removed warehouse_id field from ${result.modifiedCount} documents`);
    } else {
      console.log('\n✅ No documents with warehouse_id field found');
    }

    // Show final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });

    console.log('\n✅ Index fix completed successfully!');
    
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
    
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // Ignore close errors
    }
    
    process.exit(1);
  }
}

removeWarehouseIdIndex();

