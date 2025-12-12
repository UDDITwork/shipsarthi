/**
 * Utility script to delete test users by email.
 *
 * - Loads environment variables via dotenv (expects MONGO_URI).
 * - Connects to MongoDB with mongoose.
 * - Deletes all User documents matching the provided emails.
 *
 * Usage:
 *   node backend/scripts/delete-users-by-email.js
 *
 * NOTE: This is destructive. Double-check the email list before running.
 */

const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

const User = require('../models/User');

const TARGET_EMAILS = [
  'udditkantsinha@gmail.com',
  'udditkantsinha2@gmail.com'
];

async function connectToDatabase() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGO_URI (or MONGODB_URI) environment variable.');
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

async function deleteUsersByEmail(emails) {
  const result = {
    attempted: emails.length,
    deleted: 0,
    details: []
  };

  for (const email of emails) {
    const normalized = email.toLowerCase();
    const deletion = await User.deleteMany({ email: normalized });
    result.deleted += deletion.deletedCount || 0;
    result.details.push({
      email: normalized,
      deletedCount: deletion.deletedCount || 0
    });
  }

  return result;
}

async function main() {
  try {
    await connectToDatabase();
    console.log('[delete-users] Connected to database');

    const outcome = await deleteUsersByEmail(TARGET_EMAILS);
    console.log('[delete-users] Deletion summary:', outcome);
  } catch (err) {
    console.error('[delete-users] Error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[delete-users] Disconnected');
  }
}

main();

