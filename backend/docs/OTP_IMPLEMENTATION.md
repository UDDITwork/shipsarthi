# OTP Authentication Implementation

This document describes the OTP-based phone number verification system implemented using MSG91.

## Overview

The OTP authentication system ensures that users verify their phone numbers during registration and login. This adds an extra layer of security and ensures that users have access to the phone number they registered with.

## Architecture

### Backend Components

1. **MSG91 Service** (`services/msg91Service.js`)
   - Handles all MSG91 API interactions
   - Send OTP, Verify OTP, Resend OTP
   - Mobile number validation and formatting

2. **User Model Updates** (`models/User.js`)
   - Added OTP-related fields:
     - `otp_verified`: Boolean flag for OTP verification status
     - `otp_token`: Hashed OTP token for verification
     - `otp_expires`: OTP expiration timestamp
     - `otp_attempts`: Number of failed OTP attempts
     - `otp_locked_until`: Lock timestamp for too many attempts

3. **OTP Routes** (`routes/otp.js`)
   - `POST /api/otp/send` - Send OTP to phone number
   - `POST /api/otp/verify` - Verify OTP code
   - `POST /api/otp/resend` - Resend OTP (SMS/Voice)
   - `GET /api/otp/status/:phone_number` - Check OTP status

4. **Updated Auth Routes** (`routes/auth.js`)
   - Registration now requires OTP verification
   - Login blocks users without OTP verification
   - Account status set to 'pending_verification' until OTP verified

### Frontend Components

1. **OTP Service** (`services/otpService.ts`)
   - TypeScript service for OTP API calls
   - Handles send, verify, resend, and status operations

2. **OTP Verification Modal** (`components/OTPVerificationModal.tsx`)
   - React component for OTP input and verification
   - Auto-send OTP on modal open
   - Resend functionality with cooldown
   - SMS/Voice retry options

3. **Updated Registration Flow** (`pages/Register.tsx`)
   - Shows OTP modal after successful registration
   - Handles OTP verification success/failure
   - Redirects to login after successful verification

4. **Updated Login Flow** (`pages/Login.tsx`)
   - Detects OTP verification requirement
   - Shows OTP modal for unverified users
   - Allows login after successful OTP verification

## API Endpoints

### Send OTP
```http
POST /api/otp/send
Content-Type: application/json

{
  "phone_number": "9876543210"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP sent successfully to your phone number",
  "phone_number": "9876543210",
  "expires_in": 300
}
```

### Verify OTP
```http
POST /api/otp/verify
Content-Type: application/json

{
  "phone_number": "9876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Phone number verified successfully",
  "user": {
    "_id": "user_id",
    "phone_number": "9876543210",
    "phone_verified": true,
    "otp_verified": true
  }
}
```

### Resend OTP
```http
POST /api/otp/resend
Content-Type: application/json

{
  "phone_number": "9876543210",
  "retry_type": "sms"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP resent successfully via SMS",
  "phone_number": "9876543210",
  "retry_type": "sms",
  "expires_in": 300
}
```

### Check OTP Status
```http
GET /api/otp/status/9876543210
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "phone_number": "9876543210",
    "phone_verified": false,
    "otp_verified": false,
    "is_locked": false,
    "lock_time_remaining": 0,
    "otp_attempts": 0,
    "has_otp_token": true,
    "otp_expires": "2024-01-01T12:00:00.000Z"
  }
}
```

## Security Features

### Rate Limiting
- Maximum 3 OTP attempts per phone number
- 15-minute lock after 3 failed attempts
- 60-second cooldown between OTP sends

### Token Security
- OTP tokens are hashed using SHA-256
- Tokens expire after 5 minutes
- Tokens are cleared after successful verification

### Input Validation
- Phone number format validation (10-digit Indian numbers)
- OTP format validation (4-6 digits)
- Email format validation

## Environment Variables

Add these to your `.env` file:

```env
# MSG91 Configuration
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_TEMPLATE_ID=your_template_id_here
MSG91_OTP_EXPIRY=5
```

## MSG91 Setup

1. **Create MSG91 Account**
   - Sign up at [MSG91](https://msg91.com)
   - Get your Auth Key from the dashboard

2. **Create OTP Template**
   - Go to Templates section
   - Create a new OTP template
   - Note the Template ID

3. **Configure Environment**
   - Add MSG91_AUTH_KEY to your environment
   - Add MSG91_TEMPLATE_ID to your environment
   - Set MSG91_OTP_EXPIRY (default: 5 minutes)

## Testing

### Manual Testing
1. Register a new user
2. Verify OTP modal appears
3. Check OTP is sent to phone
4. Enter correct OTP
5. Verify account is activated
6. Test login without OTP (should fail)
7. Test login after OTP verification (should succeed)

### Automated Testing
Run the test script:
```bash
cd backend
node test-otp-flow.js
```

## Error Handling

### Common Error Scenarios
1. **Invalid Phone Number**: Returns 400 with validation error
2. **User Not Found**: Returns 404 when phone number not registered
3. **OTP Locked**: Returns 423 when too many failed attempts
4. **Invalid OTP**: Returns 400 with error message
5. **Expired OTP**: Returns 400 with expiration message
6. **Already Verified**: Returns 400 when phone already verified

### Frontend Error Handling
- Network errors are caught and displayed
- OTP input validation prevents invalid submissions
- Resend cooldown prevents spam
- Modal can be closed and reopened

## User Experience Flow

### Registration Flow
1. User fills registration form
2. Form submits to backend
3. User created with `pending_verification` status
4. OTP modal appears automatically
5. OTP sent to user's phone
6. User enters OTP code
7. OTP verified, account activated
8. User redirected to login

### Login Flow
1. User enters credentials
2. If OTP not verified, login blocked
3. OTP modal appears with phone number
4. User verifies OTP
5. Login successful, redirected to dashboard

## Monitoring and Logging

All OTP operations are logged with:
- User ID and phone number
- Operation type (send/verify/resend)
- Success/failure status
- Error messages
- Response times

## Future Enhancements

1. **SMS Templates**: Customizable OTP message templates
2. **Voice OTP**: Voice call OTP delivery
3. **International Support**: Support for international phone numbers
4. **Analytics**: OTP delivery and verification analytics
5. **Backup Methods**: Email OTP as backup
6. **Admin Panel**: OTP management interface

## Troubleshooting

### Common Issues
1. **OTP Not Received**: Check MSG91 configuration and phone number format
2. **Invalid OTP**: Ensure OTP is entered within 5 minutes
3. **Account Locked**: Wait 15 minutes or contact support
4. **Template Issues**: Verify MSG91 template is active

### Debug Steps
1. Check MSG91 dashboard for delivery status
2. Verify environment variables
3. Check server logs for errors
4. Test with different phone numbers
5. Verify network connectivity to MSG91

## Support

For issues related to:
- **MSG91 Integration**: Check MSG91 documentation
- **Backend Issues**: Check server logs
- **Frontend Issues**: Check browser console
- **Database Issues**: Check MongoDB connection
