import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, RegisterData } from '../types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      if (!token) return;
      
      const response = await authService.getCurrentUser();
      const updatedUser = response.user;
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      console.log('🔄 User data refreshed:', {
        user_category: updatedUser.user_category,
        company_name: updatedUser.company_name
      });
    } catch (err: any) {
      console.error('Failed to refresh user data:', err);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // WebSocket connection is handled in Layout.tsx to avoid duplicate connections

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(email, password);
      
      setUser(response.user);
      setToken(response.token);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (err: any) {
      // Handle different types of errors with user-friendly messages
      let errorMessage = 'Login failed';
      
      if (err.response) {
        // Server responded with an error
        const status = err.response.status;
        const serverMessage = err.response.data?.message || '';
        
        if (status === 503) {
          // Service Unavailable - Database not ready
          errorMessage = serverMessage.includes('Database') || serverMessage.includes('database')
            ? 'Database is initializing. Please wait a moment and try again.'
            : serverMessage || 'Service temporarily unavailable. Please try again in a moment.';
        } else if (status === 401) {
          errorMessage = serverMessage || 'Invalid email or password';
        } else if (status === 423) {
          errorMessage = serverMessage || 'Account is locked. Please try again later.';
        } else {
          errorMessage = serverMessage || 'Login failed. Please try again.';
        }
      } else if (err.code === 'ECONNABORTED') {
        // Request timeout
        errorMessage = 'Request timeout - The server is taking longer than expected. Please try again.';
      } else if (!err.response) {
        // Network error
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      } else {
        errorMessage = err.message || 'Login failed';
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.register(userData);
      
      // Log the response for debugging
      console.log('🔧 Registration Response:', response);
      
      // Don't automatically log in the user after registration
      // Just return the response for the component to handle
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // DO NOT clear remembered_email and remembered_password on logout
    // These should persist based on user's Remember Me checkbox choice
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};