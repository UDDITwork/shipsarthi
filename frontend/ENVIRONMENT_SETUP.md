# Environment Configuration Guide

## Overview
The application automatically detects the environment (development/production) and configures API URLs accordingly.

## Automatic Environment Detection

The code automatically detects the environment based on:
- **Hostname**: `localhost`, `127.0.0.1`, `0.0.0.0` = Development
- **Port**: `3000`, `3001` = Development
- **Manual Override**: `REACT_APP_ENVIRONMENT` variable

## Environment Variables

### Development (.env)
```bash
# Environment will be auto-detected by code
# REACT_APP_ENVIRONMENT = development
REACT_APP_PRODUCTION_API_URL = https://shipsarthi.onrender.com/api
REACT_APP_API_URL = http://localhost:5000/api
REACT_APP_APP_NAME = Shipsarthi
REACT_APP_VERSION = 1.0.0
```

### Production (.env.production)
```bash
REACT_APP_ENVIRONMENT=production
REACT_APP_PRODUCTION_API_URL=https://shipsarthi.onrender.com/api
REACT_APP_API_URL=https://shipsarthi.onrender.com/api
REACT_APP_APP_NAME=Shipsarthi
REACT_APP_VERSION=1.0.0
```

## How It Works

1. **Auto-Detection**: Code checks hostname and port
2. **Manual Override**: If `REACT_APP_ENVIRONMENT` is set, it takes priority
3. **API URL Selection**:
   - **Development**: Uses `REACT_APP_API_URL` or defaults to `http://localhost:5000/api`
   - **Production**: Uses `REACT_APP_PRODUCTION_API_URL` or `REACT_APP_API_URL` or defaults to `https://shipsarthi.onrender.com/api`

## Deployment

### Development
```bash
npm start
# Automatically detects development environment
# Uses localhost:5000 API
```

### Production
```bash
npm run build
# Automatically detects production environment
# Uses production API URL
```

## Console Logs

The application logs detailed environment information:
```
🔧 ENVIRONMENT CONFIGURATION:
  - hostname: localhost
  - port: 3000
  - autoDetected: development
  - finalEnvironment: development
  - apiUrl: http://localhost:5000/api
```

## Troubleshooting

1. **Wrong API URL**: Check console logs for environment detection
2. **CORS Issues**: Ensure backend allows the detected origin
3. **Environment Override**: Check if `REACT_APP_ENVIRONMENT` is set incorrectly
