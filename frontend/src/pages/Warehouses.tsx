import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { warehouseService } from '../services/warehouseService';
import './Warehouses.css';

interface Warehouse {
  _id: string;
  name: string;
  title: string;
  contact_person: {
    name: string;
    phone: string;
    alternative_phone?: string;
    email?: string;
  };
  address: {
    full_address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  return_address?: {
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstin?: string;
  support_contact?: {
    email?: string;
    phone?: string;
  };
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const Warehouses: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      alert('Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWarehouse = () => {
    navigate('/add-warehouse');
  };

  const handleEditWarehouse = (warehouseId: string) => {
    navigate(`/edit-warehouse/${warehouseId}`);
  };

  const handleDeleteWarehouse = async (warehouseId: string, warehouseName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete warehouse "${warehouseName}"?`);
    if (!confirmed) return;

    try {
      await warehouseService.deleteWarehouse(warehouseId);
      alert('Warehouse deleted successfully!');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      alert(`Failed to delete warehouse: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSetDefault = async (warehouseId: string) => {
    try {
      await warehouseService.setDefaultWarehouse(warehouseId);
      alert('Default warehouse updated successfully!');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error setting default warehouse:', error);
      alert(`Failed to set default warehouse: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Layout>
      <div className="warehouses-container">
        {/* Header */}
        <div className="warehouses-header">
          <div className="header-left">
            <h1>Warehouses</h1>
            <p>Manage your warehouse locations</p>
          </div>
          <div className="header-right">
            <button className="add-warehouse-btn" onClick={handleAddWarehouse}>
              ➕ Create Warehouse
            </button>
          </div>
        </div>

        {/* Warehouse List */}
        <div className="warehouses-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading warehouses...</p>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>No warehouses found</h3>
              <p>Create your first warehouse to get started</p>
              <button className="create-first-btn" onClick={handleAddWarehouse}>
                Create Warehouse
              </button>
            </div>
          ) : (
            <div className="warehouses-grid">
              {warehouses.map((warehouse) => (
                <div key={warehouse._id} className="warehouse-card">
                  <div className="warehouse-header">
                    <div className="warehouse-title">
                      <h3>{warehouse.title}</h3>
                      {warehouse.is_default && (
                        <span className="default-badge">Default</span>
                      )}
                    </div>
                    <div className="warehouse-status">
                      <span className={`status-badge ${warehouse.is_active ? 'active' : 'inactive'}`}>
                        {warehouse.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="warehouse-details">
                    <div className="detail-row">
                      <span className="label">Name:</span>
                      <span className="value">{warehouse.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Contact:</span>
                      <span className="value">{warehouse.contact_person.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">+91 {warehouse.contact_person.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Address:</span>
                      <span className="value">
                        {warehouse.address.full_address}, {warehouse.address.city}, 
                        {warehouse.address.state} - {warehouse.address.pincode}
                      </span>
                    </div>
                    {warehouse.gstin && (
                      <div className="detail-row">
                        <span className="label">GSTIN:</span>
                        <span className="value">{warehouse.gstin}</span>
                      </div>
                    )}
                  </div>

                  <div className="warehouse-actions">
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEditWarehouse(warehouse._id)}
                    >
                      ✏️ Edit
                    </button>
                    {!warehouse.is_default && (
                      <button 
                        className="action-btn default-btn"
                        onClick={() => handleSetDefault(warehouse._id)}
                      >
                        ⭐ Set Default
                      </button>
                    )}
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteWarehouse(warehouse._id, warehouse.title)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Warehouses;
