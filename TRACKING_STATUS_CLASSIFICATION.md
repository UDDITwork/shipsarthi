# Tracking Status Classification Guide

## Overview
This document describes how orders are classified based on their tracking status from the Delhivery API. Orders are automatically categorized into sections based on their current status, and tracking stops once orders reach final statuses.

## API Response Structure

The Delhivery Tracking API returns status in this structure:
```json
{
  "ShipmentData": [{
    "Shipment": {
      "Status": {
        "Status": "Delivered" | "Pending" | "In Transit" | "Dispatched" | "Manifested",
        "StatusType": "DL" | "UD" | etc.,
        "StatusLocation": "Location name",
        "StatusDateTime": "2025-11-16T17:27:10.002",
        "Instructions": "Status description"
      }
    }
  }]
}
```

**Primary Status Path:** `ShipmentData[0].Shipment.Status.Status`

## Status Values Found in API Responses

Based on actual API test results, these are the status values returned:

1. **"Delivered"** - Order has been delivered to consignee
2. **"Pending"** - Order is pending at destination facility
3. **"In Transit"** - Order is in transit (from Scans array)
4. **"Dispatched"** - Order is out for delivery (from Scans array)
5. **"Manifested"** - Order has been manifested (from Scans array)

## Status Mapping to Internal Status

| Delhivery API Status | Internal Status | Category | Stop Tracking? |
|---------------------|----------------|----------|----------------|
| Delivered | `delivered` | DELIVERED | ✅ Yes |
| Pending | `in_transit` | IN_TRANSIT | ❌ No |
| In Transit | `in_transit` | IN_TRANSIT | ❌ No |
| Dispatched | `out_for_delivery` | IN_TRANSIT | ❌ No |
| Manifested | `pickups_manifests` | PICKUPS_AND_MANIFESTS | ❌ No |
| RTO | `rto` | RTO | ✅ Yes |
| Cancelled | `cancelled` | CANCELLED | ✅ Yes |
| Lost | `lost` | LOST | ✅ Yes |
| NDR | `ndr` | NDR | ❌ No |

## Frontend Categories

Orders are displayed in these sections based on their status:

1. **NEW** - Orders with status `new`
2. **READY_TO_SHIP** - Orders with status `ready_to_ship`
3. **PICKUPS_AND_MANIFESTS** - Orders with status `pickups_manifests`
4. **IN_TRANSIT** - Orders with status `in_transit` or `out_for_delivery`
5. **DELIVERED** - Orders with status `delivered` (final - no more tracking)
6. **NDR** - Orders with status `ndr`
7. **RTO** - Orders with status `rto` (final - no more tracking)
8. **CANCELLED** - Orders with status `cancelled` (final - no more tracking)
9. **LOST** - Orders with status `lost` (final - no more tracking)

## Tracking Behavior

### Orders That Continue Tracking
- `pickups_manifests` - Pickup requested, waiting for pickup
- `in_transit` - Order is moving through the system
- `out_for_delivery` - Order is out for delivery
- `ndr` - Non-delivery report (may need reattempt)

### Orders That Stop Tracking (Final Statuses)
- `delivered` - Order delivered successfully
- `cancelled` - Order cancelled
- `rto` - Return to Origin
- `lost` - Order lost

Once an order reaches a final status, the cron job will **NOT** track it anymore.

## Status Extraction Logic

The tracking service extracts status in this priority order:

1. **Primary:** `ShipmentData[0].Shipment.Status.Status` ✅ (Main status field)
2. **Fallback:** `ShipmentData[0].Status.Status`
3. **Fallback:** `Status.Status` (root level)

## Status Update Flow

```
1. Cron job runs (every 3 hours)
   ↓
2. Query TrackingOrder collection
   - is_tracking_active = true
   - is_delivered = false
   - pickup_request_id exists
   ↓
3. Call Delhivery Tracking API
   ↓
4. Extract Status.Status from response
   ↓
5. Map to internal status
   ↓
6. Update TrackingOrder and Order models
   ↓
7. If final status (delivered/cancelled/rto/lost):
   - Set is_tracking_active = false
   - Stop future tracking
   ↓
8. Frontend polls status and displays in appropriate category
```

## Database Fields

### TrackingOrder Model
- `current_status` - Internal status (delivered, in_transit, etc.)
- `api_status` - Raw status from API ("Delivered", "Pending", etc.)
- `is_tracking_active` - Whether cron job should track this order
- `is_delivered` - Whether order is delivered (stops tracking)

### Order Model
- `status` - Current order status (synced with TrackingOrder)
- `delivered_date` - Date when delivered (if delivered)

## Frontend Polling

Frontend should:
1. Poll order status from backend API
2. Classify orders based on `status` field
3. Display in appropriate category section
4. Show status updates in real-time

## Example Status Transitions

```
Order Created
  ↓
pickups_manifests (Pickup requested)
  ↓
in_transit (Order picked up, moving)
  ↓
out_for_delivery (Out for delivery)
  ↓
delivered ✅ (STOPS TRACKING)
```

Or:

```
Order Created
  ↓
pickups_manifests
  ↓
in_transit
  ↓
rto ✅ (STOPS TRACKING)
```

## Notes

- Status is extracted from `ShipmentData[0].Shipment.Status.Status` field
- The `Scans` array contains detailed tracking history but the main status is in `Status.Status`
- Once delivered, cancelled, RTO, or lost - tracking automatically stops
- Frontend can poll status and classify orders into sections dynamically

