import { apiService } from './api';
import { DataCache } from '../utils/dataCache';

export interface WalletBalance {
  balance: number;
  currency: string;
}

class WalletService {
  private listeners: Array<(balance: WalletBalance) => void> = [];

  // Subscribe to wallet balance updates
  subscribe(listener: (balance: WalletBalance) => void) {
    this.listeners.push(listener);
    
    // Immediately notify with cached data if available
    const cached = DataCache.get<WalletBalance>('walletBalance');
    if (cached) {
      listener(cached);
    }
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of wallet balance changes
  notifyBalanceUpdate(balance: WalletBalance) {
    // Always cache the balance
    DataCache.set('walletBalance', balance);
    this.listeners.forEach(listener => listener(balance));
  }

  // Get current wallet balance - with cache fallback so it NEVER fails
  async getWalletBalance(useCache: boolean = true): Promise<WalletBalance> {
    // Try cache first for instant response
    if (useCache) {
      const cached = DataCache.get<WalletBalance>('walletBalance');
      if (cached) {
        // Still fetch fresh data in background, but return cached immediately
        this.getWalletBalance(false).catch(() => {
          // Ignore errors - we have cached data
        });
        return cached;
      }
    }

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
        
        // Cache it
        DataCache.set('walletBalance', balance);
        
        // Notify all listeners
        this.notifyBalanceUpdate(balance);
        
        return balance;
      }
      throw new Error('Failed to fetch wallet balance');
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      
      // On error, return stale cache - app continues working
      const stale = DataCache.getStale<WalletBalance>('walletBalance');
      if (stale) {
        console.log('💰 Using cached wallet balance due to API error:', stale);
        return stale;
      }
      
      // No cache either - return default (don't throw)
      const defaultBalance: WalletBalance = { balance: 0, currency: 'INR' };
      return defaultBalance;
    }
  }

  // Refresh wallet balance and notify listeners
  async refreshBalance(): Promise<WalletBalance> {
    return this.getWalletBalance(false); // Force fresh fetch
  }
}

export const walletService = new WalletService();
