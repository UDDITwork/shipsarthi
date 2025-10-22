import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RechargeModal from '../components/RechargeModal';
import { userService, DashboardData } from '../services/userService';
import './Dashboard.css';

interface DashboardMetrics {
  todaysOrders: {
    current: number;
    previous: number;
  };
  todaysRevenue: {
    current: number;
    previous: number;
  };
  averageShippingCost: {
    amount: number;
    totalOrders: number;
  };
}

interface ShipmentStatus {
  totalOrder: number;
  newOrder: number;
  pickupPending: number;
  inTransit: number;
  delivered: number;
  ndrPending: number;
  rto: number;
}

interface NDRStatus {
  totalNDR: number;
  yourReattempt: number;
  buyerReattempt: number;
  ndrDelivered: number;
  ndrUndelivered: number;
  rtoTransit: number;
  rtoDelivered: number;
}

interface CODStatus {
  totalCOD: number;
  lastCODRemitted: number;
  nextCODAvailable: number;
}

const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('28-05-2025 to 28-06-2025');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);

  useEffect(() => {
    // Fetch dashboard data from API
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await userService.getDashboardData();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = (amount: number, promoCode?: string) => {
    console.log('Recharge initiated:', { amount, promoCode });
    // Here you can add the actual recharge logic
    alert(`Recharge of ₹${amount} ${promoCode ? `with promo code ${promoCode}` : ''} initiated!`);
  };

  const openRechargeModal = () => {
    setIsRechargeModalOpen(true);
  };

  const closeRechargeModal = () => {
    setIsRechargeModalOpen(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-container">
        {/* Date Range Display */}
        <div className="date-range-display">
          <span className="calendar-icon">📅</span>
          <span className="date-text">{dateRange}</span>
        </div>

        <div className="dashboard-grid">
          {/* Left Column - Metric Cards */}
          <div className="metrics-column">
            {/* Today's Orders Card */}
            <div className="metric-card">
              <div className="card-icon">
                <span className="icon">🛒</span>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3>Today's Orders</h3>
                  <button className="card-action-btn">📋</button>
                </div>
                <div className="card-value">{dashboardData?.metrics?.todaysOrders?.current || 0}</div>
                <div className="card-subtitle">
                  Yesterday's Orders
                  <br />
                  <span className="previous-value">{dashboardData?.metrics?.todaysOrders?.previous || 0}</span>
                </div>
              </div>
            </div>

            {/* Today's Revenue Card */}
            <div className="metric-card">
              <div className="card-icon">
                <span className="icon">💼</span>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3>Today's Revenue</h3>
                  <button className="card-action-btn">📋</button>
                </div>
                <div className="card-value">₹ {dashboardData?.metrics?.todaysRevenue?.current || 0}</div>
                <div className="card-subtitle">
                  Yesterday's Revenue
                  <br />
                  <span className="previous-value">₹ {dashboardData?.metrics?.todaysRevenue?.previous || 0}</span>
                </div>
              </div>
            </div>

            {/* Average Shipping Cost Card */}
            <div className="metric-card">
              <div className="card-icon">
                <span className="icon">🚚</span>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h3>Average Shipping Cost</h3>
                  <button className="card-action-btn">📋</button>
                </div>
                <div className="card-value">₹ {dashboardData?.metrics?.averageShippingCost?.amount || 0}</div>
                <div className="card-subtitle">
                  Total Orders
                  <br />
                  <span className="previous-value">{dashboardData?.metrics?.averageShippingCost?.totalOrders || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status Sections */}
          <div className="status-column">
            {/* Shipment Status Section */}
            <div className="status-section">
              <div className="section-header">
                <h2>Shipment Status</h2>
              </div>
              <div className="status-grid">
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.totalOrder || 0}</div>
                  <div className="status-label">Total Order</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.newOrder || 0}</div>
                  <div className="status-label">New Order</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.pickupPending || 0}</div>
                  <div className="status-label">Pickup Pending</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.inTransit || 0}</div>
                  <div className="status-label">In Transit</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.delivered || 0}</div>
                  <div className="status-label">Delivered</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.ndrPending || 0}</div>
                  <div className="status-label">NDR Pending</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{dashboardData?.shipmentStatus?.rto || 0}</div>
                  <div className="status-label">RTO</div>
                </div>
              </div>
            </div>

            {/* NDR Status Section */}
            <div className="status-section">
              <div className="section-header">
                <h2>NDR Status</h2>
              </div>
              <div className="status-grid">
                <div className="status-box">
                  <div className="status-value">1400</div>
                  <div className="status-label">Total NDR</div>
                </div>
                <div className="status-box">
                  <div className="status-value">1800</div>
                  <div className="status-label">Your Reattempt</div>
                </div>
                <div className="status-box">
                  <div className="status-value">300</div>
                  <div className="status-label">Buyer Reattempt</div>
                </div>
                <div className="status-box">
                  <div className="status-value">900</div>
                  <div className="status-label">NDR Delivered</div>
                </div>
                <div className="status-box">
                  <div className="status-value">2400</div>
                  <div className="status-label">NDR Undelivered</div>
                </div>
                <div className="status-box">
                  <div className="status-value">1400</div>
                  <div className="status-label">RTO Transit</div>
                </div>
                <div className="status-box">
                  <div className="status-value">60</div>
                  <div className="status-label">RTO Delivered</div>
                </div>
              </div>
            </div>

            {/* COD Status Section */}
            <div className="status-section">
              <div className="section-header">
                <h2>COD Status</h2>
              </div>
              <div className="cod-grid">
                <div className="cod-box">
                  <div className="cod-icon">₹</div>
                  <div className="cod-value">1,20,000</div>
                  <div className="cod-label">Total COD</div>
                </div>
                <div className="cod-box">
                  <div className="cod-icon">₹</div>
                  <div className="cod-value">1,20,000</div>
                  <div className="cod-label">Last COD Remitted</div>
                </div>
                <div className="cod-box">
                  <div className="cod-icon">₹</div>
                  <div className="cod-value">1,20,000</div>
                  <div className="cod-label">Next COD Available</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Wallet Transactions and Shipments Chart */}
        <div className="bottom-section">
          {/* Wallet Transactions */}
          <div className="wallet-transactions">
            <div className="section-header-with-action">
              <h2>Wallet Transactions</h2>
              <div className="wallet-actions">
                <button className="recharge-btn" onClick={openRechargeModal}>
                  💳 Recharge Wallet
                </button>
                <button className="view-all-btn">View All</button>
              </div>
            </div>
            <div className="transactions-table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="no-data">No transactions yet</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipments Chart */}
          <div className="shipments-chart">
            <div className="section-header-with-action">
              <h2>Shipments</h2>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="chart-container">
              <div className="pie-chart-placeholder">
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color pickup-pending"></span>
                    <span className="legend-label">Pickup Pending</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color in-transit"></span>
                    <span className="legend-label">In Transit</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color delivered"></span>
                    <span className="legend-label">Delivered</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color ndr-pending"></span>
                    <span className="legend-label">NDR Pending</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color rto"></span>
                    <span className="legend-label">RTO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recharge Modal */}
        <RechargeModal
          isOpen={isRechargeModalOpen}
          onClose={closeRechargeModal}
          onRecharge={handleRecharge}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;