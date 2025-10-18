import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Tracking.css';

// Types for tracking response
interface TrackingScan {
  ScanType: string;
  ScanDateTime: string;
  ScanLocation: string;
  Remarks: string;
}

interface TrackingData {
  AWB: string;
  Status: string;
  StatusDateTime: string;
  Origin: string;
  Destination: string;
  Scans: TrackingScan[];
}

interface TrackingResponse {
  data: {
    ShipmentData: TrackingData[];
  };
}

const Tracking: React.FC = () => {
  const navigate = useNavigate();
  const [awbNumber, setAwbNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awbNumber.trim()) return;

    setLoading(true);
    setError(null);
    setTrackingData(null);

    try {
      // Call our backend API instead of Delhivery directly
      const apiUrl = process.env.REACT_APP_ENVIRONMENT === 'production' 
        ? process.env.REACT_APP_PRODUCTION_API_URL 
        : process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await axios.get(
        `${apiUrl}/api/shipping/public/track/${awbNumber.trim()}`
      );

      if (response.data?.success && response.data?.data) {
        setTrackingData(response.data.data);
      } else {
        setError(response.data?.message || 'No tracking information found for this AWB number.');
      }
    } catch (err: any) {
      console.error('Tracking error:', err);
      if (err.response?.status === 503) {
        setError('Tracking service is temporarily unavailable. Please try again later.');
      } else if (err.response?.status === 404) {
        setError('AWB number not found. Please verify the number and try again.');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please try again later.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to fetch tracking information. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tracking-page">
      {/* Header */}
      <header className="tracking-header">
        <div className="header-container">
          <div className="logo">
            <img src="/Final logo Figma 1.svg" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">
              <span className="logo-ship">Ship</span>
              <span className="logo-sarthi">sarthi</span>
            </span>
          </div>
          
          <nav className="nav-links">
            <a href="#services" className="nav-link">Services</a>
            <a href="#calculator" className="nav-link">Rate Calculator</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="/contact" className="nav-link">Contact Us</a>
          </nav>
          
          <div className="header-buttons">
            <button className="btn-track active">Track</button>
            <button 
              className="btn-login"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="tracking-main">
        <div className="tracking-container">
          {/* Left Section - Promotional */}
          <div className="tracking-left">
            <div className="promotional-content">
              <div className="illustration">
                <img src="/partner 1.svg" alt="Trusted Partners" className="partner-illustration" />
              </div>
              <div className="tagline">
                <h1 className="tagline-text">
                  Your Trusted <span className="highlight-orange">Sarthi,</span>
                </h1>
                <h1 className="tagline-text">
                  Bringing Every Shipment <span className="highlight-teal">Closer</span>
                </h1>
              </div>
              <button className="try-free-btn" onClick={() => navigate('/')}>
                Try For Free
              </button>
            </div>
          </div>

          {/* Right Section - Tracking Form */}
          <div className="tracking-right">
            <div className="tracking-card">
              <div className="tracking-card-header">
                <h2 className="tracking-title">
                  Track Your <span className="highlight-orange">Order</span>
                </h2>
                <p className="tracking-subtitle">Check current status of your shipment</p>
              </div>

              <form className="tracking-form" onSubmit={handleTrackOrder}>
                <div className="form-group">
                  <label htmlFor="awb" className="form-label">AWB Number</label>
                  <input
                    type="text"
                    id="awb"
                    className="form-input"
                    placeholder="Enter AWB number"
                    value={awbNumber}
                    onChange={(e) => setAwbNumber(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <button 
                  type="submit" 
                  className="track-order-btn"
                  disabled={loading}
                >
                  {loading ? 'Tracking...' : 'Track Order'}
                </button>
              </form>

              {/* Error Display */}
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}

              {/* Tracking Results */}
              {trackingData && (
                <div className="tracking-results">
                  <div className="results-header">
                    <h3>Tracking Information</h3>
                    <div className="awb-display">AWB: {trackingData.AWB}</div>
                  </div>
                  
                  <div className="shipment-info">
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className={`status ${trackingData.Status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {trackingData.Status}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Origin:</span>
                      <span className="value">{trackingData.Origin}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Destination:</span>
                      <span className="value">{trackingData.Destination}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Last Updated:</span>
                      <span className="value">
                        {new Date(trackingData.StatusDateTime).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {trackingData.Scans && trackingData.Scans.length > 0 && (
                    <div className="tracking-scans">
                      <h4>Tracking History</h4>
                      <div className="scans-timeline">
                        {trackingData.Scans.map((scan, index) => (
                          <div key={index} className="scan-item">
                            <div className="scan-time">
                              {new Date(scan.ScanDateTime).toLocaleString()}
                            </div>
                            <div className="scan-location">
                              <strong>{scan.ScanLocation}</strong>
                            </div>
                            <div className="scan-type">{scan.ScanType}</div>
                            {scan.Remarks && (
                              <div className="scan-remarks">{scan.Remarks}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="helper-text">
                <p className="helper-question">Can't Find Your AWB number?</p>
                <p className="helper-instruction">
                  Kindly check the SMS and Email of order confirmation for AWB numbers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Tracking;
