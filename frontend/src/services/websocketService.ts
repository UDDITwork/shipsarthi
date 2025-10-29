class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnecting = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isAuthenticated = false;

  connect(userId: string) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isAuthenticated = false;
    
    try {
      // Production-ready WebSocket URL configuration
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.REACT_APP_WS_HOST || window.location.hostname;
      const port = process.env.REACT_APP_WS_PORT || (window.location.port || '5000');
      const wsUrl = process.env.REACT_APP_WS_URL || `${protocol}//${host}:${port}`;
      
      this.ws = new WebSocket(`${wsUrl}?userId=${userId}`);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send authentication message
        this.sendMessage({
          type: 'authenticate',
          user_id: userId
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected', { code: event.code, reason: event.reason });
        this.isConnecting = false;
        this.isAuthenticated = false;
        this.handleReconnect(userId);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.isAuthenticated = false;
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      this.isAuthenticated = false;
    }
  }

  private handleReconnect(userId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(userId);
      }, this.reconnectInterval);
    } else {
      console.log('❌ Max reconnection attempts reached');
    }
  }

  private handleMessage(data: any) {
    console.log('📨 WebSocket message received:', data);

    // Handle authentication response
    if (data.type === 'authenticated') {
      console.log('✅ WebSocket authenticated for user:', data.user_id);
      this.isAuthenticated = true;
      return;
    }

    // Handle errors
    if (data.type === 'error') {
      console.error('❌ WebSocket error:', data.message);
      this.isAuthenticated = false;
      return;
    }

    // Only process messages if authenticated
    if (!this.isAuthenticated) {
      console.warn('⚠️ Received message before authentication:', data);
      return;
    }

    // Handle user category update notifications
    if (data.type === 'user_category_updated') {
      console.log('🏷️ User category updated notification received:', data);
      
      // Trigger user data refresh
      if (this.messageHandlers.has('user_category_updated')) {
        this.messageHandlers.get('user_category_updated')!(data);
      }
    }

    // Handle wallet balance updates
    if (data.type === 'wallet_balance_update') {
      console.log('💰 Wallet balance update received:', data);
      
      if (this.messageHandlers.has('wallet_balance_update')) {
        this.messageHandlers.get('wallet_balance_update')!(data);
      }
    }

    // Handle general notifications
    if (data.type === 'notification') {
      console.log('🔔 Notification received:', data);
      
      if (this.messageHandlers.has('notification')) {
        this.messageHandlers.get('notification')!(data);
      }
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      isAuthenticated: this.isAuthenticated,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Ping the server to check connection
  ping() {
    if (this.isAuthenticated) {
      return this.sendMessage({ type: 'ping' });
    }
    return false;
  }
}

export const websocketService = new WebSocketService();
