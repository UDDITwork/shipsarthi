# Variable Alignment Verification - Frontend ↔ Backend ↔ Delhivery API

## ✅ Verified Variable Mappings

### 1. Order Creation Flow

#### Frontend → Backend: POST /api/orders

| Frontend Variable | Type | Backend Variable | Type | Status | Notes |
|-------------------|------|------------------|------|--------|-------|
| `orderData.order_date` | string (ISO) | `req.body.order_date` | Date | ✅ | Validated as ISO8601 |
| `orderData.order_id` | string | `req.body.order_id` | string | ✅ | Optional, auto-generated if not provided |
| `orderData.customer_info.buyer_name` | string | `req.body.customer_info.buyer_name` | string | ✅ | Required, trimmed |
| `orderData.customer_info.phone` | string | `req.body.customer_info.phone` | string | ✅ | Required, validated: ^[6-9]\d{9}$ |
| `orderData.customer_info.email` | string | `req.body.customer_info.email` | string | ✅ | Optional, validated if provided |
| `orderData.delivery_address.pincode` | string | `req.body.delivery_address.pincode` | string | ✅ | Required, validated: ^[1-9][0-9]{5}$ |
| `orderData.delivery_address.city` | string | `req.body.delivery_address.city` | string | ✅ | Required |
| `orderData.delivery_address.state` | string | `req.body.delivery_address.state` | string | ✅ | Required |
| `orderData.pickup_address.pincode` | string | `req.body.pickup_address.pincode` | string | ✅ | Optional, validated: ^[1-9][0-9]{5}$ |
| `orderData.pickup_address.phone` | string | `req.body.pickup_address.phone` | string | ✅ | Optional, validated: ^[6-9]\d{9}$ |
| `orderData.products[].quantity` | number | `req.body.products[].quantity` | int | ✅ | Required, min: 1 |
| `orderData.products[].unit_price` | number | `req.body.products[].unit_price` | float | ✅ | Required, min: 0 |
| `orderData.package_info.weight` | number (kg) | `req.body.package_info.weight` | float | ✅ | Required, min: 0.1 (kg) |
| `orderData.package_info.dimensions.length` | number (cm) | `req.body.package_info.dimensions.length` | float | ✅ | Required, min: 1 |
| `orderData.package_info.dimensions.width` | number (cm) | `req.body.package_info.dimensions.width` | float | ✅ | Required, min: 1 |
| `orderData.package_info.dimensions.height` | number (cm) | `req.body.package_info.dimensions.height` | float | ✅ | Required, min: 1 |
| `orderData.payment_info.payment_mode` | string | `req.body.payment_info.payment_mode` | string | ✅ | Required, enum: ['Prepaid', 'COD'] |
| `orderData.payment_info.cod_amount` | number | `req.body.payment_info.cod_amount` | float | ✅ | Required if COD, min: 0 |
| `orderData.shipping_mode` | string | `req.body.shipping_mode` | string | ✅ | Optional, default: 'Surface', enum: ['Surface', 'Express'] |
| `orderData.generate_awb` | boolean | `req.body.generate_awb` | boolean | ✅ | Optional, default: false |

**✅ REMOVED:** `auto_request_pickup` - No longer sent from frontend (removed from code)

#### Backend → DelhiveryService: createShipment()

| Backend Variable | Type | DelhiveryService Expects | Type | Status | Notes |
|------------------|------|--------------------------|------|--------|-------|
| `order.customer_info.buyer_name` | string | `orderData.customer_info.buyer_name` | string | ✅ | Maps to `name` in Delhivery |
| `order.delivery_address.full_address` | string | `orderData.delivery_address.full_address` | string | ✅ | Maps to `add` in Delhivery |
| `order.delivery_address.pincode` | string | `orderData.delivery_address.pincode` | string | ✅ | Maps to `pin` in Delhivery |
| `order.customer_info.phone` | string | `orderData.customer_info.phone` | string | ✅ | Maps to `phone` in Delhivery |
| `order.payment_info.payment_mode` | 'Prepaid'\|'COD' | `orderData.payment_info.payment_mode` | 'Prepaid'\|'COD' | ✅ | Maps correctly: 'Prepaid'→'Prepaid', 'COD'→'COD' |
| `order.payment_info.cod_amount` | number | `orderData.payment_info.cod_amount` | number | ✅ | Maps to `cod_amount` in Delhivery |
| `order.payment_info.order_value` | number | `orderData.payment_info.order_value` | number | ✅ | Maps to `total_amount` in Delhivery |
| `order.package_info.weight` | number (kg) | `orderData.package_info.weight` | number (kg) | ✅ | Maps to `weight` in Delhivery (kg) |
| `order.package_info.dimensions.width` | number (cm) | `orderData.package_info.dimensions.width` | number (cm) | ✅ | Maps to `shipment_width` in Delhivery |
| `order.package_info.dimensions.height` | number (cm) | `orderData.package_info.dimensions.height` | number (cm) | ✅ | Maps to `shipment_height` in Delhivery |
| `order.package_info.dimensions.length` | number (cm) | `orderData.package_info.dimensions.length` | number (cm) | ✅ | Maps to `shipment_length` in Delhivery |
| `order.shipping_mode` | 'Surface'\|'Express' | `orderData.shipping_mode` | 'Surface'\|'Express' | ✅ | Maps to `shipping_mode` in Delhivery |
| `order.invoice_number` | string | `orderData.invoice_number` | string | ✅ | Maps to `seller_inv` in Delhivery |
| `preFetchedWaybill` | string | `orderData.waybill` | string | ✅ | Optional, pre-fetched from getWaybill API |

