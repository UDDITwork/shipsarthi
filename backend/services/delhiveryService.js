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
                pickup_location: pickupData.pickup_location,
                pickup_time: pickupData.pickup_time,
                pickup_date: pickupData.pickup_date,
                expected_package_count: pickupData.package_count || 1,
                pickup_type: 'Forward'
            });

            return {
                success: response.status === 200,
                pickup_id: response.data?.pickup_id,
                message: response.data?.message || 'Pickup scheduled successfully'
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
     * @returns {Promise} NDR action response with UPL ID
     */
    async takeNDRAction(ndrData) {
        try {
            const { waybill, action, reason } = ndrData;

            logger.info('🎯 Taking NDR action', {
                waybill,
                action,
                reason
            });

            // Validate action
            if (!['RE-ATTEMPT', 'PICKUP_RESCHEDULE'].includes(action)) {
                throw new Error('Invalid NDR action. Must be RE-ATTEMPT or PICKUP_RESCHEDULE');
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
                uplId: response.data?.request_id
            });

            return {
                success: true,
                request_id: response.data?.request_id, // UPL ID
                message: `${action} initiated successfully`,
                data: response.data
            };

        } catch (error) {
            logger.error('❌ NDR action failed', {
                waybill: ndrData.waybill,
                action: ndrData.action,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to take NDR action'
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
     * @returns {Promise} Bulk NDR action response
     */
    async bulkNDRAction(bulkData) {
        try {
            const { waybills, action } = bulkData;

            logger.info('📦 Bulk NDR action', {
                waybillCount: waybills.length,
                action
            });

            const data = waybills.map(waybill => ({
                waybill: waybill,
                act: action
            }));

            const response = await this.client.post('/api/p/update', { data });

            logger.info('✅ Bulk NDR action successful', {
                waybillCount: waybills.length,
                uplId: response.data?.request_id
            });

            return {
                success: true,
                request_id: response.data?.request_id,
                processed_count: waybills.length,
                message: `Bulk ${action} initiated for ${waybills.length} shipments`,
                data: response.data
            };

        } catch (error) {
            logger.error('❌ Bulk NDR action failed', {
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to execute bulk NDR action'
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
     * Create Pickup Request
     * @param {Object} orderData - Order data for pickup request
     * @param {Object} warehouseData - Warehouse information
     * @returns {Promise} Pickup request creation response
     */
    async createPickupRequest(orderData, warehouseData) {
        try {
            // Get current date and time for pickup
            const now = new Date();
            const pickupDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const pickupTime = '11:00:00'; // Default pickup time

            const pickupRequestData = {
                pickup_time: pickupTime,
                pickup_date: pickupDate,
                pickup_location: warehouseData.name || warehouseData.warehouse_name,
                expected_package_count: 1
            };

            logger.info('🚚 Creating pickup request', {
                orderId: orderData.order_id,
                pickupLocation: pickupRequestData.pickup_location,
                pickupDate: pickupRequestData.pickup_date,
                pickupTime: pickupRequestData.pickup_time
            });

            const response = await this.client.post('/fm/request/new/', pickupRequestData);

            if (response.status === 200) {
                logger.info('✅ Pickup request created successfully', {
                    orderId: orderData.order_id,
                    pickupId: response.data?.pickup_id,
                    response: response.data
                });

                return {
                    success: true,
                    pickup_id: response.data?.pickup_id || response.data?.pickupId,
                    pickup_date: pickupRequestData.pickup_date,
                    pickup_time: pickupRequestData.pickup_time,
                    pickup_location: pickupRequestData.pickup_location,
                    message: response.data?.message || 'Pickup request created successfully',
                    data: response.data
                };
            } else {
                throw new Error(response.data?.message || 'Failed to create pickup request');
            }
        } catch (error) {
            logger.error('❌ Pickup request creation failed', {
                orderId: orderData.order_id,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to create pickup request'
            };
        }
    }

    /**
     * Get Pickup Status
     * @param {string} pickupId - Pickup request ID
     * @returns {Promise} Pickup status
     */
    async getPickupStatus(pickupId) {
        try {
            logger.info('📦 Fetching pickup status', { pickupId });

            const response = await this.client.get(`/fm/request/get/${pickupId}`);

            return {
                success: true,
                data: response.data,
                status: response.data?.status,
                pickup_date: response.data?.pickup_date,
                pickup_time: response.data?.pickup_time
            };

        } catch (error) {
            logger.error('❌ Pickup status fetch failed', {
                pickupId,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get pickup status'
            };
        }
    }

    /**
     * Cancel Pickup Request
     * @param {string} pickupId - Pickup request ID
     * @returns {Promise} Cancellation response
     */
    async cancelPickupRequest(pickupId) {
        try {
            logger.info('🚫 Cancelling pickup request', { pickupId });

            const response = await this.client.post(`/fm/request/cancel/${pickupId}`);

            return {
                success: response.status === 200,
                message: response.data?.message || 'Pickup request cancelled successfully'
            };

        } catch (error) {
            logger.error('❌ Pickup cancellation failed', {
                pickupId,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to cancel pickup request'
            };
        }
    }

    /**
     * Get Shipment Label
     * @param {string} waybill - Waybill number
     * @returns {Promise} Label data
     */
    async getShipmentLabel(waybill) {
        try {
            logger.info('🏷️ Fetching shipment label', { waybill });

            const response = await this.client.get(`/api/p/packing_slip`, {
                params: { waybill: waybill }
            });

            return {
                success: true,
                label_url: response.data?.label_url,
                label_data: response.data,
                data: response.data
            };

        } catch (error) {
            logger.error('❌ Label fetch failed', {
                waybill,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get shipment label'
            };
        }
    }

    /**
     * Get Delivery Performance
     * @param {string} dateFrom - Start date (YYYY-MM-DD)
     * @param {string} dateTo - End date (YYYY-MM-DD)
     * @returns {Promise} Performance data
     */
    async getDeliveryPerformance(dateFrom, dateTo) {
        try {
            logger.info('📊 Fetching delivery performance', { dateFrom, dateTo });

            const response = await this.client.get('/api/p/performance', {
                params: {
                    from_date: dateFrom,
                    to_date: dateTo
                }
            });

            return {
                success: true,
                data: response.data,
                performance_metrics: response.data
            };

        } catch (error) {
            logger.error('❌ Performance fetch failed', {
                dateFrom,
                dateTo,
                error: error.response?.data || error.message
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get delivery performance'
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