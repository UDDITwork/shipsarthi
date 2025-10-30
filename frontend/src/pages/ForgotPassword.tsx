import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          {/* Left Side - 3 Steps Process */}
          <div className="steps-section">
            <div className="steps-header">
              <h1 className="brand-title">
                <span className="brand-ship">Ship</span>
                <span className="brand-sarthi">sarthi</span>
              </h1>
              <p className="brand-tagline">
                <span className="tagline-your-trusted">Your Trusted </span>
                <span className="tagline-sarthi">Sarthi </span>
                <span className="tagline-in-every">in Every </span>
                <span className="tagline-shipment">Shipment</span>
              </p>
            </div>
            
            <div className="steps-visualization">
              <img 
                src="/3 steps for login 1.svg" 
                alt="3 Steps Process" 
                className="steps-image"
              />
            </div>
          </div>

          {/* Right Side - Forgot Password Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="form-header">
                <h1 className="login-title">Forgot Password?</h1>
                <p className="login-subtitle">No worries! Enter your email to reset your password</p>
              </div>
              
              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="success-message">
                    <p>✅ Password reset email sent! Please check your inbox.</p>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Email Address
                  </label>
                  <div className="input-container">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`login-button ${loading ? 'loading' : ''}`}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="register-link-container">
                  <p className="register-text">
                    Remember your password?{' '}
                    <Link to="/login" className="register-link">
                      Back to Login
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          <div className="footer-links-container">
            <Link to="/terms-conditions" className="footer-link">Terms & Condition</Link>
            <Link to="/order-cancellation" className="footer-link">Refund & Cancellation Policy</Link>
            <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
