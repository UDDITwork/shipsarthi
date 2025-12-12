// Quick script to check webhook queue status
const https = require('https');

console.log('📊 CHECKING WEBHOOK STATUS...\n');

const options = {
  hostname: 'api.shipsarthi.com',
  port: 443,
  path: '/api/webhooks/health',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const response = JSON.parse(data);
    
    console.log('📈 CURRENT STATUS:');
    console.log('Queue Size:', response.queue.queueSize);
    console.log('Processing:', response.queue.processing ? 'Yes' : 'No');
    console.log('');
    console.log('📊 STATISTICS:');
    console.log('Processed:', response.queue.stats.processed);
    console.log('Failed:', response.queue.stats.failed);
    console.log('Retries:', response.queue.stats.retries);
    console.log('');
    
    if (response.queue.stats.processed > 0) {
      console.log('✅ WEBHOOKS ARE BEING PROCESSED!');
      console.log('Total processed:', response.queue.stats.processed);
    } else {
      console.log('⏳ No webhooks processed yet');
      console.log('   (This is normal if Delhivery hasn\'t sent any yet)');
    }
    
    if (response.queue.queueSize > 0) {
      console.log('⚠️  Webhooks waiting in queue:', response.queue.queueSize);
    }
    
    if (response.queue.stats.failed > 0) {
      console.log('❌ Failed webhooks:', response.queue.stats.failed);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ERROR:', error.message);
});

req.end();

