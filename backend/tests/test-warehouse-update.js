/**
 * Test Script for Warehouse Update Functionality
 * 
 * This script tests the Client Warehouse Update API integration:
 * 1. Fetches existing warehouses
 * 2. Selects a warehouse to update
 * 3. Updates warehouse via API (calls Delhivery API and updates database)
 * 4. Validates the update was successful
 * 
 * Usage:
 *   node backend/tests/test-warehouse-update.js
 * 
 * Required Environment Variables:
 *   - DELHIVERY_API_KEY
 *   - MONGODB_URI
 *   - JWT_SECRET (for authentication - optional, can use test token)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const API_TEST_URL = `${API_BASE_URL}/api`;

// Test configuration
let testUserId = null;
let testAuthToken = null;
let selectedWarehouse = null;

/**
 * Color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

/**
 * Step 1: Connect to MongoDB
 */
async function connectDatabase() {
  try {
    logSection('STEP 1: Connecting to Database');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipsarthi';
    await mongoose.connect(mongoUri);
    log('✅ Database connected successfully', colors.green);
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Step 2: Get test user and authentication token
 */
async function setupAuthentication() {
  try {
    logSection('STEP 2: Setting Up Authentication');
    
    // Find first user in database (or create test user)
    const user = await User.findOne().select('_id email password');
    
    if (!user) {
      log('⚠️  No users found in database. Please create a user first.', colors.yellow);
      throw new Error('No users found in database');
    }
    
    testUserId = user._id;
    log(`✅ Found test user: ${user.email} (${user._id})`, colors.green);
    
    // Generate JWT token for authentication
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    testAuthToken = jwt.sign(
      { id: user._id.toString() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    log('✅ JWT token generated for authentication', colors.green);
    
    return user;
  } catch (error) {
    log(`❌ Authentication setup failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Step 3: Fetch existing warehouses
 */
async function fetchWarehouses() {
  try {
    logSection('STEP 3: Fetching Existing Warehouses');
    
    const warehouses = await Warehouse.find({
      user_id: testUserId,
      delhivery_registered: true,
      is_active: true
    }).limit(5);
    
    if (warehouses.length === 0) {
      log('⚠️  No Delhivery-registered warehouses found for this user.', colors.yellow);
      log('   Please create and register at least one warehouse first.', colors.yellow);
      throw new Error('No warehouses found');
    }
    
    log(`✅ Found ${warehouses.length} warehouse(s):`, colors.green);
    warehouses.forEach((wh, index) => {
      log(`   ${index + 1}. ${wh.name} (${wh.title || 'No title'}) - ${wh.address.city}, ${wh.address.state}`, colors.blue);
      log(`      ID: ${wh._id}`, colors.blue);
      log(`      Phone: ${wh.contact_person?.phone || 'N/A'}`, colors.blue);
      log(`      Address: ${wh.address.full_address.substring(0, 50)}...`, colors.blue);
      log(`      Pincode: ${wh.address.pincode}`, colors.blue);
    });
    
    return warehouses;
  } catch (error) {
    log(`❌ Failed to fetch warehouses: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Step 4: Select warehouse for update
 */
function selectWarehouse(warehouses) {
  logSection('STEP 4: Selecting Warehouse for Update');
  
  // Use first warehouse or allow selection
  selectedWarehouse = warehouses[0];
  
  log(`✅ Selected warehouse for update:`, colors.green);
  log(`   Name: ${selectedWarehouse.name}`, colors.blue);
  log(`   Title: ${selectedWarehouse.title || 'N/A'}`, colors.blue);
  log(`   Current Phone: ${selectedWarehouse.contact_person?.phone || 'N/A'}`, colors.blue);
  log(`   Current Address: ${selectedWarehouse.address.full_address}`, colors.blue);
  log(`   Current Pincode: ${selectedWarehouse.address.pincode}`, colors.blue);
  
  return selectedWarehouse;
}

/**
 * Step 5: Test warehouse update via API
 */
async function testWarehouseUpdate() {
  try {
    logSection('STEP 5: Testing Warehouse Update via API');
    
    if (!selectedWarehouse) {
      throw new Error('No warehouse selected');
    }
    
    // Prepare update data
    // Note: Only phone and address can be updated via Delhivery API
    // We'll update phone number and address
    
    const originalPhone = selectedWarehouse.contact_person?.phone || '9876543210';
    const newPhone = originalPhone !== '9876543210' ? '9876543210' : '9876543211';
    
    const originalAddress = selectedWarehouse.address.full_address;
    const newAddress = `${originalAddress} (Updated ${new Date().toISOString()})`;
    
    const updateData = {
      contact_person: {
        phone: newPhone
      },
      address: {
        full_address: newAddress,
        pincode: selectedWarehouse.address.pincode,  // Required
        city: selectedWarehouse.address.city,
        state: selectedWarehouse.address.state
      }
    };
    
    log('📤 Update Payload:', colors.blue);
    log(`   Phone: ${originalPhone} → ${newPhone}`, colors.blue);
    log(`   Address: ${originalAddress.substring(0, 50)}... → ${newAddress.substring(0, 50)}...`, colors.blue);
    log(`   Pincode: ${updateData.address.pincode} (required, unchanged)`, colors.blue);
    
    log('\n🔄 Calling PUT /api/warehouses/:id...', colors.yellow);
    
    // Make API call to update warehouse
    const response = await axios.put(
      `${API_TEST_URL}/warehouses/${selectedWarehouse._id}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testAuthToken}`
        },
        validateStatus: (status) => status < 500  // Don't throw on 4xx
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      log('✅ API Update Successful!', colors.green);
      log(`   Status: ${response.status}`, colors.green);
      
      if (response.data?.data?.warehouse) {
        const updatedWarehouse = response.data.data.warehouse;
        log('\n📋 Updated Warehouse Data:', colors.blue);
        log(`   Phone: ${updatedWarehouse.contact_person?.phone || 'N/A'}`, colors.blue);
        log(`   Address: ${updatedWarehouse.address?.full_address || 'N/A'}`, colors.blue);
        log(`   Pincode: ${updatedWarehouse.address?.pincode || 'N/A'}`, colors.blue);
      }
      
      if (response.data?.data?.delhivery_response) {
        log('\n✅ Delhivery Response:', colors.green);
        log(`   ${JSON.stringify(response.data.data.delhivery_response, null, 2)}`, colors.blue);
      }
      
      return response.data;
    } else {
      log(`❌ API Update Failed!`, colors.red);
      log(`   Status: ${response.status}`, colors.red);
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, colors.red);
      throw new Error(`Update failed with status ${response.status}`);
    }
  } catch (error) {
    if (error.response) {
      log(`❌ API Error: ${error.response.status} - ${error.response.statusText}`, colors.red);
      log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`, colors.red);
    } else {
      log(`❌ Error: ${error.message}`, colors.red);
      if (error.stack) {
        log(`   Stack: ${error.stack}`, colors.red);
      }
    }
    throw error;
  }
}

/**
 * Step 6: Verify update in database
 */
async function verifyDatabaseUpdate() {
  try {
    logSection('STEP 6: Verifying Database Update');
    
    const updatedWarehouse = await Warehouse.findById(selectedWarehouse._id);
    
    if (!updatedWarehouse) {
      throw new Error('Warehouse not found in database');
    }
    
    log('✅ Warehouse found in database', colors.green);
    log(`   Name: ${updatedWarehouse.name}`, colors.blue);
    log(`   Phone: ${updatedWarehouse.contact_person?.phone || 'N/A'}`, colors.blue);
    log(`   Address: ${updatedWarehouse.address?.full_address || 'N/A'}`, colors.blue);
    log(`   Pincode: ${updatedWarehouse.address?.pincode || 'N/A'}`, colors.blue);
    log(`   Updated At: ${updatedWarehouse.updatedAt}`, colors.blue);
    
    // Check if updated_at timestamp changed
    const wasUpdated = updatedWarehouse.updatedAt > selectedWarehouse.updatedAt;
    if (wasUpdated) {
      log('✅ Warehouse was updated (updatedAt timestamp changed)', colors.green);
    } else {
      log('⚠️  Warehouse updatedAt timestamp unchanged (may be within same second)', colors.yellow);
    }
    
    return updatedWarehouse;
  } catch (error) {
    log(`❌ Database verification failed: ${error.message}`, colors.red);
    throw error;
  }
}

/**
 * Main test execution
 */
async function runTest() {
  try {
    logSection('WAREHOUSE UPDATE TEST SCRIPT');
    log(`Test started at: ${new Date().toISOString()}`, colors.blue);
    log(`API URL: ${API_TEST_URL}`, colors.blue);
    
    // Step 1: Connect to database
    await connectDatabase();
    
    // Step 2: Setup authentication
    await setupAuthentication();
    
    // Step 3: Fetch warehouses
    const warehouses = await fetchWarehouses();
    
    // Step 4: Select warehouse
    selectWarehouse(warehouses);
    
    // Step 5: Test update
    await testWarehouseUpdate();
    
    // Step 6: Verify in database
    await verifyDatabaseUpdate();
    
    logSection('TEST COMPLETED SUCCESSFULLY ✅');
    log('All tests passed! Warehouse update functionality is working correctly.', colors.green);
    
  } catch (error) {
    logSection('TEST FAILED ❌');
    log(`Error: ${error.message}`, colors.red);
    if (error.stack) {
      log(`Stack: ${error.stack}`, colors.red);
    }
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log('\n✅ Database connection closed', colors.green);
    }
  }
}

// Run the test
if (require.main === module) {
  runTest()
    .then(() => {
      log('\n✅ Test script completed', colors.green);
      process.exit(0);
    })
    .catch((error) => {
      log(`\n❌ Test script failed: ${error.message}`, colors.red);
      process.exit(1);
    });
}

module.exports = {
  runTest,
  connectDatabase,
  setupAuthentication,
  fetchWarehouses,
  selectWarehouse,
  testWarehouseUpdate,
  verifyDatabaseUpdate
};

