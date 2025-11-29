# Order Status Flow Debug Guide

## Complete Flow Check

### 1. Backend Flow (Cron Job)
```
Cron Job (every 5 min)
  ↓
trackAllShipments()
  ↓
trackSingleTrackingOrder(trackingOrder)
  ↓
Call Delhivery API → Get Status
  ↓
Update TrackingOrder.current_status
  ↓
updateOrderStatus(orderId, status) → Update Order.status
  ↓
Order model saved with new status
```

### 2. Frontend Flow
```
User clicks "Delivered" tab
  ↓
activeTab = 'delivered'
  ↓
fetchOrders() called
  ↓
orderFilters.status = 'delivered'
  ↓
GET /api/orders?status=delivered
  ↓
Backend queries: Order.find({ status: 'delivered' })
  ↓
Returns orders with status='delivered'
  ↓
Frontend displays in "Delivered" tab
```

## Test Script

**Location:** `backend/test-order-status-flow.js`

**Command:**
```bash
node backend/test-order-status-flow.js
```

**Run from:** `/project/root` (SHIPSARTHI directory)

This script will:
1. Check TrackingOrder for AWB 44800710001982
2. Check Order model by order_id
3. Compare statuses
4. Simulate frontend query
5. Show exactly where the problem is

## Common Issues & Fixes

### Issue 1: Order Not Found
**Symptom:** `updateOrderStatus` logs "Order not found"
**Fix:** Check if order_id matches between TrackingOrder and Order

### Issue 2: Status Not Updating
**Symptom:** Order.status stays old even after cron runs
**Fix:** Check logs for `updateOrderStatus` - should see "Order status updated"

### Issue 3: Statuses Match But Order Not Showing
**Symptom:** Both have correct status but frontend doesn't show
**Fix:** 
- Clear frontend cache
- Check date filters (might be filtering out old orders)
- Check user_id matches

## Quick Fix Commands

### Fix Single Order
```bash
node backend/scripts/sync-order-by-awb.js 44800710001982
```

### Force Refresh All Orders
Click "Sync Order" button in frontend (calls `/api/orders/force-refresh`)

### Manual Database Update
```javascript
// In MongoDB shell or script
db.orders.updateOne(
  { "delhivery_data.waybill": "44800710001982" },
  { $set: { status: "delivered" } }
);
```

## Debug Checklist

- [ ] TrackingOrder exists for AWB
- [ ] TrackingOrder.current_status is correct
- [ ] Order model exists with matching order_id
- [ ] Order.status matches TrackingOrder.current_status
- [ ] Frontend query includes correct status filter
- [ ] No date filters excluding the order
- [ ] Cache cleared in frontend
- [ ] Backend logs show updateOrderStatus being called
- [ ] Backend logs show Order.save() succeeding

