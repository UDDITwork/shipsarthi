# Warehouse Creation Error Logging Guide

## Overview
Comprehensive error logging has been implemented for warehouse creation to help track and debug issues. Logs are written to both console and log files.

## Log Files Location
- **General logs**: `backend/logs/app-YYYY-MM-DD.log`
- **Error logs**: `backend/logs/error-YYYY-MM-DD.log`

## Backend Logging

### Request Identification
Each warehouse creation request is assigned a unique `requestId` for tracking:
```
warehouse_TIMESTAMP_RANDOMID
```

### Log Events

#### 1. Warehouse Creation Request Started
**Level**: INFO  
**Message**: `🏢 WAREHOUSE CREATION REQUEST`  
**Details**:
- Request ID
- User ID and email
- Warehouse name and title
- Raw phone number (before cleaning)
- Timestamp

#### 2. Validation Failed
**Level**: WARN  
**Message**: `⚠️ WAREHOUSE VALIDATION FAILED`  
**Details**:
- Request ID
- User ID
- Validation errors array
- Request body

#### 3. Phone Number Cleaning
**Level**: DEBUG  
**Message**: `📞 PHONE NUMBER CLEANED`  
**Details**:
- Request ID
- Original phone number
- Cleaned phone number

#### 4. Phone Numbers Processed
**Level**: INFO  
**Message**: `📞 PHONE NUMBERS PROCESSED`  
**Details**:
- Request ID
- Phone cleaning details for all phone fields

#### 5. Warehouse Data Prepared
**Level**: DEBUG  
**Message**: `📝 WAREHOUSE DATA PREPARED`  
**Details**:
- Request ID
- Key warehouse data fields (name, title, city, state, pincode, phone)
- Whether return address exists

#### 6. Database Save Success
**Level**: INFO  
**Message**: `✅ WAREHOUSE SAVED TO DATABASE`  
**Details**:
- Request ID
- Warehouse ID
- Warehouse name

#### 7. Database Save Error
**Level**: ERROR  
**Message**: `❌ DATABASE SAVE ERROR`  
**Details**:
- Request ID
- User ID
- Error message and stack trace
- Warehouse data
- Mongoose validation errors (if any)

#### 8. Delhivery Registration Attempt
**Level**: INFO  
**Message**: `🚀 ATTEMPTING DELHIVERY REGISTRATION`  
**Details**:
- Request ID
- Warehouse ID
- Delhivery data (name, city, pin)

#### 9. Warehouse Created Successfully
**Level**: INFO  
**Message**: `✅ WAREHOUSE CREATED SUCCESSFULLY`  
**Details**:
- Request ID
- Warehouse ID
- Warehouse name
- Delhivery registration status
- Duration in milliseconds

#### 10. Delhivery Registration Failed
**Level**: WARN  
**Message**: `⚠️ WAREHOUSE CREATED BUT DELHIVERY REGISTRATION FAILED`  
**Details**:
- Request ID
- Warehouse ID
- Warehouse name
- Delhivery error

#### 11. Warehouse Creation Error
**Level**: ERROR  
**Message**: `❌ WAREHOUSE CREATION ERROR`  
**Details**:
- Request ID
- User ID and email
- Error name, message, and stack trace
- Error code
- Duration
- Request body (key fields)
- Mongoose errors (if any)

## Frontend Logging

### Console Logs

#### 1. Request Sent
**Message**: `🚀 SENDING WAREHOUSE CREATION REQUEST`  
**Details**:
- Timestamp
- Warehouse data (name, title, phone, city, state, pincode)

#### 2. Success Response
**Message**: `✅ WAREHOUSE CREATED SUCCESSFULLY`  
**Details**:
- Timestamp
- Warehouse ID
- Warehouse name

#### 3. Error Occurred
**Message**: `❌ WAREHOUSE CREATION ERROR`  
**Details**:
- Timestamp
- Error type and message
- Status code and text
- Request data
- Response data
- Stack trace

#### 4. Validation Errors
**Message**: `🔍 Validation Errors`  
**Details**:
- Array of validation errors with field names and messages

## How to Use Logs for Debugging

### Step 1: Check Browser Console
When an error occurs, check the browser console for:
- Red error messages with `❌` emoji
- Request data that was sent
- Response data received
- Validation errors

### Step 2: Check Backend Logs
1. Navigate to `backend/logs/`
2. Open the latest `error-YYYY-MM-DD.log` file
3. Search for the `requestId` from the frontend console
4. Review the error details

### Step 3: Common Issues and Solutions

#### Issue: Phone Number Validation Failed
**Look for**: `⚠️ WAREHOUSE VALIDATION FAILED`  
**Check**: Phone number format - should be 10 digits without +91

#### Issue: Database Save Error
**Look for**: `❌ DATABASE SAVE ERROR`  
**Check**: 
- Mongoose validation errors
- Required fields missing
- Duplicate warehouse name

#### Issue: Delhivery Registration Failed
**Look for**: `⚠️ WAREHOUSE CREATED BUT DELHIVERY REGISTRATION FAILED`  
**Check**: 
- Delhivery API configuration
- Delhivery error message

#### Issue: Unknown Error
**Look for**: `❌ WAREHOUSE CREATION ERROR`  
**Check**:
- Error stack trace
- Request body data
- Mongoose errors

## Example Log Entry

```
[2025-01-26T10:30:45.123Z] [ERROR] [PID:12345] ❌ WAREHOUSE CREATION ERROR | Data: {
  "requestId": "warehouse_1706269845123_abc123",
  "userId": "507f1f77bcf86cd799439011",
  "userEmail": "user@example.com",
  "errorName": "ValidationError",
  "errorMessage": "Contact person phone: Please enter a valid phone number",
  "requestBody": {
    "name": "Test Warehouse",
    "title": "Test",
    "phone": "+917456886877",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "mongooseErrors": [
    {
      "field": "contact_person.phone",
      "message": "Please enter a valid phone number",
      "value": "+917456886877"
    }
  ]
}
```

## Log Levels
- **ERROR**: Critical errors that prevent warehouse creation
- **WARN**: Issues that don't prevent creation but need attention
- **INFO**: Normal operation events
- **DEBUG**: Detailed information for debugging

## Environment Variables
- `LOG_LEVEL`: Set log level (ERROR, WARN, INFO, DEBUG)
- `NODE_ENV`: Set to 'development' for detailed error responses

## Tips
1. Use `requestId` to trace a request from frontend to backend
2. Check phone number cleaning logs if validation fails
3. Review Mongoose errors for database validation issues
4. Check Delhivery logs separately if integration fails
5. Use timestamps to correlate frontend and backend logs

