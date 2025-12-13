// Location: frontend/src/components/BulkResultModal.tsx
import React, { useState } from 'react';
import './BulkResultModal.css';

export interface BulkResult {
  status: 'completed' | 'stopped' | 'error';
  total: number;
  success: number;
  failed: number;
  skipped?: number;
  results: Array<{
    order_id: string;
    awb?: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
  stopped_reason?: string;
}

interface BulkResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BulkResult | null;
  operationType: 'awb' | 'pickup' | 'cancel' | 'label';
}

const BulkResultModal: React.FC<BulkResultModalProps> = ({
  isOpen,
  onClose,
  result,
  operationType
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen || !result) return null;

  const getOperationTitle = () => {
    switch (operationType) {
      case 'awb': return 'Bulk AWB Generation';
      case 'pickup': return 'Bulk Pickup Request';
      case 'cancel': return 'Bulk Cancellation';
      case 'label': return 'Bulk Label Print';
      default: return 'Bulk Operation';
    }
  };

  const getStatusIcon = () => {
    if (result.status === 'completed' && result.failed === 0) {
      return '✅';
    } else if (result.status === 'stopped') {
      return '⚠️';
    } else if (result.failed > 0) {
      return '⚠️';
    }
    return '✅';
  };

  const getStatusMessage = () => {
    if (result.status === 'completed' && result.failed === 0) {
      return 'Complete';
    } else if (result.status === 'stopped') {
      return 'Stopped';
    } else if (result.failed > 0) {
      return 'Partial Success';
    }
    return 'Complete';
  };

  return (
    <div className="bulk-result-modal-overlay" onClick={onClose}>
      <div className="bulk-result-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bulk-result-modal-header">
          <h2>{getStatusIcon()} {getOperationTitle()} {getStatusMessage()}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="bulk-result-modal-body">
          <div className="result-summary">
            <div className="summary-stat success">
              <span className="stat-icon">✅</span>
              <span className="stat-value">{result.success}</span>
              <span className="stat-label">Successful</span>
            </div>
            <div className="summary-stat failed">
              <span className="stat-icon">❌</span>
              <span className="stat-value">{result.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
            {result.skipped !== undefined && result.skipped > 0 && (
              <div className="summary-stat skipped">
                <span className="stat-icon">⏭️</span>
                <span className="stat-value">{result.skipped}</span>
                <span className="stat-label">Skipped</span>
              </div>
            )}
          </div>

          {result.stopped_reason && (
            <div className="stopped-reason">
              <span className="stopped-icon">⚠️</span>
              <span className="stopped-text">
                <strong>Stopped:</strong> {result.stopped_reason}
              </span>
            </div>
          )}

          <button
            className="toggle-details-btn"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
            <span className={`arrow ${showDetails ? 'up' : 'down'}`}>▼</span>
          </button>

          {showDetails && (
            <div className="result-details">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    {operationType === 'awb' && <th>AWB</th>}
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((item, index) => (
                    <tr key={index} className={`status-${item.status}`}>
                      <td>{item.order_id}</td>
                      {operationType === 'awb' && (
                        <td>{item.awb || '-'}</td>
                      )}
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status === 'success' && '✅'}
                          {item.status === 'failed' && '❌'}
                          {item.status === 'skipped' && '⏭️'}
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="error-cell">
                        {item.error || (item.status === 'success' ? 'Completed' : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bulk-result-modal-footer">
          <button className="close-result-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkResultModal;
