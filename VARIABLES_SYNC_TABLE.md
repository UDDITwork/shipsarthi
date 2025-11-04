# Frontend-Backend Variables Sync Table

## Order Creation - Variables Mapping

### Frontend → Backend: POST /api/orders

| Frontend Variable | Type | Backend Variable | Type | Sync Status | Notes |
|-------------------|------|------------------|------|-------------|-------|
| `formData.order_date` | string (YYYY-MM-DD) | `req.body.order_date` | ISO8601 | ✅ | Validated |
| `formData.reference_id` | string | `req.body.reference_id` | string | ✅ | Optional |
| `formData.invoice_number` | string | `req.body.invoice_number` | string | ✅ | Optional |
| `formData.customer_info.buyer_name` | string | `req.body.customer_info.buyer_name` | string | ✅ | Required |
| `formData.customer_info.phone` | string | `req.body.customer_info.phone` | string | ✅ | Required, validated |
| `formData.customer_info.alternate_phone` | string | `req.body.customer_info.alternate_phone` | string | ✅ | Optional |
| `formData.customer_info.email` | string | `req.body.customer_info.email` | string | ✅ | Optional |
| `formData.customer_info.gstin` | string | `req.body.customer_info.gstin` | string | ✅ | Optional |
| `formData.delivery_address.address_line_1` | string | `req.body.delivery_address.address_line_1` | string | ✅ | Required |
| `formData.delivery_address.address_line_2` | string | `req.body.delivery_address.address_line_2` | string | ✅ | Optional |
| `formData.delivery_address.pincode` | string | `req.body.delivery_address.pincode` | string | ✅ | Required, 6 digits |
| `formData.delivery_address.city` | string | `req.body.delivery_address.city` | string | ✅ | Required |
| `formData.delivery_address.state` | string | `req.body.delivery_address.state` | string | ✅ | Required |
| `formData.delivery_address.country` | string | `req.body.delivery_address.country` | string | ✅ | Default: 'India' |
| `formData.pickup_address.name` | string | `req.body.pickup_address.name` | string | ✅ | Required |
| `formData.pickup_address.full_address` | string | `req.body.pickup_address.full_address` | string | ✅ | Required |
| `formData.pickup_address.city` | string | `req.body.pickup_address.city` | string | ✅ | Required |
| `formData.pickup_address.state` | string | `req.body.pickup_address.state` | string | ✅ | Required |
| `formData.pickup_address.pincode` | string | `req.body.pickup_address.pincode` | string | ✅ | Required, 6 digits |
| `formData.pickup_address.phone` | string | `req.body.pickup_address.phone` | string | ✅ | Required |
| `formData.products[].product_name` | string | `req.body.products[].product_name` | string | ✅ | Required |
| `formData.products[].quantity` | number | `req.body.products[].quantity` | int | ✅ | Required, min 1 |
| `formData.products[].unit_price` | number | `req.body.products[].unit_price` | float | ✅ | Required, min 0 |
| `formData.products[].hsn_code` | string | `req.body.products[].hsn_code` | string | ✅ | Optional |
| `formData.products[].category` | string | `req.body.products[].category` | string | ✅ | Optional |
| `formData.products[].sku` | string | `req.body.products[].sku` | string | ✅ | Optional |
| `formData.products[].discount` | number | `req.body.products[].discount` | float | ✅ | Optional, default 0 |
| `formData.products[].tax` | number | `req.body.products[].tax` | float | ✅ | Optional, default 0 |
| `formData.package_info.package_type` | string | `req.body.package_info.package_type` | enum | ✅ | Required |
| `formData.package_info.weight` | number (kg) | `req.body.package_info.weight` | float (kg) | ✅ | Required, min 0.1 |
| `formData.package_info.dimensions.length` | number (cm) | `req.body.package_info.dimensions.length` | float (cm) | ✅ | Required, min 1 |
| `formData.package_info.dimensions.width` | number (cm) | `req.body.package_info.dimensions.width` | float (cm) | ✅ | Required, min 1 |
| `formData.package_info.dimensions.height` | number (cm) | `req.body.package_info.dimensions.height` | float (cm) | ✅ | Required, min 1 |
| `formData.package_info.number_of_boxes` | number | `req.body.package_info.number_of_boxes` | int | ✅ | Optional, default 1 |
| `formData.payment_info.payment_mode` | 'Prepaid' \| 'COD' | `req.body.payment_info.payment_mode` | 'Prepaid' \| 'COD' | ✅ | Required |
| `formData.payment_info.order_value` | number | `req.body.payment_info.order_value` | float | ✅ | Required, min 0 |
| `formData.payment_info.shipping_charges` | number | `req.body.payment_info.shipping_charges` | float | ✅ | Optional, default 0 |
| `formData.payment_info.cod_amount` | number | `req.body.payment_info.cod_amount` | float | ✅ | Required if COD |
| `formData.payment_info.grand_total` | number | `req.body.payment_info.grand_total` | float | ✅ | Optional |
| `generateAWB` | boolean | `req.body.generate_awb` | boolean | ✅ | Controls AWB generation |
| `orderId` | string | `req.body.order_id` | string | ✅ | Optional, auto-generated if not provided |

