/**
 * Delhivery Pincode Serviceability and Shipping Cost Test Script
 * 
 * PURPOSE:
 * This script tests Delhivery APIs to understand:
 * 1. Pincode serviceability (whether a pincode is serviceable)
 * 2. Zone classification by Delhivery (A, B, C1, C2, D1, D2, E, F)
 * 3. Shipping cost calculation and response format
 * 4. Distance information between pickup and delivery addresses
 * 
 * HOW IT WORKS:
 * - Tests multiple pincode pairs (origin → destination)
 * - Checks serviceability for all pincodes
 * - Calculates shipping costs for various weight and payment type combinations
 * - Extracts zone information from Delhivery's response
 * - Analyzes zone classification patterns
 * 
 * USAGE:
 * 1. Ensure DELHIVERY_API_KEY is set in .env file
 * 2. Run: node backend/test-delhivery-pincode-rates.js
 * 3. Review console output and generated JSON file
 * 
 * OUTPUT:
 * - Console logs with detailed response analysis
 * - JSON file (delhivery-test-results-{timestamp}.json) with all results
 * 
 * NEXT STEPS:
 * After running this script:
 * 1. Identify zone patterns from Delhivery's responses
 * 2. Map Delhivery zones to your price list (rateCardService.js)
 * 3. Use Delhivery's zone classification in production rate calculation
 * 4. Calculate shipping charges using YOUR price list based on Delhivery's zones
 */

// Load environment variables from root .env file
// Try multiple possible locations
const path = require('path');
const fs = require('fs');

// Check for .env file in multiple locations
const possibleEnvPaths = [
    path.resolve(__dirname, '.env'),      // backend/.env (same directory as script)
    path.resolve(__dirname, '../.env'),   // Root .env (if exists)
    path.resolve(process.cwd(), '.env'),  // Current working directory
    path.resolve(process.cwd(), 'backend/.env'), // backend/.env from project root
];

let envFileFound = false;
for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        envFileFound = true;
        console.log(`✅ Loaded .env from: ${envPath}`);
        break;
    }
}

if (!envFileFound) {
    // Try default dotenv behavior (looks in current directory)
    require('dotenv').config();
    console.log('⚠️  .env file not found in common locations, using default dotenv behavior');
}

const axios = require('axios');
const logger = require('./utils/logger');

