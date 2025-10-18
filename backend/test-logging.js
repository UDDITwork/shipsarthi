const logger = require('./utils/logger');

console.log('🧪 Testing Enhanced Logging System\n');

// Test different log levels
console.log('1. Testing Log Levels:');
logger.error('This is an ERROR message', { test: 'error', timestamp: new Date().toISOString() });
logger.warn('This is a WARN message', { test: 'warning', timestamp: new Date().toISOString() });
logger.info('This is an INFO message', { test: 'info', timestamp: new Date().toISOString() });
logger.debug('This is a DEBUG message', { test: 'debug', timestamp: new Date().toISOString() });

console.log('\n2. Testing Authentication Logging:');
logger.info('Registration attempt started', {
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Test Browser)',
  body: { email: 'test@example.com', company_name: 'Test Company' }
});

logger.info('User created successfully', {
  userId: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  company_name: 'Test Company',
  client_id: 'CLIENT123',
  user_type: 'business',
  monthly_shipments: '100-500'
});

logger.info('Login completed successfully', {
  userId: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  company_name: 'Test Company',
  responseTime: '245ms'
});

console.log('\n3. Testing Dashboard Logging:');
logger.info('Dashboard overview request started', {
  userId: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Test Browser)'
});

logger.info('Dashboard overview completed successfully', {
  userId: '507f1f77bcf86cd799439011',
  responseTime: '156ms',
  metrics: {
    todaysOrders: 5,
    yesterdaysOrders: 3,
    todaysRevenue: 1500,
    yesterdaysRevenue: 900,
    avgShippingCost: 45.50,
    walletBalance: 2500.00
  }
});

console.log('\n4. Testing Error Logging:');
logger.error('Test error occurred', {
  error: 'Database connection failed',
  stack: 'Error: Connection timeout\n    at Database.connect (/app/db.js:25:10)',
  userId: '507f1f77bcf86cd799439011',
  responseTime: '5000ms'
});

console.log('\n✅ Logging test completed!');
console.log('📁 Check the following files for logs:');
console.log(`   - backend/logs/app-${new Date().toISOString().split('T')[0]}.log`);
console.log(`   - backend/logs/error-${new Date().toISOString().split('T')[0]}.log`);
console.log('\n🔍 To view logs in real-time, run:');
console.log(`   tail -f backend/logs/app-${new Date().toISOString().split('T')[0]}.log`);

