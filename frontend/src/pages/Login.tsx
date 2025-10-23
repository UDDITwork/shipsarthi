import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import OTPVerificationModal from '../components/OTPVerificationModal';

interface LoginFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpPhoneNumber, setOtpPhoneNumber] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user came from registration page
    if (location.state?.fromRegistration) {
      setShowWelcomeMessage(true);
      // Hide welcome message after 5 seconds
      setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 5000);
    }
  }, [location]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
      
      // Check if OTP verification is required
      if (err.response?.status === 403 && err.response?.data?.requires_otp_verification) {
        setOtpPhoneNumber(err.response.data.phone_number);
        setShowOTPModal(true);
        setOtpError(null);
      }
    }
  };

  const handleOTPVerificationSuccess = (user: any) => {
    setShowOTPModal(false);
    setOtpError(null);
    navigate('/dashboard');
  };

  const handleOTPVerificationError = (error: string) => {
    setOtpError(error);
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

          {/* Right Side - Login Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="form-header">
                <h1 className="login-title">Welcome back!</h1>
                <p className="login-subtitle">Login to Your Account</p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="login-form">
                {showWelcomeMessage && (
                  <div className="success-message">
                    <p>🎉 Welcome! Please login with your credentials.</p>
                  </div>
                )}
                
                {error && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}

                {otpError && (
                  <div className="error-message">
                    <p>{otpError}</p>
                  </div>
                )}

                {/* Email or Phone */}
                <div className="form-group">
                  <label className="form-label">
                    Email or Phone
                  </label>
                  <div className="input-container">
                    <input
                      type="text"
                      {...register('email', { 
                        required: 'Email or phone is required',
                        validate: (value) => {
                          const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                          const phonePattern = /^[6-9]\d{9}$/;
                          if (!emailPattern.test(value) && !phonePattern.test(value)) {
                            return 'Please enter a valid email or phone number';
                          }
                          return true;
                        }
                      })}
                      className="form-input"
                      placeholder="Enter your email or phone"
                    />
                  </div>
                  {errors.email && (
                    <p className="field-error">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="form-label">
                    Password
                  </label>
                  <div className="input-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { required: 'Password is required' })}
                      className="form-input"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="toggle-icon" />
                      ) : (
                        <Eye className="toggle-icon" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="field-error">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me and Forgot Password */}
                <div className="form-options">
                  <div className="remember-me">
                    <input
                      type="checkbox"
                      {...register('remember_me')}
                      className="checkbox"
                      id="remember"
                    />
                    <label htmlFor="remember" className="checkbox-label">
                      Remember me
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="forgot-password-link"
                  >
                    Forgot Password ?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`login-button ${loading ? 'loading' : ''}`}
                >
                  {loading ? 'Signing In...' : 'Log in'}
                </button>

                {/* Register Link */}
                <div className="register-link-container">
                  <p className="register-text">
                    New to Shipsarthi ?{' '}
                    <Link to="/register" className="register-link">
                      Create an account
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

      {/* OTP Verification Modal */}
      {showOTPModal && otpPhoneNumber && (
        <OTPVerificationModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          phoneNumber={otpPhoneNumber}
          onVerificationSuccess={handleOTPVerificationSuccess}
          onVerificationError={handleOTPVerificationError}
        />
      )}
    </div>
  );
};

export default Login;