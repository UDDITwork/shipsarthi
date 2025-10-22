import { apiService } from './api';

export interface User {
  _id: string;
  client_id: string;
  company_name: string;
  your_name: string;
  email: string;
  phone_number: string;
  user_type: string;
  gstin: string;
  joined_date: string;
  address: {
    full_address: string;
    landmark: string;
    pincode: string;
    city: string;
    state: string;
  };
  bank_details: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    branch_name: string;
    account_holder_name: string;
  };
  documents: Array<{
    document_type: string;
    document_status: string;
    file_url: string;
    upload_date: string;
  }>;
  kyc_status: {
    status: string;
    verified_date?: string;
  };
  api_details: {
    public_key: string;
    private_key: string;
    api_documentation_version: string;
  };
}

export interface UpdateProfileData {
  company_name?: string;
  your_name?: string;
  email?: string;
  phone_number?: string;
  gstin?: string;
  address?: {
    full_address: string;
    landmark: string;
    pincode: string;
    city: string;
    state: string;
  };
  bank_details?: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    branch_name: string;
    account_holder_name: string;
  };
}

export interface PasswordResetData {
  current_password: string;
  new_password: string;
}

export interface DocumentUploadData {
  file: File;
  document_type: string;
}

class UserService {
  // Get user profile
  async getProfile(): Promise<User> {
    const response = await apiService.get<{ data: User }>('/users/profile');
    return response.data;
  }

  // Update user profile
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiService.put<{ data: User }>('/users/profile', data);
    return response.data;
  }

  // Reset password
  async resetPassword(data: PasswordResetData): Promise<{ message: string }> {
    const response = await apiService.post<{ message: string }>('/users/reset-password', data);
    return response;
  }

  // Upload document
  async uploadDocument(data: DocumentUploadData): Promise<{ message: string; document_url: string }> {
    console.log('🔍 UPLOAD DOCUMENT DEBUG:', {
      file: data.file,
      fileName: data.file?.name,
      fileSize: data.file?.size,
      fileType: data.file?.type,
      documentType: data.document_type
    });

    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('document_type', data.document_type);

    console.log('🔍 FORMDATA CREATED:', {
      hasFile: formData.has('file'),
      hasDocumentType: formData.has('document_type'),
      formDataEntries: Array.from(formData.entries())
    });

    const response = await apiService.post<{ message: string; document_url: string }>('/users/upload-document', formData);
    return response;
  }

  // Get user documents
  async getDocuments(): Promise<Array<{
    document_type: string;
    document_status: string;
    file_url: string;
    upload_date: string;
  }>> {
    const response = await apiService.get<{ data: Array<{
      document_type: string;
      document_status: string;
      file_url: string;
      upload_date: string;
    }> }>('/users/documents');
    return response.data;
  }

  // Update avatar
  async updateAvatar(file: File): Promise<{ message: string; avatar_url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiService.post<{ message: string; avatar_url: string }>('/users/avatar', formData);
    return response;
  }

  // Get API documentation
  async getApiDocumentation(): Promise<{ version: string; download_url: string }> {
    const response = await apiService.get<{ data: { version: string; download_url: string } }>('/users/api-docs');
    return response.data;
  }

  // Regenerate API keys
  async regenerateApiKeys(): Promise<{
    public_key: string;
    private_key: string;
  }> {
    const response = await apiService.post<{ data: {
      public_key: string;
      private_key: string;
    } }>('/users/regenerate-api-keys');
    return response.data;
  }

  // Get KYC status
  async getKycStatus(): Promise<{
    status: string;
    verified_date?: string;
    requirements: string[];
  }> {
    const response = await apiService.get<{ data: {
      status: string;
      verified_date?: string;
      requirements: string[];
    } }>('/users/kyc-status');
    return response.data;
  }

  // Submit KYC for verification
  async submitKyc(): Promise<{ message: string }> {
    const response = await apiService.post<{ message: string }>('/users/submit-kyc');
    return response;
  }

  // Get user profile (for Layout component)
  async getUserProfile(): Promise<{ data: UserProfile }> {
    const response = await apiService.get<{ data: UserProfile }>('/users/profile');
    return response;
  }

  // Get dashboard data
  async getDashboardData(): Promise<{ data: DashboardData }> {
    const response = await apiService.get<{ data: DashboardData }>('/api/dashboard/overview');
    return response;
  }
}

export const userService = new UserService();

// Export interfaces for external use
export interface UserProfile {
  _id: string;
  client_id: string;
  company_name: string;
  your_name: string;
  email: string;
  phone_number: string;
  user_type: string;
  gstin: string;
  joined_date: string;
  address: {
    full_address: string;
    landmark: string;
    pincode: string;
    city: string;
    state: string;
  };
  bank_details: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    branch_name: string;
    account_holder_name: string;
  };
  documents: Array<{
    document_type: string;
    document_status: string;
    file_url: string;
    upload_date: string;
  }>;
  kyc_status: {
    status: string;
    verified_date?: string;
  };
  api_details: {
    public_key: string;
    private_key: string;
    api_documentation_version: string;
  };
  walletBalance?: number;
  initials?: string;
}

export interface DashboardData {
  metrics: {
    todaysOrders: {
      current: number;
      previous: number;
    };
    todaysRevenue: {
      current: number;
      previous: number;
    };
    averageShippingCost: {
      amount: number;
      totalOrders: number;
    };
  };
  shipmentStatus: {
    totalOrder: number;
    newOrder: number;
    pickupPending: number;
    inTransit: number;
    delivered: number;
    ndrPending: number;
    rto: number;
  };
  ndrStatus: {
    totalNDR: number;
    yourReattempt: number;
    buyerReattempt: number;
    ndrDelivered: number;
    ndrUndelivered: number;
    rtoTransit: number;
    rtoDelivered: number;
  };
  codStatus: {
    totalCOD: number;
    lastCODRemitted: number;
    nextCODAvailable: number;
  };
}