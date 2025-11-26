import React, { useState } from 'react';
import { adminService } from '../services/adminService';
import './AdminRemittances.css';

interface UploadResult {
  total: number;
  successful: number;
  failed: number;
  remittances_created: number;
  remittances_updated: number;
  errors: Array<{
    remittance_number?: string;
    row?: number;
    awb?: string;
    user_id?: string;
    error: string;
  }>;
  details: Array<{
    remittance_number: string;
    user_id: string;
    orders_count: number;
    total_remittance: number;
    action: string;
  }>;
}

const AdminRemittances: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    setUploadError(null);
    setUploadResult(null);
    
    try {
      const result = await adminService.uploadRemittanceExcel(file);
      
      if (result.success && result.data) {
        setUploadResult(result.data);
        // Show success message
        alert(
          `Remittance Import Completed!\n\n` +
          `Total Rows: ${result.data.total}\n` +
          `Successful: ${result.data.successful}\n` +
          `Failed: ${result.data.failed}\n` +
          `Remittances Created: ${result.data.remittances_created}\n` +
          `Remittances Updated: ${result.data.remittances_updated}`
        );
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload file');
      alert(`Upload failed: ${error.message || 'Please check your file format and try again'}`);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="admin-remittances">
      {/* Header */}
      <div className="page-header">
        <h1>💸 Remittances</h1>
        <p>Upload remittance Excel files to automatically map data to client dashboards</p>
      </div>

      {/* Column Requirements */}
      <div className="requirements-section">
        <h3>📋 Required Excel Columns</h3>
        <div className="columns-grid">
          <div className="column-group required">
            <h4>Required Columns:</h4>
            <ul>
              <li><strong>REMITTANCE NUMBER</strong> - Unique remittance identifier</li>
              <li><strong>DATE</strong> - Remittance date</li>
              <li><strong>STATE</strong> - Pending or Completed</li>
              <li><strong>TOTAL REMITTANCE</strong> - Total remittance amount</li>
              <li><strong>AWB NUMBER</strong> - Airway bill number (used to match orders)</li>
              <li><strong>AMOUNT COLLECTED</strong> - Amount collected for this AWB</li>
            </ul>
          </div>
          <div className="column-group optional">
            <h4>Optional Columns:</h4>
            <ul>
              <li><strong>BANK'S TRANSACTION ID</strong> - Bank transaction reference</li>
              <li><strong>Bank</strong> - Bank name</li>
              <li><strong>Beneficiary Name</strong> - Account beneficiary</li>
              <li><strong>A/C Number</strong> - Account number</li>
              <li><strong>IFSC Code</strong> - IFSC code</li>
            </ul>
          </div>
        </div>
        <div className="info-box">
          <strong>💡 How it works:</strong> The system automatically matches AWB numbers from your Excel file to orders in the system, 
          then creates remittance records for the clients who placed those orders. Multiple AWBs can be grouped under the same remittance number.
        </div>
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
            {uploading ? (
              <>
                <span className="spinner"></span>
                <span>⏳ Uploading and processing...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Click to upload Excel file or drag and drop</span>
              </>
            )}
          </label>
          {!uploading && (
            <p className="upload-hint">Supported formats: .xlsx, .xls, .csv</p>
          )}
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="error-box">
          <h3>❌ Upload Error</h3>
          <p>{uploadError}</p>
        </div>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <div className={`result-box ${uploadResult.failed === 0 ? 'success' : 'warning'}`}>
          <h3>📊 Upload Results</h3>
          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-label">Total Rows:</span>
              <span className="stat-value">{uploadResult.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Successful:</span>
              <span className="stat-value success">{uploadResult.successful}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Failed:</span>
              <span className="stat-value error">{uploadResult.failed}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Remittances Created:</span>
              <span className="stat-value">{uploadResult.remittances_created}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Remittances Updated:</span>
              <span className="stat-value">{uploadResult.remittances_updated}</span>
            </div>
          </div>

          {/* Details */}
          {uploadResult.details && uploadResult.details.length > 0 && (
            <details className="details-section">
              <summary>View Details ({uploadResult.details.length} remittances processed)</summary>
              <div className="details-list">
                {uploadResult.details.map((detail, idx) => (
                  <div key={idx} className="detail-item">
                    <strong>{detail.remittance_number}</strong> - {detail.action} for client {detail.user_id} 
                    ({detail.orders_count} orders, ₹{detail.total_remittance.toFixed(2)})
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Errors */}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <details className="error-details">
              <summary>Errors ({uploadResult.errors.length})</summary>
              <ul>
                {uploadResult.errors.map((err, idx) => (
                  <li key={idx}>
                    {err.remittance_number && `Remittance: ${err.remittance_number} | `}
                    {err.row && `Row: ${err.row} | `}
                    {err.awb && `AWB: ${err.awb} | `}
                    {err.user_id && `User: ${err.user_id} | `}
                    Error: {err.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminRemittances;

