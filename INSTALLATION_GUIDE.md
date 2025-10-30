# 🚀 Weight Discrepancies Feature - Installation Guide

## 📦 Prerequisites

- Node.js installed (v14 or higher)
- npm or yarn package manager
- MongoDB database running
- Git repository cloned

## 🔧 Installation Steps

### Step 1: Install Backend Dependencies

**Location**: `backend/`
**Command**: `npm install`
**Run from**: `SHIPSARTHI/backend`

This will install all required packages including the new `xlsx` library for Excel parsing.

### Step 2: Verify MongoDB Connection

**Check**: `backend/config/db.js`
**Ensure**: MongoDB connection string is configured in `.env` file

### Step 3: Start Backend Server

**Location**: `backend/`
**Command**: `npm start` or `npm run dev`
**Run from**: `SHIPSARTHI/backend`

**Expected Output**: 
```
✅ MongoDB connected successfully
✅ Server running on port 5000
```

### Step 4: Install Frontend Dependencies

**Location**: `frontend/`
**Command**: `npm install`
**Run from**: `SHIPSARTHI/frontend`

**Note**: Frontend dependencies should already be installed, but run this to ensure.

### Step 5: Start Frontend Server

**Location**: `frontend/`
**Command**: `npm start`
**Run from**: `SHIPSARTHI/frontend`

**Expected Output**:
```
Compiled successfully!
Local: http://localhost:3000
```

## ✅ Verification Checklist

### Backend Verification

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] `/api/admin/weight-discrepancies` accessible
- [ ] `/api/weight-discrepancies` accessible
- [ ] No console errors

### Frontend Verification

- [ ] Admin page loads at `/admin/weight-discrepancies`
- [ ] Client page loads at `/weight-discrepancies`
- [ ] Navigation menu shows "Weight Discrepancies"
- [ ] No console errors
- [ ] Styles loaded correctly

### Database Verification

- [ ] WeightDiscrepancy collection created (auto-created on first use)
- [ ] Transaction model has `weight_discrepancy_charge` category
- [ ] No migration errors

## 🧪 Testing Guide

### Test 1: Admin Bulk Import

1. **Login to Admin Panel**
   - Navigate to: `http://localhost:3000/admin/login`
   - Enter admin credentials

2. **Navigate to Weight Discrepancies**
   - Click "Weight Discrepancies" in sidebar
   - URL: `/admin/weight-discrepancies`

3. **Create Test Excel File**
   - Open Excel or Google Sheets
   - Create columns:
     - AWB number
     - Date of raising the weight mismatch
     - Status of AWB
     - Client Declared Weight
     - Delhivery Updated Weight
     - Delhivery Updated chargeable weight - Client Declared chargeable weight
     - Latest deduction - Initial manifestation cost
   - Add test data with valid AWB numbers from your orders

4. **Upload File**
   - Click "Upload Excel File"
   - Select your test file
   - Wait for upload to complete

5. **Verify Results**
   - Check import results message
   - Verify discrepancies appear in table
   - Check error logs if any rows failed

### Test 2: Admin View All Discrepancies

1. **View All Discrepancies**
   - Verify all imported discrepancies appear
   - Check client information displays correctly
   - Verify AWB numbers are correct

2. **Test Filters**
   - Search by AWB number
   - Filter by processed status
   - Verify filtering works

3. **Test Pagination**
   - Create more than 50 discrepancies
   - Navigate through pages
   - Verify pagination controls

### Test 3: Client View Discrepancies

1. **Login as Client**
   - Navigate to: `http://localhost:3000/login`
   - Login with client credentials
   - Ensure this client has discrepancies

2. **Navigate to Weight Discrepancies**
   - Click "Weight Discrepancies" in sidebar
   - URL: `/weight-discrepancies`

3. **Verify Summary Cards**
   - Total Discrepancies shows correct count
   - Total Weight Difference shows sum
   - Total Deduction shows sum

4. **Verify Table**
   - Only this client's discrepancies appear
   - No other clients' data visible
   - All fields display correctly

5. **Test Filters**
   - Search by AWB
   - Filter by status
   - Verify filtering works

6. **Test Pagination**
   - If more than 25 discrepancies, test pagination
   - Change items per page
   - Navigate through pages

### Test 4: Transaction Verification

1. **Check Billing Page**
   - Navigate to `/billing`
   - Filter by transaction type: "Weight Discrepancy Charge"
   - Verify transactions appear

2. **Verify Wallet Deduction**
   - Check wallet balance before import
   - Import discrepancies
   - Check wallet balance after import
   - Balance should decrease by total deductions

3. **Check Transaction Details**
   - Click on transaction
   - Verify all fields correct
   - Verify AWB number matches
   - Verify order ID matches

### Test 5: Notifications

1. **Enable WebSocket**
   - Ensure WebSocket service running
   - Client should be connected

2. **Import Discrepancy**
   - Admin imports discrepancy for a logged-in client
   - Client should receive notification
   - Check notification content

## 🐛 Troubleshooting

### Issue: Excel Upload Fails

**Symptoms**: Error message on upload