### Backend → Frontend: Response from POST /api/orders

| Backend Response | Type | Frontend Variable | Type | Sync Status | Notes |
|-----------------|------|------------------|------|-------------|-------|
| `data.order._id` | ObjectId | `order._id` | string | ✅ | MongoDB ID |
| `data.order.order_id` | string | `order.order_id` | string | ✅ | Custom order ID |
| `data.order.status` | string | `order.status` | string | ✅ | 'new' or 'ready_to_ship' |
| `data.awb_number` | string \| null | `awbNumber` | string \| null | ✅ | If generate_awb=true |
| `data.order.delhivery_data.waybill` | string | `order.delhivery_data.waybill` | string | ✅ | AWB number |
| `data.order.payment_info.shipping_charges` | number | `order.payment_info.shipping_charges` | number | ✅ | Deducted amount |

### Generate AWB - Variables Mapping

#### Frontend → Backend: POST /api/orders/:id/generate-awb

| Frontend Variable | Type | Backend Variable | Type | Sync Status | Notes |
|-------------------|------|------------------|------|-------------|-------|
| `orderDbId` | string | `req.params.id` | string | ✅ | MongoDB ObjectId |
| - | - | `req.user._id` | ObjectId | ✅ | From auth token |

#### Backend → Frontend: Response

| Backend Response | Type | Frontend Variable | Type | Sync Status | Notes |
|-----------------|------|------------------|------|-------------|-------|
| `data.awb_number` | string | `data.data.awb_number` | string | ✅ | Generated AWB |
| `data.status` | string | `data.data.status` | string | ✅ | 'ready_to_ship' |

### Request Pickup - Variables Mapping

#### Frontend → Backend: POST /api/orders/:id/request-pickup

| Frontend Variable | Type | Backend Variable | Type | Sync Status | Notes |
|-------------------|------|------------------|------|-------------|-------|
| `pickupModal.orderId` | string | `req.params.id` | string | ✅ | MongoDB ObjectId |
| `pickupDate` | string (YYYY-MM-DD) | `req.body.pickup_date` | string (YYYY-MM-DD) | ✅ | Required |
| `pickupTime` | string (HH:mm:ss) | `req.body.pickup_time` | string (HH:mm:ss) | ✅ | Required |
| `packageCount` | number | `req.body.expected_package_count` | int | ✅ | Optional, default 1 |

#### Backend → Frontend: Response

| Backend Response | Type | Frontend Variable | Type | Sync Status | Notes |
|-----------------|------|------------------|------|-------------|-------|
| `data.pickup_request_id` | string | `data.data.pickup_request_id` | string | ✅ | Delhivery pickup ID |
| `data.pickup_date` | string | `data.data.pickup_date` | string | ✅ | Scheduled date |
| `data.pickup_time` | string | `data.data.pickup_time` | string | ✅ | Scheduled time |
| `data.status` | string | `data.data.status` | string | ✅ | 'pickups_manifests' |

### Shipping Charges Calculation - Variables Mapping

#### Frontend → Backend: POST /api/shipping/calculate-rate-card

