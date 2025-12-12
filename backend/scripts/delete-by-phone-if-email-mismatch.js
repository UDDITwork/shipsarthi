/**
 * Delete a user by phone number ONLY if their email does NOT match the expected one.
 *
 * - Loads env from backend/.env (expects MONGO_URI or MONGODB_URI).
 * - Finds user by phone_number.
 * - If no user: logs and exits.
 * - If email matches expected: aborts (no delete).
 * - If email differs: deletes the user and logs result.
 *
 * Usage:
 *   node backend/scripts/delete-by-phone-if-email-mismatch.js
 *
 * WARNING: Destructive when mismatch condition is met.
 */

const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

const User = require('../models/User');

// Parameters for this run
const TARGET_PHONE = '8368824707';
const EXPECTED_EMAIL = 'udditalerts247@gmail.com';

async function connectToDatabase() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGO_URI (or MONGODB_URI) environment variable.');
  }

  await mongoose.connect(uri);
}

async function main() {
  try {
    await connectToDatabase();
    console.log('[delete-check] Connected to database');

    const user = await User.findOne({ phone_number: TARGET_PHONE });

    if (!user) {
      console.log(`[delete-check] No user found with phone ${TARGET_PHONE}. Nothing to delete.`);
      return;
    }

    const userEmail = (user.email || '').toLowerCase();
    const expected = EXPECTED_EMAIL.toLowerCase();

    console.log('[delete-check] Found user:', {
      id: user._id.toString(),
      phone_number: user.phone_number,
      email: userEmail
    });

    if (userEmail === expected) {
      console.log('[delete-check] Email matches expected. No deletion performed.');
      return;
    }

    const deletion = await User.deleteOne({ _id: user._id });
    console.log('[delete-check] Deletion result:', deletion);
  } catch (err) {
    console.error('[delete-check] Error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[delete-check] Disconnected');
  }
}

main();

