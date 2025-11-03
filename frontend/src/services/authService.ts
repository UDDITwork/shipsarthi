import { apiService } from './api';
import { User, RegisterData } from '../types';

interface LoginResponse {
  status: string;
  message: string;
  token: string;
  user: User;
}

interface RegisterResponse {
  status: string;
  message: string;
  token?: string;
  user: User;
  requires_otp_verification?: boolean;
}

export const authService = {
  async login(email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
    return await apiService.post<LoginResponse>('/auth/login', {
      email,
      password,
      remember_me: rememberMe
    });
  },

  async register(userData: RegisterData): Promise<RegisterResponse> {
    return await apiService.post<RegisterResponse>('/auth/register', userData);
  },

  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    return await apiService.post('/auth/forgot-password', { email });
  },

  async resetPassword(email: string, password: string): Promise<{ status: string; message: string }> {
    return await apiService.post('/auth/reset-password', { email, password });
  },

  async verifyEmail(token: string): Promise<{ status: string; message: string }> {
    return await apiService.post('/auth/verify-email', { token });
  },

  async resendVerification(email: string): Promise<{ status: string; message: string }> {
    return await apiService.post('/auth/resend-verification', { email });
  },

  async refreshToken(): Promise<LoginResponse> {
    return await apiService.post<LoginResponse>('/auth/refresh-token');
  },

  async logout(): Promise<{ status: string; message: string }> {
    return await apiService.post('/auth/logout');
  },

  async getCurrentUser(): Promise<{ status: string; user: User }> {
    return await apiService.get<{ status: string; user: User }>('/auth/me');
  }
};