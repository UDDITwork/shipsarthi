import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import RechargeModal from '../components/RechargeModal';
import { userService, DashboardData } from '../services/userService';
import { walletService, WalletBalance } from '../services/walletService';
import { notificationService } from '../services/notificationService';
import { apiService } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './Dashboard.css';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [ndrStatus, setNdrStatus] = useState<any>(null);
  const [codStatus, setCodStatus] = useState<any>(null);
  const [shipmentDistribution, setShipmentDistribution] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [isBalanceUpdating, setIsBalanceUpdating] = useState(false);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update current date/time every second
  useEffect(() => {
    dateIntervalRef.current = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => {
      if (dateIntervalRef.current) {
        clearInterval(dateIntervalRef.current);
      }
    };
  }, []);

  // Fetch all dashboard data
  const fetchAllDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        dashboardResponse,
        shipmentResponse,
        ndrResponse,
        codResponse,
        distributionResponse,
        transactionsResponse
      ] = await Promise.all([
        apiService.get<{ status: string; data: any }>('/dashboard/overview'),
        apiService.get<{ status: string; data: any }>('/dashboard/shipment-status'),
        apiService.get<{ status: string; data: any }>('/dashboard/ndr-status'),
        apiService.get<{ status: string; data: any }>('/dashboard/cod-status'),
        apiService.get<{ status: string; data: any }>('/dashboard/shipment-distribution'),
        apiService.get<{ status: string; data: any[] }>('/dashboard/wallet-transactions?limit=5')
      ]);

      console.log('📊 Dashboard data fetched:', {
        overview: dashboardResponse.data,
        shipment: shipmentResponse.data,
        ndr: ndrResponse.data,
        cod: codResponse.data
      });

      // Map the data to match the DashboardData interface
      const mappedDashboardData: DashboardData = {
        metrics: {
          todaysOrders: {
            current: dashboardResponse.data.todays_orders?.count || 0,
            previous: dashboardResponse.data.todays_orders?.previous_count || 0
          },
          todaysRevenue: {
            current: dashboardResponse.data.todays_revenue?.amount || 0,
            previous: dashboardResponse.data.todays_revenue?.previous_amount || 0
          },
          averageShippingCost: {
            amount: dashboardResponse.data.average_shipping_cost || 0,
            totalOrders: dashboardResponse.data.todays_orders?.count || 0
          }
        },
        shipmentStatus: {
          totalOrder: shipmentResponse.data.total_orders || 0,
          newOrder: shipmentResponse.data.new_orders || 0,
          pickupPending: shipmentResponse.data.pickup_pending || 0,
          inTransit: shipmentResponse.data.in_transit || 0,
          delivered: shipmentResponse.data.delivered || 0,
          ndrPending: shipmentResponse.data.ndr_pending || 0,
          rto: shipmentResponse.data.rto || 0
        },
        ndrStatus: {
          totalNDR: 0,
          yourReattempt: 0,
          buyerReattempt: 0,
          ndrDelivered: 0,
          ndrUndelivered: 0,
          rtoTransit: 0,
          rtoDelivered: 0
        },
        codStatus: {
          totalCOD: 0,
          lastCODRemitted: 0,
          nextCODAvailable: 0
        }
      };

      setDashboardData(mappedDashboardData);
      setNdrStatus(ndrResponse.data);
      setCodStatus(codResponse.data);
      setShipmentDistribution(distributionResponse.data);
      setTransactions(transactionsResponse.data || []);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchAllDashboardData();
    
    // Subscribe to wallet balance updates
    const unsubscribeWallet = walletService.subscribe((balance) => {
      console.log('💰 Dashboard wallet balance updated:', balance);
      setWalletBalance(balance);
    });

    // Listen for real-time wallet updates
    const unsubscribeNotifications = notificationService.subscribe((notification) => {
      if (notification.type === 'wallet_balance_update') {
        console.log('💰 Dashboard received wallet balance update:', notification);
        const updatedBalance = {
          balance: notification.balance,
          currency: notification.currency || 'INR'
        };
        setWalletBalance(updatedBalance);
        
        // Trigger animation
        setIsBalanceUpdating(true);
        setTimeout(() => setIsBalanceUpdating(false), 600);
      }
    });

    // Auto-refresh data every 5 minutes
    refreshIntervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...');
      fetchAllDashboardData();
    }, 5 * 60 * 1000);

    return () => {
      unsubscribeWallet();
      unsubscribeNotifications();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

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

  // Format date range for display
  const formatDateRange = () => {
    const month = currentDate.toLocaleString('en-US', { month: '2-digit' });
    const day = currentDate.toLocaleString('en-US', { day: '2-digit' });
    const year = currentDate.getFullYear();
    
    // Show last 30 days range
    const endDate = `${day}-${month}-${year}`;
    const startDateObj = new Date(currentDate);
    startDateObj.setDate(startDateObj.getDate() - 30);
    const startMonth = startDateObj.toLocaleString('en-US', { month: '2-digit' });
    const startDay = startDateObj.toLocaleString('en-US', { day: '2-digit' });
    const startYear = startDateObj.getFullYear();
    const startDate = `${startDay}-${startMonth}-${startYear}`;
    
    return `${startDate} to ${endDate}`;
  };

  // Format current time
  const formatCurrentTime = () => {
    return currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  // Get day of week
  const getDayOfWeek = () => {
    return currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Prepare chart data
  const getPieChartData = () => {
    if (!shipmentDistribution) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: []
        }]
      };
    }

    const data = shipmentDistribution.distribution.map((item: any) => item.count);
    const labels = shipmentDistribution.distribution.map((item: any) => {
      // Format status names for display
      const statusNames: any = {
        'new': 'New Orders',
        'ready_to_ship': 'Ready to Ship',
        'pickup_pending': 'Pickup Pending',
        'manifested': 'Manifested',
        'in_transit': 'In Transit',
        'out_for_delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'ndr': 'NDR',
        'rto': 'RTO',
        'cancelled': 'Cancelled'
      };
      return statusNames[item.status] || item.status;
    });

    const colors = [
      '#F68723',
      '#FF9F40',
      '#FFB366',
      '#4A90E2',
      '#5C97E5',
      '#6EA5E8',
      '#28A745',
      '#FFC107',
      '#DC3545',
      '#6C757D'
    ];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, data.length),
        borderColor: '#FFFFFF',
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
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
        {/* Date Range Display with Real-time Clock */}
        <div className="date-time-display">
          <div className="date-range-display">
            <span className="calendar-icon">📅</span>
            <span className="date-text">{formatDateRange()}</span>
          </div>
          <div className="current-time-display">
            <span className="clock-icon">🕐</span>
            <span className="time-text">{formatCurrentTime()}</span>
            <span className="day-text">{getDayOfWeek()}</span>
          </div>
        </div>

        {/* Wallet Balance Section */}
        <div className="wallet-balance-section">
          <div className="wallet-card">
            <div className="wallet-icon">💰</div>
            <div className="wallet-info">
              <div className="wallet-label">Wallet Balance</div>
              <div className={`wallet-amount ${isBalanceUpdating ? 'updating' : ''}`}>
                ₹{walletBalance?.balance?.toFixed(2) || '0.00'}
              </div>
            </div>
            <button className="wallet-recharge-btn" onClick={openRechargeModal}>
              Recharge
            </button>
          </div>
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
                  <div className="status-value">{ndrStatus?.total_ndr || 0}</div>
                  <div className="status-label">Total NDR</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{ndrStatus?.new_reattempt || 0}</div>
                  <div className="status-label">Your Reattempt</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{ndrStatus?.buyer_reattempt || 0}</div>
                  <div className="status-label">Buyer Reattempt</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{ndrStatus?.ndr_delivered || 0}</div>
                  <div className="status-label">NDR Delivered</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{ndrStatus?.ndr_undelivered || 0}</div>
                  <div className="status-label">NDR Undelivered</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{ndrStatus?.rto_transit || 0}</div>
                  <div className="status-label">RTO Transit</div>
                </div>
                <div className="status-box">
                  <div className="status-value">{ndrStatus?.rto_delivered || 0}</div>
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
                  <div className="cod-value">₹{codStatus?.total_cod || 0}</div>
                  <div className="cod-label">Total COD</div>
                </div>
                <div className="cod-box">
                  <div className="cod-icon">₹</div>
                  <div className="cod-value">₹{codStatus?.last_cod_remitted || 0}</div>
                  <div className="cod-label">Last COD Remitted</div>
                </div>
                <div className="cod-box">
                  <div className="cod-icon">₹</div>
                  <div className="cod-value">₹{codStatus?.next_cod_available || 0}</div>
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
                  {transactions && transactions.length > 0 ? (
                    transactions.map((transaction: any, index: number) => (
                      <tr key={index}>
                        <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                        <td>{transaction.transaction_id}</td>
                        <td className={`transaction-type ${transaction.transaction_type}`}>
                          {transaction.transaction_type}
                        </td>
                        <td>₹{transaction.amount?.toFixed(2)}</td>
                        <td className={`status-badge ${transaction.status}`}>
                          {transaction.status}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="no-data">No transactions yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipments Chart */}
          <div className="shipments-chart">
            <div className="section-header-with-action">
              <h2>Shipments Distribution</h2>
              <button className="view-all-btn">View All</button>
            </div>
            <div className="chart-container">
              {shipmentDistribution && shipmentDistribution.distribution && shipmentDistribution.distribution.length > 0 ? (
                <Pie 
                  data={getPieChartData()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          padding: 15,
                          font: {
                            size: 12,
                            weight: 'bold'
                          }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = shipmentDistribution.total_orders || 1;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="no-chart-data">
                  <p>No shipment data available</p>
                </div>
              )}
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