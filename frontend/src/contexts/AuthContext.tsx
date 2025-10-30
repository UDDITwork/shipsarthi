import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, RegisterData } from '../types';
import { authService } from '../services/authService';
import { websocketService } from '../services/websocketService';

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

  // WebSocket connection and message handling
  useEffect(() => {
    if (user && token) {
      // Connect to WebSocket
      websocketService.connect(user._id);

      // Handle user category updates
      websocketService.onMessage('user_category_updated', (data) => {
        console.log('🏷️ User category updated, refreshing user data...');
        refreshUser();
      });

      // Handle wallet balance updates
      websocketService.onMessage('wallet_balance_update', (data) => {
        console.log('💰 Wallet balance updated, refreshing user data...');
        refreshUser();
      });

      // Cleanup on unmount
      return () => {
        websocketService.offMessage('user_category_updated');
        websocketService.offMessage('wallet_balance_update');
        websocketService.disconnect();
      };
    }
  }, [user, token, refreshUser]);

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
      setError(err.response?.data?.message || 'Login failed');
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