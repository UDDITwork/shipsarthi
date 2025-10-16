# Delhivery API Integration Guide

## Overview

This document outlines the integration of Shipsarthi platform with Delhivery's B2C logistics API. The integration provides comprehensive shipping functionality including shipment creation, tracking, NDR management, and COD handling.

## Prerequisites

1. **Delhivery API Key**: Obtain your API key from Delhivery partner portal
2. **Environment Variables**: Configure the following in your `.env` file:
   ```
   DELHIVERY_API_URL=https://track.delhivery.com/api
   DELHIVERY_API_KEY=your-delhivery-api-key
   ```

## API Endpoints

### Shipping Management

#### 1. Create Shipment
- **Endpoint**: `POST /api/shipping/create-shipment`
- **Auth**: Required
- **Description**: Creates a new shipment with Delhivery

**Request Body:**
```json
{
  "order_id": "ORD123456",
  "customer_info": {
    "buyer_name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com"
  },
  "delivery_address": {
    "full_address": "123 Main St, Apartment 4B",
    "pincode": "110001",
    "city": "New Delhi",
    "state": "Delhi"
  },
  "products": [
    {
      "product_name": "T-Shirt",
      "quantity": 2,
      "price": 500,
      "hsn_code": "6109"
    }
  ],
  "package_info": {
    "weight": 0.5,
    "dimensions": {
      "length": 20,
      "width": 15,
      "height": 5
    }
  },
  "payment_info": {
    "payment_mode": "cod",
    "cod_amount": 1000,
    "order_value": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "waybill": "SHIP1234567890",
    "tracking_id": "SHIP1234567890",
    "label_url": "https://track.delhivery.com/label/SHIP1234567890",
    "expected_delivery": "2024-01-15"
  }
}
```

#### 2. Track Shipment
- **Endpoint**: `GET /api/shipping/track/:waybill`
- **Auth**: Required
- **Description**: Get real-time tracking information

**Response:**
```json
{
  "success": true,
  "data": {
    "waybill": "SHIP1234567890",
    "status": "In Transit",
    "current_location": "Delhi Hub",
    "expected_delivery": "2024-01-15",
    "scans": [
      {
        "date": "2024-01-10T10:30:00Z",
        "location": "Origin Hub",
        "status": "Picked Up",
        "instructions": "Package picked up from sender"
      }
    ],
    "delivery_details": {
      "delivered_date": null,
      "delivered_to": "",
      "is_delivered": false
    }
  }
}
```

#### 3. Cancel Shipment
- **Endpoint**: `POST /api/shipping/cancel/:waybill`
- **Auth**: Required
- **Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

#### 4. Check Serviceability
- **Endpoint**: `GET /api/shipping/serviceability/:pincode`
- **Auth**: Required
- **Description**: Check if delivery is available to a pincode

**Response:**
```json
{
  "success": true,
  "data": {
    "serviceable": true,
    "cash_on_delivery": true,
    "cash_pickup": true,
    "state_code": "DL",
    "district": "New Delhi",
    "city": "New Delhi",
    "pre_paid": true,
    "pickup_available": true
  }
}
```

#### 5. Get Shipping Rates
- **Endpoint**: `POST /api/shipping/rates`
- **Auth**: Required
- **Request Body:**
```json
{
  "pickup_pincode": "110001",
  "delivery_pincode": "400001",
  "weight": 0.5,
  "cod_amount": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "freight_charge": 45.0,
    "cod_charge": 25.0,
    "total_charge": 70.0,
    "expected_delivery_days": 3,
    "currency": "INR"
  }
}
```

#### 6. Schedule Pickup
- **Endpoint**: `POST /api/shipping/schedule-pickup`
- **Auth**: Required
- **Request Body:**
```json
{
  "pickup_date": "2024-01-12",
  "pickup_time": "14:00",
  "package_count": 5
}
```

### Webhook Endpoints

#### 1. Status Update Webhook
- **Endpoint**: `POST /api/webhooks/delhivery/status-update`
- **Auth**: None (webhook)
- **Description**: Receives status updates from Delhivery

