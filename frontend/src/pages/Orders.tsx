import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import './Orders.css';

// Order Status Types
type OrderStatus = 'new' | 'ready_to_ship' | 'pickups_manifests' | 'in_transit' | 
                   'out_for_delivery' | 'delivered' | 'ndr' | 'rto' | 'all' | 'lost';

type OrderType = 'forward' | 'reverse';

interface Order {
  _id: string;
  orderId: string;
  referenceId: string;
  orderDate: Date;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  pin: string;
  city: string;
  state: string;
  productName: string;
  quantity: number;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  paymentMode: 'COD' | 'Prepaid' | 'Pickup' | 'REPL';
  codAmount?: number;
  totalAmount: number;
  warehouse: string;
  pickupLocation: string;
  status: OrderStatus;
  awb?: string;
  trackingUrl?: string;
  pickupRequestId?: string;
  pickupRequestStatus?: 'pending' | 'scheduled' | 'in_transit' | 'completed' | 'failed';
  pickupRequestDate?: Date;
  pickupRequestTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderFilters {
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  searchType: 'reference' | 'awb' | 'order';
  paymentMode?: string;
  state?: string;
  minAmount?: number;
  maxAmount?: number;
}

const Orders: React.FC = () => {
  // State Management
  const [activeTab, setActiveTab] = useState<OrderStatus>('new');
  const [orderType, setOrderType] = useState<OrderType>('forward');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  // Filter States
  const [filters, setFilters] = useState<OrderFilters>({
    dateFrom: '',
    dateTo: '',
    searchQuery: '',
    searchType: 'order',
  });

  // Modal States
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);

  // Fetch Orders on component mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [activeTab, orderType, filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // API call to fetch orders
      // const response = await orderService.getOrders({
      //   status: activeTab,
      //   type: orderType,
      //   ...filters
      // });
      // setOrders(response.data);
      
