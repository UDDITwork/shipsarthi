import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Login.css';

type Step = 'mobile' | 'otp' | 'reset';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setOtpSent(false);

    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.forgotPasswordSendOTP(mobile);
      if (response.status === 'success') {
        setOtpSent(true);
        setStep('otp');
        setResendCooldown(60); // 60 seconds cooldown
        setSuccess(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate OTP
    const otpRegex = /^\d{4,6}$/;
    if (!otpRegex.test(otp)) {
      setError('Please enter a valid OTP (4-6 digits)');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.forgotPasswordVerifyOTP(mobile, otp);
      if (response.status === 'success' && response.verified) {
        setOtpVerified(true);
        setStep('reset');
        setError('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.forgotPasswordResendOTP(mobile, 'sms');
      if (response.status === 'success') {
        setResendCooldown(60); // Reset cooldown
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
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

    if (!otpVerified) {
      setError('Please verify OTP first.');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.forgotPasswordReset(mobile, password);
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
    <div className="klogin-page">
      <div className="klogin-container">
        <div className="klogin-content">
          {/* Left Side - 3 Steps Process */}
          <div className="ksteps-section">
            <div className="ksteps-header">
              <h1 className="kbrand-title">
                <span className="kbrand-ship">Ship</span>
                <span className="kbrand-sarthi">sarthi</span>
              </h1>
              <p className="kbrand-tagline">
                <span className="ktagline-your-trusted">Your Trusted </span>
                <span className="ktagline-sarthi">Sarthi </span>
                <span className="ktagline-in-every">in Every </span>
                <span className="ktagline-shipment">Shipment</span>
              </p>
            </div>
            
            <div className="ksteps-visualization">
              <img 
                src="/3 steps for login 1.svg" 
                alt="3 Steps Process" 
                className="ksteps-image"
              />
            </div>
          </div>

          {/* Right Side - Forgot Password Form */}
          <div className="klogin-form-section">
            <div className="klogin-form-container">
              <div className="kform-header">
                <h1 className="klogin-title">
                  {step === 'mobile' && 'Forgot Password?'}
                  {step === 'otp' && 'Verify OTP'}
                  {step === 'reset' && 'Reset Password'}
                </h1>
                <p className="klogin-subtitle">
                  {step === 'mobile' && 'Enter your registered mobile number to receive OTP'}
                  {step === 'otp' && `Enter the OTP sent to ${mobile}`}
                  {step === 'reset' && 'Enter your new password'}
                </p>
              </div>
              
              {step === 'mobile' ? (
                <form onSubmit={handleMobileSubmit} className="klogin-form">
                  {error && (
                    <div className="kerror-message">
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="ksuccess-message">
                      <p>{success}</p>
                    </div>
                  )}

                  <div className="kform-group">
                    <label className="kform-label">
                      Mobile Number
                    </label>
                    <div className="kinput-container">
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="kform-input"
                        placeholder="Enter your 10-digit mobile number"
                        required
                        disabled={loading}
                        maxLength={10}
                        pattern="[6-9]\d{9}"
                      />
                    </div>
                    <p className="kfield-hint">Enter the mobile number registered with your account</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`klogin-button ${loading ? 'kloading' : ''}`}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>

                  <div className="kregister-link-container">
                    <p className="kregister-text">
                      Remember your password?{' '}
                      <Link to="/login" className="kregister-link">
                        Back to Login
                      </Link>
                    </p>
                  </div>
                </form>
              ) : step === 'otp' ? (
                <form onSubmit={handleOTPVerify} className="klogin-form">
                  {error && (
                    <div className="kerror-message">
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="ksuccess-message">
                      <p>✅ OTP resent successfully!</p>
                    </div>
                  )}

                  {otpSent && (
                    <div className="ksuccess-message">
                      <p>✅ OTP sent to {mobile}</p>
                    </div>
                  )}

                  <div className="kform-group">
                    <label className="kform-label">
                      Enter OTP
                    </label>
                    <div className="kinput-container">
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="kform-input"
                        placeholder="Enter 6-digit OTP"
                        required
                        disabled={loading}
                        maxLength={6}
                        pattern="\d{4,6}"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`klogin-button ${loading ? 'kloading' : ''}`}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <div className="kform-group" style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={loading || resendCooldown > 0}
                      className="kforgot-password-link"
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        width: '100%',
                        padding: '0.5rem'
                      }}
                    >
                      {resendCooldown > 0 
                        ? `Resend OTP in ${resendCooldown}s` 
                        : 'Resend OTP'}
                    </button>
                  </div>

                  <div className="kregister-link-container">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('mobile');
                        setOtp('');
                        setError('');
                        setSuccess(false);
                        setOtpSent(false);
                        setResendCooldown(0);
                        setOtpVerified(false);
                      }}
                      className="kforgot-password-link"
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        marginBottom: '0.5rem'
                      }}
                      disabled={loading}
                    >
                      ← Change Mobile Number
                    </button>
                    <p className="kregister-text">
                      Remember your password?{' '}
                      <Link to="/login" className="kregister-link">
                        Back to Login
                      </Link>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordReset} className="klogin-form">
                  {error && (
                    <div className="kerror-message">
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="ksuccess-message">
                      <p>✅ Password reset successful! Redirecting to login...</p>
                    </div>
                  )}

                  {otpVerified && (
                    <div className="ksuccess-message">
                      <p>✅ OTP verified successfully</p>
                    </div>
                  )}

                  <div className="kform-group">
                    <label className="kform-label">
                      New Password
                    </label>
                    <div className="kinput-container">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="kform-input"
                        placeholder="Enter new password (min. 6 characters)"
                        required
                        disabled={loading || success}
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="kform-group">
                    <label className="kform-label">
                      Confirm Password
                    </label>
                    <div className="kinput-container">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="kform-input"
                        placeholder="Confirm new password"
                        required
                        disabled={loading || success}
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || success || !otpVerified}
                    className={`klogin-button ${loading ? 'kloading' : ''} ${success ? 'ksuccess' : ''}`}
                  >
                    {loading ? 'Resetting...' : success ? 'Password Reset!' : 'Reset Password'}
                  </button>

                  <div className="kregister-link-container">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('otp');
                        setPassword('');
                        setConfirmPassword('');
                        setError('');
                        setSuccess(false);
                      }}
                      className="kforgot-password-link"
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        marginBottom: '0.5rem'
                      }}
                      disabled={loading || success}
                    >
                      ← Back to OTP Verification
                    </button>
                    <p className="kregister-text">
                      Remember your password?{' '}
                      <Link to="/login" className="kregister-link">
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
        <div className="kfooter-links">
          <div className="kfooter-links-container">
            <Link to="/terms-conditions" className="kfooter-link">Terms & Condition</Link>
            <Link to="/order-cancellation" className="kfooter-link">Refund & Cancellation Policy</Link>
            <Link to="/privacy-policy" className="kfooter-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
