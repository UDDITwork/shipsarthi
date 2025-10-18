import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, User, Building, MapPin, Phone, Mail, Lock, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RegisterData } from '../types';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('');
  const [selectedShipments, setSelectedShipments] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>();

  const userTypes = [
    'E-commerce Sellers',
    'Direct to Consumer Brands',
    'Manufacturers & Wholesalers',
    'Corporate/Enterprise',
    'Courier Service Providers',
    'Individual Shippers'
  ];

  const shipmentVolumes = [
    '10-300',
    '300-1000',
    '1000-2500',
    '2500-5000',
    'Above 5000 Orders'
  ];

  const onSubmit = async (data: RegisterData) => {
    try {
      await registerUser(data);
      
      // Show success message
      setRegistrationSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { fromRegistration: true } });
      }, 3000);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-content">
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

          {/* Right Side - Registration Form */}
          <div className="register-form-section">
            <div className="register-form-container">
              <div className="form-header">
                <h1 className="register-title">Register to Shipsarthi</h1>
                <p className="register-subtitle">Start your journey with Shipsarthi - shipping starts in just a few clicks.</p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="register-form">
                {registrationSuccess && (
                  <div className="success-message">
                    <p>✅ Registration successful! Redirecting to login page...</p>
                  </div>
                )}
                
                {error && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}

                <div className="form-grid">
                  {/* User Type */}
                  <div className="form-group">
                    <label className="form-label">
                      User Type *
                    </label>
                    <select
                      {...register('user_type', { required: 'User type is required' })}
                      className="form-select"
                      value={selectedUserType}
                      onChange={(e) => setSelectedUserType(e.target.value)}
                    >
                      <option value="">Select User Type</option>
                      {userTypes.map((type) => (
                        <option key={type} value={type.toLowerCase().replace(/[^a-z0-9]/g, '-')}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.user_type && (
                      <p className="field-error">{errors.user_type.message}</p>
                    )}
                  </div>

                  {/* Monthly Shipments */}
                  <div className="form-group">
                    <label className="form-label">
                      Monthly Shipments *
                    </label>
                    <select
                      {...register('monthly_shipments', { required: 'Monthly shipments is required' })}
                      className="form-select"
                      value={selectedShipments}
                      onChange={(e) => setSelectedShipments(e.target.value)}
                    >
                      <option value="">Select Volume Range</option>
                      {shipmentVolumes.map((volume) => (
                        <option key={volume} value={volume}>
                          {volume}
                        </option>
                      ))}
                    </select>
                    {errors.monthly_shipments && (
                      <p className="field-error">{errors.monthly_shipments.message}</p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div className="form-group">
                    <label className="form-label">
                      Company Name *
                    </label>
                    <div className="input-container">
                      <Building className="input-icon" />
                      <input
                        type="text"
                        {...register('company_name', { required: 'Company name is required' })}
                        className="form-input"
                        placeholder="Enter company name"
                      />
                    </div>
                    {errors.company_name && (
                      <p className="field-error">{errors.company_name.message}</p>
                    )}
                  </div>

                  {/* Your Name */}
                  <div className="form-group">
                    <label className="form-label">
                      Your Name *
                    </label>
                    <div className="input-container">
                      <User className="input-icon" />
                      <input
                        type="text"
                        {...register('your_name', { required: 'Your name is required' })}
                        className="form-input"
                        placeholder="Enter your name"
                      />
                    </div>
                    {errors.your_name && (
                      <p className="field-error">{errors.your_name.message}</p>
                    )}
                  </div>

                  {/* State */}
                  <div className="form-group">
                    <label className="form-label">
                      State *
                    </label>
                    <div className="input-container">
                      <MapPin className="input-icon" />
                      <input
                        type="text"
                        {...register('state', { required: 'State is required' })}
                        className="form-input"
                        placeholder="Enter state"
                      />
                    </div>
                    {errors.state && (
                      <p className="field-error">{errors.state.message}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group">
                    <label className="form-label">
                      Phone Number *
                    </label>
                    <div className="input-container">
                      <Phone className="input-icon" />
                      <input
                        type="tel"
                        {...register('phone_number', { 
                          required: 'Phone number is required',
                          pattern: {
                            value: /^[6-9]\d{9}$/,
                            message: 'Please enter a valid 10-digit phone number'
                          }
                        })}
                        className="form-input"
                        placeholder="Enter phone number"
                      />
                    </div>
                    {errors.phone_number && (
                      <p className="field-error">{errors.phone_number.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label">
                      Email *
                    </label>
                    <div className="input-container">
                      <Mail className="input-icon" />
                      <input
                        type="email"
                        {...register('email', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address'
                          }
                        })}
                        className="form-input"
                        placeholder="Enter email address"
                      />
                    </div>
                    {errors.email && (
                      <p className="field-error">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label">
                      Password *
                    </label>
                    <div className="input-container">
                      <Lock className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', { 
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
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
                </div>

                {/* Reference Code */}
                <div className="form-group">
                  <label className="form-label">
                    Reference Code (Optional)
                  </label>
                  <div className="input-container">
                    <Tag className="input-icon" />
                    <input
                      type="text"
                      {...register('reference_code')}
                      className="form-input"
                      placeholder="Enter reference code"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="terms-container">
                  <div className="terms-checkbox">
                    <input
                      type="checkbox"
                      {...register('terms_accepted', { required: 'You must accept terms and conditions' })}
                      className="checkbox"
                      id="terms"
                    />
                    <label htmlFor="terms" className="terms-label">
                      I agree to the{' '}
                      <Link to="/terms" className="terms-link">
                        Terms & Conditions
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="terms-link">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  {errors.terms_accepted && (
                    <p className="field-error">{errors.terms_accepted.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`register-button ${loading ? 'loading' : ''}`}
                >
                  {loading ? 'Creating Account...' : 'Register'}
                </button>

                <div className="login-link-container">
                  <p className="login-link-text">
                    Already have an account?{' '}
                    <Link to="/login" className="login-link">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;