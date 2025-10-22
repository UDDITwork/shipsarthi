// Location: frontend/src/pages/Customers.tsx
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import customerService, { Customer, CustomerSearchParams, CustomerStats } from '../services/customerService';
import './Customers.css';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 10
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'blocked' | 'all'>('active');
  const [channelFilter, setChannelFilter] = useState<'custom' | 'order_creation' | 'import' | 'api' | 'all'>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState(-1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [searchTerm, statusFilter, channelFilter, sortBy, sortOrder]);

  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const params: CustomerSearchParams = {
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter,
        channel: channelFilter,
        sortBy,
        sortOrder
      };

      const response = await customerService.getCustomers(params);
      setCustomers(response.customers);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await customerService.getCustomerStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching customer stats:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchCustomers(newPage);
  };

  const handleStatusChange = async (customerId: string, newStatus: 'active' | 'inactive' | 'blocked') => {
    try {
      await customerService.updateCustomerStatus(customerId, newStatus);
      fetchCustomers(pagination.current_page);
      fetchStats();
      alert(`Customer ${newStatus === 'active' ? 'activated' : newStatus + 'd'} successfully`);
    } catch (error) {
      console.error('Error updating customer status:', error);
      alert('Failed to update customer status');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerService.deleteCustomer(customerId);
        fetchCustomers(pagination.current_page);
        fetchStats();
        alert('Customer deleted successfully');
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Failed to delete customer. Customer may have existing orders.');
      }
    }
  };

  const formatPhone = (phone: string) => {
    return `+91 ${phone}`;
  };

  const formatAddress = (customer: Customer) => {
    const { address } = customer;
    return `${address.full_address}, ${address.city}, ${address.state}, ${address.pincode}`;
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'status-badge active',
      inactive: 'status-badge inactive',
      blocked: 'status-badge blocked'
    };
    return (
      <span className={statusClasses[status as keyof typeof statusClasses] || 'status-badge'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading && customers.length === 0) {
    return (
      <Layout>
        <div className="customers-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading customers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="customers-container">
        {/* Header */}
        <div className="customers-header">
          <div className="header-left">
            <h1>Customers</h1>
            {stats && (
              <div className="stats-summary">
                <span>Total: {stats.total_customers}</span>
                <span>Active: {stats.active_customers}</span>
              </div>
            )}
          </div>
          <div className="header-right">
            <button 
              className="add-customer-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Add New
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="search-filter-bar">
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <select 
                value="name" 
                className="search-dropdown"
                disabled
              >
                <option value="name">Name</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
              </select>
              <input
                type="text"
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                🔍
              </button>
            </form>
          </div>
          <div className="filter-section">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
            <select 
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Channels</option>
              <option value="custom">Custom</option>
              <option value="order_creation">Order Creation</option>
              <option value="import">Import</option>
              <option value="api">API</option>
            </select>
          </div>
          <div className="refresh-section">
            <button 
              onClick={() => fetchCustomers(pagination.current_page)}
              className="refresh-btn"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="customers-table-container">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td>
                    <div className="customer-name">
                      {customer.name}
                    </div>
                  </td>
                  <td>
                    <div className="customer-phone">
                      {formatPhone(customer.phone)}
                    </div>
                  </td>
                  <td>
                    <div className="customer-email">
                      {customer.email || '--'}
                    </div>
                  </td>
                  <td>
                    <div className="customer-address">
                      {formatAddress(customer)}
                    </div>
                  </td>
                  <td>
                    <div className="customer-channel">
                      {customer.channel.charAt(0).toUpperCase() + customer.channel.slice(1)}
                    </div>
                  </td>
                  <td>
                    {getStatusBadge(customer.status)}
                  </td>
                  <td>
                    <div className="customer-orders">
                      {customer.total_orders}
                    </div>
                  </td>
                  <td>
                    <div className="action-dropdown">
                      <button className="action-btn">
                        ▼
                      </button>
                      <div className="dropdown-menu">
                        <button onClick={() => {
                          setSelectedCustomer(customer);
                          setShowEditModal(true);
                        }}>
                          Edit
                        </button>
                        <button onClick={() => handleStatusChange(customer._id, 
                          customer.status === 'active' ? 'inactive' : 'active'
                        )}>
                          {customer.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteCustomer(customer._id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && !loading && (
            <div className="empty-state">
              <p>No customers found</p>
              <button 
                className="add-first-customer-btn"
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Customer
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => handlePageChange(1)}
              disabled={pagination.current_page === 1}
              className="pagination-btn"
            >
              K
            </button>
            <button 
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="pagination-btn"
            >
              &lt;
            </button>
            
            {Array.from({ length: Math.min(7, pagination.total_pages) }, (_, i) => {
              let pageNum: number;
              if (pagination.total_pages <= 7) {
                pageNum = i + 1;
              } else if (pagination.current_page <= 4) {
                pageNum = i + 1;
              } else if (pagination.current_page >= pagination.total_pages - 3) {
                pageNum = pagination.total_pages - 6 + i;
              } else {
                pageNum = pagination.current_page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`pagination-btn ${pagination.current_page === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button 
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.total_pages}
              className="pagination-btn"
            >
              &gt;
            </button>
            <button 
              onClick={() => handlePageChange(pagination.total_pages)}
              disabled={pagination.current_page === pagination.total_pages}
              className="pagination-btn"
            >
              &gt;I
            </button>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Customer</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Add customer functionality will be implemented here.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Customer</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Edit customer functionality will be implemented here.</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Customers;
