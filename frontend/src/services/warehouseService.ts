import { apiService } from './api';

// Warehouse service for managing warehouse operations
export interface Warehouse {
  _id: string;
  name: string;
  title: string;
  contact_person: {
    name: string;
    phone: string;
    alternative_phone?: string;
    email?: string;
  };
  address: {
    full_address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  return_address?: {
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstin?: string;
  support_contact?: {
    email?: string;
    phone?: string;
  };
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseData {
  name: string;
  title: string;
  contact_person: {
    name: string;
    phone: string;
    alternative_phone?: string;
    email?: string;
  };
  address: {
    full_address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  return_address?: {
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstin?: string;
  support_contact?: {
    email?: string;
    phone?: string;
  };
  is_default: boolean;
  is_active: boolean;
  notes?: string;
}

class WarehouseService {
  // Create new warehouse
  async createWarehouse(warehouseData: CreateWarehouseData): Promise<Warehouse> {
    const response = await apiService.post<{ 
      status: string;
      message: string;
      data: {
        warehouse: Warehouse;
        delhivery_response?: any;
        business_hours?: any;
        business_days?: string[];
      }
    }>('/warehouses', warehouseData);
    return (response as any).data.warehouse;
  }

  // Get all warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await apiService.get<{ 
      status: string;
      data: { 
        warehouses: Warehouse[];
        total_count: number;
      }
    }>('/warehouses');
    return (response as any).data.warehouses;
  }

  // Get warehouses for dropdown (active warehouses only)
  async getWarehousesForDropdown(): Promise<Array<{
    _id: string;
    name: string;
    title: string;
    address: {
      city: string;
      state: string;
      pincode: string;
    };
  }>> {
    const response = await apiService.get<{
      data: Array<{
        _id: string;
        name: string;
        title: string;
        address: {
          city: string;
          state: string;
          pincode: string;
        };
      }>
    }>('/warehouses/dropdown');
    
    return response.data;
  }

  // Update warehouse
  async updateWarehouse(warehouseId: string, warehouseData: Partial<CreateWarehouseData>): Promise<Warehouse> {
    const response = await apiService.put<{ data: Warehouse }>(`/warehouses/${warehouseId}`, warehouseData);
    return response.data;
  }

  // Delete warehouse
  async deleteWarehouse(warehouseId: string): Promise<{ message: string }> {
    const response = await apiService.delete<{ message: string }>(`/warehouses/${warehouseId}`);
    return response;
  }

  // Set default warehouse
  async setDefaultWarehouse(warehouseId: string): Promise<Warehouse> {
    const response = await apiService.patch<{ data: Warehouse }>(`/warehouses/${warehouseId}/set-default`);
    return response.data;
  }

  // Validate warehouse data
  validateWarehouseData(data: CreateWarehouseData): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!data.title?.trim()) {
      errors.title = 'Title is required';
    }
    if (!data.name?.trim()) {
      errors.name = 'Name is required';
    }
    if (!data.contact_person?.name?.trim()) {
      errors['contact_person.name'] = 'Contact person name is required';
    }
    if (!data.contact_person?.phone?.match(/^[6-9]\d{9}$/)) {
      errors['contact_person.phone'] = 'Valid 10-digit phone number is required';
    }
    if (data.contact_person?.alternative_phone && !data.contact_person.alternative_phone.match(/^[6-9]\d{9}$/)) {
      errors['contact_person.alternative_phone'] = 'Valid 10-digit phone number is required';
    }
    if (data.contact_person?.email && !data.contact_person.email.match(/^\S+@\S+\.\S+$/)) {
      errors['contact_person.email'] = 'Valid email is required';
    }
    if (!data.address?.full_address?.trim()) {
      errors['address.full_address'] = 'Address is required';
    }
    if (!data.address?.pincode?.match(/^\d{6}$/)) {
      errors['address.pincode'] = 'Valid 6-digit pincode is required';
    }
    if (!data.address?.city?.trim()) {
      errors['address.city'] = 'City is required';
    }
    if (!data.address?.state?.trim()) {
      errors['address.state'] = 'State is required';
    }
    if (data.gstin && !data.gstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
      errors.gstin = 'Valid GST number is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export const warehouseService = new WarehouseService();