import React, { useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Phone } from 'lucide-react';
import { otpService } from '../services/otpService';
import { apiService } from '../services/api';
import './OTPVerificationModal.css';

// Registration data interface
interface RegistrationData {
  user_type: string;
  monthly_shipments: string;
  company_name: string;
  your_name: string;
  state: string;
  phone_number: string;
  email: string;
  password: string;
  reference_code?: string;
  terms_accepted: boolean;
}

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onVerificationSuccess: (user: any) => void;
  onVerificationError: (error: string) => void;
  // New prop for registration flow - contains all form data
  registrationData?: RegistrationData;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  phoneNumber,
  onVerificationSuccess,
  onVerificationError,
  registrationData
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [retryType, setRetryType] = useState<'sms' | 'voice'>('sms');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // For registration flow, OTP is already sent by /register endpoint
  // For other flows (like phone verification), send OTP here
  const sendOTP = useCallback(async () => {
    // If this is a registration flow, OTP was already sent by /register endpoint
    if (registrationData) {
      setOtpSent(true);
      setResendCooldown(60);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await otpService.sendOTP(phoneNumber);
      setOtpSent(true);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
      onVerificationError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, onVerificationError, registrationData]);

  useEffect(() => {
    if (isOpen && phoneNumber) {
      sendOTP();
    }
  }, [isOpen, phoneNumber, sendOTP]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length < 4) {
      setError('Please enter a valid OTP');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If this is a registration flow, call complete-registration endpoint
      if (registrationData) {
        const response = await apiService.post<{
          status: string;
          message: string;
          user: any;
        }>('/auth/complete-registration', {
          ...registrationData,
          terms_accepted: 'true', // API expects string 'true'
          otp: otp
        });

        if (response.status === 'success') {
          setSuccess(true);
          onVerificationSuccess(response.user);
        } else {
          throw new Error(response.message || 'Verification failed');
        }
      } else {
        // Standard OTP verification flow (not registration)
        const response = await otpService.verifyOTP(phoneNumber, otp);
        setSuccess(true);
        onVerificationSuccess(response.user);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Invalid OTP';
      setError(errorMessage);
      onVerificationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setResendLoading(true);
      setError(null);
      await otpService.resendOTP(phoneNumber, retryType);
      setResendCooldown(60); // Reset cooldown
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
      setError(null);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  if (!isOpen) return null;

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal">
        <div className="otp-modal-header">
          <h2>Verify Phone Number</h2>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="otp-modal-content">
          {!otpSent ? (
            <div className="otp-sending">
              <div className="loading-spinner"></div>
              <p>Sending OTP to {formatPhoneNumber(phoneNumber)}...</p>
            </div>
          ) : success ? (
            <div className="otp-success">
              <div className="success-icon">✓</div>
              <h3>Phone Number Verified!</h3>
              <p>Your phone number has been successfully verified.</p>
            </div>
          ) : (
            <>
              <div className="otp-info">
                <div className="phone-icon">
                  <Phone size={24} />
                </div>
                <p>
                  We've sent a verification code to{' '}
                  <strong>{formatPhoneNumber(phoneNumber)}</strong>
                </p>
                <p className="otp-instruction">
                  Please enter the 6-digit code to verify your phone number.
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="otp-form">
                <div className="otp-input-container">
                  <input
                    type="text"
                    value={otp}
                    onChange={handleOTPChange}
                    placeholder="Enter OTP"
                    className="otp-input"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="verify-button"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>

              <div className="otp-actions">
                <button
                  onClick={handleResendOTP}
                  disabled={resendLoading || resendCooldown > 0}
                  className="resend-button"
                >
                  {resendLoading ? (
                    'Sending...'
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      Resend OTP
                    </>
                  )}
                </button>

                <div className="retry-type-toggle">
                  <button
                    onClick={() => setRetryType('sms')}
                    className={retryType === 'sms' ? 'active' : ''}
                  >
                    SMS
                  </button>
                  <button
                    onClick={() => setRetryType('voice')}
                    className={retryType === 'voice' ? 'active' : ''}
                  >
                    Voice Call
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
