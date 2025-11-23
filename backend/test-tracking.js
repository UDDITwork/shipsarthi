// Standalone Tracking API Test
// This file tests the Delhivery tracking API with a specific AWB number

require('dotenv').config();
const axios = require('axios');

const AWB_NUMBER = '44800710001643';
const API_KEY = process.env.DELHIVERY_API_KEY;
const BASE_URL = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';

async function testTracking() {
    console.log('='.repeat(60));
    console.log('DELHIVERY TRACKING API TEST');
    console.log('='.repeat(60));
    console.log('\nConfiguration:');
    console.log('- AWB Number:', AWB_NUMBER);
    console.log('- API URL:', BASE_URL);
    console.log('- API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT FOUND');
    console.log('\n' + '='.repeat(60));

    try {
        const trackingURL = `${BASE_URL}/v1/packages/json/?waybill=${AWB_NUMBER}`;

        console.log('\nMaking Request:');
        console.log('- URL:', trackingURL);
        console.log('- Method: GET');
        console.log('- Headers: Authorization: Token ' + (API_KEY ? `${API_KEY.substring(0, 10)}...` : 'MISSING'));

        const response = await axios.get(trackingURL, {
            headers: {
                'Authorization': `Token ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n' + '='.repeat(60));
        console.log('RESPONSE RECEIVED');
        console.log('='.repeat(60));
        console.log('\nStatus Code:', response.status);
        console.log('Status Text:', response.statusText);

        console.log('\nResponse Headers:');
        console.log(JSON.stringify(response.headers, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('FULL RESPONSE DATA:');
        console.log('='.repeat(60));
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('\n' + '='.repeat(60));
        console.log('ERROR OCCURRED');
        console.log('='.repeat(60));

        if (error.response) {
            console.log('\nResponse Error:');
            console.log('- Status:', error.response.status);
            console.log('- Status Text:', error.response.statusText);
            console.log('- Headers:', JSON.stringify(error.response.headers, null, 2));
            console.log('\nError Response Data:');
            console.log(JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log('\nRequest Error (No Response):');
            console.log(error.message);
        } else {
            console.log('\nError:', error.message);
        }

        console.log('\nFull Error Object:');
        console.log(error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETED');
    console.log('='.repeat(60));
}

// Run the test
testTracking();
