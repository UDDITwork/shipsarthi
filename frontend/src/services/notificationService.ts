import { environmentConfig } from '../config/environment';

class NotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private listeners: Array<(notification: any) => void> = [];
  private userId: string | null = null;

  connect(userId?: string) {
    // Prevent multiple connections
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected');
      return;
    }
    
    // Clean up existing connection if any
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
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
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.reconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔌 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(this.userId || undefined);
      }, this.reconnectInterval);
    } else {
      console.error('🔌 Max reconnection attempts reached');
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
