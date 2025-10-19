import { apiService } from './api';

export interface UserProfile {
  companyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  role: string;
  initials: string;
  userType: string;
  monthlyShipments: string;
  state: string;
  gstin?: string;
  clientId: string;
  accountStatus: string;
  walletBalance: number;
  kycStatus: {
    status: string;
    verified_date?: string;
    verification_notes?: string;
  };
  joinedDate: string;
  address?: {
    full_address?: string;
    landmark?: string;
    pincode?: string;
    city?: string;
    state?: string;
  };
  bankDetails?: {
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
    accountHolderName?: string;
  };
}

export interface DashboardData {
  user: {
    companyName: string;
    walletBalance: number;
    joinedDate: string;
  };
  metrics: {
    todaysOrders: { current: number; previous: number };
    todaysRevenue: { current: number; previous: number };
    averageShippingCost: { amount: number; totalOrders: number };
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
}

class UserService {
  // Get user profile from MongoDB Atlas
  async getUserProfile(): Promise<{ data: UserProfile }> {
    try {
      const response = await apiService.get<{ status: string; data: UserProfile }>('/users/profile');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user profile in MongoDB Atlas
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<{ data: UserProfile }> {
    try {
      const response = await apiService.put<{ status: string; data: UserProfile }>('/users/profile', profileData);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get dashboard data from MongoDB Atlas
  async getDashboardData(): Promise<{ data: DashboardData }> {
    try {
      const response = await apiService.get<{ status: string; data: DashboardData }>('/users/dashboard');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}

export default new UserService();
