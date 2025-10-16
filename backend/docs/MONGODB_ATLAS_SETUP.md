# MongoDB Atlas Setup Guide for Shipsarthi

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free" and create account
3. Choose "Shared" (Free tier) for development
4. Select region closest to your users (e.g., Mumbai for India)

## Step 2: Create Cluster

1. **Cluster Name**: `shipsarthi-cluster`
2. **Provider**: AWS (recommended)
3. **Region**: ap-south-1 (Mumbai) for India users
4. **Tier**: M0 Sandbox (Free)
5. Click "Create Cluster"

## Step 3: Database Access Setup

1. Go to **Database Access** in left sidebar
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `shipsarthi-admin`
5. **Password**: Generate secure password (save it!)
6. **Database User Privileges**: Read and write to any database
7. Click **"Add User"**

## Step 4: Network Access Setup

1. Go to **Network Access** in left sidebar
2. Click **"Add IP Address"**
3. **For Development**: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. **For Production**: Add your server's specific IP address
5. Click **"Confirm"**

## Step 5: Get Connection String

1. Go to **Clusters** and click **"Connect"**
2. Choose **"Connect your application"**
3. **Driver**: Node.js
4. **Version**: 4.1 or later
5. Copy the connection string (looks like this):
   ```
   mongodb+srv://shipsarthi-admin:<password>@shipsarthi-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Update Environment Variables

Update your `.env` file:

```bash
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://shipsarthi-admin:YOUR_PASSWORD@shipsarthi-cluster.xxxxx.mongodb.net/shipsarthi?retryWrites=true&w=majority

# Optional: For better performance
MONGODB_OPTIONS_POOL_SIZE=10
MONGODB_OPTIONS_BUFFER_MAX_ENTRIES=0
MONGODB_OPTIONS_USE_NEW_URL_PARSER=true
MONGODB_OPTIONS_USE_UNIFIED_TOPOLOGY=true
```

**Important**: Replace `YOUR_PASSWORD` with the actual password you created!

## Step 7: Database Structure

Atlas will automatically create these collections when you start using the app:

```
shipsarthi/
├── users
├── orders
├── ndrs
├── supports
├── warehouses
├── transactions
└── sessions
```

## Step 8: Test Connection

Run this to test your connection:

```bash
# Backend directory
cd backend
npm run test-db

# Or start the server and check logs
npm start
```

Look for: `✅ Connected to MongoDB` in console

## Step 9: Initial Data Setup

The system will automatically create indexes and initial data on first run. You can also manually add:

### Sample Admin User
```javascript
// Login to Atlas and go to Collections
// Add to 'users' collection:
{
  "name": "Admin User",
  "email": "admin@shipsarthi.com",
  "password": "$2a$10$hashed_password_here",
  "role": "admin",
  "is_verified": true,
  "created_at": new Date()
}
```

## Step 10: Production Optimization

### For Production Deployment:

1. **Upgrade Cluster**: Move from M0 (free) to M10+ for better performance
2. **Enable Backup**: Go to Cluster → Backup tab
3. **Set up Monitoring**: Enable MongoDB alerts
4. **IP Whitelist**: Remove 0.0.0.0/0 and add only your server IPs
5. **Connection Pooling**: Update connection options

### Recommended Production Settings:

```bash
# Production .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/shipsarthi?retryWrites=true&w=majority&maxPoolSize=20&minPoolSize=5
```

## Common Issues & Solutions

### 1. Connection Timeout
**Error**: `MongoNetworkTimeoutError`
**Solution**: Check IP whitelist, ensure 0.0.0.0/0 is added for development

### 2. Authentication Failed
**Error**: `MongoServerError: Authentication failed`
**Solution**: Double-check username/password in connection string

### 3. Database Not Found
**Error**: `Database 'shipsarthi' not found`
**Solution**: Database creates automatically on first write operation

### 4. Network Error
**Error**: `MongoNetworkError: connection timed out`
**Solution**: Check internet connection and Atlas cluster status

## Monitoring & Maintenance

### Atlas Dashboard Metrics:
- **Connections**: Monitor active connections
- **Operations**: Track read/write operations
- **Network**: Monitor data transfer
- **Storage**: Track database size

### Set Up Alerts:
1. Go to **Alerts** in Atlas
2. Create alerts for:
   - High connection count
   - High query execution time
   - Storage usage > 80%

## Backup Strategy

### Atlas Automatic Backups:
- **M10+**: Continuous backup with point-in-time recovery
- **M0**: No automatic backup (manual export recommended)

### Manual Backup Commands:
```bash
# Export specific collection
mongoexport --uri="mongodb+srv://..." --collection=orders --out=orders_backup.json

# Import collection
mongoimport --uri="mongodb+srv://..." --collection=orders --file=orders_backup.json
```

## Security Best Practices

1. **Use Strong Passwords**: Minimum 12 characters with mixed case
2. **Rotate Credentials**: Change passwords every 90 days
3. **Limit IP Access**: Only allow necessary IP addresses
4. **Monitor Access**: Review connection logs regularly
5. **Use Read-Only Users**: For reporting/analytics

## Cost Optimization

### Free Tier Limits (M0):
- **Storage**: 512 MB
- **RAM**: Shared
- **Connections**: 500 concurrent
- **Network**: No data transfer charges

### When to Upgrade:
- Storage > 400 MB
- Connections > 300 concurrent
- Need dedicated RAM
- Require backups

## Sample Connection Code

```javascript
// Test connection script
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};
```

Your MongoDB Atlas setup is now complete! The database will automatically scale as your Shipsarthi platform grows.