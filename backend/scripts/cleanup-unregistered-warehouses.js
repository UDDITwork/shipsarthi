#!/usr/bin/env node

/**
 * Cleanup Script: Remove warehouses that are not registered with Delhivery
 * 
 * This script removes warehouses that have delhivery_registered = false
 * to clean up the database from failed registration attempts.
 * 
 * Usage: node backend/scripts/cleanup-unregistered-warehouses.js
 */

const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
require('dotenv').config();

async function cleanupUnregisteredWarehouses() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find warehouses that are not registered with Delhivery
        const unregisteredWarehouses = await Warehouse.find({
            delhivery_registered: false
        });

        console.log(`📊 Found ${unregisteredWarehouses.length} unregistered warehouses`);

        if (unregisteredWarehouses.length === 0) {
            console.log('✅ No unregistered warehouses found. Database is clean!');
            return;
        }

        // Show details of warehouses to be deleted
        console.log('\n📋 Unregistered warehouses to be deleted:');
        unregisteredWarehouses.forEach((warehouse, index) => {
            console.log(`${index + 1}. ${warehouse.name} (${warehouse.title || 'No title'})`);
            console.log(`   - User ID: ${warehouse.user_id}`);
            console.log(`   - Created: ${warehouse.createdAt}`);
            console.log(`   - Delhivery Error: ${warehouse.delhivery_response?.error || 'Unknown'}`);
            console.log('');
        });

        // Confirm deletion
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise((resolve) => {
            rl.question(`⚠️  Are you sure you want to delete ${unregisteredWarehouses.length} unregistered warehouses? (yes/no): `, resolve);
        });

        rl.close();

        if (answer.toLowerCase() !== 'yes') {
            console.log('❌ Operation cancelled by user');
            return;
        }

        // Delete unregistered warehouses
        const deleteResult = await Warehouse.deleteMany({
            delhivery_registered: false
        });

        console.log(`✅ Successfully deleted ${deleteResult.deletedCount} unregistered warehouses`);

        // Show remaining warehouse count
        const remainingCount = await Warehouse.countDocuments();
        console.log(`📊 Total warehouses remaining: ${remainingCount}`);

        // Show registered warehouse count
        const registeredCount = await Warehouse.countDocuments({
            delhivery_registered: true
        });
        console.log(`✅ Registered warehouses: ${registeredCount}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the cleanup
cleanupUnregisteredWarehouses()
    .then(() => {
        console.log('🎉 Cleanup completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Cleanup failed:', error);
        process.exit(1);
    });
