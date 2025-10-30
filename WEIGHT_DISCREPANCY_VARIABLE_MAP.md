# 📊 Weight Discrepancy - Complete Variable Mapping Table

## Excel Columns → Database Fields Mapping

| Excel Column | Type | Database Field | MongoDB Path | Notes |
|--------------|------|----------------|--------------|-------|
| AWB number | Number/String | `awb_number` | `weightDiscrepancy.awb_number` | 14-digit AWB (44800710000125) |
| Date of raising the weight mismatch | Date | `discrepancy_date` | `weightDiscrepancy.discrepancy_date` | MM/DD/YYYY HH:MM format |
| Status of AWB | String | `awb_status` | `weightDiscrepancy.awb_status` | Values: "In Transit", "Delivered", etc. |
| Client Declared Weight | Number | `client_declared_weight` | `weightDiscrepancy.client_declared_weight` | In grams (5000 = 5kg) |
| Delhivery Updated Weight | Number | `delhivery_updated_weight` | `weightDiscrepancy.delhivery_updated_weight` | In grams |
| Delhivery Updated chargeable weight - Client Declared chargeable weight | Number | `weight_discrepancy` | `weightDiscrepancy.weight_discrepancy` | Difference amount |
| Latest deduction - Initial manifestation cost | Number | `deduction_amount` | `weightDiscrepancy.deduction_amount` | Currency with decimals |

## Database Variables

### WeightDiscrepancy Model
| Field | Type | Required | Indexed | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Auto | Yes | MongoDB document ID |
| `awb_number` | String | Yes | Yes | 14-digit AWB number |
| `client_id` | ObjectId (ref: User) | Yes | Yes | **Links to client** |
| `order_id` | ObjectId (ref: Order) | Optional | Yes | Links to order |
| `discrepancy_date` | Date | Yes | Yes | Date mismatch was raised |
| `awb_status` | String | Yes | No | Current AWB status |
| `client_declared_weight` | Number | Yes | No | Weight declared by client (grams) |
| `delhivery_updated_weight` | Number | Yes | No | Actual weight measured (grams) |
| `weight_discrepancy` | Number | Yes | No | Difference amount (grams) |
| `deduction_amount` | Number | Yes | No | Amount deducted (₹) |
| `processed` | Boolean | No | Yes | If deduction processed |
| `transaction_id` | ObjectId (ref: Transaction) | Optional | Yes | Links to deduction transaction |
| `notes` | String | No | No | Additional notes |
| `created_at` | Date | Auto | Yes | Record creation time |
| `updated_at` | Date | Auto | Yes | Last update time |

### Lookup Query Variables
| Variable | Source | Usage | Example |
|----------|--------|-------|---------|
| `AWB` | Excel row | Find client | "44800710000125" |
| `Order` | MongoDB | `Order.find({ 'delhivery_data.waybill': AWB })` | Get order by AWB |
| `User` | Order | `Order.user_id` | Get client ID |
| `weightDiscrepancy` | MongoDB | New document created | Store discrepancy |

## API Endpoint Variables

### POST /api/admin/weight-discrepancies/bulk-import
| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `file` | File | Request | Excel file upload |
| `rows` | Array | Parsed Excel | All rows from file |
| `row` | Object | Loop iteration | Single row being processed |
| `awb_number` | String | Excel column | AWB to lookup |
| `order` | Object | MongoDB | Found order |
| `client_id` | ObjectId | `order.user_id` | Client ID |
| `discrepancyData` | Object | Formatted | Data to save |
| `discrepancy` | Object | MongoDB | Saved document |
| `transaction` | Object | Created | Deduction transaction |
| `results` | Object | Returned | Summary of import |

### GET /api/admin/weight-discrepancies
| Variable | Type | Description |
|----------|------|-------------|
| `filterQuery` | Object | MongoDB query |
| `discrepancies` | Array | All discrepancies |
| `count` | Number | Total count |

### GET /api/weight-discrepancies (Client)
| Variable | Type | Description |
|----------|------|-------------|
| `userId` | ObjectId | From auth middleware |
| `filterQuery` | Object | MongoDB query with userId |
| `discrepancies` | Array | Client's discrepancies |
| `count` | Number | Total count |

## Frontend Variables

### Admin Weight Discrepancies Page
| Variable | Type | Component | Description |
|----------|------|-----------|-------------|
| `file` | File | State | Selected Excel file |
| `uploading` | Boolean | State | Upload progress |
| `uploadResult` | Object | State | Upload results |
| `discrepancies` | Array | State | All discrepancies |
| `loading` | Boolean | State | Data loading |
| `error` | String | State | Error message |
| `selectedFile` | File | File input | Excel file |
| `formData` | FormData | Upload | File + metadata |

