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
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Register to Shipsarthi</h1>
          <p className="mt-2 text-gray-600">Join India's leading logistics aggregation platform</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-2">
            <div className="card">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Type *
                    </label>
                    <select
                      {...register('user_type', { required: 'User type is required' })}
                      className="input-field"
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
                      <p className="mt-1 text-sm text-red-600">{errors.user_type.message}</p>
                    )}
                  </div>

                  {/* Monthly Shipments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Shipments *
                    </label>
                    <select
                      {...register('monthly_shipments', { required: 'Monthly shipments is required' })}
                      className="input-field"
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
                      <p className="mt-1 text-sm text-red-600">{errors.monthly_shipments.message}</p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        {...register('company_name', { required: 'Company name is required' })}
                        className="input-field pl-10"
                        placeholder="Enter company name"
                      />
                    </div>
                    {errors.company_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
                    )}
                  </div>

                  {/* Your Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        {...register('your_name', { required: 'Your name is required' })}
                        className="input-field pl-10"
                        placeholder="Enter your name"
                      />
                    </div>
                    {errors.your_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.your_name.message}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        {...register('state', { required: 'State is required' })}
                        className="input-field pl-10"
                        placeholder="Enter state"
                      />
                    </div>
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        {...register('phone_number', { 
                          required: 'Phone number is required',
                          pattern: {
                            value: /^[6-9]\d{9}$/,
                            message: 'Please enter a valid 10-digit phone number'
                          }
                        })}
                        className="input-field pl-10"
                        placeholder="Enter phone number"
                      />
                    </div>
                    {errors.phone_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        {...register('email', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address'
                          }
                        })}
                        className="input-field pl-10"
                        placeholder="Enter email address"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', { 
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                        className="input-field pl-10 pr-10"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                {/* Reference Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Code (Optional)
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      {...register('reference_code')}
                      className="input-field pl-10"
                      placeholder="Enter reference code"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    {...register('terms_accepted', { required: 'You must accept terms and conditions' })}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {errors.terms_accepted && (
                  <p className="text-sm text-red-600">{errors.terms_accepted.message}</p>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Register'}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Preview Panels */}
          <div className="space-y-6">
            {/* User Type Preview */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">User Types</h3>
              <div className="space-y-2">
                {userTypes.map((type, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded text-sm ${
                      selectedUserType === type.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            {/* Shipment Volume Preview */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Shipment Volumes</h3>
              <div className="space-y-2">
                {shipmentVolumes.map((volume, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded text-sm ${
                      selectedShipments === volume
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {volume}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;