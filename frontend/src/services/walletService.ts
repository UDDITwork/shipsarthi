import { apiService } from './api';

export interface WalletBalance {
  balance: number;
  currency: string;
}

class WalletService {
  private listeners: Array<(balance: WalletBalance) => void> = [];

  // Subscribe to wallet balance updates
  subscribe(listener: (balance: WalletBalance) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of wallet balance changes
  notifyBalanceUpdate(balance: WalletBalance) {
    this.listeners.forEach(listener => listener(balance));
  }

  // Get current wallet balance
  async getWalletBalance(): Promise<WalletBalance> {
    try {
      const response = await apiService.get<{
        success: boolean;
        data: {
          balance: number;
          currency: string;
        };
      }>('/user/wallet-balance');
      
      if (response.success) {
        const balance = {
          balance: response.data.balance,
          currency: response.data.currency || 'INR'
        };
        this.notifyBalanceUpdate(balance);
        return balance;
      }
      throw new Error('Failed to fetch wallet balance');
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }
  }

  // Refresh wallet balance and notify listeners
  async refreshBalance(): Promise<WalletBalance> {
    return this.getWalletBalance();
  }
}

export const walletService = new WalletService();