### Client Weight Discrepancies Page
| Variable | Type | Component | Description |
|----------|------|-----------|-------------|
| `discrepancies` | Array | State | Client's discrepancies |
| `loading` | Boolean | State | Data loading |
| `filters` | Object | State | Filter options |
| `summary` | Object | State | Statistics |
| `refetch` | Function | Function | Refresh data |

## Excel Parsing Variables

### Excel File Structure
| Variable | Type | Description |
|----------|------|-------------|
| `workbook` | Object | Excel workbook |
| `sheet` | Object | First sheet |
| `headers` | Array | Column headers |
| `dataRows` | Array | Data rows |
| `rowData` | Object | Parsed row |
| `columnIndex` | Number | Column position |

### Column Mapping
| Excel Column | Index | Variable Name |
|--------------|-------|---------------|
| AWB number | 0 | `awb_number` |
| Date of raising... | 1 | `discrepancy_date` |
| Status of AWB | 2 | `awb_status` |
| Client Declared Weight | 3 | `client_declared_weight` |
| Delhivery Updated Weight | 4 | `delhivery_updated_weight` |
| Weight Difference | 5 | `weight_discrepancy` |
| Latest deduction | 6 | `deduction_amount` |

## Transaction Creation Variables

### Debit Transaction
| Variable | Type | Value |
|----------|------|-------|
| `transaction_type` | String | "debit" |
| `transaction_category` | String | "weight_discrepancy_charge" |
| `amount` | Number | `deduction_amount` |
| `description` | String | "Weight discrepancy charge for AWB: {awb}" |
| `user_id` | ObjectId | `client_id` |
| `related_order_id` | ObjectId | `order_id` |
| `related_awb` | String | `awb_number` |

## Critical Variable Synchronization Points

### 1. AWB → Client Lookup
```javascript
const order = await Order.findOne({ 'delhivery_data.waybill': awb_number });
const client_id = order.user_id;  // ⚠️ CRITICAL LINK
```

### 2. Weight Discrepancy Creation
```javascript
const discrepancyData = {
  awb_number: parseAWB(excelAwb),
  client_id: client_id,
  order_id: order._id,
  discrepancy_date: parseDate(excelDate),
  awb_status: excelStatus,
  client_declared_weight: excelClientWeight,
  delhivery_updated_weight: excelDelhiveryWeight,
  weight_discrepancy: excelDifference,
  deduction_amount: excelDeduction
};
```

### 3. Client Dashboard Display
```javascript
const discrepancies = await WeightDiscrepancy.find({ 
  client_id: userId  // ⚠️ Only current client's data
});
```

## Data Flow Variables

### Upload Flow
```
Excel File → Parse → Extract Row → Lookup AWB → Find Order → Get client_id
→ Create WeightDiscrepancy → Create Transaction → Deduct from Client Wallet
```

### Display Flow
```
Admin: GET all discrepancies → Filter → Display
Client: GET discrepancies where client_id = userId → Display
```

## Validation Rules

### AWB Number
- Must be 14 digits
- Must exist in Order collection
- Format: "44800710000125"

### Weight
- Must be positive numbers
- Units: Grams
- Client weight < Delhivery weight (discrepancy)

### Date
- Format: MM/DD/YYYY HH:MM
- Must be valid date
- Parse timezone aware

### Amount
- Must be positive
- Currency: INR (₹)
- Decimals: 2 places

## Error Handling Variables

| Error | Variable | Response |
|-------|----------|----------|
| AWB not found | `awbNotFound` | Skip row, log |
| Invalid weight | `invalidWeight` | Skip row, log |
| Invalid date | `invalidDate` | Skip row, log |
| Duplicate AWB | `duplicateAwb` | Skip row, log |
| Client not found | `clientNotFound` | Skip row, log |
| File error | `fileError` | Return error |
| Parse error | `parseError` | Return error |

## Summary Statistics Variables

| Variable | Type | Calculation |
|----------|------|-------------|
| `total_uploaded` | Number | Rows processed |
| `successful` | Number | Rows imported |
| `failed` | Number | Rows skipped |
| `total_discrepancy_weight` | Number | Sum of discrepancies |
| `total_deduction_amount` | Number | Sum of deductions |
| `affected_clients` | Number | Unique client IDs |
| `errors` | Array | Error details |

## Variable Consistency Checklist

✅ All variable names match between Excel and database  
✅ MongoDB paths consistent  
✅ API request/response variables match  
✅ Frontend state variables match backend  
✅ Transaction variables match schema  
✅ Lookup queries use correct field names  
✅ No typos in variable names  
✅ All required fields present  
✅ Data types consistent  
✅ Units consistent (grams for weight, ₹ for money)

