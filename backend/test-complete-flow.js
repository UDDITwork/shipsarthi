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

// Test user credentials (you'll need to create this user first)
const TEST_EMAIL = 'testclient@example.com';
const TEST_PASSWORD = 'password123';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Admin-Client Ticket Flow...\n');

  try {
    // Step 1: Login as client
    console.log('1. Logging in as client...');
    const clientLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (!clientLoginResponse.data.token) {
      console.log('❌ Client login failed. Please create a test user first.');
      return;
    }
    
    const clientToken = clientLoginResponse.data.token;
    const clientHeaders = {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Client logged in successfully');

    // Step 2: Create a support ticket as client
    console.log('\n2. Creating support ticket as client...');
    const ticketData = {
      category: 'pickup_delivery',
      subject: 'Test Support Request',
      description: 'This is a test support request from client',
      awb_numbers: ['TEST123456789'],
      priority: 'medium'
    };
    
    const createTicketResponse = await axios.post(`${API_BASE_URL}/support`, ticketData, {
      headers: clientHeaders
    });
    
    if (createTicketResponse.data.status === 'success') {
      console.log('✅ Ticket created successfully:', createTicketResponse.data.data.ticket_id);
      const ticketId = createTicketResponse.data.data._id;
      
      // Step 3: Admin views client tickets
      console.log('\n3. Admin viewing client tickets...');
      const clientId = createTicketResponse.data.data.user_id;
      const adminTicketsResponse = await axios.get(`${API_BASE_URL}/admin/clients/${clientId}/tickets`, {
        headers: adminHeaders
      });
      
      if (adminTicketsResponse.data.success) {
        console.log('✅ Admin can view client tickets:', {
          totalTickets: adminTicketsResponse.data.data.pagination.totalTickets,
          ticketsReturned: adminTicketsResponse.data.data.tickets.length
        });
        
        // Step 4: Admin views specific ticket details
        console.log('\n4. Admin viewing ticket details...');
        const ticketDetailsResponse = await axios.get(`${API_BASE_URL}/admin/tickets/${ticketId}`, {
          headers: adminHeaders
        });
        
        if (ticketDetailsResponse.data.success) {
          console.log('✅ Admin can view ticket details:', {
            ticketId: ticketDetailsResponse.data.data.ticket_id,
            status: ticketDetailsResponse.data.data.status,
            conversationLength: ticketDetailsResponse.data.data.conversation?.length || 0
          });
          
          // Step 5: Admin responds to ticket
          console.log('\n5. Admin responding to ticket...');
          const adminResponse = await axios.post(`${API_BASE_URL}/admin/tickets/${ticketId}/messages`, {
            message: 'Thank you for contacting support. We are looking into your issue.',
            is_internal: false
          }, {
            headers: adminHeaders
          });
          
          if (adminResponse.data.success) {
            console.log('✅ Admin response sent successfully');
            
            // Step 6: Admin updates ticket status
            console.log('\n6. Admin updating ticket status...');
            const statusUpdateResponse = await axios.patch(`${API_BASE_URL}/admin/tickets/${ticketId}/status`, {
              status: 'in_progress',
              reason: 'Admin is working on this ticket'
            }, {
              headers: adminHeaders
            });
            
            if (statusUpdateResponse.data.success) {
              console.log('✅ Ticket status updated successfully');
              
              // Step 7: Client views updated ticket
              console.log('\n7. Client viewing updated ticket...');
              const clientTicketResponse = await axios.get(`${API_BASE_URL}/support/${ticketId}`, {
                headers: clientHeaders
              });
              
              if (clientTicketResponse.data.status === 'success') {
                console.log('✅ Client can view updated ticket:', {
                  status: clientTicketResponse.data.data.status,
                  conversationLength: clientTicketResponse.data.data.conversation?.length || 0
                });
                
                console.log('\n🎉 COMPLETE FLOW TEST SUCCESSFUL!');
                console.log('\n📋 Flow Summary:');
                console.log('   ✅ Client creates ticket');
                console.log('   ✅ Admin views client tickets');
                console.log('   ✅ Admin views ticket details');
                console.log('   ✅ Admin responds to ticket');
                console.log('   ✅ Admin updates ticket status');
                console.log('   ✅ Client sees updated ticket');
                
              } else {
                console.log('❌ Client ticket view failed:', clientTicketResponse.data);
              }
            } else {
              console.log('❌ Status update failed:', statusUpdateResponse.data);
            }
          } else {
            console.log('❌ Admin response failed:', adminResponse.data);
          }
        } else {
          console.log('❌ Admin ticket details failed:', ticketDetailsResponse.data);
        }
      } else {
        console.log('❌ Admin tickets view failed:', adminTicketsResponse.data);
      }
    } else {
      console.log('❌ Ticket creation failed:', createTicketResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response:', error.response.data);
    }
  }
}

// Run the test
testCompleteFlow();
