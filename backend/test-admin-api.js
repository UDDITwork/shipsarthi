const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test admin authentication and endpoints
async function testAdminAPI() {
  console.log('🧪 Testing Admin API Endpoints...\n');

  const adminHeaders = {
    'X-Admin-Email': 'udditalerts247@gmail.com',
    'X-Admin-Password': 'jpmcA123',
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Dashboard endpoint
    console.log('1. Testing Dashboard endpoint...');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
      headers: adminHeaders
    });
    console.log('✅ Dashboard:', {
      status: dashboardResponse.status,
      totalClients: dashboardResponse.data.data?.overview?.totalClients || 0,
      activeClients: dashboardResponse.data.data?.overview?.activeClients || 0
    });

    // Test 2: Clients endpoint
    console.log('\n2. Testing Clients endpoint...');
    const clientsResponse = await axios.get(`${API_BASE_URL}/admin/clients?page=1&limit=5`, {
      headers: adminHeaders
    });
    console.log('✅ Clients:', {
      status: clientsResponse.status,
      totalClients: clientsResponse.data.data?.pagination?.totalClients || 0,
      clientsReturned: clientsResponse.data.data?.clients?.length || 0
    });

    // Test 3: Test with wrong credentials
    console.log('\n3. Testing with wrong credentials...');
    try {
      await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: {
          'X-Admin-Email': 'wrong@email.com',
          'X-Admin-Password': 'wrongpassword'
        }
      });
      console.log('❌ Should have failed with wrong credentials');
    } catch (error) {
      console.log('✅ Correctly rejected wrong credentials:', error.response?.status);
    }

    console.log('\n🎉 All admin API tests completed successfully!');
    console.log('\n📋 Admin Portal URLs:');
    console.log('   Login: http://localhost:3000/admin/login');
    console.log('   Dashboard: http://localhost:3000/admin/dashboard');
    console.log('   Clients: http://localhost:3000/admin/clients');
    console.log('\n🔑 Admin Credentials:');
    console.log('   Email: udditalerts247@gmail.com');
    console.log('   Password: jpmcA123');

  } catch (error) {
    console.error('❌ Admin API Test Failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run the test
testAdminAPI();
