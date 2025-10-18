import { apiService } from './api';

export interface EnquiryData {
  name: string;
  email: string;
  mobile: string;
  describe: string;
  monthlyLoad: string;
}

export interface EnquiryResponse {
  status: string;
  message: string;
  data?: {
    name: string;
    email: string;
    submittedAt: string;
  };
}

export interface EnquiryOptions {
  businessTypes: Array<{ value: string; label: string }>;
  monthlyLoads: Array<{ value: string; label: string }>;
}

export const enquiryService = {
  async submitEnquiry(enquiryData: EnquiryData): Promise<EnquiryResponse> {
    return await apiService.post<EnquiryResponse>('/enquiry/submit', enquiryData);
  },

  async getEnquiryOptions(): Promise<{ status: string; data: EnquiryOptions }> {
    return await apiService.get<{ status: string; data: EnquiryOptions }>('/enquiry/options');
  }
};
