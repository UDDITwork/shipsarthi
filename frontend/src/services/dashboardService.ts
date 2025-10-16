import { apiService } from './api';

export interface DashboardOverview {
  todays_orders: {
    count: number;
    previous_count: number;
    change_percentage: string;
  };
  todays_revenue: {
    amount: number;
    previous_amount: number;
    change_percentage: string;
  };
  average_shipping_cost: number;
  wallet_balance: number;
}

export interface ShipmentStatus {
  total_orders: number;
  new_orders: number;
  pickup_pending: number;
  in_transit: number;
  delivered: number;
  ndr_pending: number;
  rto: number;
}

export interface NDRStatus {
  total_ndr: number;
  new_reattempt: number;
  buyer_reattempt: number;
  ndr_delivered: number;
  ndr_undelivered: number;
  rto_transit: number;
  rto_delivered: number;
}

export interface CODStatus {
  total_cod: number;
  last_cod_remitted: number;
  next_cod_available: number;
}

export interface WalletTransaction {
  transaction_id: string;
  transaction_type: 'credit' | 'debit';
  transaction_category: string;
  amount: number;
  description: string;
  transaction_date: string;
  closing_balance: number;
}

export interface ShipmentDistribution {
  status: string;
  count: number;
  percentage: string;
}

export interface SupportOverview {
  open_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  total_tickets: number;
}

export interface RecentActivity {
  recent_orders: Array<{
    order_id: string;
    buyer_name: string;
    current_status: string;
    created_at: string;
    order_value: number;
  }>;
  recent_ndrs: Array<{
    awb_number: string;
    customer_name: string;
    ndr_reason: string;
    ndr_date: string;
    current_status: string;
  }>;
  recent_transactions: Array<{
    transaction_id: string;
    transaction_type: string;
    amount: number;
    description: string;
    transaction_date: string;
  }>;
}

export interface PerformanceMetrics {
  total_orders: number;
  delivery_success_rate: number;
  ndr_rate: number;
  rto_rate: number;
  average_order_value: number;
  period_days: number;
}

export const dashboardService = {
  async getOverview(): Promise<{ status: string; data: DashboardOverview }> {
    return apiService.get('/dashboard/overview');
  },

  async getShipmentStatus(): Promise<{ status: string; data: ShipmentStatus }> {
    return apiService.get('/dashboard/shipment-status');
  },

  async getNDRStatus(): Promise<{ status: string; data: NDRStatus }> {
    return apiService.get('/dashboard/ndr-status');
  },

  async getCODStatus(): Promise<{ status: string; data: CODStatus }> {
    return apiService.get('/dashboard/cod-status');
  },

  async getWalletTransactions(limit: number = 10): Promise<{ status: string; data: WalletTransaction[] }> {
    return apiService.get(`/dashboard/wallet-transactions?limit=${limit}`);
  },

  async getShipmentDistribution(): Promise<{ status: string; data: { distribution: ShipmentDistribution[]; total_orders: number } }> {
    return apiService.get('/dashboard/shipment-distribution');
  },

  async getSupportOverview(): Promise<{ status: string; data: SupportOverview }> {
    return apiService.get('/dashboard/support-overview');
  },

  async getRecentActivity(limit: number = 5): Promise<{ status: string; data: RecentActivity }> {
    return apiService.get(`/dashboard/recent-activity?limit=${limit}`);
  },

  async getPerformanceMetrics(period: number = 30): Promise<{ status: string; data: PerformanceMetrics }> {
    return apiService.get(`/dashboard/performance?period=${period}`);
  }
};