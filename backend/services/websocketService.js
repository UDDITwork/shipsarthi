const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    try {
      this.wss = new WebSocket.Server({ server });
      
      this.wss.on('connection', (ws, req) => {
        const clientId = this.generateClientId();
        this.clients.set(clientId, ws);
        
        logger.info('🔌 WebSocket client connected', { clientId, totalClients: this.clients.size });
        
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleMessage(clientId, data);
          } catch (error) {
            logger.error('Error parsing WebSocket message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
          }
        });
        
        ws.on('close', (code, reason) => {
          this.clients.delete(clientId);
          logger.info('🔌 WebSocket client disconnected', { 
            clientId, 
            code, 
            reason: reason.toString(), 
            totalClients: this.clients.size 
          });
        });
        
        ws.on('error', (error) => {
          logger.error('WebSocket error:', error);
          this.clients.delete(clientId);
        });
      });
      
      this.wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });
      
      logger.info('🔌 WebSocket server initialized');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
    }
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(clientId, data) {
    logger.info('🔌 WebSocket message received', { clientId, data });
    
    // Handle different message types
    switch (data.type) {
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'subscribe':
        // Handle subscription to specific channels
        this.sendToClient(clientId, { type: 'subscribed', channel: data.channel });
        break;
      case 'unsubscribe':
        // Handle unsubscription
        this.sendToClient(clientId, { type: 'unsubscribed', channel: data.channel });
        break;
      default:
        logger.info('Unknown message type:', data.type);
        this.sendToClient(clientId, { type: 'error', message: 'Unknown message type' });
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let errorCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('Error sending message to client:', { clientId, error });
          this.clients.delete(clientId);
        }
      } else {
        // Remove closed connections
        this.clients.delete(clientId);
      }
    });
    
    logger.info('🔌 Message broadcasted to clients', { 
      message, 
      successCount,
      errorCount,
      totalClients: this.clients.size 
    });
  }

  broadcastToAdmins(message) {
    // For now, broadcast to all clients
    // In a real app, you'd filter by admin role
    this.broadcast(message);
  }

  // Cleanup method for graceful shutdown
  cleanup() {
    logger.info('🔌 Cleaning up WebSocket service...');
    
    // Close all client connections
    this.clients.forEach((client, clientId) => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1000, 'Server shutting down');
        }
      } catch (error) {
        logger.error('Error closing client connection:', { clientId, error });
      }
    });
    
    // Clear clients map
    this.clients.clear();
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        logger.info('🔌 WebSocket server closed');
      });
    }
  }

  // Get connection statistics
  getStats() {
    return {
      totalClients: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(
        client => client.readyState === WebSocket.OPEN
      ).length
    };
  }

  notifyNewTicket(ticketData) {
    const notification = {
      _id: ticketData._id || ticketData.ticket_id,
      type: 'new_ticket',
      title: 'New Ticket Created',
      message: `Ticket ${ticketData.ticket_id} created by ${ticketData.client_name}`,
      ticket_id: ticketData.ticket_id,
      client_name: ticketData.client_name,
      created_at: new Date().toISOString(),
      is_read: false,
      data: ticketData
    };
    
    this.broadcastToAdmins(notification);
    logger.info('🔔 New ticket notification sent', { ticketData });
  }

  notifyTicketUpdate(ticketData) {
    const notification = {
      type: 'ticket_update',
      title: 'Ticket Updated',
      message: `Ticket ${ticketData.ticket_id} has been updated`,
      ticket_id: ticketData.ticket_id,
      client_name: ticketData.client_name,
      created_at: new Date().toISOString(),
      data: ticketData
    };
    
    this.broadcastToAdmins(notification);
    logger.info('🔔 Ticket update notification sent', { ticketData });
  }

  notifyNewMessage(ticketData, messageData) {
    const notification = {
      type: 'message_received',
      title: 'New Message Received',
      message: `New message in ticket ${ticketData.ticket_id}`,
      ticket_id: ticketData.ticket_id,
      client_name: ticketData.client_name,
      created_at: new Date().toISOString(),
      data: { ticket: ticketData, message: messageData }
    };
    
    this.broadcastToAdmins(notification);
    logger.info('🔔 New message notification sent', { ticketData, messageData });
  }
}

module.exports = new WebSocketService();
