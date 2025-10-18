import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import Layout from '../components/Layout';
import { dashboardService, DashboardOverview, ShipmentStatus, NDRStatus, CODStatus } from '../services/dashboardService';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

// CSS-based Icon Components
const TrendingUpIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const PackageIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const IndianRupeeIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M9 7h6m-6 4h6m-3-8v8m-3 4h6" />
  </svg>
);

const TruckIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17a2 2 0 100 4 2 2 0 000-4zm0 0c1.306 0 2.417.835 2.83 2M9 17a3.001 3.001 0 00-2.83 2M15 17a2 2 0 100 4 2 2 0 000-4zm0 0c1.306 0 2.417.835 2.83 2M16 17a3.001 3.001 0 00-2.83 2M5 17H2a1 1 0 01-1-1V5a1 1 0 011-1h14a1 1 0 011 1v11a1 1 0 01-1 1h-3" />
  </svg>
);

const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const RefreshCwIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ArrowUpDownIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  bgColor: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  bgColor
}) => {
  const getChangeIcon = () => {
    if (changeType === 'positive') return <TrendingUpIcon className="h-4 w-4" />;
    if (changeType === 'negative') return <TrendingDownIcon className="h-4 w-4" />;
    return null;
  };

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center space-x-1 mt-1 ${getChangeColor()}`}>
              {getChangeIcon()}
              <span className="text-sm font-medium">{change}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface StatusCardProps {
  title: string;
  count: number;
  bgColor: string;
  textColor: string;
  onClick?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, count, bgColor, textColor, onClick }) => {
  return (
    <div
      className={`${bgColor} rounded-lg p-4 cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={onClick}
    >
      <h3 className={`text-sm font-medium ${textColor} opacity-80`}>{title}</h3>
      <p className={`text-2xl font-bold ${textColor}`}>{count.toLocaleString()}</p>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [shipmentStatus, setShipmentStatus] = useState<ShipmentStatus | null>(null);
  const [ndrStatus, setNDRStatus] = useState<NDRStatus | null>(null);
  const [codStatus, setCODStatus] = useState<CODStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [overviewRes, shipmentRes, ndrRes, codRes] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getShipmentStatus(),
        dashboardService.getNDRStatus(),
        dashboardService.getCODStatus()
      ]);

      setOverview(overviewRes.data);
      setShipmentStatus(shipmentRes.data);
      setNDRStatus(ndrRes.data);
      setCODStatus(codRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const shipmentDistributionData = {
    labels: ['Delivered', 'In Transit', 'NDR Pending', 'RTO', 'Pickup Pending'],
    datasets: [
      {
        data: [
          shipmentStatus?.delivered || 0,
          shipmentStatus?.in_transit || 0,
          shipmentStatus?.ndr_pending || 0,
          shipmentStatus?.rto || 0,
          shipmentStatus?.pickup_pending || 0,
        ],
        backgroundColor: [
          '#10B981',
          '#3B82F6',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
        borderColor: [
          '#059669',
          '#2563EB',
          '#D97706',
          '#DC2626',
          '#7C3AED',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
    },
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your shipments.</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Today's Orders"
            value={overview?.todays_orders.count || 0}
            change={overview?.todays_orders.change_percentage}
            changeType={parseFloat(overview?.todays_orders.change_percentage || '0') >= 0 ? 'positive' : 'negative'}
            icon={<PackageIcon className="h-6 w-6 text-white" />}
            bgColor="bg-blue-500"
          />
          <MetricCard
            title="Today's Revenue"
            value={`₹${(overview?.todays_revenue.amount || 0).toLocaleString()}`}
            change={overview?.todays_revenue.change_percentage}
            changeType={parseFloat(overview?.todays_revenue.change_percentage || '0') >= 0 ? 'positive' : 'negative'}
            icon={<IndianRupeeIcon className="h-6 w-6 text-white" />}
            bgColor="bg-green-500"
          />
          <MetricCard
            title="Avg. Shipping Cost"
            value={`₹${(overview?.average_shipping_cost || 0).toFixed(2)}`}
            icon={<TruckIcon className="h-6 w-6 text-white" />}
            bgColor="bg-purple-500"
          />
        </div>

        {/* Shipment Status Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipment Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatusCard
              title="Total Orders"
              count={shipmentStatus?.total_orders || 0}
              bgColor="bg-gray-100"
              textColor="text-gray-800"
            />
            <StatusCard
              title="New Orders"
              count={shipmentStatus?.new_orders || 0}
              bgColor="bg-blue-100"
              textColor="text-blue-800"
            />
            <StatusCard
              title="Pickup Pending"
              count={shipmentStatus?.pickup_pending || 0}
              bgColor="bg-yellow-100"
              textColor="text-yellow-800"
            />
            <StatusCard
              title="In Transit"
              count={shipmentStatus?.in_transit || 0}
              bgColor="bg-indigo-100"
              textColor="text-indigo-800"
            />
            <StatusCard
              title="Delivered"
              count={shipmentStatus?.delivered || 0}
              bgColor="bg-green-100"
              textColor="text-green-800"
            />
            <StatusCard
              title="NDR Pending"
              count={shipmentStatus?.ndr_pending || 0}
              bgColor="bg-orange-100"
              textColor="text-orange-800"
            />
            <StatusCard
              title="RTO"
              count={shipmentStatus?.rto || 0}
              bgColor="bg-red-100"
              textColor="text-red-800"
            />
          </div>
        </div>

        {/* NDR Status Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">NDR Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatusCard
              title="Total NDR"
              count={ndrStatus?.total_ndr || 0}
              bgColor="bg-red-100"
              textColor="text-red-800"
            />
            <StatusCard
              title="New Reattempt"
              count={ndrStatus?.new_reattempt || 0}
              bgColor="bg-yellow-100"
              textColor="text-yellow-800"
            />
            <StatusCard
              title="Buyer Reattempt"
              count={ndrStatus?.buyer_reattempt || 0}
              bgColor="bg-blue-100"
              textColor="text-blue-800"
            />
            <StatusCard
              title="NDR Delivered"
              count={ndrStatus?.ndr_delivered || 0}
              bgColor="bg-green-100"
              textColor="text-green-800"
            />
            <StatusCard
              title="NDR Undelivered"
              count={ndrStatus?.ndr_undelivered || 0}
              bgColor="bg-gray-100"
              textColor="text-gray-800"
            />
            <StatusCard
              title="RTO Transit"
              count={ndrStatus?.rto_transit || 0}
              bgColor="bg-orange-100"
              textColor="text-orange-800"
            />
            <StatusCard
              title="RTO Delivered"
              count={ndrStatus?.rto_delivered || 0}
              bgColor="bg-purple-100"
              textColor="text-purple-800"
            />
          </div>
        </div>

        {/* COD Status & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COD Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">COD Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total COD</span>
                <span className="text-lg font-semibold text-gray-900">
                  ₹{(codStatus?.total_cod || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last COD Remitted</span>
                <span className="text-lg font-semibold text-gray-900">
                  ₹{(codStatus?.last_cod_remitted || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Next COD Available</span>
                <span className="text-lg font-semibold text-green-600">
                  ₹{(codStatus?.next_cod_available || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Shipment Distribution Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipment Distribution</h2>
            <div className="h-64">
              <Doughnut data={shipmentDistributionData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
              <PackageIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Create New Order</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
              <ArrowUpDownIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Bulk Import</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
              <TruckIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Rate Calculator</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
              <AlertTriangleIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Download Reports</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;