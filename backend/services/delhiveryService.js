// Location: backend/services/delhiveryService.js
// Ensure dotenv is loaded before reading env variables
if (!process.env.DELHIVERY_API_KEY && typeof require !== 'undefined') {
    try {
        require('dotenv').config();
    } catch (e) {
        // dotenv already loaded or not available
    }
}

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DelhiveryService {
    constructor() {
        this.baseURL = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';
        this.stagingURL = 'https://staging-express.delhivery.com/api';
        this.apiKey = process.env.DELHIVERY_API_KEY;
        
        // Debug: Log API key status (first 10 chars only for security)
        const envKeys = Object.keys(process.env).filter(k => k.includes('DELHIVERY'));
        console.log('🔑 Delhivery Service Initialized:', {
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey?.length || 0,
            apiKeyPreview: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING',
            apiURL: this.baseURL,
            envKeysFound: envKeys,
            directEnvCheck: process.env.DELHIVERY_API_KEY ? `${process.env.DELHIVERY_API_KEY.substring(0, 10)}...` : 'NOT IN PROCESS.ENV',
            constructorCalledAt: new Date().toISOString()
        });
        
        // If API key is missing, log warning but don't fail - will fail at runtime
        if (!this.apiKey || this.apiKey === 'your-delhivery-api-key') {
            console.warn('⚠️ WARNING: Delhivery API Key not found during initialization!');
            console.warn('This may cause issues when making API calls.');
        }
        // FORCE PRODUCTION URL - Don't use staging unless explicitly set
        // Set DELHIVERY_USE_STAGING=true to use staging
        const useStaging = process.env.DELHIVERY_USE_STAGING === 'true';
        this.isProduction = !useStaging;
        this.apiURL = useStaging ? this.stagingURL : this.baseURL;
        
        // Initialize client with API key if available, otherwise will update at runtime
        this.client = axios.create({
            baseURL: this.apiURL,
            headers: {
                'Authorization': `Token ${this.apiKey || ''}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        
        // Update client headers if API key becomes available later
        this.updateClientHeaders = () => {
            const activeApiKey = this.apiKey || process.env.DELHIVERY_API_KEY;
            if (activeApiKey) {
                this.client.defaults.headers['Authorization'] = `Token ${activeApiKey}`;
            }
        };
    }

    /**
     * Generate Waybill Number
     * @returns {string} Generated waybill
     */
    generateWaybill() {
        return `SHIP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

    /**
     * Create Single Package Shipment (SPS)
     * @param {Object} orderData - Order data
     * @returns {Promise} Shipment creation response
     */
    async createShipment(orderData) {
        try {
            const shipmentData = {
                shipments: [{
                    name: orderData.customer_info.buyer_name,
                    add: orderData.delivery_address.full_address,
                    pin: orderData.delivery_address.pincode,
                    city: orderData.delivery_address.city,
                    state: orderData.delivery_address.state,
                    country: 'India',
                    phone: orderData.customer_info.phone,
                    order: orderData.order_id,
                    payment_mode: orderData.payment_info.payment_mode === 'Prepaid' ? 'Prepaid' : (orderData.payment_info.payment_mode === 'COD' ? 'COD' : 'Prepaid'),
                    return_pin: orderData.pickup_address?.pincode || '',
                    return_city: orderData.pickup_address?.city || '',
                    return_phone: orderData.pickup_address?.phone || '',
                    return_add: orderData.pickup_address?.full_address || '',
                    return_state: orderData.pickup_address?.state || '',
                    return_country: 'India',
                    products_desc: orderData.products.map(p => p.product_name).join(', '),
                    hsn_code: orderData.products[0]?.hsn_code || '',
                    cod_amount: orderData.payment_info.cod_amount || 0,
                    order_date: new Date().toISOString().split('T')[0],
                    total_amount: orderData.payment_info.order_value || 0,
                    // Add end_date to avoid Delhivery error "NoneType object has no attribute 'end_date'"
                    end_date: null, // Explicitly set to null as per Delhivery API requirement
                    seller_add: orderData.pickup_address?.full_address || '',
                    seller_name: orderData.seller_info?.name || '',
                    seller_inv: orderData.invoice_number || '',
                    quantity: orderData.products.reduce((sum, p) => sum + p.quantity, 0),
                    // Use pre-fetched waybill if provided, otherwise let Delhivery generate it
                    waybill: orderData.waybill || '', // Pre-fetched waybill from getWaybill API
                    shipment_width: orderData.package_info.dimensions.width || 10,
                    shipment_height: orderData.package_info.dimensions.height || 10,
                    shipment_length: orderData.package_info.dimensions.length || orderData.package_info.dimensions.width || 10,
                    weight: orderData.package_info.weight,
                    seller_gst_tin: orderData.seller_info?.gst_number || '',
                    shipping_mode: orderData.shipping_mode || 'Surface',
                    address_type: orderData.address_type || 'home'
                }],
                pickup_location: {
                    name: orderData.pickup_address?.name || 'Default Pickup',
                    add: orderData.pickup_address?.full_address || '',
                    city: orderData.pickup_address?.city || '',
                    pin_code: orderData.pickup_address?.pincode || '',
                    country: 'India',
                    phone: orderData.pickup_address?.phone || ''
                }
            };

            // Validate API key before making request - check both instance and process.env
            let apiKeyToUse = this.apiKey || process.env.DELHIVERY_API_KEY;
            
            if (!apiKeyToUse || apiKeyToUse === 'your-delhivery-api-key') {
                logger.error('❌ Delhivery API Key not configured', {
                    instanceApiKey: !!this.apiKey,
                    envApiKey: !!process.env.DELHIVERY_API_KEY,
                    allDelhiveryEnvKeys: Object.keys(process.env).filter(k => k.includes('DELHIVERY'))
                });
                throw new Error('Delhivery API Key not configured. Please set DELHIVERY_API_KEY in environment variables.');
            }
            
            // Use runtime API key if instance doesn't have it
            if (!this.apiKey && process.env.DELHIVERY_API_KEY) {
                this.apiKey = process.env.DELHIVERY_API_KEY;
                logger.info('✅ API Key loaded from process.env at runtime');
            }

            // Ensure API key is set in client headers
            this.updateClientHeaders();
            
            logger.info('🚀 Creating Delhivery shipment', {
                orderId: orderData.order_id,
                paymentMode: orderData.payment_info.payment_mode,
                hasApiKey: !!apiKeyToUse,
                apiKeyLength: apiKeyToUse?.length || 0,
                url: `${this.apiURL}/cmu/create.json`
            });

            // EXACT FORMAT AS PER DELHIVERY DOCUMENTATION:
            // The data should be sent as form-urlencoded string
            // According to docs: data: 'format=json&data={JSON_STRING}'
            const dataString = JSON.stringify(shipmentData);
            const postData = `format=json&data=${dataString}`;
            
            logger.info('📤 Sending shipment data', {
                contentType: 'application/x-www-form-urlencoded',
                bodyFormat: 'format=json&data={JSON}',
                dataSize: dataString.length,
                hasWaybill: !!shipmentData.shipments[0].waybill,
                rawBody: postData.substring(0, 100) + '...'
            });

            // EXACT format from Delhivery documentation
            // Send as form-urlencoded, not JSON
            const response = await axios.post(`${this.apiURL}/cmu/create.json`, postData, {
                headers: {
                    'Authorization': `Token ${apiKeyToUse}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'  // Form-urlencoded!
                },
                timeout: 30000
            });

            // Log the full response for debugging
            logger.info('📦 Delhivery API Response', {
                orderId: orderData.order_id,
                responseData: JSON.stringify(response.data),
                responseStatus: response.status,
                responseKeys: Object.keys(response.data || {})
            });

            // Parse Delhivery API response - they can send in ANY format
            let awbNumber = null;
            let packages = [];
            let isSuccess = false;

            // Strategy: Extract AWB from EVERY possible location in response
            // 1. Check for explicit error flag first (based on actual API test)
            if (response.data.error === true || response.data.success === false) {
                const errorMsg = response.data.rmk || response.data.message || 'Unknown error';
                logger.error('❌ Delhivery API returned error', {
                    orderId: orderData.order_id,
                    error: errorMsg,
                    responseData: response.data,
                    errorType: 'API_ERROR'
                });
                throw new Error(errorMsg);
            }

            // 2. Extract AWB from various possible locations (based on actual API test)
            if (response.data.packages && Array.isArray(response.data.packages) && response.data.packages.length > 0) {
                packages = response.data.packages;
                
                // Check if package has waybill (not empty string)
                const firstPackage = packages[0];
                if (firstPackage.waybill && firstPackage.waybill.trim() !== '') {
                    awbNumber = firstPackage.waybill;
                    isSuccess = true;
                    logger.info('✅ AWB found in packages[0].waybill', { 
                        awbNumber, 
                        packageCount: packages.length,
                        packageStatus: firstPackage.status,
                        packageRefnum: firstPackage.refnum,
                        serviceable: firstPackage.serviceable,
                        sortCode: firstPackage.sort_code
                    });
                } else {
                    // Package exists but waybill is empty (failed package)
                    logger.warn('⚠️ Package created but waybill is empty', {
                        packageStatus: firstPackage.status,
                        packageRemarks: firstPackage.remarks,
                        packageRefnum: firstPackage.refnum
                    });
                }
            } else if (response.data.pkgs && Array.isArray(response.data.pkgs) && response.data.pkgs.length > 0) {
                packages = response.data.pkgs;
                awbNumber = packages[0].waybill || packages[0].AWB || packages[0].wb || null;
                if (awbNumber) {
                    isSuccess = true;
                    logger.info('✅ AWB found in pkgs array', { awbNumber });
                }
            } else if (response.data.waybill) {
                awbNumber = response.data.waybill;
                packages = [{
                    waybill: response.data.waybill,
                    status: response.data.status || 'Success',
                    refnum: response.data.refnum || orderData.order_id,
                    label_url: response.data.label_url,
                    expected_delivery_date: response.data.expected_delivery_date
                }];
                isSuccess = true;
                logger.info('✅ AWB found in waybill field', { awbNumber });
            } else if (response.data.items && Array.isArray(response.data.items) && response.data.items.length > 0) {
                packages = response.data.items;
                awbNumber = packages[0].waybill || packages[0].AWB || packages[0].wb || null;
                if (awbNumber) {
                    isSuccess = true;
                    logger.info('✅ AWB found in items array', { awbNumber });
                }
            } else if (Array.isArray(response.data) && response.data.length > 0) {
                packages = response.data;
                awbNumber = packages[0].waybill || packages[0].AWB || packages[0].wb || null;
                if (awbNumber) {
                    isSuccess = true;
                    logger.info('✅ AWB found in root array', { awbNumber });
                }
            } else if (response.data.upload_wbn) {
                // upload_wbn is not the waybill, it's an upload reference
                logger.info('📤 Upload WBN found (not waybill)', { uploadWbn: response.data.upload_wbn });
            }

            // 3. If no AWB found in response, check if we sent a pre-fetched waybill
            if (!awbNumber && orderData.waybill) {
                awbNumber = orderData.waybill;
                isSuccess = true;
                logger.info('✅ Using pre-fetched waybill', { awbNumber });
            }

            // 4. If still no AWB, it's a failure
            if (!awbNumber) {
                logger.error('❌ No AWB number found in ANY field', {
                    orderId: orderData.order_id,
                    responseKeys: Object.keys(response.data || {}),
                    responseSample: JSON.stringify(response.data).substring(0, 200),
                    sentWaybill: orderData.waybill || 'none'
                });
                throw new Error('Delhivery API did not return AWB number. Please check API response.');
            }

            // Mark as success
            isSuccess = true;

            // Success - return response
            logger.info('✅ Shipment created successfully', {
                orderId: orderData.order_id,
                awbNumber: awbNumber,
                packagesCount: packages.length,
                responseStructure: Object.keys(response.data)
            });

            return {
                success: true,
                waybill: awbNumber,
                tracking_id: awbNumber,
                label_url: packages[0]?.label_url || packages[0]?.label || null,
                expected_delivery: packages[0]?.expected_delivery_date || null,
                packages: packages.length > 0 ? packages : [{
                    waybill: awbNumber,
                    status: 'Success',
                    refnum: orderData.order_id
                }],
                upload_wbn: response.data.upload_wbn || null,
                // Additional fields from actual API response
                serviceable: packages[0]?.serviceable || false,
                sort_code: packages[0]?.sort_code || null,
                payment_mode: packages[0]?.payment || null,
                cod_amount: packages[0]?.cod_amount || 0,
                remarks: packages[0]?.remarks || [],
                data: response.data
            };
        } catch (error) {
            logger.error('❌ Delhivery createShipment error', {
                orderId: orderData.order_id,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to create shipment'
            };
        }
    }

    /**
     * Create Multi Package Shipment (MPS)
     * @param {Object} mpsData - Multi package shipment data
     * @returns {Promise} MPS creation response
     */
    async createMPSShipment(mpsData) {
        try {
            const shipments = mpsData.packages.map((pkg, index) => ({
                order: mpsData.orderId,
                weight: pkg.weight,
                mps_amount: mpsData.payment_mode === 'COD' ? mpsData.totalAmount : 0,
                mps_children: mpsData.packages.length,
                pin: mpsData.pin,
                products_desc: pkg.productDescription,
                add: mpsData.address,
                shipment_type: 'MPS',
                state: mpsData.state,
                master_id: mpsData.masterWaybill,
                city: mpsData.city,
                waybill: pkg.waybill,
                phone: mpsData.phone,
                payment_mode: mpsData.payment_mode,
                name: mpsData.customerName,
                total_amount: mpsData.totalAmount,
                country: mpsData.country || 'India',
                shipment_width: pkg.width,
                shipment_height: pkg.height,
                shipment_length: pkg.length
            }));

            const payload = {
                pickup_location: { name: mpsData.pickupLocation },
                shipments: shipments
            };

            logger.info('🚀 Creating MPS shipment', {
                orderId: mpsData.orderId,
                packageCount: mpsData.packages.length,
                masterWaybill: mpsData.masterWaybill
            });

            const response = await this.client.post('/cmu/create.json', payload);

            logger.info('✅ MPS shipment created successfully', {
                orderId: mpsData.orderId,
                response: response.data
            });

            return {
                success: true,
                data: response.data,
                waybills: mpsData.packages.map(pkg => pkg.waybill),
                masterWaybill: mpsData.masterWaybill
            };

        } catch (error) {
            logger.error('❌ MPS shipment creation failed', {
                orderId: mpsData.orderId,
                error: error.message,
                response: error.response?.data
            });

            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Track Shipment by Waybill
     * @param {string} waybill - Waybill/AWB number
     * @returns {Promise} Tracking information
     */
    async trackShipment(waybill) {
        try {
            logger.info('📍 Tracking shipment', { waybill });

            const response = await this.client.get(`/v1/packages/json/?waybill=${waybill}`);

            if (response.data.ShipmentData && response.data.ShipmentData.length > 0) {
                const shipmentData = response.data.ShipmentData[0];
                return {
                    success: true,
                    data: {
                        AWB: shipmentData.AWB || waybill,
                        Status: shipmentData.Status || 'Unknown',
                        StatusDateTime: shipmentData.StatusDateTime || new Date().toISOString(),
                        Origin: shipmentData.Origin || '',
                        Destination: shipmentData.Destination || '',
                        Scans: shipmentData.Scans ? shipmentData.Scans.map(scan => ({
                            ScanType: scan.ScanType || scan.Scan || '',
                            ScanDateTime: scan.ScanDateTime || '',
                            ScanLocation: scan.ScanLocation || scan.ScannedLocation || '',
                            Remarks: scan.Remarks || scan.Instructions || ''
                        })) : []
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'No tracking information found for this AWB number'
                };
            }
        } catch (error) {
            logger.error('❌ Tracking failed', {
                waybill,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to track shipment'
            };
        }
    }

    /**
     * Cancel Shipment
     * @param {string} waybill - Waybill number
     * @returns {Promise} Cancellation response
     */
    async cancelShipment(waybill) {
        try {
            logger.info('🚫 Cancelling shipment', { waybill });

            const response = await this.client.post('/backend/clientwarehouse/editorders/', {
                waybill: waybill,
                cancellation: true
            });

            return {
                success: response.status === 200,
                message: response.data?.rmk || 'Shipment cancelled successfully'
            };
        } catch (error) {
            logger.error('❌ Cancellation failed', {
                waybill,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to cancel shipment'
            };
        }
    }

    /**
     * Check Pincode Serviceability
     * @param {string} pincode - Pincode to check
     * @returns {Promise} Serviceability data
     */
    async getServiceability(pincode) {
        try {
            // Use production URL directly as specified
            const productionURL = 'https://track.delhivery.com';
            const serviceabilityURL = `${productionURL}/c/api/pin-codes/json/?filter_codes=${pincode}`;
            
            logger.info('🔍 Checking serviceability with production URL', {
                pincode,
                url: serviceabilityURL,
                apiKeyLength: this.apiKey?.length || 0
            });

            // Make direct request to production URL
            const response = await axios.get(serviceabilityURL, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            logger.info('✅ Serviceability API response received', {
                pincode,
                status: response.status,
                dataKeys: Object.keys(response.data || {}),
                responseType: typeof response.data
            });

            // Check if response is HTML (error page) instead of JSON
            if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
                logger.error('❌ Serviceability API returned HTML error page', {
                    pincode,
                    responsePreview: response.data.substring(0, 200)
                });
                
                return {
                    success: false,
                    error: 'Delhivery API returned error page - serviceability endpoint may be incorrect',
                    serviceable: false
                };
            }

            // Parse response data
            if (response.data && typeof response.data === 'object') {
                if (response.data.delivery_codes && response.data.delivery_codes.length > 0) {
                    const serviceData = response.data.delivery_codes[0].postal_code;
                    
                    logger.info('✅ Serviceability data found', {
                        pincode,
                        serviceable: true,
                        city: serviceData.city,
                        state: serviceData.state_code,
                        cod: serviceData.cod
                    });

                    return {
                        success: true,
                        serviceable: true,
                        cash_on_delivery: serviceData.cod === 'Y',
                        cash_pickup: serviceData.cash === 'Y',
                        state_code: serviceData.state_code,
                        district: serviceData.district,
                        city: serviceData.city,
                        pre_paid: serviceData.pre_paid === 'Y',
                        pickup_available: serviceData.pickup === 'Y'
                    };
                } else {
                    logger.info('ℹ️ Pincode not serviceable', {
                        pincode,
                        responseData: response.data
                    });

                    return {
                        success: true,
                        serviceable: false,
                        message: 'Pincode not serviceable',
                        city: 'Not Serviceable',
                        state_code: 'Not Serviceable'
                    };
                }
            } else {
                logger.warn('⚠️ Invalid response format from serviceability API', {
                    pincode,
                    responseData: response.data,
                    responseType: typeof response.data
                });

                return {
                    success: false,
                    error: 'Invalid response format from Delhivery API',
                    serviceable: false
                };
            }

        } catch (error) {
            logger.error('❌ Serviceability check failed', {
                pincode,
                error: error.response?.data || error.message,
                status: error.response?.status,
                url: error.config?.url
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to check serviceability',
                serviceable: false
            };
        }
    }

    /**
     * Get Shipping Rates
     * @param {string} pickupPincode - Pickup pincode
     * @param {string} deliveryPincode - Delivery pincode
     * @param {number} weight - Weight in kg
     * @param {number} codAmount - COD amount
     * @returns {Promise} Rate information
     */
    async getRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
        try {
            // Use production URL directly as specified
            const productionURL = 'https://track.delhivery.com';
            const ratesURL = `${productionURL}/kinko/v1/invoice/charges/.json`;
            
            const params = {
                md: 'S',
                ss: 'Delivered',
                d_pin: deliveryPincode,
                o_pin: pickupPincode,
                cgm: weight * 1000,
                pt: codAmount > 0 ? 'COD' : 'Pre-paid',
                cod: codAmount > 0 ? 1 : 0
            };

            logger.info('💰 Getting rates from production URL', {
                pickupPincode,
                deliveryPincode,
                weight,
                codAmount,
                url: ratesURL,
                params
            });

            const response = await axios.get(ratesURL, {
                params: params,
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            logger.info('✅ Rates API response received', {
                pickupPincode,
                deliveryPincode,
                status: response.status,
                dataKeys: Object.keys(response.data || {}),
                responseType: typeof response.data
            });

            // Check if response is HTML (error page) instead of JSON
            if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
                logger.error('❌ Rates API returned HTML error page', {
                    pickupPincode,
                    deliveryPincode,
                    responsePreview: response.data.substring(0, 200)
                });
                
                return {
                    success: false,
                    error: 'Delhivery API returned error page - rates endpoint may be incorrect'
                };
            }

            if (response.data && response.data[0]) {
                const rateData = response.data[0];
                
                logger.info('✅ Rates data found', {
                    pickupPincode,
                    deliveryPincode,
                    freightCharge: rateData.freight_charge,
                    codCharge: rateData.cod_charges,
                    deliveryDays: rateData.expected_delivery_days
                });

                return {
                    success: true,
                    freight_charge: parseFloat(rateData.freight_charge || 0),
                    cod_charge: parseFloat(rateData.cod_charges || 0),
                    total_charge: parseFloat(rateData.total_amount || 0),
                    expected_delivery_days: parseInt(rateData.expected_delivery_days || 3),
                    currency: 'INR'
                };
            } else {
                logger.warn('⚠️ No rate information available', {
                    pickupPincode,
                    deliveryPincode,
                    responseData: response.data
                });

                return {
                    success: false,
                    error: 'No rate information available'
                };
            }
        } catch (error) {
            logger.error('❌ Rate calculation failed', {
                pickupPincode,
                deliveryPincode,
                error: error.response?.data || error.message,
                status: error.response?.status,
                url: error.config?.url
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get rates'
            };
        }
    }

    /**
     * Schedule Pickup
     * @param {Object} pickupData - Pickup details
     * @returns {Promise} Pickup scheduling response
     */
    async schedulePickup(pickupData) {
        try {
            // Use production URL directly as specified
            const productionURL = 'https://track.delhivery.com';
            const pickupURL = `${productionURL}/fm/request/new/`;
            
            logger.info('🚚 Scheduling pickup from Delhivery', {
                pickupURL,
                pickupLocation: pickupData.pickup_location,
                pickupDate: pickupData.pickup_date,
                pickupTime: pickupData.pickup_time,
                apiKeyLength: this.apiKey?.length || 0
            });

            // Validate API key
            let apiKeyToUse = this.apiKey || process.env.DELHIVERY_API_KEY;
            if (!apiKeyToUse || apiKeyToUse === 'your-delhivery-api-key') {
                logger.error('❌ Delhivery API Key not configured for pickup request');
                throw new Error('Delhivery API Key not configured. Please set DELHIVERY_API_KEY in environment variables.');
            }

            // Use runtime API key if instance doesn't have it
            if (!this.apiKey && process.env.DELHIVERY_API_KEY) {
                this.apiKey = process.env.DELHIVERY_API_KEY;
                logger.info('✅ API Key loaded from process.env at runtime');
            }

            const response = await axios.post(pickupURL, {
                pickup_time: pickupData.pickup_time,
                pickup_date: pickupData.pickup_date,
                pickup_location: pickupData.pickup_location,
                expected_package_count: pickupData.expected_package_count || 1
            }, {
                headers: {
                    'Authorization': `Token ${apiKeyToUse}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            logger.info('✅ Pickup scheduled successfully', {
                status: response.status,
                pickupId: response.data?.pickup_id,
                responseData: response.data
            });

            return {
                success: response.status === 200,
                pickup_id: response.data?.pickup_id,
                message: response.data?.message || 'Pickup scheduled successfully',
                data: response.data
            };
        } catch (error) {
            logger.error('❌ Pickup scheduling failed', {
                error: error.response?.data || error.message,
                status: error.response?.status,
                pickupLocation: pickupData.pickup_location
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to schedule pickup'
            };
        }
    }

    /**
     * Get Waybill from Delhivery
     * @param {number} count - Number of waybills needed
     * @returns {Promise} Waybill(s)
     */
    async getWaybill(count = 1) {
        try {
            // Fetch WayBill API format:
            // GET /waybill/api/bulk/json/?token={API_KEY}&count={count}
            // IMPORTANT: Token is sent as QUERY PARAM, not Authorization header!
            // Validate API key before making request - check both instance and process.env
            let apiKeyToUse = this.apiKey || process.env.DELHIVERY_API_KEY;
            
            if (!apiKeyToUse || apiKeyToUse === 'your-delhivery-api-key') {
                logger.error('❌ Delhivery API Key not configured', {
                    instanceApiKey: !!this.apiKey,
                    envApiKey: !!process.env.DELHIVERY_API_KEY
                });
                return {
                    success: false,
                    error: 'Delhivery API Key not configured. Please set DELHIVERY_API_KEY in environment variables.'
                };
            }
            
            // Use runtime API key if instance doesn't have it
            if (!this.apiKey && process.env.DELHIVERY_API_KEY) {
                this.apiKey = process.env.DELHIVERY_API_KEY;
                logger.info('✅ API Key loaded from process.env at runtime');
            }
            
            // Use the active API key
            apiKeyToUse = this.apiKey;

            logger.info('📋 Fetching waybill from Delhivery', {
                count: count,
                apiURL: this.apiURL,
                hasApiKey: !!this.apiKey,
                apiKeyLength: this.apiKey?.length || 0
            });
            
            // Fetch WayBill API needs different approach - token in params, not header
            // Use production URL directly: https://track.delhivery.com/waybill/api/bulk/json/
            const baseDomain = this.apiURL.includes('staging') 
                ? 'https://staging-express.delhivery.com'
                : 'https://track.delhivery.com';
            const waybillURL = `${baseDomain}/waybill/api/bulk/json/`;
            
            logger.info('📋 Waybill API Request', {
                waybillURL: waybillURL,
                usingStaging: this.apiURL.includes('staging'),
                tokenParam: apiKeyToUse ? `${apiKeyToUse.substring(0, 10)}...` : 'MISSING',
                apiKeyFromInstance: !!this.apiKey,
                apiKeyFromEnv: !!process.env.DELHIVERY_API_KEY
            });
            
            const response = await axios.get(waybillURL, {
                params: {
                    token: apiKeyToUse,  // Token as query parameter
                    count: count
                },
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            logger.info('📋 Waybill API Response', {
                status: response.status,
                dataLength: response.data?.length || 0,
                data: response.data,
                dataType: typeof response.data
            });

            // Handle different response formats:
            // 1. String: "44800710000302" -> convert to array
            // 2. Array: ["44800710000302"] -> use as is
            let waybills = [];
            
            if (typeof response.data === 'string') {
                // API returned single waybill as string
                waybills = [response.data];
                logger.info('✅ Waybill fetched (string format)', {
                    waybill: response.data
                });
            } else if (Array.isArray(response.data) && response.data.length > 0) {
                // API returned array
                waybills = response.data;
                logger.info('✅ Waybill fetched (array format)', {
                    waybillCount: response.data.length,
                    firstWaybill: response.data[0]
                });
            } else {
                logger.warn('⚠️ Waybill API returned empty response', {
                    responseData: response.data
                });
                return {
                    success: false,
                    error: 'No waybill available in response'
                };
            }
            
            return {
                success: true,
                waybills: waybills
            };
        } catch (error) {
            logger.error('❌ Waybill fetch failed', {
                error: error.response?.data || error.message,
                status: error.response?.status,
                url: error.config?.url
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get waybill',
                statusCode: error.response?.status
            };
        }
    }

    /**
     * Update Order
     * @param {string} waybill - Waybill number
     * @param {Object} updateData - Data to update
     * @returns {Promise} Update response
     */
    async updateOrder(waybill, updateData) {
        try {
            const response = await this.client.post('/backend/clientwarehouse/editorders/', {
                waybill: waybill,
                ...updateData
            });

            return {
                success: response.status === 200,
                message: response.data?.rmk || 'Order updated successfully'
            };
        } catch (error) {
            logger.error('❌ Order update failed', {
                waybill,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to update order'
            };
        }
    }

    /**
     * Get NDR Attempts
     * @param {string} waybill - Waybill number
     * @returns {Promise} NDR attempts data
     */
    async getNDRAttempts(waybill) {
        try {
            const trackingData = await this.trackShipment(waybill);

            if (trackingData.success && trackingData.data.Scans) {
                const ndrScans = trackingData.data.Scans.filter(scan =>
                    scan.ScanType.toLowerCase().includes('delivery') &&
                    !scan.ScanType.toLowerCase().includes('delivered')
                );

                return {
                    success: true,
                    attempts: ndrScans.length,
                    last_attempt_date: ndrScans.length > 0 ? ndrScans[ndrScans.length - 1].ScanDateTime : null,
                    ndr_reasons: ndrScans.map(scan => scan.Remarks),
                    next_attempt_date: this.calculateNextAttemptDate(ndrScans.length)
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to get NDR information'
                };
            }
        } catch (error) {
            logger.error('❌ NDR attempts fetch failed', {
                waybill,
                error: error.message
            });

            return {
                success: false,
                error: 'Failed to get NDR attempts'
            };
        }
    }

    /**
     * Calculate Next Attempt Date
     * @param {number} attemptCount - Current attempt count
     * @returns {string|null} Next attempt date
     */
    calculateNextAttemptDate(attemptCount) {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + (attemptCount < 3 ? 1 : 0));
        return attemptCount < 3 ? nextDay.toISOString().split('T')[0] : null;
    }

    /**
     * Initiate RTO
     * @param {string} waybill - Waybill number
     * @param {string} reason - RTO reason
     * @returns {Promise} RTO response
     */
    async initiateRTO(waybill, reason) {
        try {
            logger.info('🔄 Initiating RTO', { waybill, reason });

            const response = await this.client.post('/backend/clientwarehouse/editorders/', {
                waybill: waybill,
                return_type: 'RTO',
                return_reason: reason
            });

            return {
                success: response.status === 200,
                message: response.data?.rmk || 'RTO initiated successfully'
            };
        } catch (error) {
            logger.error('❌ RTO initiation failed', {
                waybill,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to initiate RTO'
            };
        }
    }

    /**
     * Take NDR Action (Re-Attempt or Pickup Reschedule)
     * @param {Object} ndrData - NDR action data
     * @param {string} ndrData.waybill - Waybill number
     * @param {string} ndrData.action - Action type (RE-ATTEMPT or PICKUP_RESCHEDULE)
     * @param {string} ndrData.reason - Optional reason
     * @param {string} ndrData.nslCode - Current NSL code of the shipment
     * @param {number} ndrData.attemptCount - Current attempt count
     * @returns {Promise} NDR action response with UPL ID
     */
    async takeNDRAction(ndrData) {
        try {
            const { waybill, action, reason, nslCode, attemptCount } = ndrData;

            logger.info('🎯 Taking NDR action', {
                waybill,
                action,
                reason,
                nslCode,
                attemptCount
            });

            // Validate action
            if (!['RE-ATTEMPT', 'PICKUP_RESCHEDULE'].includes(action)) {
                throw new Error('Invalid NDR action. Must be RE-ATTEMPT or PICKUP_RESCHEDULE');
            }

            // Validate attempt count
            if (attemptCount && (attemptCount < 1 || attemptCount > 2)) {
                throw new Error('Attempt count should be either 1 or 2 for NDR actions');
            }

            // Validate NSL codes based on action type
            if (action === 'RE-ATTEMPT') {
                const allowedReAttemptCodes = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];
                if (nslCode && !allowedReAttemptCodes.includes(nslCode)) {
                    throw new Error(`RE-ATTEMPT not allowed for NSL code: ${nslCode}. Allowed codes: ${allowedReAttemptCodes.join(', ')}`);
                }
            } else if (action === 'PICKUP_RESCHEDULE') {
                const allowedRescheduleCodes = ['EOD-777', 'EOD-21'];
                if (nslCode && !allowedRescheduleCodes.includes(nslCode)) {
                    throw new Error(`PICKUP_RESCHEDULE not allowed for NSL code: ${nslCode}. Allowed codes: ${allowedRescheduleCodes.join(', ')}`);
                }
            }

            // Check if it's after 9 PM (recommended time for NDR actions)
            const currentHour = new Date().getHours();
            if (currentHour < 21) {
                logger.warn('⚠️ NDR action applied before 9 PM', {
                    waybill,
                    action,
                    currentHour,
                    recommendation: 'Consider applying NDR actions after 9 PM for better results'
                });
            }

            const response = await this.client.post('/p/update', {
                data: [{
                    waybill: waybill,
                    act: action
                }]
            });

            logger.info('✅ NDR action successful', {
                waybill,
                action,
                uplId: response.data?.request_id,
                nslCode,
                attemptCount
            });

            return {
                success: true,
                request_id: response.data?.request_id, // UPL ID
                message: `${action} initiated successfully`,
                data: response.data,
                waybill: waybill,
                action: action,
                nslCode: nslCode,
                attemptCount: attemptCount
            };

        } catch (error) {
            logger.error('❌ NDR action failed', {
                waybill: ndrData.waybill,
                action: ndrData.action,
                nslCode: ndrData.nslCode,
                attemptCount: ndrData.attemptCount,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to take NDR action',
                waybill: ndrData.waybill,
                action: ndrData.action
            };
        }
    }

    /**
     * Get NDR Status by UPL ID
     * @param {string} uplId - UPL ID received from NDR action
     * @returns {Promise} NDR status
     */
    async getNDRStatus(uplId) {
        try {
            logger.info('📊 Fetching NDR status', { uplId });

            const response = await this.client.get(`/cmu/get_bulk_upl/${uplId}`, {
                params: { verbose: 'true' }
            });

            return {
                success: true,
                data: response.data,
                status: response.data?.status,
                waybills: response.data?.waybills
            };

        } catch (error) {
            logger.error('❌ NDR status fetch failed', {
                uplId,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get NDR status'
            };
        }
    }

    /**
     * Bulk NDR Action
     * @param {Object} bulkData - Bulk NDR action data
     * @param {string[]} bulkData.waybills - Array of waybill numbers
     * @param {string} bulkData.action - Action type (RE-ATTEMPT or PICKUP_RESCHEDULE)
     * @param {Array} bulkData.orders - Array of order objects for validation
     * @returns {Promise} Bulk NDR action response
     */
    async bulkNDRAction(bulkData) {
        try {
            const { waybills, action, orders } = bulkData;

            logger.info('📦 Bulk NDR action', {
                waybillCount: waybills.length,
                action
            });

            // Validate action
            if (!['RE-ATTEMPT', 'PICKUP_RESCHEDULE'].includes(action)) {
                throw new Error('Invalid NDR action. Must be RE-ATTEMPT or PICKUP_RESCHEDULE');
            }

            // Validate each order if provided
            if (orders && orders.length > 0) {
                const allowedReAttemptCodes = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];
                const allowedRescheduleCodes = ['EOD-777', 'EOD-21'];

                for (const order of orders) {
                    const nslCode = order.ndr_info?.nsl_code;
                    const attemptCount = order.ndr_info?.ndr_attempts;

                    // Validate attempt count
                    if (attemptCount && (attemptCount < 1 || attemptCount > 2)) {
                        throw new Error(`Attempt count should be either 1 or 2 for waybill: ${order.delhivery_data?.waybill}`);
                    }

                    // Validate NSL codes based on action type
                    if (action === 'RE-ATTEMPT' && nslCode && !allowedReAttemptCodes.includes(nslCode)) {
                        throw new Error(`RE-ATTEMPT not allowed for waybill: ${order.delhivery_data?.waybill} with NSL code: ${nslCode}`);
                    } else if (action === 'PICKUP_RESCHEDULE' && nslCode && !allowedRescheduleCodes.includes(nslCode)) {
                        throw new Error(`PICKUP_RESCHEDULE not allowed for waybill: ${order.delhivery_data?.waybill} with NSL code: ${nslCode}`);
                    }
                }
            }

            // Check if it's after 9 PM (recommended time for NDR actions)
            const currentHour = new Date().getHours();
            if (currentHour < 21) {
                logger.warn('⚠️ Bulk NDR action applied before 9 PM', {
                    waybillCount: waybills.length,
                    action,
                    currentHour,
                    recommendation: 'Consider applying NDR actions after 9 PM for better results'
                });
            }

            const data = waybills.map(waybill => ({
                waybill: waybill,
                act: action
            }));

            const response = await this.client.post('/p/update', { data });

            logger.info('✅ Bulk NDR action successful', {
                waybillCount: waybills.length,
                uplId: response.data?.request_id,
                action
            });

            return {
                success: true,
                request_id: response.data?.request_id,
                processed_count: waybills.length,
                message: `Bulk ${action} initiated for ${waybills.length} shipments`,
                data: response.data,
                waybills: waybills,
                action: action
            };

        } catch (error) {
            logger.error('❌ Bulk NDR action failed', {
                waybillCount: bulkData.waybills?.length,
                action: bulkData.action,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to execute bulk NDR action',
                waybills: bulkData.waybills,
                action: bulkData.action
            };
        }
    }

    /**
     * Create/Register Warehouse with Delhivery
     * @param {Object} warehouseData - Warehouse details
     * @returns {Promise} Warehouse creation response
     */
    async createWarehouse(warehouseData) {
        try {
            logger.info('🏭 Creating warehouse in Delhivery', {
                name: warehouseData.name,
                pincode: warehouseData.pin,
                method: 'POST', // CORRECTED: POST not PUT
                endpoint: 'https://track.delhivery.com/api/backend/clientwarehouse/create/'
            });

            // Validate API key
            let apiKeyToUse = this.apiKey || process.env.DELHIVERY_API_KEY;
            if (!apiKeyToUse || apiKeyToUse === 'your-delhivery-api-key') {
                logger.error('❌ Delhivery API Key not configured for warehouse creation');
                throw new Error('Delhivery API Key not configured. Please set DELHIVERY_API_KEY in environment variables.');
            }

            // Use runtime API key if instance doesn't have it
            if (!this.apiKey && process.env.DELHIVERY_API_KEY) {
                this.apiKey = process.env.DELHIVERY_API_KEY;
                logger.info('✅ API Key loaded from process.env at runtime');
            }

            // CORRECT METHOD DISCOVERED THROUGH TESTING:
            // Method: POST (NOT PUT as per documentation!)
            // URL: https://track.delhivery.com/api/backend/clientwarehouse/create/
            // Content-Type: application/json
            // Data: JSON object
            const warehouseURL = 'https://track.delhivery.com/api/backend/clientwarehouse/create/';
            const response = await axios.post(warehouseURL, warehouseData, {
                headers: {
                    'Authorization': `Token ${apiKeyToUse}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            // Enhanced success validation
            const isSuccess = response.status >= 200 && response.status < 300;
            const hasValidData = response.data && (
                response.data.data || 
                response.data.success === true || 
                response.data.status === 'success' ||
                response.data.message?.toLowerCase().includes('success')
            );

            logger.info('✅ Warehouse creation response received', {
                name: warehouseData.name,
                responseStatus: response.status,
                responseData: response.data,
                isSuccess,
                hasValidData,
                finalSuccess: isSuccess && hasValidData
            });

            if (isSuccess && hasValidData) {
                return {
                    success: true,
                    data: response.data,
                    message: 'Warehouse registered successfully',
                    delhivery_warehouse_id: response.data.data?.name || response.data.name
                };
            } else {
                logger.warn('⚠️ Delhivery API returned success status but invalid data', {
                    name: warehouseData.name,
                    status: response.status,
                    data: response.data
                });
                
                return {
                    success: false,
                    error: 'Delhivery API returned invalid response data',
                    response_data: response.data
                };
            }

        } catch (error) {
            logger.error('❌ Warehouse creation failed', {
                name: warehouseData.name,
                error: error.response?.data || error.message,
                status: error.response?.status
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to create warehouse'
            };
        }
    }

    /**
     * Validate API Key
     * @returns {boolean} Validation status
     */
    /**
     * Validate API key and configuration
     * @returns {boolean} True if API key is valid
     */
    validateApiKey() {
        if (!this.apiKey || this.apiKey === 'your-delhivery-api-key') {
            logger.error('❌ Delhivery API Key not configured');
            return false;
        }
        
        if (this.apiKey.length < 20) {
            logger.error('❌ Delhivery API Key appears to be invalid (too short)', {
                apiKeyLength: this.apiKey.length,
                apiKeyPreview: this.apiKey.substring(0, 10) + '...'
            });
            return false;
        }
        
        logger.info('✅ Delhivery API Key validation passed', {
            apiKeyLength: this.apiKey.length,
            apiKeyPreview: this.apiKey.substring(0, 10) + '...',
            apiURL: this.apiURL
        });
        
        return true;
    }

    /**
     * Test API connectivity and authentication
     * @returns {Promise<Object>} Test result
     */
    async testApiConnection() {
        try {
            logger.info('🧪 Testing Delhivery API connection', {
                apiURL: this.apiURL,
                hasApiKey: !!this.apiKey
            });

            // Test with a dummy waybill to check API connectivity
            const testWaybill = 'TEST123456789';
            const response = await this.client.get('/v1/packages/json/', {
                params: {
                    waybill: testWaybill
                },
                timeout: 10000 // 10 second timeout
            });

            logger.info('✅ Delhivery API connection test successful', {
                status: response.status,
                statusText: response.statusText,
                responseType: typeof response.data
            });

            return {
                success: true,
                message: 'API connection successful',
                status: response.status,
                apiURL: this.apiURL
            };
        } catch (error) {
            logger.error('❌ Delhivery API connection test failed', {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                apiURL: this.apiURL
            });

            return {
                success: false,
                message: 'API connection failed',
                error: error.message,
                status: error.response?.status,
                apiURL: this.apiURL
            };
        }
    }

    /**
     * Track Shipment
     * @param {string} waybill - Waybill number to track
     * @param {string} refIds - Reference IDs (optional)
     * @returns {Promise} Tracking response
     */
    /**
     * Track Shipment with retry mechanism
     * @param {string} waybill - Waybill number to track
     * @param {string} refIds - Reference IDs (optional)
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @returns {Promise} Tracking response
     */
    async trackShipment(waybill, refIds = '', maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info('🔍 Tracking shipment attempt', {
                    waybill: waybill,
                    attempt: attempt,
                    maxRetries: maxRetries
                });

                // Use the correct Delhivery tracking endpoint
                const response = await this.client.get('/v1/packages/json/', {
                params: {
                    waybill: waybill,
                    ref_ids: refIds
                }
            });

                // Check if response is HTML (error page) instead of JSON
                if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
                    logger.error('❌ Delhivery API returned HTML error page', {
                        waybill: waybill,
                        attempt: attempt,
                        responseType: typeof response.data,
                        responseLength: response.data.length,
                        responsePreview: response.data.substring(0, 200)
                    });
                    
                    // Don't retry HTML error pages - they indicate endpoint issues
                    return {
                        success: false,
                        error: 'Delhivery API returned error page - waybill may not exist or API endpoint issue',
                        waybill: waybill,
                        errorType: 'HTML_ERROR_PAGE',
                        attempts: attempt
                    };
                }

                // Validate response data structure
                if (!response.data || typeof response.data !== 'object') {
                    logger.error('❌ Invalid tracking response format', {
                        waybill: waybill,
                        attempt: attempt,
                        responseData: response.data,
                        responseType: typeof response.data
                    });
                    
                    // Retry for invalid response format
                    if (attempt < maxRetries) {
                        await this.delay(1000 * attempt); // Exponential backoff
                        continue;
                    }
                    
                    return {
                        success: false,
                        error: 'Invalid response format from Delhivery API',
                        waybill: waybill,
                        errorType: 'INVALID_RESPONSE_FORMAT',
                        attempts: attempt
                    };
                }

                logger.info('✅ Tracking successful', {
                    waybill: waybill,
                    attempt: attempt,
                    responseKeys: Object.keys(response.data)
                });

            return {
                success: true,
                data: response.data,
                    waybill: waybill,
                    attempts: attempt
            };
        } catch (error) {
                lastError = error;
                
                // Enhanced error logging
                const errorDetails = {
                waybill: waybill,
                    attempt: attempt,
                    maxRetries: maxRetries,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                    responseData: error.response?.data,
                    errorMessage: error.message
                };

                logger.error('❌ Shipment tracking failed', errorDetails);

                // Determine error type and provide appropriate message
                let errorMessage = 'Failed to track shipment';
                let errorType = 'UNKNOWN_ERROR';
                let shouldRetry = false;

                if (error.response?.status === 404) {
                    errorMessage = 'Waybill not found - shipment may not exist or may have been purged';
                    errorType = 'WAYBILL_NOT_FOUND';
                    shouldRetry = false; // Don't retry 404 errors
                } else if (error.response?.status === 401) {
                    errorMessage = 'Authentication failed - check API key';
                    errorType = 'AUTHENTICATION_ERROR';
                    shouldRetry = false; // Don't retry auth errors
                } else if (error.response?.status === 403) {
                    errorMessage = 'Access forbidden - insufficient permissions';
                    errorType = 'PERMISSION_ERROR';
                    shouldRetry = false; // Don't retry permission errors
                } else if (error.response?.status >= 500) {
                    errorMessage = 'Delhivery server error - try again later';
                    errorType = 'SERVER_ERROR';
                    shouldRetry = true; // Retry server errors
                } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                    errorMessage = 'Network timeout - connection reset';
                    errorType = 'NETWORK_ERROR';
                    shouldRetry = true; // Retry network errors
                } else {
                    shouldRetry = true; // Retry other errors
                }

                // If this is the last attempt or we shouldn't retry, return error
                if (attempt === maxRetries || !shouldRetry) {
                    return {
                        success: false,
                        error: errorMessage,
                        waybill: waybill,
                        errorType: errorType,
                        statusCode: error.response?.status,
                        attempts: attempt
                    };
                }

                // Wait before retrying (exponential backoff)
                const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, etc.
                logger.info('⏳ Retrying tracking request', {
                    waybill: waybill,
                    attempt: attempt,
                    nextAttempt: attempt + 1,
                    delayMs: delayMs
                });
                
                await this.delay(delayMs);
            }
        }

        // This should never be reached, but just in case
            return {
                success: false,
            error: 'Max retries exceeded',
            waybill: waybill,
            errorType: 'MAX_RETRIES_EXCEEDED',
            attempts: maxRetries
        };
    }

    /**
     * Utility method for delays
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculate Shipping Cost
     * @param {Object} costData - Shipping cost calculation parameters
     * @returns {Promise} Shipping cost response
     */
    async calculateShippingCost(costData) {
        try {
            const params = {
                md: costData.billing_mode || 'S', // E for Express, S for Surface
                ss: costData.shipment_status || 'Delivered',
                d_pin: costData.destination_pincode,
                o_pin: costData.origin_pincode,
                cgm: costData.chargeable_weight, // in grams
                pt: costData.payment_type || 'Pre-paid'
            };

            const response = await this.client.get('/kinko/v1/invoice/charges/.json', {
                params: params
            });

            return {
                success: true,
                data: response.data,
                calculated_cost: response.data.total_amount || 0
            };
        } catch (error) {
            logger.error('❌ Shipping cost calculation failed', {
                error: error.response?.data || error.message,
                params: costData
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to calculate shipping cost'
            };
        }
    }

    /**
     * Get Service Health Status
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            service: 'Delhivery API',
            status: this.validateApiKey() ? 'configured' : 'not_configured',
            environment: this.isProduction ? 'production' : 'staging',
            base_url: this.apiURL,
            api_key_present: !!this.apiKey
        };
    }
}

module.exports = new DelhiveryService();