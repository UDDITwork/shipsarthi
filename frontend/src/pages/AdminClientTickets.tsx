import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Clock, User, Phone, Mail, Building, Filter, Search, Send } from 'lucide-react';
import { adminService, AdminTicket, AdminClient } from '../services/adminService';
import './AdminClientTickets.css';

const AdminClientTickets: React.FC = () => {
  const { clientId, ticketId } = useParams<{ clientId: string; ticketId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [client, setClient] = useState<AdminClient | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [stats, setStats] = useState<{
    total_tickets: number;
    status_breakdown: { [key: string]: number };
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 10
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTickets: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch client details
  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  // Fetch tickets when filters change or component mounts
  useEffect(() => {
    if (clientId) {
      fetchTickets();
    }
  }, [clientId, filters.status, filters.category, filters.search, filters.page]);

  // Fetch selected ticket details when ticketId changes
  useEffect(() => {
    if (ticketId && clientId) {
      fetchTicketDetails(ticketId);
    } else {
      setSelectedTicket(null);
    }
  }, [ticketId, clientId]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.page > 1) params.set('page', filters.page.toString());
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const fetchClientDetails = async () => {
    try {
      const clientData = await adminService.getClientDetails(clientId!);
      setClient(clientData);
    } catch (err: any) {
      console.error('Error fetching client details:', err);
      setError(err.message || 'Failed to fetch client details');
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminService.getClientTickets(clientId!, {
        page: filters.page,
        limit: filters.limit,
        status: filters.status || undefined,
        category: filters.category || undefined
      });
      
      // Filter by search query on client side if provided
      let filteredTickets = response.data.tickets;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTickets = filteredTickets.filter(ticket =>
          ticket.subject?.toLowerCase().includes(searchLower) ||
          ticket.ticket_id?.toLowerCase().includes(searchLower) ||
          ticket.description?.toLowerCase().includes(searchLower)
        );
      }
      
      setTickets(filteredTickets);
      setStats(response.data.stats);
      setPagination(response.data.pagination);
      
      // If ticketId is in URL but ticket not found, clear it
      if (ticketId && !filteredTickets.find(t => t._id === ticketId)) {
        navigate(`/admin/clients/${clientId}/tickets`, { replace: true });
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketIdParam: string) => {
    try {
      const response = await adminService.getTicketDetails(ticketIdParam);
      setSelectedTicket(response.data);
    } catch (err: any) {
      console.error('Error fetching ticket details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch ticket details');
    }
  };

  const handleTicketSelect = (ticket: AdminTicket) => {
    navigate(`/admin/clients/${clientId}/tickets/${ticket._id}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendMessage = async (ticketIdParam: string) => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      
      await adminService.sendTicketMessage(ticketIdParam, newMessage, false);
      setNewMessage('');
      // Refresh ticket details
      await fetchTicketDetails(ticketIdParam);
      // Refresh tickets list
      await fetchTickets();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const updateTicketStatus = async (ticketIdParam: string, status: string) => {
    try {
      await adminService.updateTicketStatus(ticketIdParam, status);
      // Refresh ticket details
      await fetchTicketDetails(ticketIdParam);
      // Refresh tickets list
      await fetchTickets();
    } catch (err: any) {
      console.error('Error updating ticket status:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update ticket status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="w-3 h-3 bg-blue-500 rounded-full"></span>;
      case 'in_progress':
        return <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>;
      case 'waiting_customer':
        return <span className="w-3 h-3 bg-orange-500 rounded-full"></span>;
      case 'resolved':
        return <span className="w-3 h-3 bg-green-500 rounded-full"></span>;
      case 'closed':
        return <span className="w-3 h-3 bg-gray-500 rounded-full"></span>;
      case 'escalated':
        return <span className="w-3 h-3 bg-red-500 rounded-full"></span>;
      default:
        return <span className="w-3 h-3 bg-gray-500 rounded-full"></span>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waiting_customer':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'escalated':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="admin-client-tickets">
      {/* Header */}
      <div className="tickets-header">
        <div className="header-top">
          <button
            onClick={() => navigate('/admin/clients')}
            className="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Clients
          </button>
          <div className="header-title">
            <h1>Client Support Tickets</h1>
            {client && (
              <div className="client-info-header">
                <div className="client-info-item">
                  <Building className="w-4 h-4" />
                  <span>{client.company_name}</span>
                </div>
                <div className="client-info-item">
                  <Mail className="w-4 h-4" />
                  <span>{client.email}</span>
                </div>
                <div className="client-info-item">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone_number}</span>
                </div>
                {client.client_id && (
                  <div className="client-info-item">
                    <span className="text-xs text-gray-500">ID: {client.client_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="tickets-filters">
        <div className="search-box">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets by subject, ID, or description..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="pickup_delivery">Pickup & Delivery</option>
            <option value="shipment_ndr_rto">Shipment NDR/RTO</option>
            <option value="edit_shipment_info">Edit Shipment Info</option>
            <option value="shipment_dispute">Shipment Dispute</option>
            <option value="finance">Finance</option>
            <option value="billing_taxation">Billing & Taxation</option>
            <option value="claims">Claims</option>
            <option value="kyc_bank_verification">KYC & Bank Verification</option>
            <option value="technical_support">Technical Support</option>
            <option value="others">Others</option>
          </select>

          <button
            onClick={() => setFilters({ ...filters, status: '', category: '', search: '', page: 1 })}
            className="clear-filters-btn"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total Tickets:</span>
            <span className="stat-value">{stats.total_tickets}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Open:</span>
            <span className="stat-value text-blue-600">{stats.status_breakdown.open || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">In Progress:</span>
            <span className="stat-value text-yellow-600">{stats.status_breakdown.in_progress || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolved:</span>
            <span className="stat-value text-green-600">{stats.status_breakdown.resolved || 0}</span>
          </div>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="tickets-content">
        {/* Left Panel - Tickets List */}
        <div className="tickets-list-panel">
          <div className="panel-header">
            <h2>Tickets ({pagination.totalTickets})</h2>
            {loading && <div className="loading-indicator">Loading...</div>}
          </div>

          <div className="tickets-list">
            {loading && tickets.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading tickets...</p>
              </div>
            ) : error && tickets.length === 0 ? (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={fetchTickets} className="retry-button">
                  Retry
                </button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <MessageSquare className="w-12 h-12 text-gray-300" />
                <p>No tickets found</p>
                {filters.search || filters.status || filters.category ? (
                  <button
                    onClick={() => setFilters({ ...filters, status: '', category: '', search: '', page: 1 })}
                    className="clear-filters-link"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => handleTicketSelect(ticket)}
                    className={`ticket-card ${selectedTicket?._id === ticket._id ? 'selected' : ''}`}
                  >
                    <div className="ticket-card-header">
                      <div className="ticket-id-section">
                        {getStatusIcon(ticket.status)}
                        <span className="ticket-id">{ticket.ticket_id || ticket._id.slice(-8)}</span>
                      </div>
                      <div className="ticket-badges">
                        <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        <span className={`priority-badge ${getPriorityColor(ticket.priority || 'medium')}`}>
                          {ticket.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                    <div className="ticket-subject">{ticket.subject || 'No subject'}</div>
                    <div className="ticket-meta">
                      <span className="ticket-date">
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                      {ticket.category && (
                        <span className="ticket-category">{ticket.category}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    
                    <span className="pagination-info">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Ticket Details */}
        <div className="ticket-detail-panel">
          {selectedTicket ? (
            <>
              <div className="ticket-detail-header">
                <div>
                  <h2>{selectedTicket.ticket_id || selectedTicket._id.slice(-8)}</h2>
                  <div className="ticket-detail-meta">
                    <div className="ticket-detail-badges">
                      <span className={`status-badge ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                      <span className={`priority-badge ${getPriorityColor(selectedTicket.priority || 'medium')}`}>
                        {selectedTicket.priority || 'medium'}
                      </span>
                      {selectedTicket.category && (
                        <span className="category-badge">{selectedTicket.category}</span>
                      )}
                    </div>
                    <div className="ticket-detail-dates">
                      <span>Created: {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'Unknown'}</span>
                      {selectedTicket.updated_at && (
                        <span>Updated: {new Date(selectedTicket.updated_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ticket-detail-content">
                <div className="ticket-detail-section">
                  <h3>Subject</h3>
                  <p>{selectedTicket.subject || 'No subject'}</p>
                </div>

                <div className="ticket-detail-section">
                  <h3>Description</h3>
                  <div className="description-box">
                    {selectedTicket.description || 'No description provided'}
                  </div>
                </div>

                <div className="ticket-detail-section">
                  <h3>Conversation</h3>
                  <div className="conversation-list">
                    {selectedTicket.conversation && selectedTicket.conversation.length > 0 ? (
                      selectedTicket.conversation.map((message, index) => (
                        <div
                          key={index}
                          className={`conversation-message ${
                            message.message_type === 'admin' ? 'admin-message' :
                            message.message_type === 'user' ? 'user-message' :
                            'system-message'
                          }`}
                        >
                          <div className="message-header">
                            <span className="message-sender">{message.sender_name || 'Unknown'}</span>
                            <span className="message-time">
                              {message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Unknown time'}
                            </span>
                            {message.is_internal && (
                              <span className="internal-badge">Internal</span>
                            )}
                          </div>
                          <div className="message-content">
                            {message.message_content || message.message || 'No content'}
                          </div>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="message-attachments">
                              <strong>Attachments:</strong>
                              {message.attachments.map((attachment, idx) => (
                                <a
                                  key={idx}
                                  href={attachment.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="attachment-link"
                                >
                                  {attachment.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="no-conversation">
                        <MessageSquare className="w-8 h-8 text-gray-300" />
                        <p>No conversation yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="ticket-actions">
                  <h3>Admin Actions</h3>
                  
                  <div className="action-group">
                    <label>Update Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => updateTicketStatus(selectedTicket._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>

                  <div className="action-group">
                    <label>Send Message</label>
                    <div className="message-input-group">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="message-textarea"
                        rows={3}
                      />
                      <button
                        onClick={() => sendMessage(selectedTicket._id)}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="send-button"
                      >
                        {sendingMessage ? (
                          <>
                            <div className="spinner-small"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-ticket-selected">
              <MessageSquare className="w-16 h-16 text-gray-300" />
              <p>Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClientTickets;

