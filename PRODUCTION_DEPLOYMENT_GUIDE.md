# 🚀 Production Deployment Guide

## Environment Variables Setup

### Frontend (.env.production)
```bash
# Copy the production environment file
cp .env.production.example .env.production

# Update with your production values
REACT_APP_API_URL=https://api.shipsarthi.com/api
REACT_APP_WS_URL=wss://api.shipsarthi.com
REACT_APP_WS_HOST=api.shipsarthi.com
REACT_APP_WS_PORT=443
REACT_APP_ENV=production
```

### Backend (.env.production)
```bash
# Copy the production environment file
cp .env.production.example .env.production

# Update with your production values
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shipsarthi
WS_PROTOCOL=wss
WS_HOST=api.shipsarthi.com
```

## WebSocket Configuration

### Production WebSocket Setup
1. **SSL/TLS Required**: Use `wss://` for secure WebSocket connections
2. **Load Balancer**: Configure sticky sessions for WebSocket connections
3. **Firewall**: Open WebSocket port (usually same as HTTP port)
4. **Proxy**: Configure nginx/Apache for WebSocket proxying

### Nginx Configuration Example
```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 443 ssl;
    server_name api.shipsarthi.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # WebSocket Proxy
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

## Security Considerations

### 1. WebSocket Security
- ✅ Authentication required before message processing
- ✅ Rate limiting on WebSocket connections
- ✅ Input validation for all messages
- ✅ CORS configuration for WebSocket origins

### 2. Environment Security
- ✅ No hardcoded credentials
- ✅ Environment variables for all sensitive data
- ✅ Production vs development configurations
- ✅ Secure JWT secrets

### 3. Error Handling
- ✅ Comprehensive logging without sensitive data
- ✅ Graceful WebSocket reconnection
- ✅ Error boundaries in frontend
- ✅ Proper error responses

## Monitoring & Logging

### WebSocket Monitoring
```javascript
// Add to your monitoring system
const wsStats = websocketService.getStats();
console.log('WebSocket Stats:', {
  totalClients: wsStats.totalClients,
  activeConnections: wsStats.activeConnections,
  timestamp: new Date().toISOString()
});
```

### Health Check Endpoint
```javascript
// Add to backend routes
app.get('/health', (req, res) => {
  const wsStats = websocketService.getStats();
  res.json({
    status: 'healthy',
    websocket: {
      totalClients: wsStats.totalClients,
      activeConnections: wsStats.activeConnections
    },
    timestamp: new Date().toISOString()
  });
});
```

## Deployment Commands

### Frontend Build
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Serve with nginx or similar
```

### Backend Deployment
```bash
# Install dependencies
npm install

# Start with PM2 for production
pm2 start server.js --name shipsarthi-backend

# Or with Docker
docker build -t shipsarthi-backend .
docker run -d --name shipsarthi-backend -p 5000:5000 shipsarthi-backend
```

## Testing Production Setup

### 1. WebSocket Connection Test
```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://api.shipsarthi.com');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (error) => console.error('❌ WebSocket error:', error);
```

### 2. Authentication Test
```javascript
// Test authentication flow
ws.send(JSON.stringify({
  type: 'authenticate',
  user_id: 'test-user-id'
}));
```

### 3. Notification Test
```javascript
// Test notification delivery
// Use admin panel to update user category
// Verify real-time updates in client
```

## Troubleshooting

### Common Issues
1. **WebSocket Connection Failed**: Check SSL certificates and firewall
2. **Authentication Errors**: Verify user_id format and backend validation
3. **Message Not Received**: Check authentication status and message handlers
4. **Reconnection Issues**: Verify reconnection logic and network stability

### Debug Commands
```bash
# Check WebSocket connections
netstat -an | grep :5000

# Monitor logs
tail -f logs/app.log

# Check environment variables
printenv | grep REACT_APP
```
