import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-circle">
              <span className="logo-text">S</span>
            </div>
          </div>
          <h1 className="login-title">Welcome back!</h1>
          <p className="login-subtitle">Login to Your Account</p>
        </div>

        {/* Login Form */}
        <div className="login-form-container">
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}

            {/* Email or Phone */}
            <div className="form-group">
              <label className="form-label">
                Email or Phone
              </label>
              <div className="input-container">
                <User className="input-icon" />
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
                  placeholder="Enter email or phone number"
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
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className="form-input"
                  placeholder="Enter password"
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
                  Remember Me
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="forgot-password-link"
              >
                Forgot Password?
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
                New to Shipsarthi?{' '}
                <Link to="/register" className="register-link">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          <div className="footer-links-container">
            <Link to="/terms" className="footer-link">Terms & Condition</Link>
            <Link to="/refund" className="footer-link">Refund & Cancellation Policy</Link>
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;