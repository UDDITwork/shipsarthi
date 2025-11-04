# Order Creation Workflow - Implementation Tracking

## Implementation Checklist

### Phase 1: Shipping Charges Calculation (Before Save) ✅ COMPLETED
- [x] Update `OrderCreationModal.tsx` to calculate shipping charges using Delhivery zone API
- [x] Call `delhiveryService.getZoneFromDelhivery()` to get zone from pincodes
- [x] Extract ONLY zone (A, B, C, D, E, F) from Delhivery response
- [x] Calculate shipping charges from `rateCardService.calculateShippingCharges(zone, weight, userCategory)`
- [x] Display calculated shipping charges in UI before save
- [x] Store shipping charges in `formData.payment_info.shipping_charges`

### Phase 2: "Save" Button Implementation ✅ COMPLETED
- [x] Ensure `handleSave()` calls `handleOrderSubmission(false)` (generate_awb=false)
- [x] Backend: Wallet deduction happens in `POST /api/orders` route (already implemented)
- [x] Verify order saved with status: 'new'
- [x] Verify order appears in "NEW" tab
- [x] Verify "Generate AWB Number" button appears in Action column

### Phase 3: "Generate AWB Number" Button (NEW Tab) ✅ VERIFIED
- [x] Verify existing `handleGenerateAWB()` function works
- [x] Calls `POST /api/orders/:id/generate-awb` (already exists)
- [x] After AWB generated, order status changes to 'ready_to_ship'
- [x] Order moves to "READY TO SHIP" tab
- [x] "Request Pickup" button appears in READY TO SHIP tab

### Phase 4: "Ready to Ship" Button (NEW Tab) ⚠️ NOT REQUIRED
- [ ] Add "Ready to Ship" button in Orders.tsx (after Generate AWB button)
- [ ] Create `handleReadyToShip()` function
- [ ] Call backend endpoint to create shipment (may need to create new endpoint)
- [ ] After shipment created, order stays in "READY TO SHIP" tab
- [ ] Verify order has AWB before allowing "Ready to Ship"
- **NOTE:** This phase is not needed - "Generate AWB Number" already creates the shipment via Delhivery API

### Phase 5: "Request Pickup" Button Enhancement (READY TO SHIP Tab) ✅ COMPLETED
- [x] Update `PickupRequestModal.tsx` to add date/time selection
- [x] Date options: Today / Tomorrow / Day After Tomorrow (quick buttons)
- [x] Time options: 10 AM-2 PM / 2 PM-6 PM (quick buttons)
- [x] Send `pickup_date` and `pickup_time` to existing `/api/orders/:id/request-pickup` endpoint
- [x] Verify backend already accepts these parameters (already implemented)

### Phase 6: "Save and Assign Order" Button Implementation ✅ COMPLETED
- [x] Ensure `handleSaveAndAssign()` calls `handleOrderSubmission(true)` (generate_awb=true)
- [x] Backend: After AWB generation, automatically call CREATE SHIPMENT API
- [x] Backend: After shipment created, automatically request pickup (default: tomorrow, 11:00 AM)
- [x] Backend: After pickup requested, update order status to 'pickups_manifests'
- [x] Backend: Wallet deduction happens (already implemented)
- [x] Frontend: Order directly appears in "PICKUPS AND MANIFESTS" tab
- [x] Verify shipping charges calculated and displayed before save

### Phase 7: Wallet Deduction Verification ✅ COMPLETED
- [x] Verify wallet deduction happens for "Save" button
- [x] Verify wallet deduction happens for "Save and Assign Order" button
- [x] Verify wallet deduction uses calculated shipping charges from our rate card
- [x] Verify transaction record created with correct zone information (from Delhivery API)

