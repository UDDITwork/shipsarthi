// Shipping Service for rate card calculations and shipping charges
import { apiService } from './api';

export interface ShippingCalculationRequest {
  weight: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  zone?: string; // Optional - if not provided, use pincodes to get zone from Delhivery
  pickup_pincode?: string; // Required if zone not provided
  delivery_pincode?: string; // Required if zone not provided
  shipping_mode?: 'Surface' | 'Express' | 'S' | 'E'; // For zone calculation
  payment_mode?: 'Prepaid' | 'COD' | 'Pre-paid'; // For zone calculation
  cod_amount?: number;
  order_type?: 'forward' | 'rto';
}

export interface ShippingCalculationResult {
  user_category: string;
  weight: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  zone: string;
  cod_amount: number;
  calculation_result: {
    forwardCharges: number;
    rtoCharges: number;
    codCharges: number;
    totalCharges: number;
    volumetricWeight: number;
    chargeableWeight: number;
  };
}

export interface RateCard {
  userCategory: string;
  carrier: string;
  forwardCharges: Array<{
    condition: string;
    zones: {
      A: number;
      B: number;
      C: number;
      D: number;
      E: number;
      F: number;
    };
  }>;
  rtoCharges: Array<{
    condition: string;
    zones: {
      A: number;
      B: number;
      C: number;
      D: number;
      E: number;
      F: number;
    };
  }>;
  codCharges: {
    percentage: number;
    minimumAmount: number;
    gstAdditional: boolean;
  };
  zoneDefinitions: Array<{
    zone: string;
    definition: string;
  }>;
  termsAndConditions: string[];
}

class ShippingService {

  // Calculate shipping charges using rate card system
  // If zone is not provided, backend will get it from Delhivery API using pincodes
  async calculateShippingCharges(request: ShippingCalculationRequest): Promise<{
    forwardCharges: number;
    rtoCharges: number;
    codCharges: number;
    totalCharges: number;
    volumetricWeight: number;
    chargeableWeight: number;
    zone?: string; // Zone used (either provided or fetched from Delhivery)
  }> {
    try {
      const response = await apiService.post<{ success: boolean; data: {
        forwardCharges: number;
        rtoCharges: number;
        codCharges: number;
        totalCharges: number;
        volumetricWeight: number;
        chargeableWeight: number;
        zone?: string; // Zone used in calculation
      } }>('/shipping/calculate-rate-card', request);
      return response.data;
    } catch (error: any) {
      console.error('Calculate shipping charges error:', error);
      throw new Error(error.message || 'Failed to calculate shipping charges');
    }
  }

  // Get rate card for a specific user category
  async getRateCard(userCategory: string): Promise<RateCard> {
    try {
      const response = await apiService.get<{ success: boolean; data: RateCard }>(`/shipping/rate-card/${encodeURIComponent(userCategory)}`);
      return response.data;
    } catch (error: any) {
      console.error('Get rate card error:', error);
      throw new Error(error.message || 'Failed to get rate card');
    }
  }

  // Get available user categories
  async getUserCategories(): Promise<string[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: string[] }>('/shipping/user-categories');
      return response.data;
    } catch (error: any) {
      console.error('Get user categories error:', error);
      throw new Error(error.message || 'Failed to get user categories');
    }
  }

  // Get zones for dropdown
  getZones() {
    return [
      { value: 'A', label: 'Zone A - Local within city' },
      { value: 'B', label: 'Zone B - Within 500 kms Regional' },
      { value: 'C1', label: 'Zone C1 - Metro to Metro (501-1400 kms)' },
      { value: 'C2', label: 'Zone C2 - Metro to Metro (1401-2500 kms)' },
      { value: 'D1', label: 'Zone D1 - Rest of India (501-1400 kms)' },
      { value: 'D2', label: 'Zone D2 - Rest of India (1401-2500 kms)' },
      { value: 'E', label: 'Zone E - Special (NE, J&K, >2500 kms)' },
      { value: 'F', label: 'Zone F - Special (NE, J&K, >2500 kms)' }
    ];
  }
}

export const shippingService = new ShippingService();
