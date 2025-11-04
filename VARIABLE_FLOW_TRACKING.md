# Variable Flow Tracking - Shipping Charges Calculation

## Complete Variable Mapping Table

### Frontend → Backend Request Flow

| Variable Name | Frontend Source | Frontend Type | Conversion | Backend Receives | Backend Type | Backend Validation | Backend Usage |
|--------------|----------------|---------------|------------|-----------------|--------------|-------------------|---------------|
| **weight** | `formData.package_info.weight` | `number` (kg) | Multiply by 1000 → grams | `weight` | `number` (grams) | `isFloat({ min: 0.1 })` | Passed to RateCardService (grams) |
| **dimensions.length** | `formData.package_info.dimensions.length` | `number` (cm) | No conversion | `dimensions.length` | `number` (cm) | `isFloat({ min: 0.1 })` | Used in volumetric calc |
| **dimensions.breadth** | `formData.package_info.dimensions.width` | `number` (cm) | Mapped: `width` → `breadth` | `dimensions.breadth` | `number` (cm) | `isFloat({ min: 0.1 })` | Used in volumetric calc |
| **dimensions.height** | `formData.package_info.dimensions.height` | `number` (cm) | No conversion | `dimensions.height` | `number` (cm) | `isFloat({ min: 0.1 })` | Used in volumetric calc |
| **pickup_pincode** | `formData.pickup_address.pincode` | `string` (6 digits) | No conversion | `pickup_pincode` | `string` | `isLength({ min: 6, max: 6 })` | Used for Delhivery zone API |
| **delivery_pincode** | `formData.delivery_address.pincode` | `string` (6 digits) | No conversion | `delivery_pincode` | `string` | `isLength({ min: 6, max: 6 })` | Used for Delhivery zone API |
| **shipping_mode** | `formData.shipping_mode` | `'Surface' \| 'Express'` | Normalized to `'S' \| 'E'` | `shipping_mode` | `'Surface' \| 'Express' \| 'S' \| 'E'` | `isIn(['Surface', 'Express', 'S', 'E'])` | Converted to `'S'` or `'E'` for Delhivery |
| **payment_mode** | `formData.payment_info.payment_mode` | `'Prepaid' \| 'COD'` | No conversion | `payment_mode` | `'Prepaid' \| 'COD' \| 'Pre-paid'` | `isIn(['Prepaid', 'COD', 'Pre-paid'])` | Converted to `'COD'` or `'Pre-paid'` for Delhivery |
| **cod_amount** | `formData.payment_info.cod_amount` | `number` | Conditional: Only if payment_mode === 'COD' | `cod_amount` | `number` | `isFloat({ min: 0 })` | Used for COD charge calculation |
| **order_type** | `orderType` prop | `'forward' \| 'reverse'` | Converted: `'reverse'` → `'rto'` | `order_type` | `'forward' \| 'rto'` | `isIn(['forward', 'rto'])` | Used to select forward vs RTO charges |
| **zone** | Not provided | `undefined` | N/A | `zone` | `string \| undefined` | `optional().isIn(['A', 'B', 'C', 'D', 'E', 'F'])` | Fetched from Delhivery if not provided |

### Backend Internal Processing Flow

| Variable Name | Source | Processing | Output | Used By |
|--------------|--------|------------|--------|---------|
| **userCategory** | `req.user.user_category` | Validated against available categories | `string` | RateCardService |
| **volumetricWeightKg** | `(length × breadth × height) / 5000` | Calculated from dimensions | `number` (kg) | Converted to grams |
| **volumetricWeightGrams** | `volumetricWeightKg × 1000` | Converted to grams | `number` (grams) | Used for chargeable weight |
| **chargeableWeightGrams** | `Math.max(weight, volumetricWeightGrams)` | Higher of actual or volumetric | `number` (grams) | Delhivery API & RateCardService |
| **shippingModeForDelhivery** | `shipping_mode` | `'Express' \| 'E'` → `'E'`, else → `'S'` | `'S' \| 'E'` | Delhivery getZoneFromDelhivery |
| **paymentTypeForDelhivery** | `payment_mode` | `'COD'` → `'COD'`, else → `'Pre-paid'` | `'COD' \| 'Pre-paid'` | Delhivery getZoneFromDelhivery |
| **finalZone** | Delhivery API or provided | Retrieved from `getZoneFromDelhivery()` | `string` (A-F) | RateCardService |
| **forwardCharges** | RateCardService | Calculated based on zone + weight + user category | `number` | Returned in response |
| **rtoCharges** | RateCardService | Calculated based on zone + weight + user category | `number` | Returned in response |
| **codCharges** | RateCardService | Calculated from cod_amount + rate card percentage | `number` | Returned in response |
| **totalCharges** | RateCardService | `forwardCharges + codCharges` OR `rtoCharges + codCharges` | `number` | Returned in response |

