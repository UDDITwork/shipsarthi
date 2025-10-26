# Delhivery Webhook Testing Guide

## Quick Test Commands

### 1. Test Scan Push Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/scan-status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123" \
  -H "Authorization: Bearer test_secret_token_123" \
  -d '{
    "Shipment": {
        "Status": {
            "Status": "Manifested",
            "StatusDateTime": "2024-01-15T10:30:00.000",
            "StatusType": "UD",
            "StatusLocation": "Mumbai",
            "Instructions": "Manifest uploaded"
        },
        "PickUpDate": "2024-01-15 10:30:00.000",
        "NSLCode": "X-UCI",
        "Sortcode": "IXC/MDP",
        "ReferenceNo": "TEST123",
        "AWB": "TEST1234567890"
    }
}'
```

### 2. Test Different Status Updates

#### Out for Delivery
```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/scan-status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123" \
  -H "Authorization: Bearer test_secret_token_123" \
  -d '{
    "Shipment": {
        "Status": {
            "Status": "Out for Delivery",
            "StatusDateTime": "2024-01-15T14:30:00.000",
            "StatusType": "OD",
            "StatusLocation": "Delhi",
            "Instructions": "Out for delivery"
        },
        "AWB": "TEST1234567890",
        "ReferenceNo": "TEST123"
    }
}'
```

#### Delivered
```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/scan-status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123" \
  -H "Authorization: Bearer test_secret_token_123" \
  -d '{
    "Shipment": {
        "Status": {
            "Status": "Delivered",
            "StatusDateTime": "2024-01-15T16:30:00.000",
            "StatusType": "DL",
            "StatusLocation": "Delhi",
            "Instructions": "Delivered successfully"
        },
        "AWB": "TEST1234567890",
        "ReferenceNo": "TEST123"
    }
}'
```

### 3. Test EPOD Webhook

**Note**: You'll need a base64 encoded image. Use a small test image.

```bash
# First, encode an image to base64
base64 -i test_image.jpg > image_base64.txt

# Then use it in the webhook
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/epod \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123" \
  -H "Authorization: Bearer test_secret_token_123" \
  -d "{
    \"waybill\": \"TEST1234567890\",
    \"EPOD\": \"$(cat image_base64.txt)\",
    \"orderID\": \"TEST123\"
}"
```

### 4. Test Sorter Image Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/sorter-image \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123" \
  -H "Authorization: Bearer test_secret_token_123" \
  -d "{
    \"Waybill\": \"TEST1234567890\",
    \"Weight_images\": \"$(cat image_base64.txt)\",
    \"doc\": \"\"
}"
```

