import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { ticketService, Ticket, TicketStats } from '../services/ticketService';
import './Support.css';

type TicketStatus = 'open' | 'resolved' | 'closed' | 'all';
type TicketTab = 'tickets' | 'training';

// Remove duplicate Ticket interface - using from ticketService

interface Category {
  value: string;
  label: string;
  description: string;
}

const Support: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TicketTab>('tickets');
  const [activeStatus, setActiveStatus] = useState<TicketStatus>('open');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [awbNumbers, setAwbNumbers] = useState('');
  const [comment, setComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Statistics
  const [stats, setStats] = useState<TicketStats['status_counts']>({
    open: 0,
    resolved: 0,
    closed: 0,
    all: 0
  });

  const categories: Category[] = [
    {
      value: 'pickup_delivery',
      label: 'Pickup & Delivery',
      description: 'Pickup/delivery delay / RTO escalation, mismatch in tracking status, etc'
    },
    {
      value: 'shipment_ndr_rto',
      label: 'Shipment NDR & RTO',
      description: 'NDR reattempts, courier fake attempts, RTO requests'
    },
    {
      value: 'edit_shipment_info',
      label: 'Edit Shipment Info',
      description: 'Update in Address, pincode, phone, change payment type'
    },
    {
      value: 'shipment_dispute',
      label: 'Shipment Dispute',
      description: 'Issues related to delivered shipments, status mismatch, incorrect weight charged'
    },
    {
      value: 'finance',
      label: 'Finance',
      description: 'Remittance status, wallet management, recharge issues, plan upgrade/downgrade'
    },
    {
      value: 'billing_taxation',
      label: 'Billing & Taxation',
      description: 'Billing issue or request an account ledger statement, GST or TDS form'
    },
    {
      value: 'claims',
      label: 'Claims',
      description: 'Lost or damaged shipment, request a refund via bank transfer, or inquire about credit note'
    },
    {
      value: 'kyc_bank_verification',
      label: 'KYC & Bank Verification',
      description: 'Issues related to KYC and Bank Account verification'
    },
    {
      value: 'technical_support',
      label: 'Technical Support',
      description: 'Channel connection errors, order management, API auth errors, serviceability issues'
    },
    {
      value: 'others',
      label: 'Others',
      description: 'Enter your query'
    }
  ];

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [activeStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await ticketService.getTickets({ status: activeStatus });
      setTickets(response.tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      alert('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await ticketService.getStats();
      setStats(response.status_counts);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate file sizes
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

      setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    const awbArray = awbNumbers.split(',').map(s => s.trim()).filter(Boolean);
    if (awbArray.length > 10) {
      alert('Maximum 10 AWB numbers allowed');
      return;
    }

    setLoading(true);

    try {
      const response = await ticketService.createTicket({
        category: selectedCategory,
        awb_numbers: awbNumbers,
        comment: comment,
        files: selectedFiles
      });
      
      alert('Ticket created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchTickets();
      fetchStats();

    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setAwbNumbers('');
    setComment('');
    setSelectedFiles([]);
  };

  return (
    <Layout>
      <div className="support-container">
        {/* Support Header */}
        <div className="support-header">
          <div className="support-contact-banner">
            <h3>Have a query ?</h3>
            <p>Connect us at +91 9636369672 | Email - support@shipsarthi.com</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="support-tabs">
          <button
            className={`support-tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            📧 Tickets
          </button>
          <button
            className={`support-tab ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            📚 Training
          </button>
        </div>

        {activeTab === 'tickets' && (
          <>
            {/* Status Tabs */}
            <div className="ticket-status-tabs">
              <button
                className={`status-tab ${activeStatus === 'open' ? 'active' : ''}`}
                onClick={() => setActiveStatus('open')}
              >
                📧 Open
              </button>
              <button
                className={`status-tab ${activeStatus === 'resolved' ? 'active' : ''}`}
                onClick={() => setActiveStatus('resolved')}
              >
                ✅ Resolved
              </button>
              <button
                className={`status-tab ${activeStatus === 'closed' ? 'active' : ''}`}
                onClick={() => setActiveStatus('closed')}
              >
                🔒 Closed
              </button>
              <button
                className={`status-tab ${activeStatus === 'all' ? 'active' : ''}`}
                onClick={() => setActiveStatus('all')}
              >
                📋 All
              </button>
            </div>

            {/* Filters and Actions */}
            <div className="ticket-filters">
              <div className="date-filter">
                <input type="date" /> to <input type="date" />
              </div>
              <div className="search-filters">
                <input type="text" placeholder="Search by AWB" className="search-input" />
                <input type="text" placeholder="Search by order id" className="search-input" />
              </div>
              <button className="raise-ticket-btn" onClick={() => setShowCreateModal(true)}>
                🎫 Raise Ticket
              </button>
              <button className="help-btn">🔄</button>
            </div>

            {/* Tickets Table */}
            <div className="tickets-table-container">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Category</th>
                    <th>Order Details</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="loading-cell">Loading tickets...</td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="no-data-cell">
                        <div className="no-tickets">
                          <div className="no-tickets-icon">🎫</div>
                          <h3>No tickets found</h3>
                          <p>Create your first support ticket</p>
                          <button onClick={() => setShowCreateModal(true)}>Raise Ticket</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tickets.map(ticket => (
                      <tr key={ticket._id}>
                        <td>{ticket.ticket_id}</td>
                        <td>{ticket.category}</td>
                        <td>{ticket.awb_numbers.join(', ')}</td>
                        <td>
                          <span className={`status-badge ${ticket.status}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td>{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                        <td>
                          <button className="action-btn">Add Comment</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'training' && (
          <div className="training-content">
            <h2>Training Resources</h2>
            <p>Training materials coming soon...</p>
          </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Raise Ticket</h2>
                <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
              </div>

              <form className="ticket-form" onSubmit={handleSubmit}>
                {/* Category Selection */}
                <div className="form-group">
                  <label>Select Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Description */}
                {selectedCategory && (
                  <div className="category-description">
                    {categories.find(c => c.value === selectedCategory)?.description}
                  </div>
                )}

                {/* AWB Numbers */}
                <div className="form-group">
                  <label>AWB Numbers (Separated with Comma)</label>
                  <input
                    type="text"
                    placeholder="Enter awb numbers"
                    value={awbNumbers}
                    onChange={(e) => setAwbNumbers(e.target.value)}
                  />
                  <small>Only 10 AWB numbers can be uploaded at a time</small>
                </div>

                {/* Comment */}
                <div className="form-group">
                  <label>Comment</label>
                  <textarea
                    placeholder="Enter 6 digit pincode&#10;Enter 6 digit pincode&#10;Enter 6 digit pincode"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={5}
                    required
                  />
                  <small>Maximum 500 characters</small>
                </div>

                {/* File Attachment */}
                <div className="form-group">
                  <label>Attach File</label>
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload" className="file-upload-btn">
                      <span>Select file</span>
                      <span className="upload-icon">☁️</span>
                    </label>
                  </div>
                  <small>Max file size: Image - 2MB, Audio - 5MB, Video - 5MB, Document - 5MB</small>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="selected-files">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="file-item">
                          <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                          <button type="button" onClick={() => removeFile(index)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>

            {/* Category Sidebar */}
            {!selectedCategory && (
              <div className="category-sidebar">
                {categories.map(cat => (
                  <div
                    key={cat.value}
                    className="category-card"
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    <h4>{cat.label}</h4>
                    <p>{cat.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Support;