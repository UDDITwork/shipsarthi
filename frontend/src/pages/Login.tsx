import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

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

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginFormData>();

  // Load saved email on component mount (secure - no password storage)
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';
    if (savedEmail && savedRememberMe) {
      setValue('email', savedEmail);
      setValue('remember_me', true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, data.remember_me);
      
      // Handle Remember Me functionality - SECURE: Only store email, not password
      if (data.remember_me) {
        localStorage.setItem('remembered_email', data.email);
        localStorage.setItem('remember_me', 'true');
        // Token is already stored in localStorage by AuthContext
      } else {
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remember_me');
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login failed:', err);
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

          {/* Right Side - Login Form */}
          <div className="klogin-form-section">
            <div className="klogin-form-container">
              <div className="kform-header">
                <h1 className="klogin-title">Welcome back!</h1>
                <p className="klogin-subtitle">Login to Your Account</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="klogin-form">
                {showWelcomeMessage && (
                  <div className="ksuccess-message">
                    <p>🎉 Welcome! Please login with your credentials.</p>
                  </div>
                )}

                {error && (
                  <div className="kerror-message">
                    <p>{error}</p>
                  </div>
                )}


                {/* Email or Phone */}
                <div className="kform-group">
                  <label className="kform-label" htmlFor="login-email">
                    Email or Phone
                  </label>
                  <div className="kinput-container">
                    <input
                      id="login-email"
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
                      className="kform-input"
                      placeholder="Enter your email or phone"
                    />
                  </div>
                  {errors.email && (
                    <p className="kfield-error">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="kform-group">
                  <label className="kform-label" htmlFor="login-password">
                    Password
                  </label>
                  <div className="kinput-container">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { required: 'Password is required' })}
                      className="kform-input"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="kpassword-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="ktoggle-icon" />
                      ) : (
                        <Eye className="ktoggle-icon" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="kfield-error">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me and Forgot Password */}
                <div className="kform-options">
                  <label htmlFor="remember" className="kremember-me">
                    <input
                      type="checkbox"
                      {...register('remember_me')}
                      className="kcheckbox"
                      id="remember"
                    />
                    <span className="kcheckbox-label">
                      Remember me
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="kforgot-password-link"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`klogin-button ${loading ? 'kloading' : ''}`}
                >
                  {loading ? 'Signing In...' : 'Log in'}
                </button>

                {/* Register Link */}
                <div className="kregister-link-container">
                  <p className="kregister-text">
                    New to Shipsarthi ?{' '}
                    <Link to="/register" className="kregister-link">
                      Create an account
                    </Link>
                  </p>
                </div>
              </form>
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

export default Login;