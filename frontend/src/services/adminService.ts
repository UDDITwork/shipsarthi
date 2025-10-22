import { apiService } from './api';

export interface AdminClient {
  _id: string;
  client_id: string;
  company_name: string;
  your_name: string;
  email: string;
  phone_number: string;
  user_type: string;
  account_status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  kyc_status: {
    status: 'pending' | 'verified' | 'rejected';
    verified_date?: Date;
    verification_notes?: string;
  };
  wallet_balance: number;
  created_at: Date;
  stats: {
    orders: number;
    packages: number;
    customers: number;
  };
}

export interface AdminDashboard {
  overview: {
    totalClients: number;
    activeClients: number;
    pendingVerification: number;
    suspendedClients: number;
    totalOrders: number;
    totalPackages: number;
    totalCustomers: number;
  };
  clientsByType: Array<{
    _id: string;
    count: number;
  }>;
  monthlyRegistrations: Array<{
    _id: {
      year: number;
      month: number;
    };
    count: number;
  }>;
  recentClients: AdminClient[];
}

export interface AdminClientsResponse {
  success: boolean;
  data: {
    clients: AdminClient[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalClients: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboard;
}

class AdminService {
  private getAdminHeaders() {
    return {
      'X-Admin-Email': 'udditalerts247@gmail.com',
      'X-Admin-Password': 'jpmcA123'
    };
  }

  async getDashboard(): Promise<AdminDashboard> {
    const response = await apiService.get<AdminDashboardResponse>('/admin/dashboard', {
      headers: this.getAdminHeaders()
    });
    return response.data;
  }

  async getClients(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    user_type?: string;
    sortBy?: string;
    sortOrder?: number;
  } = {}): Promise<AdminClientsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.user_type) queryParams.append('user_type', params.user_type);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder.toString());

    const response = await apiService.get<AdminClientsResponse>(`/admin/clients?${queryParams.toString()}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async getClientDetails(clientId: string): Promise<AdminClient> {
    const response = await apiService.get<{ success: boolean; data: AdminClient }>(`/admin/clients/${clientId}`, {
      headers: this.getAdminHeaders()
    });
    return response.data;
  }

  async updateClientStatus(clientId: string, account_status: string): Promise<{ success: boolean; message: string; data: AdminClient }> {
    const response = await apiService.patch<{ success: boolean; message: string; data: AdminClient }>(`/admin/clients/${clientId}/status`, {
      account_status
    }, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async updateClientKYC(clientId: string, kyc_status: string, verification_notes?: string): Promise<{ success: boolean; message: string; data: AdminClient }> {
    const response = await apiService.patch<{ success: boolean; message: string; data: AdminClient }>(`/admin/clients/${clientId}/kyc`, {
      kyc_status,
      verification_notes
    }, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async getClientOrders(clientId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await apiService.get(`/admin/clients/${clientId}/orders?${queryParams.toString()}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async getClientPackages(clientId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await apiService.get(`/admin/clients/${clientId}/packages?${queryParams.toString()}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async getClientCustomers(clientId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await apiService.get(`/admin/clients/${clientId}/customers?${queryParams.toString()}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }
}

export const adminService = new AdminService();
