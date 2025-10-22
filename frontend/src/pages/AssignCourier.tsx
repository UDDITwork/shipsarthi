import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiService } from '../services/api';
import './AssignCourier.css';

interface Order {
  _id: string;
  order_id: string;
  customer_info: {
    buyer_name: string;
    phone: string;
  };
  pickup_address: {
    name: string;
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    country?: string;
  };
  delivery_address: {
    name?: string;
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    phone?: string;
    country?: string;
  };
  payment_info: {
    order_value: number;
    payment_mode: string;
    total_amount: number;
  };
  delhivery_data?: {
    waybill: string;
  };
}

interface CourierOption {
  id: string;
  name: string;
  service_type: string;
  description: string;
  estimated_delivery: string;
  chargeable_weight: string;
  charges: number;
  pickup_cutoff_time: string;
  more_options?: string;
}

const AssignCourier: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [courierOptions, setCourierOptions] = useState<CourierOption[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      fetchCourierOptions();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await apiService.get<{ 
        status: string;
        data: Order 
      }>(`/orders/order/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('Failed to fetch order details');
    }
  };

  const fetchCourierOptions = async () => {
    try {
      if (!order) return;

      // Calculate shipping cost using Delhivery API
      const costData = {
        billing_mode: 'S', // Surface
        shipment_status: 'Delivered',
        destination_pincode: order.delivery_address.pincode,
        origin_pincode: order.pickup_address.pincode,
        chargeable_weight: 5000, // 5kg in grams (default weight)
        payment_type: order.payment_info.payment_mode === 'COD' ? 'COD' : 'Pre-paid'
      };

      const costResponse = await apiService.post<{
        success: boolean;
        data: {
          calculated_cost: number;
        };
      }>('/shipping/calculate-cost', costData);
      
      if (costResponse.success) {
        const calculatedCharges = costResponse.data.calculated_cost || 211.22;
        
        const courierOptions: CourierOption[] = [
          {
            id: 'delhivery_surface',
            name: 'DELHIVERY',
            service_type: 'Delhivery Surface 5KG',
            description: 'Domestic (Surface)',
            estimated_delivery: 'Oct 25, 2025',
            chargeable_weight: '5 Kg',
            charges: calculatedCharges,
            pickup_cutoff_time: '02:00 PM',
            more_options: '+3 more options from Delhivery Surface'
          }
        ];
        
        setCourierOptions(courierOptions);
        setSelectedCourier('delhivery_surface');
      } else {
        // Fallback to mock data if API fails
        const mockOptions: CourierOption[] = [
          {
            id: 'delhivery_surface',
            name: 'DELHIVERY',
            service_type: 'Delhivery Surface 5KG',
            description: 'Domestic (Surface)',
            estimated_delivery: 'Oct 25, 2025',
            chargeable_weight: '5 Kg',
            charges: 211.22,
            pickup_cutoff_time: '02:00 PM',
            more_options: '+3 more options from Delhivery Surface'
          }
        ];
        setCourierOptions(mockOptions);
        setSelectedCourier('delhivery_surface');
      }
    } catch (error) {
      console.error('Error fetching courier options:', error);
      // Fallback to mock data
      const mockOptions: CourierOption[] = [
        {
          id: 'delhivery_surface',
          name: 'DELHIVERY',
          service_type: 'Delhivery Surface 5KG',
          description: 'Domestic (Surface)',
          estimated_delivery: 'Oct 25, 2025',
          chargeable_weight: '5 Kg',
          charges: 211.22,
          pickup_cutoff_time: '02:00 PM',
          more_options: '+3 more options from Delhivery Surface'
        }
      ];
      setCourierOptions(mockOptions);
      setSelectedCourier('delhivery_surface');
    } finally {
      setLoading(false);
    }
  };

  const handleShipNow = async () => {
    if (!selectedCourier || !order) return;

    setShipping(true);
    try {
      const selectedOption = courierOptions.find(option => option.id === selectedCourier);
      
      if (!selectedOption) {
        alert('Please select a courier option');
        setShipping(false);
        return;
      }

      // Check wallet balance before proceeding
      const shippingCharges = selectedOption.charges;
      try {
        const walletResponse = await apiService.get<{
          success: boolean;
          data: {
            balance: number;
          };
        }>('/user/wallet-balance');
        
        if (walletResponse.success) {
          const walletBalance = walletResponse.data.balance || 0;
          
          if (walletBalance < shippingCharges) {
            alert(`Insufficient wallet balance! 
Required: ₹${shippingCharges}
Available: ₹${walletBalance}
Please recharge your wallet to continue.`);
            setShipping(false);
            return;
          }
        }
      } catch (walletError) {
        // If wallet balance check fails, proceed with warning
        console.warn('Could not verify wallet balance, proceeding with caution');
      }

      // Call pickup request creation API
      const pickupData = {
        pickup_time: '11:00:00',
        pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        pickup_location: {
          name: order.pickup_address.name,
          add: order.pickup_address.full_address,
          city: order.pickup_address.city,
          pin_code: order.pickup_address.pincode,
          country: 'India',
          phone: order.pickup_address.phone
        },
        expected_package_count: 1,
        shipping_charges: shippingCharges
      };

      const response = await apiService.post<{
        success: boolean;
        message: string;
      }>('/shipping/schedule-pickup', pickupData);
      
      if (response.success) {
        alert(`Pickup request created successfully! 
Shipping Charges: ₹${shippingCharges}
Courier will be notified for pickup.`);
        navigate('/orders');
      } else {
        alert('Failed to create pickup request. Please try again.');
      }
    } catch (error) {
      console.error('Error creating pickup request:', error);
      alert('Failed to create pickup request. Please try again.');
    } finally {
      setShipping(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="assign-courier-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading order details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="assign-courier-container">
          <div className="error-state">
            <h3>Order not found</h3>
            <button onClick={() => navigate('/orders')} className="back-btn">
              Back to Orders
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="assign-courier-container">
        {/* Header */}
        <div className="assign-courier-header">
          <h1>Assign Courier</h1>
          <button onClick={() => navigate('/orders')} className="back-btn">
            ← Back to Orders
          </button>
        </div>

        {/* Order Information */}
        <div className="order-info-card">
          <div className="order-info-header">
            <h3>Order Information</h3>
            <span className="order-id">Order ID: {order.order_id}</span>
          </div>
          
          <div className="order-details">
            <div className="address-section">
              <div className="pickup-info">
                <span className="label">Pickup From:</span>
                <span className="address">{order.pickup_address.pincode}, {order.pickup_address.state}</span>
              </div>
              
              <div className="arrow">→</div>
              
              <div className="delivery-info">
                <span className="label">Delivery To:</span>
                <span className="address">{order.delivery_address.pincode}, {order.delivery_address.state}</span>
              </div>
            </div>
            
            <div className="order-meta">
              <div className="meta-item">
                <span className="label">Order value:</span>
                <span className="value">₹ {order.payment_info.order_value}</span>
              </div>
              <div className="meta-item">
                <span className="label">Payment Type:</span>
                <span className="value">{order.payment_info.payment_mode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RTO Warehouse Selection */}
        <div className="rto-warehouse-section">
          <div className="dropdown-container">
            <label>Select RTO Warehouse</label>
            <select className="warehouse-dropdown">
              <option value="">Select Warehouse</option>
              <option value="main">Main Warehouse</option>
            </select>
            <p className="dropdown-note">Only applicable for Delhivery Courier</p>
          </div>
        </div>

        {/* Courier Options */}
        <div className="courier-options-section">
          <div className="filter-tabs">
            <button className="tab-btn active">All</button>
            <button className="tab-btn">Air</button>
            <button className="tab-btn">Surface</button>
          </div>

          <div className="courier-table">
            <div className="table-header">
              <div className="header-cell">Courier Partner</div>
              <div className="header-cell">Estimated Delivery</div>
              <div className="header-cell">Chargeable Weight</div>
              <div className="header-cell">Charges</div>
              <div className="header-cell">Action</div>
            </div>

            <div className="table-body">
              {courierOptions.map((courier) => (
                <div key={courier.id} className="table-row">
                  <div className="courier-info">
                    <div className="courier-logo">
                      <div className="logo-placeholder">DELHIVERY</div>
                    </div>
                    <div className="courier-details">
                      <div className="service-name">{courier.service_type}</div>
                      <div className="service-description">{courier.description}</div>
                      <div className="pickup-cutoff">
                        Pickup cut-off time: <span className="cutoff-time">{courier.pickup_cutoff_time}</span>
                      </div>
                      {courier.more_options && (
                        <a href="#" className="more-options">{courier.more_options}</a>
                      )}
                    </div>
                  </div>
                  
                  <div className="estimated-delivery">{courier.estimated_delivery}</div>
                  <div className="chargeable-weight">{courier.chargeable_weight}</div>
                  <div className="charges">
                    ₹ {courier.charges.toFixed(2)}
                    <span className="info-icon">ℹ️</span>
                  </div>
                  
                  <div className="action-cell">
                    <button 
                      className={`ship-now-btn ${selectedCourier === courier.id ? 'selected' : ''}`}
                      onClick={handleShipNow}
                      disabled={shipping}
                    >
                      {shipping ? 'Processing...' : 'Ship Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AssignCourier;
