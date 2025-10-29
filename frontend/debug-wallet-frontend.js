// Frontend Debug Script for Wallet Balance
// Run this in browser console on the client dashboard

console.log('🔍 FRONTEND WALLET BALANCE DEBUG');
console.log('================================');

// Function to test wallet balance API
async function testWalletBalanceAPI() {
  try {
    console.log('📋 Testing wallet balance API...');
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No token found in localStorage');
      return;
    }
    
    console.log('✅ Token found:', token.substring(0, 20) + '...');
    
    // Test direct API call
    const response = await fetch('/api/user/wallet-balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📊 API Response:', data);
    
    if (data.success) {
      console.log('✅ API Success:');
      console.log(`   - Balance: ₹${data.data.balance}`);
      console.log(`   - Currency: ${data.data.currency}`);
    } else {
      console.log('❌ API Failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error);
  }
}

// Function to test WebSocket connection
function testWebSocketConnection() {
  console.log('📋 Testing WebSocket connection...');
  
  // Check if WebSocket is connected
  const wsUrl = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const wsPort = window.location.port ? `:${window.location.port}` : '';
  const wsEndpoint = `${wsUrl}${window.location.hostname}${wsPort}`;
  
  console.log('🔌 WebSocket URL:', wsEndpoint);
  
  try {
    const ws = new WebSocket(wsEndpoint);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      
      // Send authentication
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user._id) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          user_id: user._id
        }));
        console.log('🔐 Authentication sent for user:', user._id);
      }
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message received:', data);
      
      if (data.type === 'wallet_balance_update') {
        console.log('💰 Wallet balance update received:');
        console.log(`   - Balance: ₹${data.balance}`);
        console.log(`   - Previous: ₹${data.previous_balance}`);
        console.log(`   - Added: ₹${data.amount_added}`);
      }
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    // Close after 10 seconds
    setTimeout(() => {
      ws.close();
    }, 10000);
    
  } catch (error) {
    console.error('❌ WebSocket test error:', error);
  }
}

// Function to check current user data
function checkUserData() {
  console.log('📋 Checking current user data...');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('👤 User data:', user);
  
  if (user._id) {
    console.log('✅ User ID found:', user._id);
  } else {
    console.log('❌ No user ID found');
  }
  
  if (user.wallet_balance !== undefined) {
    console.log('💰 Wallet balance in user data:', user.wallet_balance);
  } else {
    console.log('❌ No wallet balance in user data');
  }
}

// Function to test wallet service
async function testWalletService() {
  console.log('📋 Testing wallet service...');
  
  try {
    // Check if wallet service exists
    if (typeof walletService !== 'undefined') {
      console.log('✅ Wallet service found');
      
      const balance = await walletService.getWalletBalance();
      console.log('💰 Wallet service balance:', balance);
    } else {
      console.log('❌ Wallet service not found');
    }
  } catch (error) {
    console.error('❌ Wallet service error:', error);
  }
}

// Run all tests
console.log('🚀 Starting frontend debug tests...\n');

checkUserData();
console.log('');

testWalletBalanceAPI();
console.log('');

testWebSocketConnection();
console.log('');

testWalletService();

console.log('\n📝 Instructions:');
console.log('1. Check the console output above');
console.log('2. Look for any ❌ errors');
console.log('3. Verify the wallet balance values');
console.log('4. Check if WebSocket messages are received');
console.log('5. Report any issues found');
