const axios = require('axios');
const crypto = require('crypto');

class DelhiveryService {
    constructor() {
        this.baseURL = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';
        this.apiKey = process.env.DELHIVERY_API_KEY;
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

    generateWaybill() {
        return `SHIP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }

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
                    shipping_mode: 'Surface',
                    address_type: 'home'
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

            const response = await this.client.post('/cmu/create.json', shipmentData);

            if (response.data.success) {
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
            console.error('Delhivery createShipment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to create shipment'
            };
        }
    }

    async trackShipment(waybill) {
        try {
            const response = await this.client.get(`/v1/packages/json/?waybill=${waybill}`);

            if (response.data.ShipmentData && response.data.ShipmentData.length > 0) {
                const shipment = response.data.ShipmentData[0].Shipment;
                return {
                    success: true,
                    waybill: waybill,
                    status: shipment.Status.Status,
                    current_location: shipment.Status.Instructions || '',
                    expected_delivery: shipment.ExpectedDeliveryDate,
                    scans: shipment.Scans.map(scan => ({
                        date: scan.ScanDateTime,
                        location: scan.ScannedLocation,
                        status: scan.Scan,
                        instructions: scan.Instructions || ''
                    })),
                    delivery_details: {
                        delivered_date: shipment.Status.StatusDateTime,
                        delivered_to: shipment.Status.ReceivedBy || '',
                        is_delivered: shipment.Status.Status === 'Delivered'
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'No tracking information found'
                };
            }
        } catch (error) {
            console.error('Delhivery trackShipment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to track shipment'
            };
        }
    }

    async cancelShipment(waybill) {
        try {
            const response = await this.client.post('/api/backend/clientwarehouse/editorders/', {
                waybill: waybill,
                cancellation: true
            });

            return {
                success: response.status === 200,
                message: response.data?.rmk || 'Shipment cancelled successfully'
            };
        } catch (error) {
            console.error('Delhivery cancelShipment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to cancel shipment'
            };
        }
    }

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
            console.error('Delhivery getServiceability error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to check serviceability'
            };
        }
    }

    async getRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
        try {
            const response = await this.client.get('/api/kinko/v1/invoice/charges/.json', {
                params: {
                    md: 'S', // Mode: Surface
                    ss: 'Delivered', // Service: Delivered
                    d_pin: deliveryPincode,
                    o_pin: pickupPincode,
                    cgm: weight * 1000, // Convert kg to grams
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
            console.error('Delhivery getRates error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get rates'
            };
        }
    }

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
            console.error('Delhivery schedulePickup error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to schedule pickup'
            };
        }
    }

    async getWaybill() {
        try {
            const response = await this.client.get('/waybill/api/bulk/json/?count=1');

            if (response.data && response.data.length > 0) {
                return {
                    success: true,
                    waybill: response.data[0]
                };
            } else {
                return {
                    success: false,
                    error: 'No waybill available'
                };
            }
        } catch (error) {
            console.error('Delhivery getWaybill error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Failed to get waybill'
            };
        }
    }

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
            console.error('Delhivery updateOrder error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to update order'
            };
        }
    }

    async getNDRAttempts(waybill) {
        try {
            const trackingData = await this.trackShipment(waybill);

            if (trackingData.success && trackingData.scans) {
                const ndrScans = trackingData.scans.filter(scan =>
                    scan.status.toLowerCase().includes('delivery') &&
                    !scan.status.toLowerCase().includes('delivered')
                );

                return {
                    success: true,
                    attempts: ndrScans.length,
                    last_attempt_date: ndrScans.length > 0 ? ndrScans[ndrScans.length - 1].date : null,
                    ndr_reasons: ndrScans.map(scan => scan.instructions),
                    next_attempt_date: this.calculateNextAttemptDate(ndrScans.length)
                };
            } else {
                return {
                    success: false,
                    error: 'Failed to get NDR information'
                };
            }
        } catch (error) {
            console.error('Delhivery getNDRAttempts error:', error);
            return {
                success: false,
                error: 'Failed to get NDR attempts'
            };
        }
    }

    calculateNextAttemptDate(attemptCount) {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + (attemptCount < 3 ? 1 : 0));
        return attemptCount < 3 ? nextDay.toISOString().split('T')[0] : null;
    }

    async initiateRTO(waybill, reason) {
        try {
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
            console.error('Delhivery initiateRTO error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.rmk || error.message || 'Failed to initiate RTO'
            };
        }
    }

    validateApiKey() {
        return !!this.apiKey && this.apiKey !== 'your-delhivery-api-key';
    }

    getHealthStatus() {
        return {
            service: 'Delhivery API',
            status: this.validateApiKey() ? 'configured' : 'not_configured',
            base_url: this.baseURL,
            api_key_present: !!this.apiKey
        };
    }
}

module.exports = new DelhiveryService();