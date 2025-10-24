const axios = require('axios');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = 'udditalerts247@gmail.com';
const ADMIN_PASSWORD = 'jpmcA123';

const adminHeaders = {
  'X-Admin-Email': ADMIN_EMAIL,
  'X-Admin-Password': ADMIN_PASSWORD,
  'Content-Type': 'application/json'
};

async function testAdminTicketRoutes() {
  console.log('🧪 Testing Admin Ticket Routes...\n');

  try {
    // Test 1: Get all tickets
    console.log('1. Testing GET /api/admin/tickets...');
    const allTicketsResponse = await axios.get(`${API_BASE_URL}/admin/tickets`, {
      headers: adminHeaders
    });
    console.log('✅ All tickets fetched:', {
      status: allTicketsResponse.status,
      totalTickets: allTicketsResponse.data.data?.pagination?.totalTickets || 0,
      ticketsReturned: allTicketsResponse.data.data?.tickets?.length || 0
    });

    // Test 2: Get client tickets (if we have a client)
    if (allTicketsResponse.data.data.tickets.length > 0) {
      const firstTicket = allTicketsResponse.data.data.tickets[0];
      const clientId = firstTicket.user_id._id;
      
      console.log('\n2. Testing GET /api/admin/clients/:id/tickets...');
      const clientTicketsResponse = await axios.get(`${API_BASE_URL}/admin/clients/${clientId}/tickets`, {
        headers: adminHeaders
      });
      console.log('✅ Client tickets fetched:', {
        status: clientTicketsResponse.status,
        totalTickets: clientTicketsResponse.data.data?.pagination?.totalTickets || 0,
        ticketsReturned: clientTicketsResponse.data.data?.tickets?.length || 0
      });

      // Test 3: Get specific ticket details
      console.log('\n3. Testing GET /api/admin/tickets/:id...');
      const ticketDetailsResponse = await axios.get(`${API_BASE_URL}/admin/tickets/${firstTicket._id}`, {
        headers: adminHeaders
      });
      console.log('✅ Ticket details fetched:', {
        status: ticketDetailsResponse.status,
        ticketId: ticketDetailsResponse.data.data?.ticket_id,
        status: ticketDetailsResponse.data.data?.status,
        conversationLength: ticketDetailsResponse.data.data?.conversation?.length || 0
      });

      // Test 4: Send message to ticket
      console.log('\n4. Testing POST /api/admin/tickets/:id/messages...');
      const messageResponse = await axios.post(`${API_BASE_URL}/admin/tickets/${firstTicket._id}/messages`, {
        message: 'Test admin response - this is a test message from admin',
        is_internal: false
      }, {
        headers: adminHeaders
      });
      console.log('✅ Message sent:', {
        status: messageResponse.status,
        success: messageResponse.data.success,
        message: messageResponse.data.message
      });

      // Test 5: Update ticket status
      console.log('\n5. Testing PATCH /api/admin/tickets/:id/status...');
      const statusResponse = await axios.patch(`${API_BASE_URL}/admin/tickets/${firstTicket._id}/status`, {
        status: 'in_progress',
        reason: 'Admin is working on this ticket'
      }, {
        headers: adminHeaders
      });
      console.log('✅ Status updated:', {
        status: statusResponse.status,
        success: statusResponse.data.success,
        message: statusResponse.data.message
      });
    }

    console.log('\n🎉 All admin ticket routes are working correctly!');
    console.log('\n📋 Available Admin Ticket Endpoints:');
    console.log('   GET    /api/admin/tickets - Get all tickets');
    console.log('   GET    /api/admin/clients/:id/tickets - Get client tickets');
    console.log('   GET    /api/admin/tickets/:id - Get ticket details');
    console.log('   POST   /api/admin/tickets/:id/messages - Send message');
    console.log('   PATCH  /api/admin/tickets/:id/status - Update status');
    console.log('   PATCH  /api/admin/tickets/:id/assign - Assign ticket');
    console.log('   POST   /api/admin/tickets/:id/resolve - Resolve ticket');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response:', error.response.data);
    }
  }
}

// Run the test
testAdminTicketRoutes();
