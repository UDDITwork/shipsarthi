// Location: backend/services/delhiveryService.js
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DelhiveryService {
    constructor() {
        this.baseURL = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';
        this.stagingURL = 'https://staging-express.delhivery.com/api';
        this.apiKey = process.env.DELHIVERY_API_KEY;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.apiURL = this.isProduction ? this.baseURL : this.stagingURL;
        
        this.client = axios.create({
            baseURL: this.apiURL,
            headers: {
                'Authorization': `Token ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000
        });
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
                    payment_mode: orderData.payment_info.payment_mode,
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
                    total_amount: orderData.payment_info.order_value,
                    seller_add: orderData.pickup_address?.full_address || '',
                    seller_name: orderData.seller_info?.name || '',
                    seller_inv: orderData.invoice_number || '',
                    quantity: orderData.products.reduce((sum, p) => sum + p.quantity, 0),
                    waybill: this.generateWaybill(),
                    shipment_width: orderData.package_info.dimensions.width,
                    shipment_height: orderData.package_info.dimensions.height,
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

            logger.info('🚀 Creating Delhivery shipment', {
                orderId: orderData.order_id,
                paymentMode: orderData.payment_info.payment_mode
            });

            const response = await this.client.post('/cmu/create.json', shipmentData);

            if (response.data.success) {
                logger.info('✅ Shipment created successfully', {
                    orderId: orderData.order_id,
                    waybill: shipmentData.shipments[0].waybill
                });

                return {
                    success: true,
                    waybill: shipmentData.shipments[0].waybill,
                    tracking_id: response.data.packages?.[0]?.waybill || shipmentData.shipments[0].waybill,
                    label_url: response.data.packages?.[0]?.label_url,
                    expected_delivery: response.data.packages?.[0]?.expected_delivery_date,
                    data: response.data
                };
            } else {
                throw new Error(response.data.rmk || 'Failed to create shipment');
            }
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

            const response = await this.client.post('/api/backend/clientwarehouse/editorders/', {
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
            const response = await this.client.get(`/c/api/pin-codes/json/?filter_codes=${pincode}`);

            if (response.data.delivery_codes && response.data.delivery_codes.length > 0) {
                const serviceData = response.data.delivery_codes[0];
                return {
                    success: true,
                    serviceable: true,
                    cash_on_delivery: serviceData.cash_on_delivery === 'Y',
                    cash_pickup: serviceData.cash_pickup === 'Y',
                    state_code: serviceData.state_code,
                    district: serviceData.district,
                    city: serviceData.city,
                    pre_paid: serviceData.pre_paid === 'Y',
                    pickup_available: serviceData.pickup === 'Y'
                };
            } else {
                return {
                    success: true,
                    serviceable: false,
                    message: 'Pincode not serviceable'
                };
            }
        } catch (error) {
            logger.error('❌ Serviceability check failed', {
                pincode,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to check serviceability'
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
            const response = await this.client.get('/api/kinko/v1/invoice/charges/.json', {
                params: {
                    md: 'S',
                    ss: 'Delivered',
                    d_pin: deliveryPincode,
                    o_pin: pickupPincode,
                    cgm: weight * 1000,
                    pt: codAmount > 0 ? 'COD' : 'Pre-paid',
                    cod: codAmount > 0 ? 1 : 0
                }
            });

            if (response.data && response.data[0]) {
                const rateData = response.data[0];
                return {
                    success: true,
                    freight_charge: parseFloat(rateData.freight_charge || 0),
                    cod_charge: parseFloat(rateData.cod_charges || 0),
                    total_charge: parseFloat(rateData.total_amount || 0),
                    expected_delivery_days: parseInt(rateData.expected_delivery_days || 0),
                    currency: 'INR'
                };
            } else {
                return {
                    success: false,
                    error: 'No rate information available'
                };
            }
        } catch (error) {
            logger.error('❌ Rate calculation failed', {
                pickupPincode,
                deliveryPincode,
                error: error.response?.data || error.message
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
            const response = await this.client.post('/fm/request/new/', {
                pickup_time: pickupData.pickup_time,
                pickup_date: pickupData.pickup_date,
                pickup_location: pickupData.pickup_location,
                expected_package_count: pickupData.expected_package_count || 1
            });

            return {
                success: response.status === 200,
                pickup_id: response.data?.pickup_id,
                message: response.data?.message || 'Pickup scheduled successfully',
                data: response.data
            };
        } catch (error) {
            logger.error('❌ Pickup scheduling failed', {
                error: error.response?.data || error.message
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
            const response = await this.client.get(`/waybill/api/bulk/json/?count=${count}`);

            if (response.data && response.data.length > 0) {
                return {
                    success: true,
                    waybills: response.data
                };
            } else {
                return {
                    success: false,
                    error: 'No waybill available'
                };
            }
        } catch (error) {
            logger.error('❌ Waybill fetch failed', {
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get waybill'
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
            const response = await this.client.post('/api/backend/clientwarehouse/editorders/', {
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

            const response = await this.client.post('/api/backend/clientwarehouse/editorders/', {
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

            const response = await this.client.post('/api/p/update', {
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

            const response = await this.client.get(`/api/cmu/get_bulk_upl/${uplId}`, {
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

            const response = await this.client.post('/api/p/update', { data });

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
                pincode: warehouseData.pin
            });

            const response = await this.client.post('/api/backend/clientwarehouse/create/', warehouseData);

            logger.info('✅ Warehouse created successfully', {
                name: warehouseData.name,
                response: response.data
            });

            return {
                success: true,
                data: response.data,
                message: 'Warehouse registered successfully'
            };

        } catch (error) {
            logger.error('❌ Warehouse creation failed', {
                name: warehouseData.name,
                error: error.response?.data || error.message
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
    validateApiKey() {
        return !!this.apiKey && this.apiKey !== 'your-delhivery-api-key';
    }

    /**
     * Track Shipment
     * @param {string} waybill - Waybill number to track
     * @param {string} refIds - Reference IDs (optional)
     * @returns {Promise} Tracking response
     */
    async trackShipment(waybill, refIds = '') {
        try {
            const response = await this.client.get('/api/v1/packages/json/', {
                params: {
                    waybill: waybill,
                    ref_ids: refIds
                }
            });

            return {
                success: true,
                data: response.data,
                waybill: waybill
            };
        } catch (error) {
            logger.error('❌ Shipment tracking failed', {
                waybill: waybill,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to track shipment',
                waybill: waybill
            };
        }
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

            const response = await this.client.get('/api/kinko/v1/invoice/charges/.json', {
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