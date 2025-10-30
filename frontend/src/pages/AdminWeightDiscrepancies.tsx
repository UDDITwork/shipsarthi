import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { environmentConfig } from '../config/environment';
import './AdminWeightDiscrepancies.css';

interface WeightDiscrepancy {
  _id: string;
  awb_number: string;
  client_id: {
    _id: string;
    company_name: string;
    email: string;
    phone_number: string;
  };
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
  upload_batch_id: string;
}

const AdminWeightDiscrepancies: React.FC = () => {
  const [discrepancies, setDiscrepancies] = useState<WeightDiscrepancy[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [processed, setProcessed] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchDiscrepancies();
  }, [page, limit, search, processed]);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (processed !== 'all') params.append('processed', processed);

      const response = await fetch(`${environmentConfig.apiUrl}/admin/weight-discrepancies?${params}`, {
        headers: {
          'x-admin-email': localStorage.getItem('admin_email') || '',
          'x-admin-password': 'jpmcA123'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDiscrepancies(data.data.discrepancies || []);
        setTotal(data.data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Error fetching discrepancies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please upload a valid Excel file (.xlsx, .xls, .csv)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${environmentConfig.apiUrl}/admin/weight-discrepancies/bulk-import`, {
        method: 'POST',
        headers: {
          'x-admin-email': localStorage.getItem('admin_email') || '',
          'x-admin-password': 'jpmcA123'
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result.data);
        alert(`Import completed!\nSuccessful: ${result.data.successful}\nFailed: ${result.data.failed}`);
        fetchDiscrepancies(); // Refresh list
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
           ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <AdminLayout>
      <div className="admin-weight-discrepancies">
        {/* Header */}
        <div className="page-header">
          <h1>⚖️ Weight Discrepancies</h1>
          <p>Manage weight discrepancies and charges</p>
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-box">
            <input
              type="file"
              id="file-upload"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="upload-label">
              {uploading ? '⏳ Uploading...' : '📤 Upload Excel File'}
            </label>
          </div>
        </div>

        {/* Filters */}
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
              value={processed}
              onChange={(e) => setProcessed(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="true">Processed</option>
              <option value="false">Not Processed</option>
            </select>
          </div>
        </div>

        {/* Results Message */}
        {uploadResult && (
          <div className={`result-box ${uploadResult.failed === 0 ? 'success' : 'warning'}`}>
            <h3>📊 Upload Results</h3>
            <p>Total: {uploadResult.total} | Successful: {uploadResult.successful} | Failed: {uploadResult.failed}</p>
            {uploadResult.errors.length > 0 && (
              <details className="error-details">
                <summary>Errors ({uploadResult.errors.length})</summary>
                <ul>
                  {uploadResult.errors.map((err: any, idx: number) => (
                    <li key={idx}>Row {err.row}: {err.error} {err.awb ? `(AWB: ${err.awb})` : ''}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Discrepancies Table */}
        <div className="table-container">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <table className="discrepancies-table">
              <thead>
                <tr>
                  <th>AWB Number</th>
                  <th>Client</th>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Declared</th>
                  <th>Actual</th>
                  <th>Difference</th>
                  <th>Deduction</th>
                  <th>Processed</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="no-data">No discrepancies found</td>
                  </tr>
                ) : (
                  discrepancies.map((disc) => (
                    <tr key={disc._id}>
                      <td className="awb-cell">{disc.awb_number}</td>
                      <td>
                        <div className="client-info">
                          <div>{disc.client_id?.company_name || 'N/A'}</div>
                          <div className="client-email">{disc.client_id?.email || ''}</div>
                        </div>
                      </td>
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
                      <td>
                        <span className={`processed-badge ${disc.processed ? 'yes' : 'no'}`}>
                          {disc.processed ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
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
            <div className="pagination-nav">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                ←
              </button>
              <span>Page {page} of {Math.ceil(total / limit)}</span>
              <button onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page >= Math.ceil(total / limit)}>
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWeightDiscrepancies;

