# Delhivery Webhook Integration Guide

## Overview

This document describes the Delhivery B2C webhook integration for ShipSarthi platform. The integration enables real-time shipment tracking updates and document delivery from Delhivery.

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Delhivery Webhook Configuration
DELHIVERY_WEBHOOK_API_KEY=your_secure_api_key_here
DELHIVERY_WEBHOOK_SECRET=your_secure_secret_token_here
DELHIVERY_WEBHOOK_ENABLE_IP_WHITELIST=true

# Delhivery API Credentials (for outgoing requests)
DELHIVERY_API_KEY=your_delhivery_api_key
DELHIVERY_CLIENT_ID=your_delhivery_client_id

# Cloudinary Configuration (for image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Webhook Endpoints

### Base URLs

- **Development**: `https://api-dev.shipsarthi.com/api/webhooks/v1/delhivery/`
- **Production**: `https://api.shipsarthi.com/api/webhooks/v1/delhivery/`

### 1. Scan Push Webhook (Status Updates)

**Endpoint**: `POST /api/webhooks/v1/delhivery/scan-status`

**Purpose**: Receive real-time shipment status updates from Delhivery

**Headers Required**:
```
X-API-Key: {DELHIVERY_WEBHOOK_API_KEY}
Authorization: Bearer {DELHIVERY_WEBHOOK_SECRET}
Content-Type: application/json
```

**Expected Payload**:
```json
{
    "Shipment": {
        "Status": {
            "Status": "Manifested",
            "StatusDateTime": "2019-01-09T17:10:42.767",
            "StatusType": "UD",
            "StatusLocation": "Chandigarh_Raiprkln_C (Chandigarh)",
            "Instructions": "Manifest uploaded"
        },
        "PickUpDate": "2019-01-09 17:10:42.543",
        "NSLCode": "X-UCI",
        "Sortcode": "IXC/MDP",
        "ReferenceNo": "28",
        "AWB": "XXXXXXXXXXXX"
    }
}
```

**Response**:
```json
{
    "status": "success",
    "message": "Webhook received"
}
```

**Status Mapping**:
- `Manifested` → `pickups_manifests`
- `In Transit` → `in_transit`
- `Out for Delivery` → `out_for_delivery`
- `Delivered` → `delivered`
- `Undelivered` → `ndr`
- `RTO` → `rto`
- `Lost` → `lost`
- `Cancelled` → `cancelled`

### 2. EPOD Webhook (Electronic Proof of Delivery)

**Endpoint**: `POST /api/webhooks/v1/delhivery/epod`

**Purpose**: Receive delivery proof images when shipment is delivered

**Expected Payload**:
```json
{
    "waybill": "1234567890",
    "EPOD": "base64_encoded_image_string",
    "orderID": "order_reference_id"
}
```

**Response**:
```json
{
    "status": "success",
    "message": "EPOD received"
}
```

### 3. Sorter Image Webhook

**Endpoint**: `POST /api/webhooks/v1/delhivery/sorter-image`

**Purpose**: Receive warehouse sorting images

**Expected Payload**:
```json
{
    "Waybill": "1234567890",
    "Weight_images": "base64_encoded_image_url",
    "doc": ""
}
```

**Response**:
```json
{
    "status": "success",
    "message": "Sorter image received"
}
```

### 4. QC Image Webhook (Quality Check Images)

**Endpoint**: `POST /api/webhooks/v1/delhivery/qc-image`

**Purpose**: Receive quality check images from Delhivery warehouse

**Expected Payload**:
```json
{
    "waybillId": "1234567890",
    "returnId": "order_id",
    "Image": "base64_encoded_image_string"
}
```

**Response**:
```json
{
    "status": "success",
    "message": "QC image received"
}
```

## IP Whitelisting

### Development IPs
- 18.136.12.154
- 13.250.167.49
- 52.220.126.238
- 3.108.106.65
- 3.109.19.228
- 3.7.116.186
- 3.6.106.39

### Production IPs
- 13.229.195.68
- 18.139.238.62
- 52.76.70.1
- 3.108.106.65
- 13.127.20.101
- 13.126.12.240
- 35.154.161.83
- 3.6.106.39
- 18.61.175.16

## Database Models

### ShipmentTrackingEvent

Stores all scan push webhook events:

```javascript
{
  waybill: String (indexed),
  order_id: String (indexed),
  reference_no: String (indexed),
  status: String,
  status_type: String,
  status_date_time: Date (indexed),
  status_location: String,
  instructions: String,
  nsl_code: String,
  sort_code: String,
  pickup_date: Date,
  raw_payload: Object,
  processed: Boolean,
  order_ref: ObjectId (reference to Order)
}
```