### 5. Test QC Image Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks/v1/delhivery/qc-image \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test_api_key_123" \
  -H "Authorization: Bearer test_secret_token_123" \
  -d "{
    \"waybillId\": \"TEST1234567890\",
    \"returnId\": \"TEST123\",
    \"Image\": \"$(cat image_base64.txt)\"
}"
```

## Testing Checklist

### Authentication Tests
- [ ] Test with valid API key and secret token
- [ ] Test with missing API key (should return 401)
- [ ] Test with invalid API key (should return 401)
- [ ] Test with missing Bearer token (should return 401)
- [ ] Test with invalid Bearer token (should return 401)

### Scan Push Webhook Tests
- [ ] Test with valid payload
- [ ] Test with missing AWB (should handle gracefully)
- [ ] Test with missing Shipment.Status (should handle gracefully)
- [ ] Test duplicate event (should be ignored)
- [ ] Test status mapping for all status types
- [ ] Verify order status is updated in database
- [ ] Verify tracking event is saved
- [ ] Verify WebSocket notification is sent

### EPOD Webhook Tests
- [ ] Test with valid base64 image
- [ ] Test with invalid base64 (should handle gracefully)
- [ ] Test with missing waybill (should return error)
- [ ] Test with missing EPOD (should return error)
- [ ] Verify image is uploaded to Cloudinary
- [ ] Verify document is saved in database
- [ ] Verify order EPOD URL is updated
- [ ] Verify WebSocket notification is sent

### Sorter Image Webhook Tests
- [ ] Test with valid payload
- [ ] Verify image is uploaded to Cloudinary
- [ ] Verify document is saved in database
- [ ] Verify order package_info is updated

### QC Image Webhook Tests
- [ ] Test with valid payload
- [ ] Verify image is uploaded to Cloudinary
- [ ] Verify document is saved in database

### Performance Tests
- [ ] Test response time (< 300ms)
- [ ] Test concurrent webhook requests
- [ ] Test high volume webhook requests

### Database Tests
- [ ] Verify ShipmentTrackingEvent collection is created
- [ ] Verify ShipmentDocument collection is created
- [ ] Verify indexes are created properly
- [ ] Test query performance with indexes

## Environment Setup for Testing

1. **Set Environment Variables**:
```bash
export DELHIVERY_WEBHOOK_API_KEY=test_api_key_123
export DELHIVERY_WEBHOOK_SECRET=test_secret_token_123
export DELHIVERY_WEBHOOK_ENABLE_IP_WHITELIST=false
export CLOUDINARY_CLOUDANT_NAME=test_cloud
export CLOUDINARY_API_KEY=test_key
export CLOUDINARY_API_SECRET=test_secret
```

2. **Start MongoDB** (if running locally)

3. **Start Server**:
```bash
cd backend
npm run dev
```

4. **Check Logs**:
```bash
tail -f backend/logs/app-$(date +%Y-%m-%d).log
```

## Expected Database Records

### After Scan Push Webhook:
```javascript
// ShipmentTrackingEvent collection
{
  waybill: "TEST1234567890",
  order_id: "TEST123",
  status: "Manifested",
  status_date_time: ISODate("2024-01-15T10:30:00.000Z"),
  processed: true
}

// Order collection (if order exists)
{
  order_id: "TEST123",
  status: "pickups_manifests",
  status_history: [{
    status: "pickups_manifests",
    timestamp: ISODate("2024-01-15T10:30:00.000Z"),
    location: "Mumbai"
  }]
}
```

### After EPOD Webhook:
```javascript
// ShipmentDocument collection
{
  waybill: "TEST1234567890",
  order_id: "TEST123",
  document_type: "epod",
  image_url: "https://res.cloudinary.com/...",
  processed: true
}

// Order collection
{
  order_id: "TEST123",
  delivery_info: {
    epod_url: "https://res.cloudinary.com/...",
    epod_date: ISODate("2024-01-15T16:30:00.000Z")
  }
}
```

## Debugging Tips

1. **Check Logs**: All webhook requests are logged with timestamps and details
2. **Verify Environment Variables**: Make sure all required env vars are set
3. **Test Authentication**: Use Postman or curl to test authentication separately
4. **Check Database**: Verify records are being created in MongoDB
5. **Monitor Performance**: Check response times in logs
6. **Test WebSocket**: Open browser console and connect to WebSocket to see real-time updates

## Common Issues and Solutions

### Issue: 401 Unauthorized
**Solution**: Check API key and secret token in environment variables

### Issue: Images not uploading
**Solution**: 
- Verify Cloudinary credentials
- Check base64 encoding is correct
- Verify image size is within limits

### Issue: Order status not updating
**Solution**:
- Verify order exists with matching waybill/reference
- Check logs for errors
- Verify order_id format matches

### Issue: Duplicate events
**Solution**: System automatically prevents duplicates by checking waybill + status + timestamp

### Issue: Slow response time
**Solution**:
- Check database indexes
- Monitor Cloudinary upload speed
- Check server resources

## Production Testing

Before going live:

1. Test all endpoints with production credentials
2. Verify IP whitelisting is working
3. Test with real Delhivery webhook payloads
4. Monitor logs for 24 hours
5. Set up alerts for failures
6. Document any issues encountered