**Request Body:**
```json
{
  "waybill": "SHIP1234567890",
  "status": "Delivered",
  "expected_delivery": "2024-01-15",
  "scans": [
    {
      "date": "2024-01-15T15:30:00Z",
      "location": "Customer Location",
      "status": "Delivered",
      "comment": "Package delivered to customer",
      "delivered_to": "John Doe"
    }
  ]
}
```

#### 2. COD Remittance Webhook
- **Endpoint**: `POST /api/webhooks/delhivery/cod-remittance`
- **Auth**: None (webhook)
- **Description**: Receives COD remittance information

**Request Body:**
```json
{
  "waybill": "SHIP1234567890",
  "cod_amount": 1000,
  "remittance_date": "2024-01-16",
  "utr_number": "UTR123456789"
}
```

## Service Features

### DelhiveryService Class

The `DelhiveryService` class provides the following methods:

1. **createShipment(orderData)**: Creates a new shipment
2. **trackShipment(waybill)**: Tracks shipment status
3. **cancelShipment(waybill)**: Cancels a shipment
4. **getServiceability(pincode)**: Checks pincode serviceability
5. **getRates(pickup, delivery, weight, cod)**: Gets shipping rates
6. **schedulePickup(pickupData)**: Schedules pickup
7. **getWaybill()**: Gets a new waybill number
8. **getNDRAttempts(waybill)**: Gets NDR attempt information
9. **initiateRTO(waybill, reason)**: Initiates return to origin

### Status Mapping

The system maps Delhivery statuses to internal order statuses:

| Delhivery Status | Internal Status |
|------------------|-----------------|
| Shipped | in_transit |
| In Transit | in_transit |
| Out for Delivery | out_for_delivery |
| Delivered | delivered |
| Undelivered | ndr |
| Customer not available | ndr |
| RTO | rto |
| Cancelled | cancelled |

### NDR Handling

The system automatically creates NDR (Non-Delivery Report) records when:
- Delivery attempts fail
- Customer is not available
- Address is incomplete
- Customer refuses delivery

NDR features:
- Automatic retry attempts (up to 3)
- Escalation levels (L1, L2)
- Customer communication tracking
- RTO eligibility after 3 failed attempts

## Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Environment Configuration

Ensure these environment variables are properly configured:

```bash
# Delhivery Configuration
DELHIVERY_API_URL=https://track.delhivery.com/api
DELHIVERY_API_KEY=your-actual-api-key-here

# Enable in production for webhook security
DELHIVERY_WEBHOOK_SECRET=your-webhook-secret
```

## Testing

### API Health Check
```bash
GET /api/shipping/health
```

### Test Serviceability
```bash
curl -X GET "http://localhost:5000/api/shipping/serviceability/110001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Rate Calculation
```bash
curl -X POST "http://localhost:5000/api/shipping/rates" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_pincode": "110001",
    "delivery_pincode": "400001",
    "weight": 0.5,
    "cod_amount": 1000
  }'
```

## Production Deployment

1. **API Key Configuration**: Use production Delhivery API keys
2. **Webhook URLs**: Configure webhook URLs in Delhivery portal
3. **SSL Certificates**: Ensure HTTPS for webhook endpoints
4. **Rate Limiting**: Monitor API usage and respect rate limits
5. **Error Monitoring**: Set up logging for Delhivery API errors

## Support and Troubleshooting

### Common Issues

1. **API Key Not Configured**
   - Error: "Delhivery API not configured"
   - Solution: Set `DELHIVERY_API_KEY` in environment variables

2. **Invalid Pincode**
   - Error: "Pincode not serviceable"
   - Solution: Verify pincode with serviceability endpoint

3. **Weight Validation**
   - Error: "Valid weight is required"
   - Solution: Ensure weight is provided in kilograms (minimum 0.1 kg)

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=delhivery:*
```

This will log all API requests and responses for troubleshooting.

## API Rate Limits

Delhivery enforces the following rate limits:
- 1000 requests per hour for tracking APIs
- 500 requests per hour for shipment creation
- Monitor usage and implement appropriate caching strategies

For support, contact the development team or refer to Delhivery's official API documentation.