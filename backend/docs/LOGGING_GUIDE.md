# Comprehensive Logging Guide

## Overview
This application has been enhanced with comprehensive logging for registration, login, and dashboard operations. All logs are written to both console and log files for easy debugging and monitoring.

## Log Levels
- **ERROR**: Critical errors that need immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: General information about operations
- **DEBUG**: Detailed debugging information

## Log Files Location
- **General Logs**: `backend/logs/app-YYYY-MM-DD.log`
- **Error Logs**: `backend/logs/error-YYYY-MM-DD.log`

## Authentication Logging

### Registration Process
The registration process logs the following events:
1. **Registration attempt started** - Initial request with IP and user agent
2. **Registration data extracted** - User data validation
3. **Checking for existing user** - Duplicate user check
4. **User existence check completed** - Result of duplicate check
5. **User created successfully** - Successful user creation with details
6. **JWT token generated** - Token creation
7. **Registration completed successfully** - Final success with response time

### Login Process
The login process logs the following events:
1. **Login attempt started** - Initial request with credentials
2. **Login credentials received** - Credential validation
3. **Searching for user** - User lookup by email/phone
4. **User found for login attempt** - User details and account status
5. **Verifying password** - Password validation start
6. **Password verification completed** - Password validation result
7. **Password verified successfully** - Successful authentication
8. **JWT token generated** - Token creation with expiry
9. **Login completed successfully** - Final success with response time

### Password Reset Process
The password reset process logs:
1. **Forgot password request started** - Initial request
2. **User found for password reset** - User lookup
3. **Password reset token generated** - Token creation
4. **Forgot password completed successfully** - Success confirmation
5. **Reset password request started** - Reset attempt
6. **User found for password reset** - Token validation
7. **Password reset completed successfully** - Final success

## Dashboard Logging

### Overview Metrics
- **Dashboard overview request started** - Initial request
- **Dashboard overview - calculating metrics** - Date range calculations
- **Dashboard overview completed successfully** - Success with metrics data

### Shipment Status
- **Shipment status request started** - Initial request
- **Shipment status completed successfully** - Success with status counts

### NDR Status
- **NDR status request started** - Initial request
- **NDR status completed successfully** - Success with NDR counts

### COD Status
- **COD status request started** - Initial request
- **COD status completed successfully** - Success with COD data

### Wallet Transactions
- **Wallet transactions request started** - Initial request with limit
- **Wallet transactions completed successfully** - Success with transaction count

### Shipment Distribution
- **Shipment distribution request started** - Initial request
- **Shipment distribution completed successfully** - Success with distribution data

### Support Overview
- **Support overview request started** - Initial request
- **Support overview completed successfully** - Success with support metrics

### Recent Activity
- **Recent activity request started** - Initial request with limit
- **Recent activity completed successfully** - Success with activity counts

### Performance Metrics
- **Performance metrics request started** - Initial request with period
- **Performance metrics - calculating stats** - Date range and calculations
- **Performance metrics completed successfully** - Success with performance data

## Error Logging
All errors are logged with:
- Error message and stack trace
- User ID (when available)
- Request details (IP, user agent)
- Response time
- Request body (for debugging)

## Monitoring Commands

### View Real-time Logs
```bash
# View all logs in real-time
tail -f backend/logs/app-$(date +%Y-%m-%d).log

# View only errors
tail -f backend/logs/error-$(date +%Y-%m-%d).log

# View logs with colors (if using less)
less -R backend/logs/app-$(date +%Y-%m-%d).log
```

### Filter Logs by Operation
```bash
# Filter registration logs
grep "Registration" backend/logs/app-$(date +%Y-%m-%d).log

# Filter login logs
grep "Login" backend/logs/app-$(date +%Y-%m-%d).log

# Filter dashboard logs
grep "Dashboard" backend/logs/app-$(date +%Y-%m-%d).log

# Filter error logs
grep "ERROR" backend/logs/app-$(date +%Y-%m-%d).log
```

### Search for Specific User
```bash
# Search logs for specific user ID
grep "userId.*USER_ID" backend/logs/app-$(date +%Y-%m-%d).log

# Search logs for specific email
grep "email.*user@example.com" backend/logs/app-$(date +%Y-%m-%d).log
```

## Log Format
Each log entry includes:
- **Timestamp**: ISO format with timezone
- **Log Level**: ERROR, WARN, INFO, DEBUG
- **Process ID**: For multi-process debugging
- **Message**: Human-readable description
- **Data**: JSON object with relevant details

Example log entry:
```
[2025-01-18T17:53:14.132Z] [INFO] [PID:12972] Login completed successfully | Data: {
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "company_name": "Test Company",
  "responseTime": "245ms"
}
```

## Environment Variables
- `LOG_LEVEL`: Set log level (ERROR, WARN, INFO, DEBUG) - defaults to DEBUG
- `JWT_SECRET`: Secret for JWT token generation
- `JWT_EXPIRE`: JWT token expiry time - defaults to '7d'

## Best Practices
1. **Monitor Error Logs**: Check error logs regularly for issues
2. **Track Performance**: Monitor response times for optimization
3. **User Activity**: Use logs to track user behavior and issues
4. **Security**: Monitor failed login attempts and suspicious activity
5. **Debugging**: Use DEBUG level for detailed troubleshooting

## Troubleshooting Common Issues

### High Response Times
- Check database connection logs
- Monitor aggregation query performance
- Look for slow API calls

### Authentication Failures
- Check user existence in logs
- Verify password validation steps
- Monitor account lockout attempts

### Dashboard Data Issues
- Check aggregation query results
- Verify date range calculations
- Monitor database connection status

### Memory Issues
- Monitor log file sizes
- Check for memory leaks in long-running processes
- Rotate log files regularly

