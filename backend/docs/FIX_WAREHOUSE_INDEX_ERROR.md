# Fix for E11000 Duplicate Key Error on warehouse_id

## Problem
MongoDB error: `E11000 duplicate key error collection: test.warehouses index: warehouse_id_1 dup key: { warehouse_id: null }`

This error occurs when there's a unique index on a `warehouse_id` field that doesn't exist in the Warehouse schema anymore, or when multiple documents have `warehouse_id: null`.

## Solution

### Option 1: Run the Fix Script (Recommended)

Run the provided script to automatically fix the issue:

**Location**: `backend/scripts/fix-warehouse-index.js`

**Command**:
```bash
cd backend
node scripts/fix-warehouse-index.js
```

This script will:
1. Connect to your MongoDB database
2. List all current indexes
3. Remove the problematic `warehouse_id` unique index
4. Clean up any documents with `warehouse_id: null`
5. Show the final state of indexes

### Option 2: Manual MongoDB Fix

If you prefer to fix it manually:

1. **Connect to MongoDB**:
```bash
mongosh "your-mongodb-connection-string"
```

2. **Switch to your database**:
```javascript
use test  // or your database name
```

3. **Check current indexes**:
```javascript
db.warehouses.getIndexes()
```

4. **Remove the problematic index**:
```javascript
db.warehouses.dropIndex("warehouse_id_1")
```

5. **Clean up null warehouse_id fields** (if any):
```javascript
db.warehouses.updateMany(
  { warehouse_id: null },
  { $unset: { warehouse_id: "" } }
)
```

### Option 3: Fix via Backend Code

The Warehouse model has been updated with a post-save hook that will automatically attempt to remove the problematic index. However, this may not work if you don't have proper permissions, so manual removal is still recommended.

## Prevention

The Warehouse model schema does NOT include a `warehouse_id` field. The error is likely from:
- An old schema version that had this field
- A migration that created this index
- Manual database changes

The current Warehouse model uses:
- `_id` (MongoDB's default ObjectId)
- `warehouse_code` (unique, sparse index) - for business logic
- `user_id` - reference to the user who owns the warehouse

## Verification

After running the fix, verify the indexes are correct:

```javascript
db.warehouses.getIndexes()
```

You should see:
- `_id_` (unique, default MongoDB index)
- `user_id_1_is_active_1` (compound index)
- `user_id_1_name_1` (compound index)
- `address.pincode_1` (index)
- `warehouse_code_1` (unique, sparse) - if any warehouses have codes

You should NOT see:
- `warehouse_id_1` (unique index) ❌

## Additional Notes

- The `warehouse_code` field has a sparse unique index, meaning multiple null values are allowed
- The Warehouse model uses `_id` as the primary identifier
- If you need a warehouse ID for business logic, use `warehouse_code` instead