### Backend → Frontend Response Flow

| Variable Name | Backend Response | Backend Type | Frontend Receives | Frontend Type | Frontend Usage |
|--------------|------------------|--------------|-------------------|---------------|----------------|
| **forwardCharges** | `result.forwardCharges` | `number` | `response.forwardCharges` | `number` | Display (optional) |
| **rtoCharges** | `result.rtoCharges` | `number` | `response.rtoCharges` | `number` | Display (optional) |
| **codCharges** | `result.codCharges` | `number` | `response.codCharges` | `number` | Display (optional) |
| **totalCharges** | `result.totalCharges` | `number` | `response.totalCharges` | `number` | **Stored in `formData.payment_info.shipping_charges`** |
| **volumetricWeight** | `result.volumetricWeight` | `number` (kg) | `response.volumetricWeight` | `number` (kg) | Display (optional) |
| **chargeableWeight** | `result.chargeableWeight` | `number` (kg) | `response.chargeableWeight` | `number` (kg) | Display (optional) |
| **zone** | `finalZone` | `string` | `response.zone` | `string` | **Displayed in UI** |
| **user_category** | `userCategory` | `string` | `response.user_category` | `string` | Display (optional) |
| **rate_card_applied** | `rateCard.userCategory` | `string` | `response.rate_card_applied` | `string` | Display (optional) |

## Critical Variable Mapping Issues & Fixes

### ✅ Issue 1: Dimensions Width → Breadth Mapping
**Problem:** Frontend uses `dimensions.width` but backend expects `dimensions.breadth`
**Status:** ✅ **FIXED** - Frontend correctly maps `width` → `breadth` in request
```typescript
dimensions: {
  length: formData.package_info.dimensions.length,
  breadth: formData.package_info.dimensions.width,  // ✅ Correct mapping
  height: formData.package_info.dimensions.height
}
```

### ✅ Issue 2: Weight Unit Conversion
**Problem:** Frontend stores weight in kg, backend expects grams
**Status:** ✅ **FIXED** - Frontend converts kg → grams before sending
```typescript
const weightInGrams = formData.package_info.weight * 1000; // ✅ Correct conversion
weight: weightInGrams, // ✅ Sent in grams
```

### ✅ Issue 3: Order Type Mapping
**Problem:** Frontend uses `'reverse'`, backend expects `'rto'`
**Status:** ✅ **FIXED** - Frontend converts `'reverse'` → `'rto'`
```typescript
order_type: orderType === 'reverse' ? 'rto' : 'forward' // ✅ Correct mapping
```

### ✅ Issue 4: Payment Mode Normalization
**Problem:** Frontend uses `'Prepaid'`, backend accepts `'Pre-paid'` for Delhivery
**Status:** ✅ **FIXED** - Backend handles both formats
```javascript
const paymentTypeForDelhivery = payment_mode === 'COD' ? 'COD' : 'Pre-paid'; // ✅ Correct
```

### ✅ Issue 5: Shipping Mode Normalization
**Problem:** Frontend uses `'Surface'` or `'Express'`, Delhivery expects `'S'` or `'E'`
**Status:** ✅ **FIXED** - Backend converts correctly
```javascript
const shippingModeForDelhivery = shipping_mode === 'Express' || shipping_mode === 'E' ? 'E' : 'S'; // ✅ Correct
```

## Data Type Consistency Check

