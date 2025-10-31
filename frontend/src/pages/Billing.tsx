import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiService } from '../services/api';
import { environmentConfig } from '../config/environment';
import { notificationService } from '../services/notificationService';
import './Billing.css';

interface WalletTransaction {
  transaction_id: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: string;
  transaction_date: string;
  account_name: string;
  account_email: string;
  order_id: string;
  awb_number: string;
  weight: number | null;
  zone: string;
  closing_balance: number;
}

interface WalletSummary {
  current_balance: number;
  total_credits: number;
  total_debits: number;
}

const Billing: React.FC = () => {
  const navigate = useNavigate();
  
  // State Management
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [summary, setSummary] = useState<WalletSummary>({
    current_balance: 0,
    total_credits: 0,
    total_debits: 0
  });
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search and Filters
  const [searchAWB, setSearchAWB] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [transactionType, setTransactionType] = useState('all');
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'transactions' | 'recharges'>('transactions');

  // Fetch current wallet balance (independent of filters)
  const fetchWalletBalance = async () => {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: {
          available_balance: number;
          pending_credits: number;
          pending_debits: number;
          effective_balance: number;
          currency: string;
        }
      }>('/billing/wallet/balance');

      if ((response as any).success) {
        const data = (response as any).data;
        // Use available_balance for Current Balance card
        setSummary(prev => ({
          ...prev,
          current_balance: Number(data.available_balance || 0)
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error);
    }
  };

  // Fetch wallet transactions
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (transactionType !== 'all') params.append('type', transactionType);

      console.log('🔍 FETCHING WALLET TRANSACTIONS:', {
        params: params.toString(),
        page,
        limit
      });

      const response = await fetch(`${environmentConfig.apiUrl}/billing/wallet-transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ WALLET TRANSACTIONS FETCHED:', data);
        
        setTransactions(data.data.transactions || []);
        // Do NOT override current_balance here; only update totals from the query
        const totals = data.data.summary || { current_balance: 0, total_credits: 0, total_debits: 0 };
        setSummary(prev => ({
          ...prev,
          total_credits: Number(totals.total_credits || 0),
          total_debits: Number(totals.total_debits || 0)
        }));
        setTotalPages(data.data.pagination?.total_pages || 1);
        setTotalCount(data.data.pagination?.total_count || 0);
      } else {
        console.error('❌ Failed to fetch transactions:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetches
    fetchWalletBalance();
    fetchTransactions();

    // Periodic refresh as a safety-net (prevents stale UI if WS drops silently)
    // Refresh more frequently (every 30 seconds) to ensure balance stays fresh
    const interval = setInterval(() => {
      fetchWalletBalance();
    }, 30 * 1000); // every 30 seconds (reduced from 60 for better responsiveness)

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Refresh transactions when filters/page change
    fetchTransactions();
  }, [page, limit, dateFrom, dateTo, transactionType]);

  // Listen for real-time wallet updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      if (notification.type === 'wallet_balance_update' || notification.type === 'weight_discrepancy_charge') {
        console.log('💰 Wallet-related notification:', notification);
        fetchWalletBalance();
        // For charges also refresh transactions
        if (notification.type === 'weight_discrepancy_charge') {
          fetchTransactions();
        }
      }
    });

    return unsubscribe;
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    
    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    }
    
    // Other dates
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  // Format weight display (weight is in grams)
  const formatWeight = (weight: number | null) => {
    if (!weight) return 'N/A';
    // Weight is already in grams from backend
    return `${weight.toFixed(1)} gm`;
  };

  // Get default date range (last 7 days)
  const getDefaultDateRange = () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    setDateFrom(sevenDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  // Set default date range on mount
  useEffect(() => {
    getDefaultDateRange();
  }, []);

  // Filter transactions by AWB search
  const filteredTransactions = searchAWB
    ? transactions.filter(txn => txn.awb_number.toLowerCase().includes(searchAWB.toLowerCase()))
    : transactions;

  return (
    <Layout>
      <div className="billing-container">
        {/* Wallet Summary Cards */}
        <div className="wallet-summary-cards">
          <div className="summary-card current-balance">
            <div className="summary-card-icon">💰</div>
            <div className="summary-card-content">
              <div className="summary-card-label">Current Balance</div>
              <div className="summary-card-value green">₹{summary.current_balance.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="summary-card total-credits">
            <div className="summary-card-icon">💵</div>
            <div className="summary-card-content">
              <div className="summary-card-label">Total Credit</div>
              <div className="summary-card-value">₹{summary.total_credits.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="summary-card total-debits">
            <div className="summary-card-icon">💸</div>
            <div className="summary-card-content">
              <div className="summary-card-label">Total Debit</div>
              <div className="summary-card-value">₹{summary.total_debits.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Wallet Actions */}
        <div className="wallet-actions-bar">
          <button className="download-ledger-btn" onClick={() => alert('Download ledger feature coming soon')}>
            📥 Download Ledger
          </button>
          <button className="recharge-wallet-btn" onClick={() => navigate('/billing')}>
            💳 Recharge Wallet
          </button>
        </div>

        {/* Tabs */}
        <div className="billing-tabs">
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`tab-btn ${activeTab === 'recharges' ? 'active' : ''}`}
            onClick={() => setActiveTab('recharges')}
          >
            Recharges
          </button>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filter-group">
            <label>AWB</label>
            <input
              type="text"
              placeholder="Search by AWB number"
              value={searchAWB}
              onChange={(e) => setSearchAWB(e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Date Range</label>
            <button
              className="date-range-btn"
              onClick={() => {
                const from = dateFrom ? new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Start Date';
                const to = dateTo ? new Date(dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'End Date';
                alert(`Date Range: ${from} to ${to}`);
              }}
            >
              📅 {dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(dateTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Select Date Range'}
            </button>
          </div>
          
          <div className="filter-group">
            <label>Transaction Type</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Account Name</label>
            <select className="filter-select">
              <option value="all">All Accounts</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="transactions-table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : (
            <table className="wallet-transactions-table">
              <thead>
                <tr>
                  <th>TRANSACTION DETAILS</th>
                  <th>ACCOUNT DETAILS</th>
                  <th>ORDER ID</th>
                  <th>AWB / LRN</th>
                  <th>WEIGHT & ZONE</th>
                  <th>DESCRIPTION</th>
                  <th>CREDIT</th>
                  <th>DEBIT</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-data-cell">
                      <div className="no-transactions">
                        <div className="no-transactions-icon">💰</div>
                        <h3>No transactions found</h3>
                        <p>Your wallet transaction history will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn, index) => (
                    <tr key={index} className="transaction-row">
                      <td>
                        <div className="transaction-id">{txn.transaction_id}</div>
                        <div className="transaction-date">{formatDate(txn.transaction_date)}</div>
                      </td>
                      <td>
                        <div className="account-name">{txn.account_name}</div>
                        <div className="account-email">{txn.account_email}</div>
                      </td>
                      <td>
                        <div className="order-id-display">
                          {txn.order_id ? txn.order_id.split(' ')[1] + ' ' + txn.order_id.split(' ')[0].toUpperCase() : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="awb-display">
                          {txn.awb_number || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="weight-display">{formatWeight(txn.weight)}</div>
                        {txn.zone && <div className="zone-display">{txn.zone}</div>}
                      </td>
                      <td>
                        <div className="description-display">{txn.description}</div>
                      </td>
                      <td>
                        {txn.transaction_type === 'credit' && (
                          <div className="amount credit">+₹{txn.amount.toFixed(2)}</div>
                        )}
                      </td>
                      <td>
                        {txn.transaction_type === 'debit' && (
                          <div className="amount debit">-₹{txn.amount.toFixed(2)}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredTransactions.length > 0 && (
          <div className="pagination-section">
            <div className="pagination-info">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, totalCount)} of {totalCount}
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
                className="pagination-btn"
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                ←
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                className="pagination-btn"
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
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

export default Billing;
