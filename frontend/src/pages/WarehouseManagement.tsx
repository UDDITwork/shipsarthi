import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { warehouseService, Warehouse } from '../services/warehouseService';
import './WarehouseManagement.css';

const WarehouseManagement: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const warehousesData = await warehouseService.getWarehouses();
      setWarehouses(warehousesData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = () => {
    navigate('/warehouses/add');
  };

  const handleEditWarehouse = (warehouseId: string) => {
    navigate(`/warehouses/edit/${warehouseId}`);
  };

  const handleDeleteWarehouse = async (warehouseId: string, warehouseName: string) => {
    if (window.confirm(`Are you sure you want to delete "${warehouseName}"? This action cannot be undone.`)) {
      try {
        await warehouseService.deleteWarehouse(warehouseId);
        setWarehouses(warehouses.filter(w => w._id !== warehouseId));
      } catch (err: any) {
        alert(`Failed to delete warehouse: ${err.message}`);
      }
    }
  };

  const handleSetDefault = async (warehouseId: string) => {
    try {
      await warehouseService.setDefaultWarehouse(warehouseId);
      // Refresh warehouses to update default status
      fetchWarehouses();
    } catch (err: any) {
      alert(`Failed to set default warehouse: ${err.message}`);
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warehouse.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warehouse.address.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && warehouse.is_active) ||
                         (filterStatus === 'inactive' && !warehouse.is_active);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="warehouse-management">
          <div className="loading-container">
            <div className="loading">Loading warehouses...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="warehouse-management">
        {/* Header */}
        <div className="warehouse-header">
          <div className="header-left">
            <h1>Warehouse Management</h1>
            <p>Manage your warehouses and shipping locations</p>
          </div>
          <div className="header-right">
            <button 
              className="create-warehouse-btn"
              onClick={handleCreateWarehouse}
            >
              ➕ CREATE WAREHOUSE
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search warehouses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span>Error: {error}</span>
            <button onClick={fetchWarehouses} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* Warehouses List */}
        <div className="warehouses-section">
          {filteredWarehouses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>No warehouses found</h3>
              <p>
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first warehouse to get started'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <button 
                  className="create-first-btn"
                  onClick={handleCreateWarehouse}
                >
                  Create Warehouse
                </button>
              )}
            </div>
          ) : (
            <div className="warehouses-grid">
              {filteredWarehouses.map((warehouse) => (
                <div key={warehouse._id} className="warehouse-card">
                  <div className="warehouse-header-card">
                    <div className="warehouse-title">
                      <h3>{warehouse.title}</h3>
                      <span className="warehouse-name">{warehouse.name}</span>
                    </div>
                    <div className="warehouse-badges">
                      {warehouse.is_default && (
                        <span className="badge default-badge">Default</span>
                      )}
                      <span className={`badge status-badge ${warehouse.is_active ? 'active' : 'inactive'}`}>
                        {warehouse.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="warehouse-details">
                    <div className="detail-row">
                      <span className="detail-label">Contact Person:</span>
                      <span className="detail-value">{warehouse.contact_person.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">+91 {warehouse.contact_person.phone}</span>
                    </div>
                    {warehouse.contact_person.email && (
                      <div className="detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{warehouse.contact_person.email}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">
                        {warehouse.address.full_address}, {warehouse.address.city}, {warehouse.address.state} - {warehouse.address.pincode}
                      </span>
                    </div>
                    {warehouse.gstin && (
                      <div className="detail-row">
                        <span className="detail-label">GSTIN:</span>
                        <span className="detail-value">{warehouse.gstin}</span>
                      </div>
                    )}
                  </div>

                  <div className="warehouse-actions">
                    {!warehouse.is_default && (
                      <button
                        className="action-btn set-default-btn"
                        onClick={() => handleSetDefault(warehouse._id)}
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEditWarehouse(warehouse._id)}
                    >
                      Edit
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteWarehouse(warehouse._id, warehouse.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredWarehouses.length > 0 && (
          <div className="warehouse-summary">
            <p>
              Showing {filteredWarehouses.length} of {warehouses.length} warehouses
              {searchTerm && ` matching "${searchTerm}"`}
              {filterStatus !== 'all' && ` (${filterStatus} only)`}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WarehouseManagement;
