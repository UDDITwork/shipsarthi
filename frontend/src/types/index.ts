export interface User {
  _id: string;
  user_type: string;
  monthly_shipments: string;
  company_name: string;
  your_name: string;
  state: string;
  phone_number: string;
  email: string;
  client_id: string;
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
  kyc_status: {
    status: 'pending' | 'verified' | 'rejected';
    verified_date?: string;
    verification_notes?: string;
  };
  api_details: {
    private_key: string;
    public_key: string;
    api_documentation_version: string;
    key_generated_date: string;
    last_key_reset?: string;
  };
  documents: Document[];
  account_status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  user_category: 'Basic User' | 'Lite User' | 'New User' | 'Advanced';
  wallet_balance: number;
  last_login?: string;
  email_verified: boolean;
  phone_verified: boolean;
  otp_verified: boolean;
}

export interface Document {
  _id: string;
  document_type: 'gst_certificate' | 'photo_selfie' | 'pan_card' | 'aadhaar_card';
  document_status: 'uploaded' | 'pending' | 'verified' | 'rejected';
  file_url: string;
  upload_date: string;
  verification_date?: string;
  rejection_reason?: string;
}

export interface Order {
  _id: string;
  awb_number: string;
  order_id: string;
  reference_id: string;
  status: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  package_details: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    product_name: string;
    quantity: number;
    value: number;
  };
  payment: {
    mode: 'prepaid' | 'cod';
    cod_amount?: number;
  };
  warehouse_id: string;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  _id: string;
  title: string;
  name: string;
  phone: string;
  alternative_phone?: string;
  email: string;
  address: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  gstin: string;
  support_email: string;
  support_phone: string;
  mark_as: 'default' | 'custom';
  status: 'active' | 'inactive';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  _id: string;
  ticket_id: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  awb_numbers?: string[];
  attachments: string[];
  conversations: Conversation[];
  user_id: string;
  admin_assigned?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  _id: string;
  message: string;
  sender: 'user' | 'admin';
  sender_name: string;
  timestamp: string;
  attachments?: string[];
}

export interface DashboardMetrics {
  today_orders: number;
  today_revenue: number;
  average_shipping_cost: number;
  total_orders: number;
  new_orders: number;
  pickup_pending: number;
  in_transit: number;
  delivered: number;
  ndr_pending: number;
  rto: number;
  total_ndr: number;
  new_reattempt: number;
  buyer_reattempt: number;
  ndr_delivered: number;
  ndr_undelivered: number;
  rto_transit: number;
  rto_delivered: number;
  total_cod: number;
  last_cod_remitted: number;
  next_cod_available: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<any>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

export interface RegisterData {
  user_type: string;
  monthly_shipments: string;
  company_name: string;
  your_name: string;
  state: string;
  phone_number: string;
  email: string;
  password: string;
  reference_code?: string;
  terms_accepted: boolean;
}