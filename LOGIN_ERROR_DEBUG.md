# Login 500 Error - Debugging Guide

## Error Summary
- **Error**: `POST /api/auth/login 500 (Internal Server Error)`
- **Location**: `backend/routes/auth.js`
- **Status**: Enhanced error handling added

## Changes Made

### 1. Enhanced Error Logging
- Added detailed error information including:
  - Error name and message
  - Database connection state
  - JWT_SECRET availability check
  - Error code

### 2. JWT_SECRET Validation
- Added check before token generation
- Returns clear error if JWT_SECRET is missing

### 3. Token Generation Error Handling
- Wrapped token generation in try-catch
- Provides specific error message for token failures

### 4. Improved Error Messages
- More specific error messages for different failure scenarios:
  - JWT configuration errors
  - Database connection errors
  - Generic server errors

## Common Causes of 500 Error

### 1. Missing JWT_SECRET Environment Variable
**Symptom**: Error occurs when generating token
**Solution**: Ensure `JWT_SECRET` is set in environment variables

```bash
# Check if JWT_SECRET is set
echo $JWT_SECRET

# Or in .env file
JWT_SECRET=your-secret-key-here
```

### 2. Database Connection Issues
**Symptom**: Error occurs when querying user
**Solution**: Check database connection

```javascript
// Check database state
mongoose.connection.readyState
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
```

### 3. Missing User Model Methods
**Symptom**: Error when calling `findByEmailOrPhone` or `comparePassword`
**Solution**: Verify User model is properly loaded

### 4. Logger Issues
**Symptom**: Error when logging (unlikely to cause 500, but possible)
**Solution**: Logger has fallback to console.error

## Debugging Steps

### Step 1: Check Server Logs
Look for detailed error logs with:
- Error message
- Error name
- Stack trace
- Database state
- JWT_SECRET status

### Step 2: Verify Environment Variables
```bash
# Required environment variables:
JWT_SECRET=your-secret-key
MONGO_URI=your-mongodb-connection-string
```

### Step 3: Test Database Connection
```javascript
// In backend console or test script
const mongoose = require('mongoose');
console.log('DB State:', mongoose.connection.readyState);
```

### Step 4: Check User Model
```javascript
// Verify User model is loaded
const User = require('./models/User');
console.log('User model methods:', Object.keys(User.schema.methods));
console.log('User model statics:', Object.keys(User.schema.statics));
```

## Expected Behavior After Fix

1. **Missing JWT_SECRET**: Returns 500 with message "Server configuration error. Please contact support."
2. **Database Error**: Returns 503 with message "Database connection error. Please try again in a moment."
3. **Token Generation Error**: Returns 500 with message "Server error generating authentication token"
4. **Other Errors**: Returns 500 with generic message (detailed error in development mode)

## Testing

Test the login endpoint with:
```bash
curl -X POST https://shipsarthi.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

Check the response for:
- Status code
- Error message
- (In development) Error details

## Next Steps

1. **Check server logs** on Render dashboard for detailed error information
2. **Verify environment variables** are set correctly
3. **Test database connection** separately
4. **Review error logs** with the enhanced logging now in place

The enhanced error handling will now provide more specific information about what's causing the 500 error.

