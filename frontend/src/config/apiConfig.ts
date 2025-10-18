// API Configuration for Delhivery Tracking
// Replace 'XXXXXXXXXXXXXXXXXX' with your actual Delhivery API token

export const DELHIVERY_CONFIG = {
  // Production API URL
  API_URL: 'https://track.delhivery.com/api/v1/packages/json/',
  
  // Staging API URL (for testing)
  STAGING_API_URL: 'https://staging-express.delhivery.com/api/v1/packages/json/',
  
  // API Token - Replace with your actual token
  API_TOKEN: 'Token XXXXXXXXXXXXXXXXXX',
  
  // Rate limits (as per Delhivery documentation)
  RATE_LIMIT: {
    REQUESTS_PER_5_MINUTES: 750,
    AVERAGE_LATENCY: '130.31ms',
    P99_LATENCY: '529.15ms'
  }
};

// Usage Instructions:
// 1. Get your API token from Delhivery dashboard
// 2. Replace 'XXXXXXXXXXXXXXXXXX' with your actual token
// 3. The API supports tracking up to 50 waybills in a single request
// 4. Parameters: waybill (mandatory), ref_ids (optional order ID)
