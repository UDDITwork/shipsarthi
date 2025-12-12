// Instant webhook test - sends a test webhook and checks if it's processed
const https = require('https');

console.log('🧪 INSTANT WEBHOOK VERIFICATION TEST\n');

// Test payload with current timestamp
const testPayload = {
  Shipment: {
    Status: {
      Status: "In Transit",
      StatusDateTime: new Date().toISOString(),
      StatusType: "UD",
      StatusLocation: "Mumbai",
      Instructions: "Instant verification test"
    },
    PickUpDate: new Date().toISOString(),
    NSLCode: "X-UCI",
    Sortcode: "IXC/MDP",
    ReferenceNo: `TEST-${Date.now()}`,
    AWB: `TEST-AWB-${Date.now()}`
  }
};

const postData = JSON.stringify(testPayload);

const options = {
  hostname: 'api.shipsarthi.com',
  port: 443,
  path: '/api/webhooks/v1/delhivery/scan-status',
  method: 'POST',
  headers: {
    'X-API-Key': '7b91fd81aab0b5c36252a2f0a509cfc8912146e1f5b11bcc62f50eb4846657a2',
    'Authorization': 'Bearer b45e7341b4c104f385f9b9f9965b81ada840f2d02e178cc1d4229ee8aa45fa72',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📤 Sending test webhook...');
console.log('Waybill:', testPayload.Shipment.AWB);
console.log('Status:', testPayload.Shipment.Status.Status);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ WEBHOOK RESPONSE:');
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    console.log('');
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('🎉 WEBHOOK RECEIVED SUCCESSFULLY!');
      console.log('Request ID:', response.requestId);
      console.log('Job ID:', response.jobId);
      console.log('');
      console.log('📊 NEXT STEPS TO VERIFY:');
      console.log('1. Check Render logs for: "📥 Scan push webhook received"');
      console.log('2. Check MongoDB for new record in ShipmentTrackingEvent collection');
      console.log('3. Search for waybill:', testPayload.Shipment.AWB);
      console.log('');
      console.log('⏱️  Wait 2-3 seconds, then check health endpoint:');
      console.log('   https://api.shipsarthi.com/api/webhooks/health');
      console.log('   Look for "processed" count to increase');
    } else {
      console.log('❌ ERROR: Webhook returned status', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ERROR:', error.message);
});

req.write(postData);
req.end();

