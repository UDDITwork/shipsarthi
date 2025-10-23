import React, { useState, useEffect } from 'react';
import { adminService, AdminClient, AdminClientsResponse } from '../services/adminService';
import './AdminClients.css';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug clients state changes
  useEffect(() => {
    console.log('👥 Clients state updated:', { 
      clientsCount: clients.length, 
      clients: clients,
      loading,
      error 
    });
  }, [clients, loading, error]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalClients: 0,
    hasNext: false,
    hasPrev: false
  });

  // Filters and search
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    user_type: '',
    sortBy: 'created_at',
    sortOrder: -1
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    // Only fetch data if admin is authenticated
    const isAuthenticated = localStorage.getItem('admin_authenticated');
    console.log('🔐 Admin authentication check:', isAuthenticated);
    if (isAuthenticated) {
      console.log('✅ Admin authenticated, fetching clients...');
      fetchClients();
    } else {
      console.log('❌ Admin not authenticated, skipping fetch');
      setLoading(false);
    }
  }, [page, filters]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching clients with params:', { page, limit, ...filters });
      const response: AdminClientsResponse = await adminService.getClients({
        page,
        limit,
        ...filters
      });
      
      console.log('📊 Clients API Response:', response);
      console.log('👥 Clients data:', response.data.clients);
      console.log('📄 Pagination data:', response.data.pagination);
      
      setClients(response.data.clients);
      setPagination(response.data.pagination);
    } catch (err: any) {
      console.error('❌ Error fetching clients:', err);
      setError(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusUpdate = async (clientId: string, newStatus: string) => {
    try {
      await adminService.updateClientStatus(clientId, newStatus);
      // Refresh the clients list
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to update client status');
    }
  };

  const handleKYCUpdate = async (clientId: string, kycStatus: string, notes?: string) => {
    try {
      await adminService.updateClientKYC(clientId, kycStatus, notes);
      // Refresh the clients list
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to update KYC status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending_verification': return '#F59E0B';
      case 'suspended': return '#EF4444';
      case 'inactive': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="admin-clients">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-clients">
      <div className="admin-header">
        <h1>Client Management</h1>
        <p>Manage all registered clients and their accounts</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by company, name, email, phone, or client ID..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.user_type}
            onChange={(e) => handleFilterChange('user_type', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="e-commerce-sellers">E-commerce Sellers</option>
            <option value="direct-to-consumer-brands">D2C Brands</option>
            <option value="manufacturers-wholesalers">Manufacturers</option>
            <option value="corporate-enterprise">Corporate</option>
            <option value="courier-service-providers">Courier Services</option>
            <option value="individual-shippers">Individual Shippers</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="created_at">Sort by Date</option>
            <option value="company_name">Sort by Company</option>
            <option value="account_status">Sort by Status</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="filter-select"
          >
            <option value="-1">Newest First</option>
            <option value="1">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="clients-section">
        <div className="section-header">
          <h2>Clients ({pagination.totalClients})</h2>
          {loading && <div className="loading-indicator">Loading...</div>}
        </div>

        <div className="clients-table-container">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Client ID</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Status</th>
                <th>KYC</th>
                <th>Stats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client._id}>
                  <td>
                    <span className="client-id">{client.client_id}</span>
                  </td>
                  <td>
                    <div className="company-info">
                      <strong>{client.company_name}</strong>
                      <small>{client.your_name}</small>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div>{client.email}</div>
                      <small>{client.phone_number}</small>
                    </div>
                  </td>
                  <td>
                    <span className="user-type">
                      {client.user_type.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <select
                      value={client.account_status}
                      onChange={(e) => handleStatusUpdate(client._id, e.target.value)}
                      className="status-select"
                      style={{ backgroundColor: getStatusColor(client.account_status) }}
                    >
                      <option value="active">Active</option>
                      <option value="pending_verification">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={client.kyc_status.status}
                      onChange={(e) => handleKYCUpdate(client._id, e.target.value)}
                      className="kyc-select"
                      style={{ backgroundColor: getKYCStatusColor(client.kyc_status.status) }}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td>
                    <div className="stats-info">
                      <div>Orders: {client.stats.orders}</div>
                      <div>Packages: {client.stats.packages}</div>
                      <div>Customers: {client.stats.customers}</div>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-btn"
                        onClick={() => {
                          // Navigate to client details
                          window.location.href = `/admin/clients/${client._id}`;
                        }}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={!pagination.hasPrev}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={!pagination.hasNext}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminClients;