      // Dummy data for now
      setOrders([]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    setLoading(true);
    try {
      // API call to sync orders with Delhivery
      // await orderService.syncOrders();
      alert('Orders synced successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Error syncing orders:', error);
      alert('Failed to sync orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = () => {
    setIsBulkImportModalOpen(true);
  };

  const handleAddOrder = () => {
    setIsAddOrderModalOpen(true);
  };

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order._id));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // Export logic
    console.log('Exporting as:', format);
  };

  return (
    <Layout>
      <div className="orders-container">
        {/* Top Action Bar */}
        <div className="orders-top-bar">
          <div className="order-type-toggle">
            <button
              className={`toggle-btn ${orderType === 'forward' ? 'active' : ''}`}
              onClick={() => setOrderType('forward')}
            >
              Forward
            </button>
            <button
              className={`toggle-btn ${orderType === 'reverse' ? 'active' : ''}`}
              onClick={() => setOrderType('reverse')}
            >
              Reverse
            </button>
          </div>

          <div className="top-actions">
            <button className="action-btn sync-btn" onClick={handleSyncOrders}>
              🔄 Sync Order
            </button>
            <button className="action-btn import-btn" onClick={handleBulkImport}>
              📥 Bulk Import
            </button>
            <button className="action-btn add-btn" onClick={handleAddOrder}>
              ➕ Add Order
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="status-tabs">
          <button
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            New
          </button>
          <button
            className={`tab-btn ${activeTab === 'ready_to_ship' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready_to_ship')}
          >
            Ready to Ship
          </button>
          <button
            className={`tab-btn ${activeTab === 'pickups_manifests' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickups_manifests')}
          >
            Pickups & Manifests
          </button>
          <button
            className={`tab-btn ${activeTab === 'in_transit' ? 'active' : ''}`}
            onClick={() => setActiveTab('in_transit')}
          >
            In Transit
          </button>
          <button
            className={`tab-btn ${activeTab === 'out_for_delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('out_for_delivery')}
          >
            Out for Delivery
          </button>
          <button
            className={`tab-btn ${activeTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered
          </button>
          <button
            className={`tab-btn ${activeTab === 'ndr' ? 'active' : ''}`}
            onClick={() => setActiveTab('ndr')}
          >
            NDR
          </button>
          <button
            className={`tab-btn ${activeTab === 'rto' ? 'active' : ''}`}
            onClick={() => setActiveTab('rto')}
          >
            RTO
          </button>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`tab-btn ${activeTab === 'lost' ? 'active' : ''}`}
            onClick={() => setActiveTab('lost')}
          >
            Lost
          </button>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="date-filter">
            <button className="calendar-btn">
              📅 {filters.dateFrom || '28-05-2025'} to {filters.dateTo || '28-06-2025'}
            </button>
          </div>

          <form onSubmit={handleSearch} className="search-filter">
            <select
              className="search-type-select"
              value={filters.searchType}
              onChange={(e) => setFilters({...filters, searchType: e.target.value as any})}
            >
              <option value="reference">Search by Reference ID</option>
              <option value="awb">Search by AWB</option>
              <option value="order">Search by Order ID</option>
            </select>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
            />
            <button type="submit" className="search-btn">🔍</button>
          </form>

          <button className="more-filters-btn">
            🎚️ More Filter
          </button>

          <div className="export-btns">
            <button className="export-btn" onClick={() => handleExport('csv')}>
              CSV
            </button>
            <button className="export-btn" onClick={() => handleExport('excel')}>
              Excel
            </button>
            <button className="export-btn" onClick={() => handleExport('pdf')}>
              PDF
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Order Date</th>
                <th>Order Details</th>
                <th>Product Details</th>
                <th>Package Details</th>
                <th>Payment</th>
                <th>Shipping Details</th>
                <th>Pickup Status</th>
                <th>Warehouse</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="loading-cell">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data-cell">
                    <div className="no-orders">
                      <div className="no-orders-icon">📦</div>
                      <h3>No orders found</h3>
                      <p>Create your first order to get started</p>
                      <button className="create-order-btn" onClick={handleAddOrder}>
                        ➕ Create Order
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                      />
                    </td>
                    <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td>
                      <div className="order-details-cell">
                        <div>Order ID: {order.orderId}</div>
                        <div>Ref: {order.referenceId}</div>
                        <div>{order.customerName}</div>
                      </div>
                    </td>
                    <td>
                      <div className="product-details-cell">
                        <div>{order.productName}</div>
                        <div>Qty: {order.quantity}</div>
                      </div>
                    </td>
                    <td>
                      <div className="package-details-cell">
                        <div>Weight: {order.weight}g</div>
                        {order.length && (
                          <div>
                            {order.length} x {order.width} x {order.height} cm
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="payment-cell">
                        <div className={`payment-mode ${order.paymentMode.toLowerCase()}`}>
                          {order.paymentMode}
                        </div>
                        {order.codAmount && <div>₹{order.codAmount}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="shipping-details-cell">
                        <div>{order.city}, {order.state}</div>
                        <div>PIN: {order.pin}</div>
                        {order.awb && <div>AWB: {order.awb}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="pickup-status-cell">
                        {order.pickupRequestStatus ? (
                          <div className={`pickup-status ${order.pickupRequestStatus}`}>
                            <span className="pickup-status-badge">
                              {order.pickupRequestStatus === 'pending' && '⏳'}
                              {order.pickupRequestStatus === 'scheduled' && '📅'}
                              {order.pickupRequestStatus === 'in_transit' && '🚚'}
                              {order.pickupRequestStatus === 'completed' && '✅'}
                              {order.pickupRequestStatus === 'failed' && '❌'}
                              {order.pickupRequestStatus.charAt(0).toUpperCase() + order.pickupRequestStatus.slice(1)}
                            </span>
                            {order.pickupRequestDate && (
                              <div className="pickup-date">
                                {new Date(order.pickupRequestDate).toLocaleDateString()}
                              </div>
                            )}
                            {order.pickupRequestTime && (
                              <div className="pickup-time">
                                {order.pickupRequestTime}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pickup-status pending">
                            <span className="pickup-status-badge">
                              ⏳ Pending
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{order.warehouse}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-icon-btn view-btn" title="View">
                          👁️
                        </button>
                        <button className="action-icon-btn edit-btn" title="Edit">
                          ✏️
                        </button>
                        <button className="action-icon-btn track-btn" title="Track">
                          📍
                        </button>
                        <button className="action-icon-btn print-btn" title="Print Label">
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Orders;