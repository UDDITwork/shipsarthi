import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { environmentConfig } from '../config/environment';
import { requestDeduplicator } from '../utils/requestDeduplicator';

// Use the environment configuration
const API_BASE_URL = environmentConfig.apiUrl;

class ApiService {
  private api: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased timeout to 30 seconds for initial requests and DB cold starts
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
        
        // Don't set Content-Type for FormData - let browser handle it
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        // Enhanced request logging
        console.log('🚀 FRONTEND API REQUEST:', {
          method: config.method,
          baseURL: config.baseURL,
          data: config.data,
          headers: config.headers,
          isFormData: config.data instanceof FormData,
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
          errorDetails.message = 'Request timeout - The server is taking longer than expected. Please try again.';
        } else if (!error.response) {
          console.error('🌐 NETWORK ERROR - Cannot connect to backend');
          errorDetails.message = 'Network error - Cannot connect to backend server. Please check your connection and try again.';
        } else if (error.response.status === 503) {
          // Service Unavailable - usually means DB is not ready
          const serverMessage = error.response.data?.message || 'Service temporarily unavailable';
          console.error('🔌 SERVICE UNAVAILABLE - Database may not be ready');
          errorDetails.message = serverMessage.includes('Database') || serverMessage.includes('database')
            ? 'Database is initializing. Please wait a moment and try again.'
            : serverMessage;
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

  // Retry helper with exponential backoff
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries = this.maxRetries
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error: any) {
      // Don't retry on 401 (auth errors) or 4xx client errors (except 429)
      if (error.response?.status === 401 || 
          (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429)) {
        throw error;
      }

      // CRITICAL: NEVER retry on 429 (rate limit) - retrying makes it exponentially worse!
      // The rate limit window is 15 minutes, so retrying immediately will just hit the limit again
      if (error.response?.status === 429) {
        console.error('🚫 Rate limit exceeded - NOT retrying. Use cached data or wait before making new requests.');
        // Don't retry at all - fail immediately and let the app use cached data
        throw error;
      }

      // Retry on network errors, timeouts, or 5xx server errors (NOT 429)
      if (retries > 0 && (
        !error.response || 
        error.response.status >= 500 || 
        error.code === 'ECONNABORTED' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT'
      )) {
        const delay = this.retryDelay * Math.pow(2, this.maxRetries - retries);
        console.log(`🔄 Retrying request (${this.maxRetries - retries + 1}/${this.maxRetries}) after ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(requestFn, retries - 1);
      }
      
      throw error;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // Use deduplicator to prevent duplicate requests
    const key = `GET:${url}`;
    return requestDeduplicator.get(key, async () => {
      const response = await this.retryRequest(() => this.api.get<T>(url, config));
      return response.data;
    });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.api.post<T>(url, data, config));
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.api.put<T>(url, data, config));
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.api.patch<T>(url, data, config));
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.retryRequest(() => this.api.delete<T>(url, config));
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