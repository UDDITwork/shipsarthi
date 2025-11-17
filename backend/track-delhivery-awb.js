// Script to fetch full tracking details for a specific Delhivery AWB
// Uses API key and base URL from backend .env

require('dotenv').config({ path: './.env' });
const axios = require('axios');

const WAYBILL = '44800710001492';

const apiKey = process.env.DELHIVERY_API_KEY;
const baseUrl = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';

if (!apiKey) {
  console.error('❌ DELHIVERY_API_KEY is not set in backend .env');
  process.exit(1);
}

async function trackShipment() {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/packages/json/`;

  console.log('🔍 Fetching tracking details from Delhivery...');
  console.log('URL:', url);
  console.log('Waybill:', WAYBILL);
  console.log('');

  const options = {
    method: 'GET',
    url,
    params: {
      waybill: WAYBILL,
      ref_ids: '',
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${apiKey}`,
    },
    timeout: 15000,
    validateStatus: () => true, // let us see all responses, even errors
  };

  try {
    const response = await axios.request(options);

    console.log('=== STATUS ===');
    console.log(response.status, response.statusText);

    console.log('\n=== HEADERS ===');
    console.dir(response.headers, { depth: null });

    console.log('\n=== RAW BODY (AS RETURNED BY DELHIVERY) ===');
    console.dir(response.data, { depth: null });

    console.log('\n=== JSON STRINGIFIED BODY ===');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('\n=== REQUEST ERROR ===');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Body:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error code:', error.code || 'UNKNOWN');
      console.log('Message:', error.message);
    }
  }
}

trackShipment();


