import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { environmentConfig } from '../config/environment';

// Use the environment configuration
const API_BASE_URL = environmentConfig.apiUrl;

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // Reduced timeout to 10 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Enhanced request logging
        console.log('🚀 FRONTEND API REQUEST:', {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
          data: config.data,
          headers: config.headers,
          timestamp: new Date().toISOString()
        });
        
        return config;
      },
      (error) => {
        console.error('❌ FRONTEND REQUEST ERROR:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ FRONTEND API RESPONSE:', {
          url: response.config.url,
          status: response.status,
          data: response.data,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error) => {
        // Enhanced error logging with connection details
        const errorDetails = {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code,
          timeout: error.code === 'ECONNABORTED',
          networkError: !error.response,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ FRONTEND API ERROR:', errorDetails);
        
        // Special handling for timeout and connection errors
        if (error.code === 'ECONNABORTED') {
          console.error('⏰ REQUEST TIMEOUT - Backend might be down or slow');
          errorDetails.message = 'Request timeout - Backend server might be down or slow';
        } else if (!error.response) {
          console.error('🌐 NETWORK ERROR - Cannot connect to backend');
          errorDetails.message = 'Network error - Cannot connect to backend server';
        }
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete<T>(url, config);
    return response.data;
  }

  async uploadFile<T>(url: string, file: File, onUploadProgress?: (progressEvent: any) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  }
}

export const apiService = new ApiService();