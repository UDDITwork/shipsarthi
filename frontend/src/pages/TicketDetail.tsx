import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ticketService, Ticket } from '../services/ticketService';
import { ArrowLeft, Send, Paperclip, User, MessageSquare } from 'lucide-react';
import './TicketDetail.css';

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  const fetchTicket = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const ticketData = await ticketService.getTicket(id);
      setTicket(ticketData);
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      alert(error.response?.data?.message || 'Failed to load ticket');
      navigate('/support');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const invalidFiles = files.filter(file => {
        if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) return true;
        if (file.type.startsWith('audio/') && file.size > 5 * 1024 * 1024) return true;
        if (file.type.startsWith('video/') && file.size > 5 * 1024 * 1024) return true;
        if (file.type.startsWith('application/') && file.size > 5 * 1024 * 1024) return true;
        return false;
      });

      if (invalidFiles.length > 0) {
        alert('Some files exceed the size limit:\nImage: 2MB, Audio/Video/Document: 5MB');
        return;
      }

      setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      alert('Please enter a message or attach a file');
      return;
    }

    if (!id) return;

    try {
      setSending(true);
      await ticketService.addComment(id, {
        comment: newMessage,
        files: selectedFiles
      });
      setNewMessage('');
      setSelectedFiles([]);
      await fetchTicket(); // Refresh ticket to show new message
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'waiting_customer': return '#f97316';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      case 'escalated': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="ticket-detail-container">
          <div className="loading">Loading ticket...</div>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <div className="ticket-detail-container">
          <div className="error">Ticket not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="ticket-detail-container">
        <div className="ticket-detail-header">
          <button className="back-btn" onClick={() => navigate('/support')}>
            <ArrowLeft size={20} /> Back to Tickets
          </button>
          <div className="ticket-header-info">
            <h1>Ticket #{ticket.ticket_id}</h1>
            <span 
              className="status-badge" 
              style={{ backgroundColor: getStatusColor(ticket.status) }}
            >
              {ticket.status}
            </span>
          </div>
        </div>

        <div className="ticket-info-section">
          <div className="info-row">
            <span className="info-label">Category:</span>
            <span className="info-value">{ticket.category}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Priority:</span>
            <span className="info-value">{ticket.priority}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Created:</span>
            <span className="info-value">{formatDate(ticket.created_at || ticket.createdAt || undefined)}</span>
          </div>
          {ticket.awb_numbers && ticket.awb_numbers.length > 0 && (
            <div className="info-row">
              <span className="info-label">AWB Numbers:</span>
              <span className="info-value">{ticket.awb_numbers.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="conversation-section">
          <h2>Conversation</h2>
          <div className="conversation-messages">
            {ticket.conversation && ticket.conversation.length > 0 ? (
              ticket.conversation.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.message_type === 'user' ? 'message-user' : 'message-admin'}`}
                >
                  <div className="message-header">
                    <div className="message-sender">
                      {msg.message_type === 'user' ? (
                        <User size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                      <span className="sender-name">
                        {msg.message_type === 'user' ? 'You' : msg.sender_name || 'Admin'}
                      </span>
                    </div>
                    <span className="message-time">
                      {formatDate(msg.timestamp || msg.created_at || undefined)}
                    </span>
                  </div>
                  <div className="message-content">
                    {msg.message_content || msg.message || msg.comment}
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="message-attachments">
                      {msg.attachments.map((att, attIndex) => (
                        <a 
                          key={attIndex} 
                          href={att.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          <Paperclip size={14} />
                          {att.file_name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-messages">No messages yet</div>
            )}
          </div>
        </div>

        <div className="reply-section">
          <h3>Add Reply</h3>
          <textarea
            className="reply-input"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={4}
          />
          <div className="file-upload-section">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="file-upload-btn">
              <Paperclip size={16} /> Attach Files
            </label>
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <span>{file.name}</span>
                    <button onClick={() => removeFile(index)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            className="send-btn" 
            onClick={handleSendMessage}
            disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default TicketDetail;

