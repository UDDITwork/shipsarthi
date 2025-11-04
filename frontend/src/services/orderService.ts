import { apiService } from './api';
import { DataCache } from '../utils/dataCache';

export interface PickupAddress {
  name?: string;
  full_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  referenceId: string;
  orderDate: Date | string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  pin: string;
  city: string;
  state: string;
  productName: string;
  quantity: number;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  paymentMode: 'COD' | 'Prepaid' | 'Pickup' | 'REPL';
  codAmount?: number;
  totalAmount: number;
  warehouse: string;
  pickupLocation: string;
  pickup_address?: PickupAddress;
  status: string;
  awb?: string;
  trackingUrl?: string;
  pickupRequestId?: string;
  pickupRequestStatus?: 'pending' | 'scheduled' | 'in_transit' | 'completed' | 'failed';
  pickupRequestDate?: Date;
  pickupRequestTime?: string;
  delhivery_data?: {
    waybill?: string;
    cancellation_status?: string;
    cancellation_date?: Date | string;
    status_type?: string;
    pickup_request_id?: string;
    pickup_request_status?: string;
    [key: string]: any;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface OrderFilters {
  status?: string;
  order_type?: 'forward' | 'reverse';
  payment_mode?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface OrdersResponse {
  status: string;
  data: {
    orders: any[];
    pagination?: {
      current_page: number;
      total_pages: number;
      total_orders: number;
      per_page: number;
    };
  };
}

class OrderService {
  private readonly CACHE_KEY = 'orders';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Get all orders with filters
   * Uses cache for instant display, then fetches fresh data from MongoDB
   */
  async getOrders(filters: OrderFilters = {}, useCache: boolean = true): Promise<Order[]> {
    // Generate cache key based on filters
    const cacheKey = `${this.CACHE_KEY}_${JSON.stringify(filters)}`;

    // Try to load from cache first for instant display
    if (useCache) {
      const cached = DataCache.get<Order[]>(cacheKey);
      if (cached && cached.length > 0) {
        console.log(`📦 Orders loaded from cache (${cached.length} orders)`, { filters });
        // Still fetch fresh data in background, but return cached immediately
        this.getOrders(filters, false).catch((error) => {
          console.warn('Background orders refresh failed, using cached data:', error);
        });
        return cached;
      }
    }

    try {
      console.log('📡 Fetching orders from MongoDB...', { filters });

      // Build query params
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.order_type) params.append('order_type', filters.order_type);
      if (filters.payment_mode) params.append('payment_mode', filters.payment_mode);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search);

      const queryString = params.toString();
      const url = `/orders${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get<OrdersResponse>(url);

      if (response.status === 'success' && response.data?.orders) {
        // Transform backend data to frontend format
        const transformedOrders: Order[] = (response.data.orders || []).map((order: any) => ({
          _id: order._id,
          orderId: order.order_id,
          referenceId: order.reference_id || '',
          orderDate: order.order_date || order.createdAt,
          customerName: order.customer_info?.buyer_name || '',
          customerPhone: order.customer_info?.phone || '',
          customerAddress: order.delivery_address?.full_address || '',
          pin: order.delivery_address?.pincode || '',
          city: order.delivery_address?.city || '',
          state: order.delivery_address?.state || '',
          productName: order.products?.[0]?.product_name || '',
          quantity: order.products?.[0]?.quantity || 0,
          weight: order.package_info?.weight || 0,
          length: order.package_info?.dimensions?.length,
          width: order.package_info?.dimensions?.width,
          height: order.package_info?.dimensions?.height,
          paymentMode: order.payment_info?.payment_mode || 'Prepaid',
          codAmount: order.payment_info?.cod_amount || 0,
          totalAmount: order.payment_info?.total_amount || 0,
          warehouse: order.pickup_address?.name || order.pickup_info?.warehouse_id?.name || '',
          pickupLocation: order.pickup_address?.full_address || order.pickup_info?.warehouse_id?.address?.full_address || '',
          pickup_address: order.pickup_address ? {
            name: order.pickup_address.name,
            full_address: order.pickup_address.full_address,
            city: order.pickup_address.city,
            state: order.pickup_address.state,
            pincode: order.pickup_address.pincode,
            phone: order.pickup_address.phone
          } : undefined,
          status: order.status,
          awb: order.delhivery_data?.waybill || order.shipping_info?.awb_number || '',
          trackingUrl: order.delhivery_data?.tracking_url || '',
          pickupRequestId: order.delhivery_data?.pickup_request_id || '',
          pickupRequestStatus: order.delhivery_data?.pickup_request_status || 'pending',
          pickupRequestDate: order.delhivery_data?.pickup_request_date,
          pickupRequestTime: order.delhivery_data?.pickup_request_time || '',
          delhivery_data: order.delhivery_data ? {
            waybill: order.delhivery_data.waybill,
            cancellation_status: order.delhivery_data.cancellation_status,
            cancellation_date: order.delhivery_data.cancellation_date,
            status_type: order.delhivery_data.status_type,
            pickup_request_id: order.delhivery_data.pickup_request_id,
            pickup_request_status: order.delhivery_data.pickup_request_status,
            ...order.delhivery_data
          } : undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }));

        // Cache the transformed orders
        DataCache.set(cacheKey, transformedOrders, this.CACHE_TTL);
        console.log(`✅ Orders fetched from MongoDB and cached (${transformedOrders.length} orders)`);

        return transformedOrders;
      }

      throw new Error('Invalid response format from orders API');
    } catch (error: any) {
      console.error('❌ Error fetching orders:', error);

      // On error, try to return stale cache - app continues working
      const stale = DataCache.getStale<Order[]>(cacheKey);
      if (stale && stale.length > 0) {
        console.log(`⚠️ Using stale cached orders due to API error (${stale.length} orders)`, error);
        return stale;
      }

      // No cache either - return empty array (don't throw)
      console.warn('⚠️ No orders cache available, returning empty array');
      return [];
    }
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const response = await apiService.get<{ status: string; data: any }>(`/orders/${orderId}`);
      
      if (response.status === 'success' && response.data) {
        const order = response.data;
        return {
          _id: order._id,
          orderId: order.order_id,
          referenceId: order.reference_id || '',
          orderDate: order.order_date || order.createdAt,
          customerName: order.customer_info?.buyer_name || '',
          customerPhone: order.customer_info?.phone || '',
          customerAddress: order.delivery_address?.full_address || '',
          pin: order.delivery_address?.pincode || '',
          city: order.delivery_address?.city || '',
          state: order.delivery_address?.state || '',
          productName: order.products?.[0]?.product_name || '',
          quantity: order.products?.[0]?.quantity || 0,
          weight: order.package_info?.weight || 0,
          length: order.package_info?.dimensions?.length,
          width: order.package_info?.dimensions?.width,
          height: order.package_info?.dimensions?.height,
          paymentMode: order.payment_info?.payment_mode || 'Prepaid',
          codAmount: order.payment_info?.cod_amount || 0,
          totalAmount: order.payment_info?.total_amount || 0,
          warehouse: order.pickup_address?.name || order.pickup_info?.warehouse_id?.name || '',
          pickupLocation: order.pickup_address?.full_address || order.pickup_info?.warehouse_id?.address?.full_address || '',
          pickup_address: order.pickup_address ? {
            name: order.pickup_address.name,
            full_address: order.pickup_address.full_address,
            city: order.pickup_address.city,
            state: order.pickup_address.state,
            pincode: order.pickup_address.pincode,
            phone: order.pickup_address.phone
          } : undefined,
          status: order.status,
          awb: order.delhivery_data?.waybill || order.shipping_info?.awb_number || '',
          trackingUrl: order.delhivery_data?.tracking_url || '',
          pickupRequestId: order.delhivery_data?.pickup_request_id || '',
          pickupRequestStatus: order.delhivery_data?.pickup_request_status || 'pending',
          pickupRequestDate: order.delhivery_data?.pickup_request_date,
          pickupRequestTime: order.delhivery_data?.pickup_request_time || '',
          delhivery_data: order.delhivery_data ? {
            waybill: order.delhivery_data.waybill,
            cancellation_status: order.delhivery_data.cancellation_status,
            cancellation_date: order.delhivery_data.cancellation_date,
            status_type: order.delhivery_data.status_type,
            pickup_request_id: order.delhivery_data.pickup_request_id,
            pickup_request_status: order.delhivery_data.pickup_request_status,
            ...order.delhivery_data
          } : undefined,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      return null;
    }
  }

  /**
   * Clear orders cache (useful after creating/updating orders)
   */
  clearCache(filters?: OrderFilters): void {
    if (filters) {
      const cacheKey = `${this.CACHE_KEY}_${JSON.stringify(filters)}`;
      DataCache.clear(cacheKey);
    } else {
      // Clear all order caches
      Object.keys(localStorage).forEach(key => {
        if (key.includes(this.CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
    console.log('🗑️ Orders cache cleared');
  }

  /**
   * Refresh orders (force fresh fetch from MongoDB)
   */
  async refreshOrders(filters: OrderFilters = {}): Promise<Order[]> {
    // Clear cache for these filters first
    this.clearCache(filters);
    // Fetch fresh data
    return this.getOrders(filters, false);
  }
}

export const orderService = new OrderService();
