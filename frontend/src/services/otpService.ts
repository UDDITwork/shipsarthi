import { apiService } from './api';

interface SendOTPResponse {
  status: string;
  message: string;
  phone_number: string;
  expires_in: number;
}

interface VerifyOTPResponse {
  status: string;
  message: string;
  user: {
    _id: string;
    phone_number: string;
    phone_verified: boolean;
    otp_verified: boolean;
  };
}

interface ResendOTPResponse {
  status: string;
  message: string;
  phone_number: string;
  retry_type: string;
  expires_in: number;
}

interface OTPStatusResponse {
  status: string;
  data: {
    phone_number: string;
    phone_verified: boolean;
    otp_verified: boolean;
    is_locked: boolean;
    lock_time_remaining: number;
    otp_attempts: number;
    has_otp_token: boolean;
    otp_expires: string | null;
  };
}

export const otpService = {
  async sendOTP(phone_number: string): Promise<SendOTPResponse> {
    return await apiService.post<SendOTPResponse>('/otp/send', {
      phone_number
    });
  },

  async verifyOTP(phone_number: string, otp: string): Promise<VerifyOTPResponse> {
    return await apiService.post<VerifyOTPResponse>('/otp/verify', {
      phone_number,
      otp
    });
  },

  async resendOTP(phone_number: string, retry_type: 'sms' | 'voice' = 'sms'): Promise<ResendOTPResponse> {
    return await apiService.post<ResendOTPResponse>('/otp/resend', {
      phone_number,
      retry_type
    });
  },

  async getOTPStatus(phone_number: string): Promise<OTPStatusResponse> {
    return await apiService.get<OTPStatusResponse>(`/otp/status/${phone_number}`);
  }
};
