import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await authService.forgotPassword(email);
      if (response.status === 'success') {
        setStep('reset');
        setSuccess(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email not found. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.resetPassword(email, password);
      if (response.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
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
                <h1 className="login-title">
                  {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                </h1>
                <p className="login-subtitle">
                  {step === 'email' 
                    ? 'No worries! Enter your email to verify your account' 
                    : `Enter your new password for ${email}`}
                </p>
              </div>
              
              {step === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="login-form">
                  {error && (
                    <div className="error-message">
                      <p>{error}</p>
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
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`login-button ${loading ? 'loading' : ''}`}
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
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
              ) : (
                <form onSubmit={handlePasswordReset} className="login-form">
                  {error && (
                    <div className="error-message">
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="success-message">
                      <p>✅ Password reset successful! Redirecting to login...</p>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      New Password
                    </label>
                    <div className="input-container">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-input"
                        placeholder="Enter new password (min. 6 characters)"
                        required
                        disabled={loading || success}
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Confirm Password
                    </label>
                    <div className="input-container">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="form-input"
                        placeholder="Confirm new password"
                        required
                        disabled={loading || success}
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || success}
                    className={`login-button ${loading ? 'loading' : ''} ${success ? 'success' : ''}`}
                  >
                    {loading ? 'Resetting...' : success ? 'Password Reset!' : 'Reset Password'}
                  </button>

                  <div className="register-link-container">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setPassword('');
                        setConfirmPassword('');
                        setError('');
                        setSuccess(false);
                      }}
                      className="back-link"
                      disabled={loading}
                    >
                      ← Back to Email
                    </button>
                    <p className="register-text">
                      Remember your password?{' '}
                      <Link to="/login" className="register-link">
                        Back to Login
                      </Link>
                    </p>
                  </div>
                </form>
              )}
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
