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

export interface AdminTicket {
  _id: string;
  ticket_id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  user_id: {
    _id: string;
    company_name: string;
    your_name: string;
    email: string;
    phone_number: string;
    client_id: string;
  };
  conversation: Array<{
    message_type: 'user' | 'admin' | 'system';
    sender_name: string;
    sender?: string;
    message_content: string;
    message?: string;
    timestamp: string;
    is_internal?: boolean;
    attachments: Array<{
      file_name: string;
      file_url: string;
      file_type: string;
    }>;
  }>;
  attachments: Array<{
    file_name: string;
    file_url: string;
    file_type: string;
  }>;
}

export interface AdminTicketsResponse {
  success: boolean;
  data: {
    tickets: AdminTicket[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalTickets: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: {
      total_tickets: number;
      status_breakdown: {
        [key: string]: number;
      };
    };
  };
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboard;
}

export interface ClientDocument {
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
  status: string;
}

export interface ClientDocumentsResponse {
  success: boolean;
  data: {
    client: {
      id: string;
      client_id: string;
      company_name: string;
      your_name: string;
      email: string;
      kyc_status: {
        status: 'pending' | 'verified' | 'rejected';
        verified_date?: Date;
        verification_notes?: string;
      };
    };
    documents: ClientDocument[];
  };
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

  async getClientDocuments(clientId: string): Promise<ClientDocumentsResponse> {
    const response = await apiService.get<ClientDocumentsResponse>(`/admin/clients/${clientId}/documents`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  // Ticket management methods
  async getClientTickets(clientId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  } = {}): Promise<AdminTicketsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);

    const response = await apiService.get<AdminTicketsResponse>(`/api/admin/clients/${clientId}/tickets?${queryParams.toString()}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async getAllTickets(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
    assigned_to?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<AdminTicketsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.assigned_to) queryParams.append('assigned_to', params.assigned_to);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await apiService.get<AdminTicketsResponse>(`/api/admin/tickets?${queryParams.toString()}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async getTicketDetails(ticketId: string): Promise<{ success: boolean; data: AdminTicket }> {
    const response = await apiService.get<{ success: boolean; data: AdminTicket }>(`/api/admin/tickets/${ticketId}`, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async sendTicketMessage(ticketId: string, message: string, isInternal: boolean = false): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message: string }>(`/api/admin/tickets/${ticketId}/messages`, {
      message,
      is_internal: isInternal
    }, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async updateTicketStatus(ticketId: string, status: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.patch<{ success: boolean; message: string }>(`/api/admin/tickets/${ticketId}/status`, {
      status,
      reason
    }, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async assignTicket(ticketId: string, assignedTo: string, department: string = 'customer_service'): Promise<{ success: boolean; message: string }> {
    const response = await apiService.patch<{ success: boolean; message: string }>(`/api/admin/tickets/${ticketId}/assign`, {
      assigned_to: assignedTo,
      department
    }, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async resolveTicket(ticketId: string, resolutionSummary: string, resolutionCategory: string, internalNotes?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message: string }>(`/api/admin/tickets/${ticketId}/resolve`, {
      resolution_summary: resolutionSummary,
      resolution_category: resolutionCategory,
      internal_notes: internalNotes
    }, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  // Notification methods
  async getNotifications(): Promise<{ success: boolean; data: { notifications: any[]; unread_count: number } }> {
    try {
      const response = await apiService.get<{ success: boolean; data: { notifications: any[]; unread_count: number } }>(`/api/admin/notifications`, {
        headers: this.getAdminHeaders()
      });
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        data: { notifications: [], unread_count: 0 }
      };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.patch<{ success: boolean; message: string }>(`/api/admin/notifications/${notificationId}/read`, {}, {
      headers: this.getAdminHeaders()
    });
    return response;
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean; message: string }> {
    const response = await apiService.patch<{ success: boolean; message: string }>(`/api/admin/notifications/read-all`, {}, {
      headers: this.getAdminHeaders()
    });
    return response;
  }
}

export const adminService = new AdminService();
