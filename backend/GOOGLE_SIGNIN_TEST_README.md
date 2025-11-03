# Google Sign-In Testing Guide

This guide will help you verify that Google Sign-In is working correctly in your Shipsarthi application.

## Quick Test

Run the automated test script:

```bash
cd backend
node test-google-signin.js
```

## Prerequisites

1. **Environment Variables** - Must be configured in `backend/.env`:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
   - `JWT_SECRET` - JWT secret for token generation
   - `MONGODB_URI` - MongoDB connection string

2. **Backend Server** - Must be running on port 5000

3. **Database** - MongoDB must be connected and accessible

## Test Script Features

The `test-google-signin.js` script performs the following tests:

### Test 1: Environment Variables
- Verifies `GOOGLE_CLIENT_ID` is set
- Verifies `JWT_SECRET` is set
- Verifies `MONGODB_URI` is set

### Test 2: Backend Server Health
- Checks if server is running on `http://localhost:5000`
- Verifies database connection
- Tests health check endpoint

### Test 3: Google Auth Endpoint
- Tests `/api/auth/google` endpoint accessibility
- Verifies endpoint handles invalid tokens correctly

### Test 4: Google Client ID Format
- Validates Google Client ID format
- Initializes OAuth2Client

### Test 5: Token Verification Logic
- Tests token verification structure
- Validates error handling

## Running the Tests

### Option 1: Full Test Suite
```bash
cd backend
node test-google-signin.js
# or
node test-google-signin.js full
```

### Option 2: Test Endpoint Only
```bash
node test-google-signin.js endpoint
```

## Manual Testing Steps

### 1. Start the Backend Server

```bash
cd backend
node server.js
# or for development
npm run dev
```

The server should start successfully on port 5000.

### 2. Run the Test Script

In another terminal:

```bash
cd backend
node test-google-signin.js
```

### 3. Verify Results

You should see all tests pass:

```
✅ All environment variables are configured
✅ Backend and database are operational
✅ Google auth endpoint is working
✅ Google Client ID is valid
✅ Token verification logic appears correct

🎉 All tests passed! Google Sign-In setup is correct.
```

## Integration Testing with Frontend

To fully test Google Sign-In, you need to test through the frontend UI:

### 1. Start Frontend
```bash
cd frontend
npm start
```

### 2. Navigate to Login/Register Page

Open `http://localhost:3000` and go to:
- Login page
- Register page

### 3. Click "Sign in with Google"

This will:
1. Open Google authentication popup
2. Let you select a Google account
3. Return a credential token
4. Call backend `/api/auth/google` endpoint
5. Verify token with Google
6. Create or login user
7. Return JWT token

### 4. Check Backend Logs

Watch for these logs:
- `Google OAuth attempt` - when user clicks button
- `Starting Google token verification...` - verifying with Google
- `Google token verified successfully` - token is valid
- `Google OAuth completed successfully` - user authenticated

## Troubleshooting

### Test Fails: "Backend server is not reachable"

**Solution**: Start the backend server first
```bash
cd backend
node server.js
```

### Test Fails: "Database is not connected"

**Solution**: Check MongoDB connection in `.env`
```bash
# In .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/...
```

### Test Fails: "GOOGLE_CLIENT_ID is not set"

**Solution**: Add Google credentials to `.env`
```bash
# In .env file
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google Sign-In Popup Doesn't Open in Browser

**Possible Causes**:
1. Frontend environment variables not set
2. Popup blocked by browser
3. Invalid Google Client ID

**Check**:
1. Frontend `.env` has `REACT_APP_GOOGLE_CLIENT_ID` set
2. Browser popup blocker is disabled
3. Google OAuth credentials are correctly configured

### "Invalid Google token" Error

**Possible Causes**:
1. Token expired (Google tokens expire quickly)
2. Wrong Client ID configured
3. CORS issues

**Solution**:
1. Check backend logs for specific error
2. Verify `GOOGLE_CLIENT_ID` matches frontend `REACT_APP_GOOGLE_CLIENT_ID`
3. Check CORS configuration in `server.js`

## API Endpoint Details

### POST /api/auth/google

**Request Body**:
```json
{
  "credential": "eyJhbGci...", // Google ID token
  "mode": "signin", // or "signup"
  "additionalData": { // Optional, for signup
    "company_name": "My Company",
    "phone_number": "1234567890",
    "state": "Maharashtra"
  }
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Logged in successfully with Google",
  "token": "eyJhbGci...",
  "user": {
    "_id": "...",
    "email": "user@gmail.com",
    "company_name": "...",
    ...
  },
  "isNewUser": false,
  "requires_phone_verification": false
}
```

**Response (Error)**:
```json
{
  "status": "error",
  "message": "Invalid Google token"
}
```

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Web](https://developers.google.com/identity/sign-in/web)
- Backend implementation: `backend/services/googleAuthService.js`
- Auth routes: `backend/routes/auth.js`

## Need Help?

If tests are still failing, check:
1. Backend logs in `logs/app-*.log`
2. Network tab in browser DevTools
3. Environment variables are correct
4. All services are running

For more detailed logs, check:
- `backend/logs/app-YYYY-MM-DD.log` - General logs
- `backend/logs/error-YYYY-MM-DD.log` - Error logs

