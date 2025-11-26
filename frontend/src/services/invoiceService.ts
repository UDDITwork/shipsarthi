// Location: frontend/src/services/invoiceService.ts
import { apiService } from './api';
import { environmentConfig } from '../config/environment';
import axios from 'axios';

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  delhivery_invoice_id?: string;
  invoice_date: string;
  due_date: string;
  service_type: string;
  gst_number?: string;
  amounts: {
    subtotal: number;
    tax: number;
    grand_total: number;
  };
  payment_status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'disputed';
  billing_period: {
    start_date: string;
    end_date: string;
    cycle_number: number;
    month: number;
    year: number;
  };
  shipment_count: number;
}

export interface InvoiceDetail extends Invoice {
  gst_info: {
    seller_gstin: string;
    buyer_gstin?: string;
    place_of_supply: string;
    place_of_supply_name: string;
    is_igst: boolean;
    sac_code: string;
  };
  billing_address: {
    company_name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  bill_info: {
    freight: number;
    cgst_rate: number;
    cgst_amount: number;
    sgst_rate: number;
    sgst_amount: number;
    igst_rate: number;
    igst_amount: number;
    total_amount: number;
  };
  amount_paid: number;
  balance_due: number;
  payment_info?: {
    payment_date: string;
    payment_method: string;
    payment_reference?: string;
    transaction_id?: string;
  };
  shipment_summary: {
    total_shipments: number;
    delivered_shipments: number;
    rto_shipments: number;
    cancelled_shipments: number;
    in_transit_shipments: number;
    prepaid_shipments: number;
    cod_shipments: number;
    total_weight: number;
    total_cod_collected: number;
  };
  documents?: {
    invoice_pdf_url?: string;
    transaction_list_csv_url?: string;
  };
  adjustments?: Array<{
    type: 'credit_note' | 'debit_note';
    note_number: string;
    amount: number;
    reason: string;
    date: string;
    related_awb?: string;
  }>;
  shipment_charges?: Array<{
    awb_number: string;
    order_id: string;
    internal_order_id: string;
    order_date: string;
    delivery_date?: string;
    shipment_status: string;
    weight: {
      declared_weight: number;
      actual_weight?: number;
      volumetric_weight?: number;
      charged_weight: number;
    };
    zone: string;
    pickup_pincode: string;
    delivery_pincode: string;
    charges: {
      forward_charge: number;
      rto_charge: number;
      cod_charge: number;
      fuel_surcharge?: number;
      weight_discrepancy_charge?: number;
      other_charges?: number;
    };
    total_charge: number;
    payment_mode: string;
    cod_amount?: number;
  }>;
}

export interface InvoiceListResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_count: number;
      per_page: number;
    };
    summary: {
      total_invoices: number;
      total_amount: number;
      paid: { count: number; amount: number };
      pending: { count: number; amount: number };
      overdue: { count: number; amount: number };
    };
  };
}

export interface InvoiceDetailResponse {
  success: boolean;
  data: InvoiceDetail;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'all';
  search?: string;
}

class InvoiceService {
  /**
   * Get list of invoices with filters
   */
  async getInvoices(filters: InvoiceFilters = {}): Promise<InvoiceListResponse> {
    const startTime = Date.now();
    const requestId = `invoice_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.group(`📋 [${requestId}] InvoiceService.getInvoices`);
    console.log('🔍 Filters:', filters);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const url = `/invoices?${params.toString()}`;
      console.log('🌐 Request URL:', url);
      console.log('📤 Request Params:', Object.fromEntries(params));
      
      const response = await apiService.get<InvoiceListResponse>(url);
      
      const duration = Date.now() - startTime;
      console.log('✅ Success:', {
        '📊 Invoice Count': response.data?.invoices?.length || 0,
        '📄 Total Pages': response.data?.pagination?.total_pages || 0,
        '⏱️ Duration': `${duration}ms`,
        '📦 Response': response
      });
      console.groupEnd();
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ Error:', {
        '🚨 Error Type': error.name,
        '💬 Message': error.message,
        '📊 Status': error.response?.status,
        '📥 Response Data': error.response?.data,
        '⏱️ Duration': `${duration}ms`,
        '📍 Stack': error.stack
      });
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Get single invoice detail
   */
  async getInvoiceDetail(invoiceId: string): Promise<InvoiceDetailResponse> {
      const response = await apiService.get<InvoiceDetailResponse>(`/invoices/${invoiceId}`);
      return response;
  }

  /**
   * Get transaction list for an invoice
   */
  async getTransactionList(invoiceId: string, format: 'json' | 'csv' = 'json') {
    if (format === 'csv') {
      // For CSV, we need to use axios directly to get blob
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${environmentConfig.apiUrl}/api/invoices/${invoiceId}/transactions?format=csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      // Create download link for CSV
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transaction_list_${invoiceId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    }
    
    const response = await apiService.get(`/invoices/${invoiceId}/transactions?format=${format}`);
    return response;
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: string) {
    try {
      // For PDF, we need to use axios directly to get blob
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${environmentConfig.apiUrl}/api/invoices/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error: any) {
      // If PDF not available, try to get invoice data and show message
      if (error.response?.status === 404 || error.response?.data?.message) {
        // Try to parse error message from blob if needed
        if (error.response?.data instanceof Blob) {
          const text = await error.response.data.text();
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || 'Invoice PDF not available');
          } catch {
            throw new Error('Invoice PDF not available');
          }
        }
        throw new Error(error.response.data?.message || 'Invoice PDF not available');
      }
      throw error;
    }
  }

  /**
   * Get invoice summary/statistics
   */
  async getInvoiceSummary() {
    const response = await apiService.get('/invoices/stats/summary');
    return response;
  }

  /**
   * Update invoice status (mark as paid, etc.)
   */
  async updateInvoiceStatus(
    invoiceId: string,
    paymentStatus: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'disputed',
    options?: {
      amount_paid?: number;
      payment_method?: 'wallet_deduction' | 'bank_transfer' | 'upi' | 'auto_debit' | 'razorpay';
      payment_reference?: string;
    }
  ) {
    const response = await apiService.patch(`/invoices/${invoiceId}/status`, {
      payment_status: paymentStatus,
      ...options
    });
    return response;
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;