class DelhiveryPincodeTester {
    constructor() {
        this.apiKey = process.env.DELHIVERY_API_KEY;
        this.baseURL = 'https://track.delhivery.com';
        
        // Debug: Check environment loading
        console.log('🔍 Environment Check:', {
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey?.length || 0,
            apiKeyPreview: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT FOUND',
            envFile: path.resolve(__dirname, '../.env'),
            nodeEnv: process.env.NODE_ENV,
            allDelhiveryKeys: Object.keys(process.env).filter(k => k.includes('DELHIVERY'))
        });
        
        if (!this.apiKey || this.apiKey === 'your-delhivery-api-key' || this.apiKey.trim() === '') {
            console.error('\n❌ ERROR: DELHIVERY_API_KEY not found or invalid!');
            console.error('Please check your .env file in the project root and ensure it contains:');
            console.error('DELHIVERY_API_KEY=your_actual_api_key_here\n');
            throw new Error('DELHIVERY_API_KEY not found in environment variables. Please check your .env file.');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Token ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Test Pincode Serviceability API
     * @param {string} pincode - Pincode to check
     */
    async checkPincodeServiceability(pincode) {
        try {
            logger.info('📍 Checking pincode serviceability', { pincode });
            
            const response = await this.client.get('/c/api/pin-codes/json/', {
                params: {
                    filter_codes: pincode
                }
            });

            const data = response.data;
            
            // Delhivery returns: { delivery_codes: [{ postal_code: {...} }] }
            const deliveryCodes = data.delivery_codes || (Array.isArray(data) ? data : []);
            const hasData = deliveryCodes.length > 0;
            
            logger.info('✅ Pincode serviceability response', {
                pincode,
                responseType: typeof data,
                hasDeliveryCodes: !!data.delivery_codes,
                deliveryCodesLength: deliveryCodes.length,
                isServiceable: hasData,
                structure: data.delivery_codes ? 'object with delivery_codes' : 'direct array'
            });

            // Extract zone and serviceability info
            if (hasData) {
                const pincodeData = deliveryCodes[0]?.postal_code || deliveryCodes[0];
                
                // Check if pincode is NSZ (non-serviceable) by checking center codes
                const centers = pincodeData?.center || [];
                const isNSZ = centers.length > 0 && centers[centers.length - 1]?.code === 'NSZ';
                const isServiceable = !isNSZ && pincodeData?.pickup === 'Y';
                
                return {
                    pincode,
                    serviceable: isServiceable,
                    zone: null, // Zone not in pincode API, only in shipping cost API
                    city: pincodeData?.city || pincodeData?.district || 'Unknown',
                    state: pincodeData?.state_code || 'Unknown',
                    district: pincodeData?.district || 'Unknown',
                    remark: pincodeData?.remarks || '',
                    isEmbargo: (pincodeData?.remarks || '').toLowerCase().includes('embargo'),
                    pickup: pincodeData?.pickup === 'Y',
                    cod: pincodeData?.cod === 'Y',
                    pre_paid: pincodeData?.pre_paid === 'Y',
                    sort_code: pincodeData?.sort_code || null,
                    fullData: pincodeData
                };
            } else {
                return {
                    pincode,
                    serviceable: false,
                    zone: null,
                    message: 'Pincode is non-serviceable (NSZ) - Empty response',
                    data: data
                };
            }
        } catch (error) {
            logger.error('❌ Pincode serviceability check failed', {
                pincode,
                error: error.message,
                status: error.response?.status,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Test Shipping Cost Calculation API
     * @param {Object} params - Shipping parameters
     */
    async calculateShippingCost(params) {
        try {
            const {
                origin_pincode,
                destination_pincode,
                weight_kg = 1, // Default 1kg
                payment_type = 'Pre-paid' // Pre-paid or COD
            } = params;

            logger.info('💰 Calculating shipping cost', {
                origin_pincode,
                destination_pincode,
                weight_kg,
                payment_type
            });

            const response = await this.client.get('/api/kinko/v1/invoice/charges/.json', {
                params: {
                    md: 'E', // Express
                    ss: 'Delivered', // Shipment Status
                    d_pin: destination_pincode,
                    o_pin: origin_pincode,
                    cgm: weight_kg, // Weight in kg
                    pt: payment_type
                }
            });

            const data = response.data;
            
            // Delhivery returns an ARRAY with a single object: [{ zone, total_amount, ... }]
            const chargeData = Array.isArray(data) && data.length > 0 ? data[0] : data;
            
            logger.info('✅ Shipping cost calculation response', {
                origin_pincode,
                destination_pincode,
                weight_kg,
                payment_type,
                responseType: Array.isArray(data) ? 'array' : typeof data,
                isArray: Array.isArray(data),
                arrayLength: Array.isArray(data) ? data.length : 'N/A',
                fullResponse: data
            });

            // Extract zone and pricing info from response
            const extractedData = {
                origin_pincode,
                destination_pincode,
                weight_kg,
                payment_type,
                response: data, // Keep full response for analysis
                // Zone information - DIRECTLY in response object
                zone: chargeData.zone || null,
                // Distance information (not in Delhivery response, but we can calculate if needed)
                distance: null, // Delhivery doesn't provide distance in this API
                // Delhivery's calculated charges
                delhivery_total_amount: chargeData.total_amount || null, // Total with GST
                delhivery_gross_amount: chargeData.gross_amount || null, // Base before GST
                delhivery_delivery_charge: chargeData.charge_DL || null, // Delivery charge
                delhivery_cod_charge: chargeData.charge_COD || null, // COD charge
                delhivery_peak_charge: chargeData.charge_PEAK || null, // Peak surcharge
                // Tax breakdown
                tax_data: chargeData.tax_data || null,
                gst_sgst: chargeData.tax_data?.SGST || null,
                gst_cgst: chargeData.tax_data?.CGST || null,
                gst_igst: chargeData.tax_data?.IGST || null,
                // Weight information
                charged_weight: chargeData.charged_weight || null, // Weight used for calculation
                // Additional charges
                charge_breakdown: {
                    awb: chargeData.charge_AWB || 0,
                    label: chargeData.charge_LABEL || 0,
                    pickup: chargeData.charge_pickup || 0,
                    cod: chargeData.charge_COD || 0,
                    peak: chargeData.charge_PEAK || 0,
                    delivery: chargeData.charge_DL || 0,
                    fuel_surcharge: chargeData.charge_FSC || 0,
                    insurance: chargeData.charge_INS || 0,
                    reverse: chargeData.charge_ROV || 0,
                    rto: chargeData.charge_RTO || 0
                },
                // Status
                status: chargeData.status || null,
                wt_rule_id: chargeData.wt_rule_id || null,
                zonal_cl: chargeData.zonal_cl || null
            };

            logger.info('📊 Extracted shipping cost data', {
                route: `${origin_pincode} → ${destination_pincode}`,
                zone: extractedData.zone,
                delhivery_total: extractedData.delhivery_total_amount,
                delhivery_gross: extractedData.delhivery_gross_amount,
                delhivery_delivery_charge: extractedData.delhivery_delivery_charge,
                charged_weight: extractedData.charged_weight
            });

            return extractedData;
        } catch (error) {
            logger.error('❌ Shipping cost calculation failed', {
                params,
                error: error.message,
                status: error.response?.status,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Test multiple pincode pairs
     */
    async testMultiplePincodePairs(testCases) {
        const results = {
            pincodeServiceability: [],
            shippingCosts: [],
            zoneAnalysis: {}
        };

        logger.info('🧪 Starting comprehensive pincode and rate testing', {
            totalTestCases: testCases.length
        });

        // Test serviceability for all unique pincodes
        const uniquePincodes = new Set();
        testCases.forEach(tc => {
            uniquePincodes.add(tc.origin_pincode);
            uniquePincodes.add(tc.destination_pincode);
        });

        logger.info('📍 Checking serviceability for all pincodes', {
            totalUniquePincodes: uniquePincodes.size,
            pincodes: Array.from(uniquePincodes)
        });

        // Check serviceability
        for (const pincode of uniquePincodes) {
            try {
                const serviceability = await this.checkPincodeServiceability(pincode);
                results.pincodeServiceability.push(serviceability);
                
                // Store pincode info (zone comes from shipping cost API, not serviceability)
                // We'll add zone info when we process shipping costs
                
                // Wait between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                logger.error('❌ Failed to check serviceability', { pincode, error: error.message });
            }
        }

        // Calculate shipping costs for all test cases
        logger.info('💰 Calculating shipping costs for all test cases');
        
        for (const testCase of testCases) {
            try {
                const costData = await this.calculateShippingCost(testCase);
                results.shippingCosts.push(costData);
                
                // Store zone information from shipping cost API
                if (costData.zone) {
                    if (!results.zoneAnalysis[costData.zone]) {
                        results.zoneAnalysis[costData.zone] = [];
                    }
                    results.zoneAnalysis[costData.zone].push({
                        origin_pincode: costData.origin_pincode,
                        destination_pincode: costData.destination_pincode,
                        weight_kg: costData.weight_kg,
                        payment_type: costData.payment_type,
                        delhivery_total: costData.delhivery_total_amount,
                        delhivery_delivery_charge: costData.delhivery_delivery_charge
                    });
                }
                
                // Wait between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                logger.error('❌ Failed to calculate shipping cost', {
                    testCase,
                    error: error.message
                });
            }
        }

        return results;
    }
}

// Test Cases - Comprehensive Zone Testing Based on Distance Ranges
// Testing if Delhivery uses C1, C2, D1, D2, E, F zone names

const testCases = [
    // ==========================================
    // ZONE A: Local within city pickup and delivery
    // ==========================================
    { origin_pincode: '110001', destination_pincode: '110053', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'A', description: 'Zone A: Delhi to Delhi (Same City)' },
    { origin_pincode: '400001', destination_pincode: '400070', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'A', description: 'Zone A: Mumbai to Mumbai (Same City)' },
    { origin_pincode: '560001', destination_pincode: '560100', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'A', description: 'Zone A: Bangalore to Bangalore (Same City)' },
    { origin_pincode: '600001', destination_pincode: '600036', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'A', description: 'Zone A: Chennai to Chennai (Same City)' },
    
    // ==========================================
    // ZONE B: 0-500 km Regional
    // ==========================================
    { origin_pincode: '110001', destination_pincode: '141001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'B', description: 'Zone B: Delhi to Ludhiana (~300 km)' },
    { origin_pincode: '110001', destination_pincode: '160001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'B', description: 'Zone B: Delhi to Chandigarh (~250 km)' },
    { origin_pincode: '400001', destination_pincode: '411001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'B', description: 'Zone B: Mumbai to Pune (~150 km)' },
    { origin_pincode: '400001', destination_pincode: '422002', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'B', description: 'Zone B: Mumbai to Nashik (~180 km)' },
    { origin_pincode: '560001', destination_pincode: '641001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'B', description: 'Zone B: Bangalore to Coimbatore (~350 km)' },
    { origin_pincode: '110001', destination_pincode: '248001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'B', description: 'Zone B: Delhi to Dehradun (~250 km)' },
    
    // ==========================================
    // ZONE C-1: 501-1400 km Metro to Metro only
    // ==========================================
    { origin_pincode: '400001', destination_pincode: '560001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C1', description: 'Zone C-1: Mumbai to Bangalore (~850 km Metro to Metro)' },
    { origin_pincode: '110001', destination_pincode: '700001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C2', description: 'Zone C-2: Delhi to Kolkata (~1500 km Metro to Metro)' },
    { origin_pincode: '400001', destination_pincode: '600001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C1', description: 'Zone C-1: Mumbai to Chennai (~1400 km Metro to Metro)' },
    { origin_pincode: '500001', destination_pincode: '560001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C1', description: 'Zone C-1: Hyderabad to Bangalore (~570 km Metro to Metro)' },
    
    // ==========================================
    // ZONE C-2: 1401-2500 km Metro to Metro only
    // ==========================================
    { origin_pincode: '110001', destination_pincode: '560001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C2', description: 'Zone C-2: Delhi to Bangalore (~2200 km Metro to Metro)' },
    { origin_pincode: '400001', destination_pincode: '700001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C2', description: 'Zone C-2: Mumbai to Kolkata (~2000 km Metro to Metro)' },
    { origin_pincode: '110001', destination_pincode: '500001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C2', description: 'Zone C-2: Delhi to Hyderabad (~1600 km Metro to Metro)' },
    { origin_pincode: '560001', destination_pincode: '700001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'C2', description: 'Zone C-2: Bangalore to Kolkata (~1900 km Metro to Metro)' },
    
    // ==========================================
    // ZONE D-1: 501-1400 km Rest of India (NOT Metro to Metro)
    // ==========================================
    { origin_pincode: '380015', destination_pincode: '411001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D1', description: 'Zone D-1: Ahmedabad to Pune (~530 km Rest of India)' },
    { origin_pincode: '141001', destination_pincode: '302001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D1', description: 'Zone D-1: Ludhiana to Jaipur (~500 km Rest of India)' },
    { origin_pincode: '700001', destination_pincode: '800001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D1', description: 'Zone D-1: Kolkata to Patna (~600 km Rest of India)' },
    { origin_pincode: '500001', destination_pincode: '530001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D1', description: 'Zone D-1: Hyderabad to Vizag (~650 km Rest of India)' },
    { origin_pincode: '302001', destination_pincode: '452001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D1', description: 'Zone D-1: Jaipur to Indore (~600 km Rest of India)' },
    
    // ==========================================
    // ZONE D-2: 1401-2500 km Rest of India (NOT Metro to Metro)
    // ==========================================
    { origin_pincode: '700001', destination_pincode: '500001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D2', description: 'Zone D-2: Kolkata to Hyderabad (~1400 km Rest of India)' },
    { origin_pincode: '110001', destination_pincode: '781001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D2', description: 'Zone D-2: Delhi to Guwahati (~1800 km Rest of India)' },
    { origin_pincode: '400001', destination_pincode: '781001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D2', description: 'Zone D-2: Mumbai to Guwahati (~2400 km Rest of India)' },
    { origin_pincode: '302001', destination_pincode: '700001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'D2', description: 'Zone D-2: Jaipur to Kolkata (~1800 km Rest of India)' },
    
    // ==========================================
    // ZONE E & F: NE, J&K, or >2500 km
    // ==========================================
    { origin_pincode: '110001', destination_pincode: '180001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'E/F', description: 'Zone E/F: Delhi to Jammu (~600 km J&K)' },
    { origin_pincode: '110001', destination_pincode: '190001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'E/F', description: 'Zone E/F: Delhi to Srinagar (~800 km J&K)' },
    { origin_pincode: '781001', destination_pincode: '795001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'E/F', description: 'Zone E/F: Guwahati to Imphal (~500 km NE)' },
    { origin_pincode: '400001', destination_pincode: '795001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'E/F', description: 'Zone E/F: Mumbai to Imphal (>2500 km)' },
    { origin_pincode: '110001', destination_pincode: '795001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'E/F', description: 'Zone E/F: Delhi to Imphal (>2500 km)' },
    { origin_pincode: '560001', destination_pincode: '781001', weight_kg: 1, payment_type: 'Pre-paid', expected_zone: 'E/F', description: 'Zone E/F: Bangalore to Guwahati (~2500 km)' },
];

// Main execution
async function main() {
    const tester = new DelhiveryPincodeTester();
    
    console.log('🚀 Starting Delhivery Pincode and Rate Testing Script\n');
    console.log('='.repeat(80));
    console.log(`Total Test Cases: ${testCases.length}`);
    console.log('='.repeat(80));
    console.log('\n');

    try {
        const results = await tester.testMultiplePincodePairs(testCases);

        // Display results
        console.log('\n' + '='.repeat(80));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(80));

        // Serviceability Summary
        console.log('\n📍 PINCODE SERVICEABILITY:');
        console.log('-'.repeat(80));
        results.pincodeServiceability.forEach(item => {
            console.log(`\nPincode: ${item.pincode}`);
            console.log(`  Serviceable: ${item.serviceable ? '✅ YES' : '❌ NO'}`);
            if (item.serviceable) {
                console.log(`  Zone: ${item.zone || 'Not found in response'}`);
                console.log(`  City: ${item.city}`);
                console.log(`  State: ${item.state}`);
                console.log(`  Remark: ${item.remark || 'None'}`);
                console.log(`  Embargo: ${item.isEmbargo ? '⚠️ YES' : '✅ NO'}`);
            }
        });

        // Zone Analysis
        console.log('\n\n🗺️  ZONE ANALYSIS (from Shipping Cost API):');
        console.log('-'.repeat(80));
        if (Object.keys(results.zoneAnalysis).length === 0) {
            console.log('\n⚠️  No zones found in shipping cost responses');
        } else {
            Object.keys(results.zoneAnalysis).sort().forEach(zone => {
                console.log(`\nZone ${zone}: ${results.zoneAnalysis[zone].length} route(s)`);
                results.zoneAnalysis[zone].forEach(route => {
                    console.log(`  - ${route.origin_pincode} → ${route.destination_pincode} (${route.weight_kg}kg, ${route.payment_type})`);
                    console.log(`    Delhivery Charge: ₹${route.delhivery_delivery_charge || 'N/A'} | Total: ₹${route.delhivery_total || 'N/A'}`);
                });
            });
        }

        // Shipping Cost Summary with Zone Analysis
        console.log('\n\n💰 SHIPPING COST CALCULATIONS:');
        console.log('-'.repeat(80));
        results.shippingCosts.forEach((cost, index) => {
            const testCase = testCases[index];
            const description = testCase?.description || 'N/A';
            const expectedZone = testCase?.expected_zone || 'N/A';
            const zoneMatch = cost.zone === expectedZone || 
                             (expectedZone === 'C1' && cost.zone?.startsWith('C')) ||
                             (expectedZone === 'C2' && cost.zone?.startsWith('C')) ||
                             (expectedZone === 'D1' && cost.zone?.startsWith('D')) ||
                             (expectedZone === 'D2' && cost.zone?.startsWith('D')) ||
                             (expectedZone === 'E/F' && (cost.zone === 'E' || cost.zone === 'F'));
            
            console.log(`\nRoute: ${cost.origin_pincode} → ${cost.destination_pincode}`);
            console.log(`  Description: ${description}`);
            console.log(`  Weight: ${cost.weight_kg} kg | Payment: ${cost.payment_type}`);
            console.log(`  Expected Zone: ${expectedZone}`);
            console.log(`  Actual Zone from Delhivery: ${cost.zone || 'Not found'} ${zoneMatch ? '✅' : '⚠️'}`);
            console.log(`  Delhivery Gross Amount: ₹${cost.delhivery_gross_amount || 'N/A'}`);
            console.log(`  Delhivery Delivery Charge: ₹${cost.delhivery_delivery_charge || 'N/A'}`);
            console.log(`  Delhivery COD Charge: ₹${cost.delhivery_cod_charge || '0'}`);
            console.log(`  Delhivery Total (with GST): ₹${cost.delhivery_total_amount || 'N/A'}`);
            console.log(`  Charged Weight: ${cost.charged_weight || cost.weight_kg} kg`);
            if (cost.tax_data) {
                console.log(`  GST (CGST+SGST): ₹${(cost.gst_cgst || 0) + (cost.gst_sgst || 0)}`);
            }
        });

        // Zone Name Analysis
        console.log('\n\n🔬 ZONE NAME ANALYSIS:');
        console.log('-'.repeat(80));
        const allZones = results.shippingCosts.map(c => c.zone).filter(z => z);
        const uniqueZones = [...new Set(allZones)].sort();
        console.log(`Unique Zone Names Found: ${uniqueZones.length}`);
        console.log(`Zone Names: ${uniqueZones.join(', ')}`);
        console.log('\nZone Distribution:');
        uniqueZones.forEach(zone => {
            const count = allZones.filter(z => z === zone).length;
            console.log(`  ${zone}: ${count} route(s)`);
        });
        
        // Check for C1, C2, D1, D2, E, F
        const hasC1 = uniqueZones.some(z => z === 'C1' || z === 'C-1' || z?.includes('C1'));
        const hasC2 = uniqueZones.some(z => z === 'C2' || z === 'C-2' || z?.includes('C2'));
        const hasD1 = uniqueZones.some(z => z === 'D1' || z === 'D-1' || z?.includes('D1'));
        const hasD2 = uniqueZones.some(z => z === 'D2' || z === 'D-2' || z?.includes('D2'));
        const hasE = uniqueZones.some(z => z === 'E');
        const hasF = uniqueZones.some(z => z === 'F');
        
        console.log('\nZone Naming Pattern Check:');
        console.log(`  C1/C-1 found: ${hasC1 ? '✅ YES' : '❌ NO (using C instead)'}`);
        console.log(`  C2/C-2 found: ${hasC2 ? '✅ YES' : '❌ NO (using C instead)'}`);
        console.log(`  D1/D-1 found: ${hasD1 ? '✅ YES' : '❌ NO (using D instead)'}`);
        console.log(`  D2/D-2 found: ${hasD2 ? '✅ YES' : '❌ NO (using D instead)'}`);
        console.log(`  Zone E found: ${hasE ? '✅ YES' : '❌ NO'}`);
        console.log(`  Zone F found: ${hasF ? '✅ YES' : '❌ NO'}`);
        
        // Key Findings
        console.log('\n\n🔍 KEY FINDINGS:');
        console.log('-'.repeat(80));
        console.log(`Total Serviceable Pincodes: ${results.pincodeServiceability.filter(p => p.serviceable).length}`);
        console.log(`Total Non-Serviceable Pincodes: ${results.pincodeServiceability.filter(p => !p.serviceable).length}`);
        console.log(`Unique Zones Found: ${Object.keys(results.zoneAnalysis).length}`);
        console.log(`Zones: ${Object.keys(results.zoneAnalysis).join(', ')}`);
        console.log(`Total Shipping Cost Calculations: ${results.shippingCosts.length}`);
        const usesExtendedNames = hasC1 || hasC2 || hasD1 || hasD2;
        const conclusion = usesExtendedNames 
            ? 'extended zone names (C1, C2, D1, D2, E, F)' 
            : (uniqueZones.length > 4 
                ? 'simple zone names (A, B, C, D, E, F) - NO C1/C2 or D1/D2 distinction' 
                : 'simple zone names (A, B, C, D)');
        console.log(`\n📌 CONCLUSION: Delhivery uses ${conclusion}`);

        // Save detailed results to file
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `delhivery-test-results-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\n✅ Detailed results saved to: ${filename}`);

    } catch (error) {
        logger.error('❌ Test script failed', {
            error: error.message,
            stack: error.stack
        });
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DelhiveryPincodeTester;

