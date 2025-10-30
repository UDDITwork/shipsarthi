import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { environmentConfig } from '../config/environment';
import { notificationService } from '../services/notificationService';
import './WeightDiscrepancies.css';

interface WeightDiscrepancy {
  _id: string;
  awb_number: string;
  order_id: {
    _id: string;
    order_id: string;
  };
  discrepancy_date: string;
  awb_status: string;
  client_declared_weight: number;
  delhivery_updated_weight: number;
  weight_discrepancy: number;
  deduction_amount: number;
  processed: boolean;
  transaction_id?: {
    transaction_id: string;
    amount: number;
  };
}

interface Summary {
  total_discrepancies: number;
  total_weight_discrepancy: number;
  total_deduction: number;
}

const WeightDiscrepancies: React.FC = () => {
  const [discrepancies, setDiscrepancies] = useState<WeightDiscrepancy[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_discrepancies: 0,
    total_weight_discrepancy: 0,
    total_deduction: 0
  });
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchDiscrepancies();
  }, [page, limit, search, status]);

  // Listen for real-time weight discrepancy notifications
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      if (notification.type === 'weight_discrepancy_charge') {
        console.log('⚖️ WEIGHT DISCREPANCY NOTIFICATION:', notification);
        // Refresh discrepancies to show new charge
        fetchDiscrepancies();
        console.log('✅ Weight discrepancies refreshed');
      }
    });

    return unsubscribe;
  }, []);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);

      const response = await fetch(`${environmentConfig.apiUrl}/weight-discrepancies?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDiscrepancies(data.data.discrepancies || []);
        setSummary(data.data.summary || summary);
        setTotal(data.data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Error fetching discrepancies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    
    if (date.toDateString() === yesterday.toDateString()) {
      return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  return (
    <Layout>
      <div className="weight-discrepancies-container">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-icon">⚖️</div>
            <div className="summary-card-content">
              <div className="summary-card-label">Total Discrepancies</div>
              <div className="summary-card-value">{summary.total_discrepancies}</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-card-icon">📊</div>
            <div className="summary-card-content">
              <div className="summary-card-label">Total Weight Difference</div>
              <div className="summary-card-value">{summary.total_weight_discrepancy.toFixed(1)}g</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-card-icon">💸</div>
            <div className="summary-card-content">
              <div className="summary-card-label">Total Deduction</div>
              <div className="summary-card-value red">₹{summary.total_deduction.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search by AWB..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="RTO">RTO</option>
              <option value="NDR">NDR</option>
            </select>
          </div>
        </div>

        {/* Discrepancies Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading discrepancies...</p>
            </div>
          ) : (
            <table className="discrepancies-table">
              <thead>
                <tr>
                  <th>AWB NUMBER</th>
                  <th>ORDER ID</th>
                  <th>DATE & TIME</th>
                  <th>AWB STATUS</th>
                  <th>DECLARED WEIGHT</th>
                  <th>ACTUAL WEIGHT</th>
                  <th>DIFFERENCE</th>
                  <th>DEDUCTION AMOUNT</th>
                  <th>TRANSACTION ID</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      <div className="no-discrepancies">
                        <div className="no-discrepancies-icon">⚖️</div>
                        <h3>No weight discrepancies found</h3>
                        <p>Weight discrepancies will appear here when charged</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  discrepancies.map((disc) => (
                    <tr key={disc._id}>
                      <td className="awb-cell">{disc.awb_number}</td>
                      <td>{disc.order_id?.order_id || 'N/A'}</td>
                      <td>{formatDate(disc.discrepancy_date)}</td>
                      <td>
                        <span className={`status-badge ${disc.awb_status.toLowerCase().replace(' ', '-')}`}>
                          {disc.awb_status}
                        </span>
                      </td>
                      <td>{disc.client_declared_weight}g</td>
                      <td>{disc.delhivery_updated_weight}g</td>
                      <td className="diff-cell">{disc.weight_discrepancy}g</td>
                      <td className="deduction-cell">-₹{disc.deduction_amount.toFixed(2)}</td>
                      <td className="transaction-id">{disc.transaction_id?.transaction_id || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && discrepancies.length > 0 && (
          <div className="pagination-section">
            <div className="pagination-info">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total}
            </div>
            
            <div className="pagination-per-page">
              <label>Show</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="per-page-select"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>per page</span>
            </div>
            
            <div className="pagination-nav">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                ←
              </button>
              <button className="pagination-btn active">{page}</button>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="pagination-btn"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WeightDiscrepancies;