| Frontend Variable | Type | Backend Variable | Type | Sync Status | Notes |
|-------------------|------|------------------|------|-------------|-------|
| `weight` | number (grams) | `req.body.weight` | float (grams) | ✅ | Required |
| `dimensions.length` | number (cm) | `req.body.dimensions.length` | float (cm) | ✅ | Required |
| `dimensions.breadth` | number (cm) | `req.body.dimensions.breadth` | float (cm) | ✅ | Required |
| `dimensions.height` | number (cm) | `req.body.dimensions.height` | float (cm) | ✅ | Required |
| `zone` | string (A-F) | `req.body.zone` | string (A-F) | ✅ | Required |
| `cod_amount` | number | `req.body.cod_amount` | float | ✅ | Optional |
| `order_type` | 'forward' \| 'rto' | `req.body.order_type` | 'forward' \| 'rto' | ✅ | Optional, default 'forward' |

#### Backend → Frontend: Response

| Backend Response | Type | Frontend Variable | Type | Sync Status | Notes |
|-----------------|------|------------------|------|-------------|-------|
| `data.forwardCharges` | number | `response.forwardCharges` | number | ✅ | Calculated from rate card |
| `data.rtoCharges` | number | `response.rtoCharges` | number | ✅ | Calculated from rate card |
| `data.codCharges` | number | `response.codCharges` | number | ✅ | Calculated from rate card |
| `data.totalCharges` | number | `response.totalCharges` | number | ✅ | Forward + COD charges |
| `data.volumetricWeight` | number | `response.volumetricWeight` | number | ✅ | LxBxH/5000 |
| `data.chargeableWeight` | number | `response.chargeableWeight` | number | ✅ | Max(actual, volumetric) |

### Zone Retrieval - Variables Mapping

#### Frontend → Backend: Internal Call to getZoneFromDelhivery

| Frontend Variable | Type | Backend Parameter | Type | Sync Status | Notes |
|-------------------|------|-------------------|------|-------------|-------|
| `formData.pickup_address.pincode` | string | `pickupPincode` | string | ✅ | 6 digits |
| `formData.delivery_address.pincode` | string | `deliveryPincode` | string | ✅ | 6 digits |
| `chargeableWeightGrams` | number | `chargeableWeight` | number (grams) | ✅ | Calculated |
| `shippingMode` | 'E' \| 'S' | `shippingMode` | 'E' \| 'S' | ✅ | 'S' for Surface |
| - | - | `shipmentStatus` | string | ✅ | Default: 'Delivered' |
| `paymentMode` | 'Pre-paid' \| 'COD' | `paymentType` | 'Pre-paid' \| 'COD' | ✅ | Based on form |

#### Backend → Frontend: Response

| Backend Response | Type | Frontend Variable | Type | Sync Status | Notes |
|-----------------|------|------------------|------|-------------|-------|
| `zoneResult.zone` | string (A-F) | `zone` | string (A-F) | ✅ | Extracted from Delhivery |
| `zoneResult.success` | boolean | `zoneResult.success` | boolean | ✅ | API call success |
| `zoneResult.error` | string \| null | `zoneResult.error` | string \| null | ✅ | Error message if failed |

## Critical Variable Mismatches to Watch

### ⚠️ Potential Issues:

1. **Weight Units**: 
   - Frontend sends weight in **kg** → Backend expects **kg** ✅
   - But for zone API, need to convert to **grams** (×1000)

2. **Dimension Naming**:
   - Frontend: `dimensions.width` → Backend: `dimensions.width` ✅
   - Frontend: `dimensions.breadth` → Backend: `dimensions.breadth` ✅
   - **Note**: Some places use `width`, some use `breadth` - need consistency

3. **Payment Mode Values**:
   - Frontend: `'Prepaid'` or `'COD'` → Backend: `'Prepaid'` or `'COD'` ✅
   - Delhivery API: `'Pre-paid'` or `'COD'` (note hyphen in Pre-paid)

4. **Zone Values**:
   - Delhivery API: Returns `'C'`, `'D'`, `'C1'`, `'C2'`, `'D1'`, `'D2'`
   - Our Rate Card: Uses `'C'`, `'D'` (C1/C2→C, D1/D2→D mapping)

5. **Order Status Values**:
   - Frontend expects: `'new'`, `'ready_to_ship'`, `'pickups_manifests'`
   - Backend uses: Same values ✅

6. **Date Format**:
   - Frontend: `YYYY-MM-DD` (string) → Backend: `YYYY-MM-DD` (string) ✅
   - Time Format: `HH:mm:ss` (string) → Backend: `HH:mm:ss` (string) ✅

