// Location: backend/track-awb-from-file.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function trackAWBNumbers() {
    try {
        // Read AWB numbers from file
        const awbFile = path.join(__dirname, '..', 'awb-numbers-from-image.txt');
        
        // Debug: Check if file exists
        if (!fs.existsSync(awbFile)) {
            console.error(`ERROR: File not found: ${awbFile}`);
            process.exit(1);
        }
        
        const fileContent = fs.readFileSync(awbFile, 'utf-8');
        const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Get AWB numbers from lines 1-2 (0-indexed: lines 0-1)
        const awbNumbers = lines.slice(0, 2).filter(awb => awb.length > 0);
        
        if (awbNumbers.length === 0) {
            console.error('ERROR: No AWB numbers found in file');
            process.exit(1);
        }
        
        // Debug info to stderr
        process.stderr.write(`DEBUG: Found ${awbNumbers.length} AWB number(s): ${awbNumbers.join(', ')}\n`);
        
        // Get API configuration
        const apiKey = process.env.DELHIVERY_API_KEY;
        if (!apiKey || apiKey === 'your-delhivery-api-key') {
            console.error('ERROR: DELHIVERY_API_KEY not configured in .env file');
            process.exit(1);
        }
        
        // Determine base URL (production or staging)
        const useStaging = process.env.DELHIVERY_USE_STAGING === 'true';
        const baseDomain = useStaging 
            ? 'https://staging-express.delhivery.com'
            : 'https://track.delhivery.com';
        
        const trackingURL = `${baseDomain}/api/v1/packages/json/`;
        
        // Debug info to stderr
        process.stderr.write(`DEBUG: Using API URL: ${trackingURL}\n`);
        process.stderr.write(`DEBUG: API Key present: ${apiKey ? 'YES' : 'NO'}\n`);
        
        // Track each AWB number
        for (const awb of awbNumbers) {
            try {
                process.stderr.write(`DEBUG: Tracking AWB: ${awb}\n`);
                
                const params = {
                    waybill: awb
                };
                
                const response = await axios.get(trackingURL, {
                    params: params,
                    headers: {
                        'Authorization': `Token ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });
                
                // Output raw response body only to stdout
                process.stdout.write(JSON.stringify(response.data, null, 2));
                process.stdout.write('\n');
                
            } catch (error) {
                // Output error response body if available to stdout (raw response)
                if (error.response) {
                    process.stdout.write(JSON.stringify(error.response.data, null, 2));
                    process.stdout.write('\n');
                    process.stderr.write(`ERROR: HTTP ${error.response.status} for AWB ${awb}\n`);
                } else {
                    // Network/other errors to stdout as JSON
                    process.stdout.write(JSON.stringify({
                        error: error.message,
                        waybill: awb,
                        code: error.code
                    }, null, 2));
                    process.stdout.write('\n');
                    process.stderr.write(`ERROR: ${error.message} for AWB ${awb}\n`);
                }
            }
        }
        
    } catch (error) {
        // Fatal errors to stdout as JSON
        process.stdout.write(JSON.stringify({
            error: error.message,
            stack: error.stack
        }, null, 2));
        process.stdout.write('\n');
        process.exit(1);
    }
}

trackAWBNumbers();