**Solutions**:
- Check file format (.xlsx, .xls, .csv)
- Verify file size < 10MB
- Check column names match exactly
- Verify data in file
- Check server logs for errors

### Issue: AWB Not Found

**Symptoms**: Row imports fail with "AWB not found"

**Solutions**:
- Verify AWB exists in orders
- Check AWB format (14 digits)
- Verify scientific notation handling
- Check order has delhivery_data.waybill field

### Issue: Client Not Seeing Data

**Symptoms**: Client page shows "No discrepancies found"

**Solutions**:
- Verify client_id in discrepancy matches user_id
- Check authentication token valid
- Verify query filters
- Check database has data

### Issue: Wallet Not Deducting

**Symptoms**: Transactions created but wallet unchanged

**Solutions**:
- Check user.wallet_balance exists
- Verify user.save() called
- Check transaction amount
- Verify no errors in server logs

### Issue: Server Crashes

**Symptoms**: Server stops responding

**Solutions**:
- Check server logs for errors
- Verify xlsx package installed
- Check MongoDB connection
- Verify no memory issues

## 📊 Sample Test Data

### Excel File Format

| AWB number | Date of raising the weight mismatch | Status of AWB | Client Declared Weight | Delhivery Updated Weight | Delhivery Updated chargeable weight - Client Declared chargeable weight | Latest deduction - Initial manifestation cost |
|------------|-------------------------------------|---------------|------------------------|--------------------------|-------------------------------------------------------------------------|-----------------------------------------------|
| 44800710000125 | 10/30/2025 12:00 | In Transit | 5000 | 5890 | 890 | 34.22 |
| 44800710000126 | 10/30/2025 14:30 | Delivered | 1000 | 1200 | 200 | 18.50 |

### Before Upload Checklist

- [ ] Order with AWB 44800710000125 exists in database
- [ ] Order with AWB 44800710000126 exists in database
- [ ] Orders have correct user_id
- [ ] Clients have wallet_balance field
- [ ] Client is logged in (for notification test)

## 🔍 Debug Commands

### Backend Logs
```bash
# View server logs
tail -f logs/server.log

# MongoDB query to check discrepancies
db.weightdiscrepancies.find().pretty()

# MongoDB query to check transactions
db.transactions.find({ transaction_category: "weight_discrepancy_charge" }).pretty()

# MongoDB query to check wallet
db.users.findOne({ _id: ObjectId("client_id") }, { wallet_balance: 1 })
```

### Frontend Console
```javascript
// Check API response
console.log(response)

// Check discrepancies data
console.log(discrepancies)

// Check filter state
console.log(search, status, page)
```

## 📝 Post-Installation Notes

### Important Files Created

**Backend**:
- `backend/models/WeightDiscrepancy.js`
- `backend/routes/weightDiscrepancies.js`
- Modified: `backend/routes/admin.js`
- Modified: `backend/models/Transaction.js`
- Modified: `backend/server.js`

**Frontend**:
- `frontend/src/pages/AdminWeightDiscrepancies.tsx`
- `frontend/src/pages/AdminWeightDiscrepancies.css`
- `frontend/src/pages/WeightDiscrepancies.tsx`
- `frontend/src/pages/WeightDiscrepancies.css`
- Modified: `frontend/src/components/AdminLayout.tsx`
- Modified: `frontend/src/components/Layout.tsx`
- Modified: `frontend/src/App.tsx`

**Documentation**:
- `WEIGHT_DISCREPANCY_VARIABLE_MAP.md`
- `WEIGHT_DISCREPANCY_SYNC_VERIFICATION.md`
- `WEIGHT_DISCREPANCY_IMPLEMENTATION_SUMMARY.md`
- `INSTALLATION_GUIDE.md` (this file)

### Database Collections

- **weightdiscrepancies**: Auto-created on first save
- **transactions**: Updates include new category
- **orders**: No changes (used for lookup)
- **users**: No changes (used for client and wallet)

### Environment Variables

No new environment variables required. Existing configuration should work.

### Security Considerations

- Admin routes protected by admin auth middleware
- Client routes protected by JWT auth
- File upload limited to 10MB
- Excel parsing has error handling
- SQL injection prevented by Mongoose
- XSS prevented by React

## ✅ Success Criteria

Feature is successfully installed when:

- [x] Admin can upload Excel files
- [x] Import results display correctly
- [x] Discrepancies appear in admin table
- [x] Clients see only their discrepancies
- [x] Transactions created correctly
- [x] Wallet deductions work
- [x] Notifications sent
- [x] Filters work
- [x] Pagination works
- [x] No console errors
- [x] No server errors
- [x] UI responsive
- [x] All tests pass

## 🎉 Installation Complete!

If all verification steps pass, the Weight Discrepancies feature is successfully installed and ready for use!

For questions or issues, refer to:
- `WEIGHT_DISCREPANCY_IMPLEMENTATION_SUMMARY.md` for feature overview
- `WEIGHT_DISCREPANCY_VARIABLE_MAP.md` for technical details
- `WEIGHT_DISCREPANCY_SYNC_VERIFICATION.md` for variable verification

