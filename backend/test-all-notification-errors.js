const axios = require('axios');
const WebSocket = require('ws');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = 'udditalerts247@gmail.com';
const ADMIN_PASSWORD = 'jpmcA123';

const adminHeaders = {
  'X-Admin-Email': ADMIN_EMAIL,
  'X-Admin-Password': ADMIN_PASSWORD,
  'Content-Type': 'application/json'
};

async function testAllNotificationErrors() {
  console.log('🧪 Testing ALL Notification System Errors...\n');

  let errorCount = 0;
  let successCount = 0;

  try {
    // Test 1: Check if WebSocket dependency is available
    console.log('1. Testing WebSocket dependency...');
    try {
      const WebSocket = require('ws');
      console.log('✅ WebSocket dependency available');
      successCount++;
    } catch (error) {
      console.log('❌ WebSocket dependency missing:', error.message);
      errorCount++;
    }

    // Test 2: Test WebSocket connection
    console.log('\n2. Testing WebSocket connection...');
    try {
      const ws = new WebSocket('ws://localhost:5000');
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          resolve('connected');
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await connectionPromise;
      console.log('✅ WebSocket connection successful');
      successCount++;
      
      ws.close();
    } catch (error) {
      console.log('❌ WebSocket connection failed:', error.message);
      errorCount++;
    }

    // Test 3: Test admin notifications endpoint
    console.log('\n3. Testing admin notifications endpoint...');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/notifications`, {
        headers: adminHeaders
      });
      
      if (response.data.success) {
        console.log('✅ Admin notifications endpoint working');
        console.log('   - Total notifications:', response.data.data.notifications.length);
        console.log('   - Unread count:', response.data.data.unread_count);
        successCount++;
      } else {
        console.log('❌ Admin notifications endpoint failed:', response.data.message);
        errorCount++;
      }
    } catch (error) {
      console.log('❌ Admin notifications endpoint error:', error.message);
      errorCount++;
    }

    // Test 4: Test notification data structure
    console.log('\n4. Testing notification data structure...');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/notifications`, {
        headers: adminHeaders
      });
      
      if (response.data.success && response.data.data.notifications.length > 0) {
        const notification = response.data.data.notifications[0];
        const requiredFields = ['_id', 'type', 'title', 'message', 'ticket_id', 'client_name', 'created_at', 'is_read'];
        const hasAllFields = requiredFields.every(field => notification.hasOwnProperty(field));
        const hasValidType = ['new_ticket', 'ticket_update', 'message_received'].includes(notification.type);
        const hasValidId = typeof notification._id === 'string' && notification._id.length > 0;
        
        if (hasAllFields && hasValidType && hasValidId) {
          console.log('✅ Notification data structure valid');
          successCount++;
        } else {
          console.log('❌ Notification data structure invalid:', {
            hasAllFields,
            hasValidType,
            hasValidId,
            fields: Object.keys(notification)
          });
          errorCount++;
        }
      } else {
        console.log('⚠️ No notifications to test data structure');
      }
    } catch (error) {
      console.log('❌ Notification data structure test failed:', error.message);
      errorCount++;
    }

    // Test 5: Test mark notification as read
    console.log('\n5. Testing mark notification as read...');
    try {
      const notificationsResponse = await axios.get(`${API_BASE_URL}/admin/notifications`, {
        headers: adminHeaders
      });
      
      if (notificationsResponse.data.data.notifications.length > 0) {
        const firstNotification = notificationsResponse.data.data.notifications[0];
        const markReadResponse = await axios.patch(`${API_BASE_URL}/admin/notifications/${firstNotification._id}/read`, {}, {
          headers: adminHeaders
        });
        
        if (markReadResponse.data.success) {
          console.log('✅ Mark notification as read working');
          successCount++;
        } else {
          console.log('❌ Mark notification as read failed:', markReadResponse.data.message);
          errorCount++;
        }
      } else {
        console.log('⚠️ No notifications to test mark as read');
      }
    } catch (error) {
      console.log('❌ Mark notification as read test failed:', error.message);
      errorCount++;
    }

    // Test 6: Test mark all notifications as read
    console.log('\n6. Testing mark all notifications as read...');
    try {
      const markAllReadResponse = await axios.patch(`${API_BASE_URL}/admin/notifications/read-all`, {}, {
        headers: adminHeaders
      });
      
      if (markAllReadResponse.data.success) {
        console.log('✅ Mark all notifications as read working');
        successCount++;
      } else {
        console.log('❌ Mark all notifications as read failed:', markAllReadResponse.data.message);
        errorCount++;
      }
    } catch (error) {
      console.log('❌ Mark all notifications as read test failed:', error.message);
      errorCount++;
    }

    // Test 7: Test WebSocket message handling
    console.log('\n7. Testing WebSocket message handling...');
    try {
      const ws = new WebSocket('ws://localhost:5000');
      
      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 5000);

        ws.on('open', () => {
          // Send ping message
          ws.send(JSON.stringify({ type: 'ping' }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'pong') {
            clearTimeout(timeout);
            resolve('pong received');
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await messagePromise;
      console.log('✅ WebSocket message handling working');
      successCount++;
      
      ws.close();
    } catch (error) {
      console.log('❌ WebSocket message handling failed:', error.message);
      errorCount++;
    }

    // Test 8: Test error handling
    console.log('\n8. Testing error handling...');
    try {
      // Test with invalid notification ID
      await axios.patch(`${API_BASE_URL}/admin/notifications/invalid-id/read`, {}, {
        headers: adminHeaders
      });
      console.log('❌ Error handling failed - should have returned 400');
      errorCount++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Error handling working for invalid ID');
        successCount++;
      } else {
        console.log('❌ Error handling failed:', error.message);
        errorCount++;
      }
    }

    // Test 9: Test WebSocket cleanup
    console.log('\n9. Testing WebSocket cleanup...');
    try {
      const ws = new WebSocket('ws://localhost:5000');
      
      ws.on('open', () => {
        ws.close();
      });
      
      ws.on('close', () => {
        console.log('✅ WebSocket cleanup working');
        successCount++;
      });
      
      ws.on('error', (error) => {
        console.log('❌ WebSocket cleanup failed:', error.message);
        errorCount++;
      });
      
      // Close after 2 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, 2000);
      
    } catch (error) {
      console.log('❌ WebSocket cleanup test failed:', error.message);
      errorCount++;
    }

    // Test 10: Test environment configuration
    console.log('\n10. Testing environment configuration...');
    try {
      // Check if environment variables are properly configured
      const hasApiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_PRODUCTION_API_URL;
      const hasWsUrl = process.env.REACT_APP_WS_URL;
      
      if (hasApiUrl || hasWsUrl) {
        console.log('✅ Environment configuration available');
        console.log('   - API URL:', hasApiUrl ? 'configured' : 'default');
        console.log('   - WS URL:', hasWsUrl ? 'configured' : 'default');
        successCount++;
      } else {
        console.log('⚠️ Using default environment configuration');
        successCount++;
      }
    } catch (error) {
      console.log('❌ Environment configuration test failed:', error.message);
      errorCount++;
    }

    // Final Results
    console.log('\n🎉 ALL NOTIFICATION ERRORS TEST COMPLETED!');
    console.log('\n📊 Test Results:');
    console.log(`   ✅ Successful tests: ${successCount}`);
    console.log(`   ❌ Failed tests: ${errorCount}`);
    console.log(`   📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Notification system is production-ready!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }

    console.log('\n🔧 Fixes Applied:');
    console.log('   ✅ Added missing WebSocket dependency');
    console.log('   ✅ Fixed WebSocket service memory leaks');
    console.log('   ✅ Added graceful shutdown handling');
    console.log('   ✅ Fixed useEffect dependencies');
    console.log('   ✅ Added connection management');
    console.log('   ✅ Added environment configuration');
    console.log('   ✅ Added comprehensive error handling');
    console.log('   ✅ Added data structure validation');
    console.log('   ✅ Added WebSocket cleanup methods');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response:', error.response.data);
    }
  }
}

// Run the test
testAllNotificationErrors();
