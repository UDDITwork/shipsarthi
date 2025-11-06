import { apiService } from './api';

export interface Ticket {
  _id: string;
  ticket_id: string;
  category: string;
  subject?: string;
  description?: string;
  awb_numbers?: string[];
  comment?: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | 'escalated';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: Array<{
    file_url: string;
    file_type: string;
    file_name: string;
  }>;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  conversation?: Array<{
    message_type: 'user' | 'admin' | 'system';
    sender_name: string;
    sender?: string;
    message_content?: string;
    message?: string;
    comment?: string;
    attachments?: Array<{
      file_url: string;
      file_type: string;
      file_name: string;
    }>;
    timestamp?: string;
    created_at?: string;
    is_internal?: boolean;
  }>;
}

export interface TicketStats {
  status_counts: {
    open: number;
    resolved: number;
    closed: number;
    all: number;
  };
  category_breakdown: Array<{
    _id: string;
    count: number;
  }>;
}

export interface TicketFilters {
  status?: 'open' | 'resolved' | 'closed' | 'all';
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTicketData {
  category: string;
  awb_numbers?: string[] | string; // Optional, can be array or comma-separated string
  comment: string;
  files?: File[];
}

export interface AddCommentData {
  comment: string;
  files?: File[];
}

export interface TicketRating {
  score: number;
  feedback?: string;
}

class TicketService {
  // Get all tickets with filters
  async getTickets(filters: TicketFilters = {}): Promise<{
    tickets: Ticket[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_tickets: number;
      per_page: number;
    };
  }> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiService.get<{
      data: {
        tickets: Ticket[];
        pagination: {
          current_page: number;
          total_pages: number;
          total_tickets: number;
          per_page: number;
        };
      }
    }>(`/support?${params.toString()}`);
    return response.data;
  }

  // Get single ticket
  async getTicket(ticketId: string): Promise<Ticket> {
    const response = await apiService.get<{ data: Ticket }>(`/support/${ticketId}`);
    return response.data;
  }

  // Create new ticket
  async createTicket(ticketData: CreateTicketData): Promise<Ticket> {
    const formData = new FormData();
    formData.append('category', ticketData.category);
    
    // Only append AWB numbers if provided
    // Backend expects string (comma-separated) or array, so convert array to comma-separated string
    if (ticketData.awb_numbers) {
      if (Array.isArray(ticketData.awb_numbers)) {
        formData.append('awb_numbers', ticketData.awb_numbers.join(','));
      } else {
        formData.append('awb_numbers', ticketData.awb_numbers);
      }
    }
    
    formData.append('subject', `Support Request - ${ticketData.category}`);
    formData.append('description', ticketData.comment);
    
    if (ticketData.files) {
      ticketData.files.forEach(file => {
        formData.append('attachments', file);
      });
    }

    const response = await apiService.post<{ data: Ticket }>('/support', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Add comment to ticket
  async addComment(ticketId: string, commentData: AddCommentData): Promise<Ticket> {
    const formData = new FormData();
    formData.append('comment', commentData.comment);
    
    if (commentData.files) {
      commentData.files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await apiService.post<{ data: Ticket }>(`/support/${ticketId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Update ticket status
  async updateStatus(ticketId: string, status: 'open' | 'resolved' | 'closed', resolutionText?: string): Promise<Ticket> {
    const response = await apiService.patch<{ data: Ticket }>(`/support/${ticketId}/status`, {
      status,
      resolution_text: resolutionText
    });
    return response.data;
  }

  // Add rating to ticket
  async addRating(ticketId: string, rating: TicketRating): Promise<Ticket> {
    const response = await apiService.post<{ data: Ticket }>(`/support/${ticketId}/rating`, rating);
    return response.data;
  }

  // Get ticket statistics
  async getStats(): Promise<TicketStats> {
    const response = await apiService.get<{ data: TicketStats }>('/support/statistics/overview');
    return response.data;
  }
}

export const ticketService = new TicketService();