#### DelhiveryService → Delhivery API: /cmu/create.json

| DelhiveryService Variable | Type | Delhivery API Field | Type | Status | Notes |
|---------------------------|------|---------------------|------|--------|-------|
| `shipmentData.shipments[0].name` | string | `name` | string | ✅ | Customer name |
| `shipmentData.shipments[0].add` | string | `add` | string | ✅ | Delivery address |
| `shipmentData.shipments[0].pin` | string | `pin` | string | ✅ | Delivery pincode |
| `shipmentData.shipments[0].phone` | string | `phone` | string | ✅ | Customer phone |
| `shipmentData.shipments[0].order` | string | `order` | string | ✅ | Order ID |
| `shipmentData.shipments[0].payment_mode` | 'Prepaid'\|'COD' | `payment_mode` | 'Prepaid'\|'COD' | ✅ | Exact format match |
| `shipmentData.shipments[0].cod_amount` | number | `cod_amount` | number | ✅ | Required for COD |
| `shipmentData.shipments[0].total_amount` | number | `total_amount` | number | ✅ | Order value |
| `shipmentData.shipments[0].weight` | number (kg) | `weight` | number (kg) | ✅ | Weight in kg |
| `shipmentData.shipments[0].shipment_width` | number (cm) | `shipment_width` | number (cm) | ✅ | Width in cm |
| `shipmentData.shipments[0].shipment_height` | number (cm) | `shipment_height` | number (cm) | ✅ | Height in cm |
| `shipmentData.shipments[0].shipment_length` | number (cm) | `shipment_length` | number (cm) | ✅ | Length in cm |
| `shipmentData.shipments[0].waybill` | string | `waybill` | string | ✅ | Pre-fetched waybill (optional) |
| `shipmentData.shipments[0].shipping_mode` | 'Surface'\|'Express' | `shipping_mode` | 'Surface'\|'Express' | ✅ | Shipping mode |
| `shipmentData.pickup_location.name` | string | `pickup_location.name` | string | ✅ | Pickup location name |
| `shipmentData.pickup_location.add` | string | `pickup_location.add` | string | ✅ | Pickup address |
| `shipmentData.pickup_location.pin_code` | string | `pickup_location.pin_code` | string | ✅ | Pickup pincode |
| `shipmentData.pickup_location.phone` | string | `pickup_location.phone` | string | ✅ | Pickup phone |

**Delhivery API Request Format:**
- Content-Type: `application/x-www-form-urlencoded`
- Body Format: `format=json&data={JSON_STRING}`
- Authorization: `Token {API_KEY}`

### 2. Pickup Request Flow

#### Frontend → Backend: POST /api/orders/:id/request-pickup

| Frontend Variable | Type | Backend Variable | Type | Status | Notes |
|-------------------|------|------------------|------|--------|-------|
| `pickupDate` | string (YYYY-MM-DD) | `req.body.pickup_date` | string (YYYY-MM-DD) | ✅ | Validated: ^\d{4}-\d{2}-\d{2}$ |
| `pickupTime` | string (HH:mm:ss) | `req.body.pickup_time` | string (HH:mm:ss) | ✅ | Validated: ^([0-1]?[0-9]\|2[0-3]):[0-5][0-9]:[0-5][0-9]$ |
| `packageCount` | number | `req.body.expected_package_count` | int | ✅ | Optional, default: 1 |

**Frontend Validation:**
- Date: Only Today, Tomorrow, or Day After allowed
- Time: Only 10 AM-2 PM or 2 PM-6 PM allowed
- Format: Time converted from HH:mm to HH:mm:ss on submit

#### Backend → DelhiveryService: schedulePickup()