### ShipmentDocument

Stores EPOD, sorter images, and QC images:

```javascript
{
  waybill: String (indexed),
  order_id: String (indexed),
  return_id: String (indexed),
  document_type: Enum ['epod', 'sorter_image', 'qc_image', 'other'],
  image_url: String,
  image_path: String,
  cloudinary_public_id: String,
  base64_data: String,
  file_size: Number,
  mime_type: String,
  processed: Boolean,
  order_ref: ObjectId (reference to Order)
}
```

## Testing Webhooks Locally

### Using curl

#### Scan Push Webhook
```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/scan-status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -H "Authorization: Bearer your_secret_token" \
  -d '{
    "Shipment": {
        "Status": {
            "Status": "Manifested",
            "StatusDateTime": "2024-01-09T17:10:42.767",
            "StatusType": "UD",
            "StatusLocation": "Mumbai",
            "Instructions": "Manifest uploaded"
        },
        "PickUpDate": "2024-01-09 17:10:42.543",
        "NSLCode": "X-UCI",
        "Sortcode": "IXC/MDP",
        "ReferenceNo": "ORDER123",
        "AWB": "1234567890"
    }
}'
```

#### EPOD Webhook
```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/epod \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -H "Authorization: Bearer your_secret_token" \
  -d '{
    "waybill": "1234567890",
    "EPOD": "base64_encoded_image_data",
    "orderID": "ORDER123"
}'
```

### Using Postman

1. Set method to `POST`
2. Add headers:
   - `X-API-Key`: Your webhook API key
   - `Authorization`: `Bearer {your_secret_token}`
   - `Content-Type`: `application/json`
3. Add payload in Body → raw → JSON
4. Send request

## Performance Requirements

- **Response Time**: < 300ms (target), < 500ms (maximum)
- **Throughput**: Must handle multiple webhooks per second
- **Reliability**: Always return 200 OK to prevent Delhivery retries

## Security Features

1. **API Key Authentication**: Validates `X-API-Key` header
2. **Bearer Token**: Validates `Authorization: Bearer {token}` header
3. **IP Whitelisting**: Optionally validates request IP addresses
4. **Duplicate Prevention**: Prevents processing same event twice
5. **Error Handling**: Returns 200 OK even on errors (prevents retries)

## Monitoring and Logging

All webhook requests are logged with:
- Request timestamp
- Client IP address
- Waybill/AWB number
- Processing duration
- Success/failure status
- Error details (if any)

Logs are stored in:
- `backend/logs/app-{date}.log` - General logs
- `backend/logs/error-{date}.log` - Error logs only

## Deployment Checklist

- [ ] Set `DELHIVERY_WEBHOOK_API_KEY` in production environment
- [ ] Set `DELHIVERY_WEBHOOK_SECRET` in production environment
- [ ] Configure Cloudinary credentials for image storage
- [ ] Test all 4 webhook endpoints in production
- [ ] Verify IP whitelisting is working (optional)
- [ ] Monitor logs for first 24 hours after deployment
- [ ] Set up alerts for webhook failures
- [ ] Configure Delhivery dashboard with webhook URLs

## Webhook Registration with Delhivery

Register these endpoints in your Delhivery dashboard:

1. Log in to Delhivery Dashboard
2. Go to Settings → Webhooks
3. Add webhook URLs:
   - Scan Push: `https://api.shipsarthi.com/api/webhooks/v1/delhivery/scan-status`
   - EPOD: `https://api.shipsarthi.com/api/webhooks/v1/delhivery/epod`
   - Sorter Image: `https://api.shipsarthi.com/api/webhooks/v1/delhivery/sorter-image`
   - QC Image: `https://api.shipsarthi.com/api/webhooks/v1/delhivery/qc-image`
4. Provide API key and secret token to Delhivery support
5. Verify webhook is active

## Troubleshooting

### Webhook not receiving data
1. Check API key and secret token in Delhivery dashboard
2. Verify IP whitelisting (if enabled)
3. Check server logs for authentication errors
4. Test webhook endpoint manually with curl

### Images not uploading
1. Verify Cloudinary credentials
2. Check image base64 encoding
3. Verify file size limits
4. Check Cloudinary upload logs

### Order status not updating
1. Verify order exists with matching waybill/reference
2. Check status mapping in `webhookService.js`
3. Review database logs for save errors
4. Check WebSocket connection (for real-time updates)

## Support

For issues or questions:
- Contact: Narayan Mundhra
- Email: hello@shipsarthi.com
- Phone: +91-9636369672

