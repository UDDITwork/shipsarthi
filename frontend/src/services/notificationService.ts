import { environmentConfig } from '../config/environment';

class NotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: Array<(notification: any) => void> = [];
  private userId: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;

  connect(userId?: string) {
    // Prevent multiple connections - check all states
    if (this.ws) {
      const state = this.ws.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.log('🔌 WebSocket already connected or connecting, state:', state);
        // Update userId if connection is open but userId changed
        if (state === WebSocket.OPEN && userId && this.userId !== userId) {
          this.userId = userId;
          this.ws.send(JSON.stringify({
            type: 'authenticate',
            user_id: userId
          }));
        }
        return;
      }
      
      // Connection is closed or closing, clean it up
      if (state === WebSocket.CLOSING || state === WebSocket.CLOSED) {
        this.ws = null;
      } else {
        // Clean up existing connection
        this.ws.close();
        this.ws = null;
      }
    }
    
    // Clear any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isManualDisconnect = false;
    
    // Store user ID for reconnection
    if (userId) {
      this.userId = userId;
    }
    
    const wsUrl = environmentConfig.wsUrl;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Authenticate with user ID if available
        if (this.userId) {
          this.ws?.send(JSON.stringify({
            type: 'authenticate',
            user_id: this.userId
          }));
          console.log('🔌 WebSocket authentication sent', { user_id: this.userId });
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle authentication response
          if (data.type === 'authenticated') {
            console.log('🔌 WebSocket authenticated successfully', { user_id: data.user_id });
            return;
          }
          
          // Handle other notifications
          this.listeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        // Code 1001 = "Going Away" (normal navigation/refresh) - common and expected
        // Code 1000 = Normal closure
        // Code 1005 = No status received (abnormal closure, often browser tab closing)
        // Code 1006 = Abnormal closure
        
        console.log('🔌 WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          userId: this.userId ? 'present' : 'missing',
          isManual: this.isManualDisconnect
        });
        
        // Clear the connection reference
        this.ws = null;
        
        // Don't reconnect if manually disconnected
        if (this.isManualDisconnect) {
          console.log('🔌 Manual disconnect - not reconnecting');
          return;
        }
        
        // Don't reconnect for normal navigation/refresh (code 1001) or normal closure (code 1000)
        // The page will create a new connection when it loads
        if (event.code === 1000 || event.code === 1001) {
          console.log('🔌 Normal disconnect - not auto-reconnecting (page will reconnect on load)');
          this.reconnectAttempts = 0;
          return;
        }
        
        // Only reconnect for abnormal closures (1005, 1006) or other errors
        // And only if we have a userId
        if (this.userId && (event.code === 1005 || event.code === 1006 || !event.wasClean)) {
          console.log('🔌 Abnormal disconnect - will attempt to reconnect');
          // Clear any existing timeout
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          
          // Reconnect after a delay
          this.reconnectTimeout = setTimeout(() => {
            // Only reconnect if still no connection and we have userId
            if (!this.ws && this.userId && !this.isManualDisconnect) {
              this.reconnect();
            }
          }, this.reconnectInterval);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close connection
    if (this.ws) {
      try {
        this.ws.close(1000, 'Manual disconnect');
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.ws = null;
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
  }

  private reconnect() {
    // Don't reconnect if manually disconnected
    if (this.isManualDisconnect) {
      console.log('🔌 Reconnect cancelled - manual disconnect');
      return;
    }
    
    // Don't reconnect if already connected or connecting
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('🔌 Already connected/connecting - skipping reconnect');
      return;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔌 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      // Clear any existing timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        // Double-check before connecting
        if (!this.isManualDisconnect && this.userId) {
          this.connect(this.userId);
        }
      }, this.reconnectInterval);
    } else {
      console.error('🔌 Max reconnection attempts reached');
      // Reset after a longer delay before trying again
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts = 0;
        if (this.userId && !this.isManualDisconnect) {
          this.connect(this.userId);
        }
      }, 60000); // Wait 1 minute before resetting attempts
    }
  }

  subscribe(listener: (notification: any) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }
}

export const notificationService = new NotificationService();
