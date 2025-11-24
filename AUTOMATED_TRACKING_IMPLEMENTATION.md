# Automated Order Tracking Implementation

## Overview
This document describes the implementation of an automated tracking system that monitors orders whose pickup requests have been created. The system uses a cron job to periodically check the status of these orders via the Delhivery Tracking API and automatically updates their status.

## Key Components

### 1. TrackingOrder Model (`backend/models/TrackingOrder.js`)
A new MongoDB model that stores AWB numbers of orders whose pickup request has been created.

**Key Features:**
- Stores AWB numbers, order references, and pickup request information
- Tracks current status and status history from Delhivery API
- Automatically stops tracking once orders are delivered
- Maintains tracking metadata (tracking count, failures, etc.)

**Key Fields:**
- `awb_number`: The AWB/Waybill number for tracking
- `pickup_request_id`: ID of the pickup request
- `current_status`: Current order status (mapped from Delhivery status)
- `api_status`: Raw status from Delhivery API (Status.Status field)
- `is_tracking_active`: Whether tracking is active
- `is_delivered`: Whether order has been delivered (stops tracking)
- `status_history`: Complete history of status changes from API
- `last_tracked_at`: Timestamp of last tracking check

### 2. Updated Tracking Service (`backend/services/trackingService.js`)
Enhanced tracking service that:
- Only tracks orders with pickup requests created
- Extracts status from Delhivery API response (handles `Status.Status` format)
- Automatically stops tracking once delivered
- Updates both TrackingOrder and main Order models
- Handles various status formats (Delivered, In Transit, Out For Delivery, RTO, Cancelled, NDR, etc.)

**Key Methods:**
- `trackAllShipments()`: Gets all active tracking orders and tracks them
- `trackSingleTrackingOrder()`: Tracks a single order and updates status
- `extractStatusFromResponse()`: Extracts status from various API response formats
- `mapDelhiveryStatus()`: Maps Delhivery status to internal status
- `isStatusDelivered()`, `isStatusCancelled()`, `isStatusRTO()`: Status checkers

### 3. Cron Job Configuration
The cron job runs **every 3 hours** (configurable) and:
- Queries `TrackingOrder` collection for active orders (pickup request created, not delivered)
- Calls Delhivery Tracking API for each AWB number
- Extracts status from API response
- Updates order status if changed
- Stops tracking once delivered

**Cron Schedule:** `0 */3 * * *` (every 3 hours at minute 0)

### 4. Integration with Order Creation
When a pickup request is created (`POST /api/orders/:id/request-pickup`):
- Order is updated with pickup request information
- A `TrackingOrder` document is automatically created
- This order will now be tracked by the cron job

## API Response Format Handling

The system handles the Delhivery Tracking API response format:
```
{
  "ShipmentData": [{
    "Status": {
      "Status": "Delivered/Cancelled/IN Transit/Out FOR DELIVERY",
      "StatusType": "...",
      "StatusDateTime": "...",
      "StatusLocation": "...",
      "Instructions": "...",
      "NSLCode": "...",
      "SortCode": "..."
    },
    ...
  }]
}
```

**Status Extraction:**
- Primary: `ShipmentData[0].Status.Status`
- Fallback: `Status.Status` or `Status` (if string)
- All status values are normalized and mapped to internal statuses

## Status Mapping

| Delhivery Status | Internal Status | Action |
|-----------------|----------------|--------|
| Delivered | `delivered` | Stop tracking, mark as delivered |
| In Transit / IN TRANSIT | `in_transit` | Continue tracking |
| Out For Delivery / OUT FOR DELIVERY | `out_for_delivery` | Continue tracking |
| RTO | `rto` | Stop tracking, mark as RTO |
| Cancelled / Canceled | `cancelled` | Stop tracking, mark as cancelled |
| NDR | `ndr` | Continue tracking |
| Pickup / Manifest | `pickups_manifests` | Continue tracking |

## Testing Script

A test script (`backend/test-tracking-awb-numbers.js`) has been created to:
- Test tracking API with actual AWB numbers
- Extract all possible field values from API responses
- Generate a comprehensive report of all fields and status values
- Save results to `backend/logs/tracking-test-results-{timestamp}.json`

**Usage:**
```bash
cd backend
node test-tracking-awb-numbers.js
```

**AWB Numbers Tested:**
- 44800710001492
- 44800710001643
- 44800710001632
- 44800710001982

## Database Schema

### TrackingOrder Collection
```javascript
{
  order_id: String (unique, indexed),
  user_id: ObjectId (indexed),
  awb_number: String (unique, indexed),
  pickup_request_id: String (indexed),
  current_status: String (enum, indexed),
  api_status: String,
  is_tracking_active: Boolean (indexed),
  is_delivered: Boolean (indexed),
  status_history: [{
    status: String,
    status_date_time: Date,
    status_location: String,
    ...
  }],
  last_tracked_at: Date (indexed),
  ...
}
```

## Workflow

1. **Pickup Request Created:**
   - User creates pickup request via API
   - `TrackingOrder` document is created automatically
   - Order status set to `pickups_manifests`

2. **Cron Job Execution (Every 3 hours):**
   - Query all `TrackingOrder` documents where:
     - `is_tracking_active = true`
     - `is_delivered = false`
     - `pickup_request_id` exists
   - For each order:
     - Call Delhivery Tracking API with AWB number
     - Extract status from response
     - Update `TrackingOrder` status if changed
     - Add to status history
     - If delivered: Stop tracking, update Order model

3. **Status Updates:**
   - Status changes are saved to `status_history`
   - Main `Order` model is also updated
   - Tracking stops automatically when delivered

## Configuration

**Environment Variables:**
- `DELHIVERY_API_KEY`: Required for tracking API calls

**Cron Schedule:**
- Default: Every 3 hours (`0 */3 * * *`)
- Timezone: Asia/Kolkata
- Can be modified in `trackingService.js` `startTracking()` method

## Monitoring

The tracking service logs:
- Number of orders tracked
- Success/failure counts
- Status updates
- Errors and failures

**Log Locations:**
- Console output
- Log files in `backend/logs/`

## Future Enhancements

1. **Real-time Tracking:**
   - WebSocket updates when status changes
   - Push notifications for status updates

2. **Status Classification:**
   - Automatic categorization: In Transit, Pickup and Manifests, Delivered, Cancelled, RTO, NDR
   - Dashboard views by category

3. **Retry Logic:**
   - Exponential backoff for failed API calls
   - Automatic retry for transient errors

4. **Analytics:**
   - Tracking success rates
   - Average delivery times
   - Status distribution

## Files Modified/Created

1. **Created:**
   - `backend/models/TrackingOrder.js` - New model for tracking orders
   - `backend/test-tracking-awb-numbers.js` - Test script for API

2. **Modified:**
   - `backend/services/trackingService.js` - Enhanced tracking logic
   - `backend/routes/orders.js` - Added TrackingOrder creation on pickup request

## Testing

To test the implementation:

1. **Test Tracking API:**
   ```bash
   cd backend
   node test-tracking-awb-numbers.js
   ```

2. **Verify Cron Job:**
   - Check logs for cron job execution
   - Verify TrackingOrder documents are created
   - Check status updates in database

3. **Manual Tracking:**
   - Create a pickup request for an order
   - Verify TrackingOrder is created
   - Wait for cron job or manually trigger tracking

## Notes

- The cron job only tracks orders with pickup requests created
- Tracking automatically stops once order is delivered
- Status history is maintained for all status changes
- Both TrackingOrder and Order models are kept in sync
- The system handles various status formats from Delhivery API