| Variable | Frontend Form | Frontend Request | Backend Receives | Backend Validation | Backend Service | Status |
|----------|--------------|------------------|------------------|-------------------|-----------------|--------|
| Weight | `number` (kg) | `number` (grams) | `number` (grams) | ✅ Float min 0.1 | ✅ Number (grams) | ✅ Consistent |
| Length | `number` (cm) | `number` (cm) | `number` (cm) | ✅ Float min 0.1 | ✅ Number (cm) | ✅ Consistent |
| Width | `number` (cm) | `breadth` (cm) | `number` (cm) | ✅ Float min 0.1 | ✅ Number (cm) | ✅ Consistent |
| Height | `number` (cm) | `number` (cm) | `number` (cm) | ✅ Float min 0.1 | ✅ Number (cm) | ✅ Consistent |
| Pickup Pincode | `string` (6) | `string` (6) | `string` (6) | ✅ Length 6 | ✅ String | ✅ Consistent |
| Delivery Pincode | `string` (6) | `string` (6) | `string` (6) | ✅ Length 6 | ✅ String | ✅ Consistent |
| Shipping Mode | `'Surface'` | `'Surface' \| 'Express'` | `'Surface' \| 'Express' \| 'S' \| 'E'` | ✅ Enum check | ✅ Converted to 'S'/'E' | ✅ Consistent |
| Payment Mode | `'Prepaid' \| 'COD'` | `'Prepaid' \| 'COD'` | `'Prepaid' \| 'COD' \| 'Pre-paid'` | ✅ Enum check | ✅ Converted to 'Pre-paid'/'COD' | ✅ Consistent |
| COD Amount | `number` | `number` (conditional) | `number` | ✅ Float min 0 | ✅ Number | ✅ Consistent |
| Order Type | `'forward' \| 'reverse'` | `'forward' \| 'rto'` | `'forward' \| 'rto'` | ✅ Enum check | ✅ Used correctly | ✅ Consistent |

## Response Variable Mapping

| Backend Response Field | Frontend Receives | Stored Where | Used For |
|----------------------|-------------------|--------------|----------|
| `data.totalCharges` | `response.totalCharges` | `formData.payment_info.shipping_charges` | ✅ Order submission |
| `data.zone` | `response.zone` | `finalShippingCalculation.zone` | ✅ Display in UI |
| `data.forwardCharges` | `response.forwardCharges` | Not stored | Display only |
| `data.rtoCharges` | `response.rtoCharges` | Not stored | Display only |
| `data.codCharges` | `response.codCharges` | Not stored | Display only |
| `data.volumetricWeight` | `response.volumetricWeight` | Not stored | Display only |
| `data.chargeableWeight` | `response.chargeableWeight` | Not stored | Display only |

## Verification Checklist

- [x] Weight conversion: kg → grams (frontend) ✅
- [x] Dimensions mapping: width → breadth ✅
- [x] Order type mapping: reverse → rto ✅
- [x] Payment mode: Prepaid → Pre-paid (backend) ✅
- [x] Shipping mode: Surface/Express → S/E (backend) ✅
- [x] Pincode validation: 6 digits ✅
- [x] Zone fetching: From Delhivery API ✅
- [x] Response mapping: totalCharges → shipping_charges ✅
- [x] Response mapping: zone → display ✅
- [x] User category: From MongoDB user ✅
- [x] Rate card: Based on user category ✅

## Order Creation Flow - Additional Variable Mapping

### Frontend Order Submission → Backend Order Creation

| Variable Name | Frontend Source | Frontend Type | Backend Receives | Backend Type | Backend Storage | Status |
|--------------|----------------|---------------|------------------|--------------|-----------------|--------|
| **order_type** | `orderType` prop | `'forward' \| 'reverse'` | `req.body.order_type` | `'forward' \| 'reverse'` | `order.order_type` (MongoDB) | ✅ Fixed |
| **shipping_charges** | `formData.payment_info.shipping_charges` | `number` | `req.body.payment_info.shipping_charges` | `number` | `order.payment_info.shipping_charges` | ✅ Consistent |
| **weight** | `formData.package_info.weight` | `number` (kg) | `req.body.package_info.weight` | `number` (kg) | `order.package_info.weight` (kg) | ✅ Consistent |
| **dimensions.width** | `formData.package_info.dimensions.width` | `number` (cm) | `req.body.package_info.dimensions.width` | `number` (cm) | `order.package_info.dimensions.width` | ✅ Consistent |

**Note:** For order creation, weight is stored in **kg** (not grams), which is different from the shipping calculation API where weight is sent in grams.

## Summary

**All variables are correctly mapped and consistent across the flow!** ✅

The implementation correctly:
1. Converts weight from kg to grams for shipping calculation API
2. Keeps weight in kg for order storage (MongoDB)
3. Maps dimensions.width to dimensions.breadth for shipping calculation
4. Keeps dimensions.width for order storage
5. Converts order type 'reverse' to 'rto' for shipping calculation
6. Keeps order type 'reverse'/'forward' for order storage
7. Handles payment and shipping mode normalization
8. Fetches zone from Delhivery API
9. Uses rate card service with correct parameters
10. Returns and stores charges correctly
11. Sends order_type to backend for order creation

No variable inconsistencies found! ✅

