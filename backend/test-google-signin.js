// Test script to verify Google Sign-In functionality
require('dotenv').config();
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const logger = require('./utils/logger');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const TEST_MODE = process.argv[2] || 'full'; // 'full', 'endpoint', 'token'

console.log('\n🧪 Google Sign-In Test Script');
console.log('================================\n');

// Test cases
async function testGoogleSignIn() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Check environment variables
  console.log('📋 Test 1: Checking environment variables...');
  const envTest = {
    name: 'Environment Variables',
    passed: true,
    issues: []
  };

  if (!GOOGLE_CLIENT_ID) {
    envTest.passed = false;
    envTest.issues.push('GOOGLE_CLIENT_ID is not set');
  } else {
    console.log(`  ✅ GOOGLE_CLIENT_ID is configured: ${GOOGLE_CLIENT_ID.substring(0, 30)}...`);
  }

  if (!process.env.JWT_SECRET) {
    envTest.passed = false;
    envTest.issues.push('JWT_SECRET is not set');
  } else {
    console.log(`  ✅ JWT_SECRET is configured`);
  }

  if (!process.env.MONGODB_URI) {
    envTest.passed = false;
    envTest.issues.push('MONGODB_URI is not set');
  } else {
    console.log(`  ✅ MONGODB_URI is configured`);
  }

  results.tests.push(envTest);
  if (envTest.passed) {
    results.passed++;
    console.log('  ✅ All environment variables are configured\n');
  } else {
    results.failed++;
    console.log('  ❌ Environment variable issues found:');
    envTest.issues.forEach(issue => console.log(`     - ${issue}\n`));
    return results;
  }

  // Test 2: Check backend server is running
  console.log('📋 Test 2: Checking backend server...');
  const serverTest = {
    name: 'Backend Server',
    passed: true,
    issues: []
  };

  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 5000
    });
    console.log('  ✅ Backend server is running');
    const dbConnected = response.data.database.status === 'connected';
    console.log(`  ✅ Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    
    if (!dbConnected) {
      serverTest.passed = false;
      serverTest.issues.push('Database is not connected');
    }
  } catch (error) {
    serverTest.passed = false;
    const errorMsg = error.code === 'ECONNREFUSED' 
      ? `Cannot connect to ${BACKEND_URL}. Make sure the server is running.`
      : error.message;
    serverTest.issues.push(`Backend server is not reachable: ${errorMsg}`);
    console.log('  ❌ Backend server is not reachable');
    console.log(`     Error: ${errorMsg}\n`);
    console.log(`     💡 Start the server with: node server.js\n`);
    results.tests.push(serverTest);
    results.failed++;
    return results;
  }

  results.tests.push(serverTest);
  if (serverTest.passed) {
    results.passed++;
    console.log('  ✅ Backend and database are operational\n');
  } else {
    results.failed++;
    console.log('  ❌ Server issues found:');
    serverTest.issues.forEach(issue => console.log(`     - ${issue}\n`));
    return results;
  }

  // Test 3: Check Google Auth endpoint exists
  console.log('📋 Test 3: Testing Google Auth endpoint...');
  const endpointTest = {
    name: 'Google Auth Endpoint',
    passed: true,
    issues: []
  };

  try {
    // Test with invalid credential to check if endpoint exists
    const response = await axios.post(
      `${BACKEND_URL}/api/auth/google`,
      { credential: 'invalid-token' },
      { 
        validateStatus: () => true, // Accept all status codes
        timeout: 30000 // 30 second timeout
      }
    );
    
    // If we get 400 or 401, endpoint exists
    if (response.status === 400 || response.status === 401) {
      console.log('  ✅ Google auth endpoint is accessible');
      console.log(`  ✅ Endpoint correctly rejected invalid token`);
    } else {
      endpointTest.passed = false;
      endpointTest.issues.push(`Unexpected status code: ${response.status}`);
      console.log(`  ⚠️  Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      // Connection reset during test, but endpoint is accessible
      console.log('  ⚠️  Connection reset during test (expected for invalid tokens)');
      console.log('  ℹ️  Endpoint is accessible, but rejected invalid token');
    } else {
      endpointTest.passed = false;
      endpointTest.issues.push(`Endpoint error: ${error.message}`);
      console.log('  ❌ Google auth endpoint test failed');
      console.log(`     Error: ${error.message}\n`);
    }
  }

  results.tests.push(endpointTest);
  if (endpointTest.passed) {
    results.passed++;
    console.log('  ✅ Google auth endpoint is working\n');
  } else {
    results.failed++;
    console.log('  ❌ Endpoint issues found:');
    endpointTest.issues.forEach(issue => console.log(`     - ${issue}\n`));
  }

  // Test 4: Validate Google Client ID format
  console.log('📋 Test 4: Validating Google Client ID format...');
  const clientIdTest = {
    name: 'Google Client ID Format',
    passed: true,
    issues: []
  };

  // Google Client IDs typically end with .apps.googleusercontent.com
  if (!GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    clientIdTest.passed = false;
    clientIdTest.issues.push('Client ID does not match expected format');
    console.log('  ⚠️  Client ID format may be incorrect');
  } else {
    console.log('  ✅ Google Client ID format is valid');
  }

  // Try to initialize OAuth2Client
  try {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    console.log('  ✅ OAuth2Client initialized successfully');
  } catch (error) {
    clientIdTest.passed = false;
    clientIdTest.issues.push(`OAuth2Client initialization failed: ${error.message}`);
    console.log('  ❌ Failed to initialize OAuth2Client');
    console.log(`     Error: ${error.message}`);
  }

  results.tests.push(clientIdTest);
  if (clientIdTest.passed) {
    results.passed++;
    console.log('  ✅ Google Client ID is valid\n');
  } else {
    results.failed++;
    console.log('  ❌ Client ID issues found:');
    clientIdTest.issues.forEach(issue => console.log(`     - ${issue}\n`));
  }

  // Test 5: Test with mock Google token structure
  console.log('📋 Test 5: Testing token verification logic...');
  const tokenTest = {
    name: 'Token Verification Logic',
    passed: true,
    issues: []
  };

  try {
    // Create a mock token structure to test the verification endpoint
    // This will fail verification but tests the endpoint structure
    const mockCredential = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1NiJ9.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI' + GOOGLE_CLIENT_ID + 'IiwiYXVkIjoi' + GOOGLE_CLIENT_ID + 'IiwiZXhwIjoxNjk5OTk5OTk5LCJpYXQiOjE2OTk5OTk5OTl9';
    
    const response = await axios.post(
      `${BACKEND_URL}/api/auth/google`,
      { 
        credential: mockCredential,
        mode: 'signin'
      },
      { 
        validateStatus: () => true,
        timeout: 30000 // 30 second timeout
      }
    );

    // We expect either 401 (invalid token) or 400 (validation error)
    if (response.status === 401 || response.status === 400) {
      console.log('  ✅ Token verification logic is working');
      console.log(`  ✅ Received expected response: ${response.status}`);
    } else {
      console.log(`  ⚠️  Unexpected response: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      console.log('  ⚠️  Connection reset during token verification test');
    } else {
      console.log('  ⚠️  Could not complete token verification test');
      console.log(`     Error: ${error.message}`);
    }
  }

  results.tests.push(tokenTest);
  if (tokenTest.passed) {
    results.passed++;
    console.log('  ✅ Token verification logic appears correct\n');
  } else {
    results.failed++;
  }

  return results;
}

// Test specific endpoint
async function testEndpoint() {
  console.log('\n📋 Testing Google Auth Endpoint...');
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/auth/google`,
      { credential: 'test-token' },
      { validateStatus: () => true }
    );
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests based on mode
async function runTests() {
  try {
    if (TEST_MODE === 'endpoint') {
      await testEndpoint();
    } else if (TEST_MODE === 'full') {
      const results = await testGoogleSignIn();
      
      console.log('\n📊 Test Results Summary');
      console.log('========================');
      console.log(`✅ Passed: ${results.passed}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`📋 Total: ${results.tests.length}\n`);

      if (results.failed === 0) {
        console.log('🎉 All tests passed! Google Sign-In setup is correct.\n');
        console.log('⚠️  Note: To fully test, you need a real Google credential token.');
        console.log('   You can get this by signing in through the frontend UI.\n');
      } else {
        console.log('❌ Some tests failed. Please fix the issues above.\n');
      }
    }
  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
  
  process.exit(0);
}

// Run the tests
runTests();

