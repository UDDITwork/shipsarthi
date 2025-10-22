// Location: frontend/src/services/customerService.ts
import { apiService } from './api';

// Customer interface matching the backend model
export interface Customer {
  _id: string;
  user_id: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  gstin?: string;
  address: {
    address_line_1: string;
    address_line_2?: string;
    full_address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    address_type: string;
  };
  channel: 'custom' | 'order_creation' | 'import' | 'api';
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  total_orders: number;
  total_order_value: number;
  last_order_date?: string;
  tags: string[];
  social_links?: {
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
  createdAt: string;
  updatedAt: string;
  formatted_phone?: string;
  display_name?: string;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  gstin?: string;
  address: {
    address_line_1: string;
    address_line_2?: string;
    full_address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
    address_type?: string;
  };
  channel?: 'custom' | 'order_creation' | 'import' | 'api';
  notes?: string;
  tags?: string[];
  social_links?: {
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: 'active' | 'inactive' | 'blocked';
}

export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'blocked' | 'all';
  channel?: 'custom' | 'order_creation' | 'import' | 'api' | 'all';
  sortBy?: string;
  sortOrder?: number;
}

export interface CustomerStats {
  total_customers: number;
  active_customers: number;
  total_orders: number;
  total_order_value: number;
  total_orders_all: number;
  total_order_value_all: number;
}

export interface CustomersResponse {
  customers: Customer[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
  stats: CustomerStats;
}

class CustomerService {
  // Get all customers with pagination and filters
  async getCustomers(params: CustomerSearchParams = {}): Promise<CustomersResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.channel) queryParams.append('channel', params.channel);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder.toString());

    const response = await apiService.get<{
      success: boolean;
      data: CustomersResponse;
    }>(`/customers?${queryParams.toString()}`);
    
    return response.data;
  }

  // Get single customer by ID
  async getCustomer(customerId: string): Promise<{ customer: Customer; recent_orders: any[] }> {
    const response = await apiService.get<{
      success: boolean;
      data: {
        customer: Customer;
        recent_orders: any[];
      };
    }>(`/customers/${customerId}`);
    
    return response.data;
  }

  // Create new customer
  async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: Customer;
    }>('/customers', customerData);
    
    return response.data;
  }

  // Update customer
  async updateCustomer(customerId: string, customerData: UpdateCustomerData): Promise<Customer> {
    const response = await apiService.put<{
      success: boolean;
      message: string;
      data: Customer;
    }>(`/customers/${customerId}`, customerData);
    
    return response.data;
  }

  // Delete customer
  async deleteCustomer(customerId: string): Promise<void> {
    await apiService.delete<{
      success: boolean;
      message: string;
    }>(`/customers/${customerId}`);
  }

  // Update customer status
  async updateCustomerStatus(customerId: string, status: 'active' | 'inactive' | 'blocked'): Promise<Customer> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: Customer;
    }>(`/customers/${customerId}/status`, { status });
    
    return response.data;
  }

  // Get customer statistics
  async getCustomerStats(): Promise<CustomerStats> {
    const response = await apiService.get<{
      success: boolean;
      data: CustomerStats;
    }>('/customers/stats/overview');
    
    return response.data;
  }

  // Search customers
  async searchCustomers(query: string, limit: number = 10): Promise<Customer[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await apiService.get<{
      success: boolean;
      data: Customer[];
    }>(`/customers/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    
    return response.data;
  }

  // Find or create customer (used during order creation)
  async findOrCreateCustomer(customerData: CreateCustomerData): Promise<Customer> {
    try {
      // First try to find existing customer by phone
      const searchResults = await this.searchCustomers(customerData.phone, 1);
      
      if (searchResults.length > 0 && searchResults[0].phone === customerData.phone) {
        // Update existing customer with new data
        return await this.updateCustomer(searchResults[0]._id, customerData);
      } else {
        // Create new customer
        return await this.createCustomer({
          ...customerData,
          channel: 'order_creation'
        });
      }
    } catch (error) {
      console.error('Error in findOrCreateCustomer:', error);
      throw error;
    }
  }

  // Get customers for dropdown/select options
  async getCustomersForDropdown(search?: string): Promise<Customer[]> {
    const params: CustomerSearchParams = {
      status: 'active',
      limit: 50,
      sortBy: 'name',
      sortOrder: 1
    };

    if (search) {
      params.search = search;
    }

    const response = await this.getCustomers(params);
    return response.customers;
  }

  // Format customer name for display
  static formatCustomerName(customer: Customer): string {
    return customer.display_name || customer.name;
  }

  // Format customer phone for display
  static formatCustomerPhone(customer: Customer): string {
    return customer.formatted_phone || `+91 ${customer.phone}`;
  }

  // Format customer address for display
  static formatCustomerAddress(customer: Customer): string {
    const { address } = customer;
    return `${address.full_address}, ${address.city}, ${address.state}, ${address.pincode}`;
  }

  // Validate customer data
  static validateCustomerData(data: Partial<CreateCustomerData>): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Customer name is required');
    }

    if (!data.phone?.trim()) {
      errors.push('Phone number is required');
    } else if (!/^[6-9]\d{9}$/.test(data.phone)) {
      errors.push('Please enter a valid 10-digit phone number');
    }

    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!data.address?.full_address?.trim()) {
      errors.push('Address is required');
    }

    if (!data.address?.city?.trim()) {
      errors.push('City is required');
    }

    if (!data.address?.state?.trim()) {
      errors.push('State is required');
    }

    if (!data.address?.pincode?.trim()) {
      errors.push('Pincode is required');
    } else if (!/^\d{6}$/.test(data.address.pincode)) {
      errors.push('Please enter a valid 6-digit pincode');
    }

    return errors;
  }
}

export default new CustomerService();