| Backend Variable | Type | DelhiveryService Expects | Type | Status | Notes |
|------------------|------|--------------------------|------|--------|-------|
| `pickupDate` | string (YYYY-MM-DD) | `pickupData.pickup_date` | string (YYYY-MM-DD) | ✅ | Exact match |
| `pickupTime` | string (HH:mm:ss) | `pickupData.pickup_time` | string (HH:mm:ss) | ✅ | Exact match |
| `order.pickup_address.name` | string | `pickupData.pickup_location` | string | ✅ | Maps correctly |
| `expectedPackageCount` | number | `pickupData.expected_package_count` | number | ✅ | Default: 1 |

#### DelhiveryService → Delhivery API: /fm/request/new/

| DelhiveryService Variable | Type | Delhivery API Field | Type | Status | Notes |
|---------------------------|------|---------------------|------|--------|-------|
| `pickupData.pickup_time` | string (HH:mm:ss) | `pickup_time` | string | ✅ | Exact format match |
| `pickupData.pickup_date` | string (YYYY-MM-DD) | `pickup_date` | string | ✅ | Exact format match |
| `pickupData.pickup_location` | string | `pickup_location` | string | ✅ | Exact format match |
| `pickupData.expected_package_count` | number | `expected_package_count` | number | ✅ | Exact format match |

**Delhivery API Request Format:**
- Content-Type: `application/json`
- Authorization: `Token {API_KEY}`

### 3. Zone Calculation Flow

#### Backend → DelhiveryService: getZoneFromDelhivery()

| Backend Variable | Type | DelhiveryService Expects | Type | Status | Notes |
|------------------|------|--------------------------|------|--------|-------|
| `order.pickup_address.pincode` | string | `pickupPincode` | string | ✅ | Maps to `o_pin` |
| `order.delivery_address.pincode` | string | `deliveryPincode` | string | ✅ | Maps to `d_pin` |
| `chargeableWeightGrams` | number (grams) | `chargeableWeight` | number (grams) | ✅ | Maps to `cgm` |
| `order.shipping_mode === 'Express' ? 'E' : 'S'` | 'E'\|'S' | `shippingMode` | 'E'\|'S' | ✅ | Maps to `md` |
| `'Delivered'` | string | `shipmentStatus` | string | ✅ | Maps to `ss` |
| `order.payment_info.payment_mode === 'COD' ? 'COD' : 'Pre-paid'` | 'COD'\|'Pre-paid' | `paymentType` | 'COD'\|'Pre-paid' | ✅ | Maps to `pt` |

**Note:** Delhivery zone API uses 'Pre-paid' (with hyphen) while createShipment uses 'Prepaid' (no hyphen). This is correct and handled properly.

#### DelhiveryService → Delhivery API: /api/kinko/v1/invoice/charges/.json

| DelhiveryService Variable | Type | Delhivery API Parameter | Type | Status | Notes |
|---------------------------|------|------------------------|------|--------|-------|
| `pickupPincode` | string | `o_pin` | string | ✅ | Origin pincode |
| `deliveryPincode` | string | `d_pin` | string | ✅ | Destination pincode |
| `weightInGrams` | number | `cgm` | number (integer) | ✅ | Chargeable weight in grams (rounded) |
| `shippingMode` | 'E'\|'S' | `md` | 'E'\|'S' | ✅ | Billing mode |
| `shipmentStatus` | string | `ss` | string | ✅ | Shipment status |
| `paymentType` | 'COD'\|'Pre-paid' | `pt` | 'COD'\|'Pre-paid' | ✅ | Payment type |

**Delhivery API Request Format:**
- Method: GET
- Query Parameters: URL encoded
- Authorization: `Token {API_KEY}`

## ✅ Critical Validations

### Payment Mode Consistency
- ✅ Frontend sends: 'Prepaid' or 'COD'
- ✅ Backend validates: 'Prepaid' or 'COD'
- ✅ Delhivery createShipment receives: 'Prepaid' or 'COD'
- ✅ Delhivery getZone receives: 'COD' or 'Pre-paid' (with hyphen - this is correct)

### Weight Units
- ✅ Frontend sends: weight in kg (from form)
- ✅ Backend stores: weight in kg
- ✅ Delhivery createShipment receives: weight in kg
- ✅ Zone calculation: converts to grams for Delhivery API

### Dimension Units
- ✅ Frontend sends: dimensions in cm
- ✅ Backend stores: dimensions in cm
- ✅ Delhivery receives: dimensions in cm

### Date/Time Formats
- ✅ Pickup Date: YYYY-MM-DD format (consistent across frontend, backend, Delhivery)
- ✅ Pickup Time: HH:mm:ss format (converted from HH:mm in frontend)

## ✅ All Variable Mappings Verified

All critical variables are properly aligned between:
1. Frontend → Backend
2. Backend → DelhiveryService
3. DelhiveryService → Delhivery API

No mismatches found. All expected values are coming in the expected way.

