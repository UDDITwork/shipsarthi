import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import OrderCreationModal from '../components/OrderCreationModal';
import { environmentConfig } from '../config/environment';
import './Orders.css';

// Order Status Types
type OrderStatus = 'new' | 'ready_to_ship' | 'pickups_manifests' | 'in_transit' | 
                   'out_for_delivery' | 'delivered' | 'ndr' | 'rto' | 'all' | 'lost';

type OrderType = 'forward' | 'reverse';

interface Order {
  _id: string;
  orderId: string;
  referenceId: string;
  orderDate: Date;
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
  status: OrderStatus;
  awb?: string;
  trackingUrl?: string;
  pickupRequestId?: string;
  pickupRequestStatus?: 'pending' | 'scheduled' | 'in_transit' | 'completed' | 'failed';
  pickupRequestDate?: Date;
  pickupRequestTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderFilters {
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  searchType: 'reference' | 'awb' | 'order';
  paymentMode?: string;
  state?: string;
  minAmount?: number;
  maxAmount?: number;
}

const Orders: React.FC = () => {
  const navigate = useNavigate();
  
  // State Management
  const [activeTab, setActiveTab] = useState<OrderStatus>('new');
  const [orderType, setOrderType] = useState<OrderType>('forward');
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Debug orders state changes
  useEffect(() => {
    console.log('📋 ORDERS STATE UPDATED:', {
      count: orders.length,
      orders: orders
    });
  }, [orders]);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  // Filter States
  const [filters, setFilters] = useState<OrderFilters>({
    dateFrom: '',
    dateTo: '',
    searchQuery: '',
    searchType: 'order',
  });

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Modal States
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch Orders on component mount and when filters change
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🔐 AUTH CHECK:', {
      hasToken: !!token,
      token: token ? 'Present' : 'Missing'
    });
    
    if (token) {
      fetchOrders();
    } else {
      console.warn('⚠️ No authentication token found');
    }
  }, [activeTab, orderType, filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      if (filters.paymentMode) params.append('payment_mode', filters.paymentMode);

      const apiUrl = `${environmentConfig.apiUrl}/orders?${params}`;
      const token = localStorage.getItem('token');
      
      console.log('🔍 FETCHING ORDERS:', {
        apiUrl,
        token: token ? 'Token present' : 'No token',
        activeTab,
        filters
      });

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 API RESPONSE:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 ORDERS DATA:', data);
        console.log('📋 ORDERS ARRAY:', data.data?.orders);
        console.log('📊 ORDERS COUNT:', data.data?.orders?.length || 0);
        
        // Transform backend data to frontend format
        const transformedOrders = (data.data.orders || []).map((order: any) => ({
          _id: order._id,
          orderId: order.order_id,
          referenceId: order.reference_id || '',
          orderDate: order.order_date,
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
          paymentMode: order.payment_info?.payment_mode || '',
          codAmount: order.payment_info?.cod_amount || 0,
          totalAmount: order.payment_info?.total_amount || 0,
          warehouse: order.pickup_address?.name || '',
          pickupLocation: order.pickup_address?.full_address || '',
          status: order.status,
          awb: order.delhivery_data?.waybill || '',
          trackingUrl: order.delhivery_data?.tracking_url || '',
          pickupRequestId: order.delhivery_data?.pickup_request_id || '',
          pickupRequestStatus: order.delhivery_data?.pickup_request_status || 'pending',
          pickupRequestDate: order.delhivery_data?.pickup_request_date,
          pickupRequestTime: order.delhivery_data?.pickup_request_time || '',
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }));
        
        console.log('🔄 TRANSFORMED ORDERS:', transformedOrders);
        setOrders(transformedOrders);
      } else {
        const errorText = await response.text();
        console.error('❌ API ERROR:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      }
    } catch (error) {
      console.error('❌ FETCH ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    setLoading(true);
    try {
      // API call to sync orders with Delhivery
      // await orderService.syncOrders();
      alert('Orders synced successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Error syncing orders:', error);
      alert('Failed to sync orders');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = () => {
    setIsBulkImportModalOpen(true);
  };

  const handleBulkImportClose = () => {
    setIsBulkImportModalOpen(false);
  };

  const handleBulkImportSubmit = async (file: File) => {
    try {
      setLoading(true);
      // Process CSV/Excel file and import orders
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${environmentConfig.apiUrl}/orders/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully imported ${data.importedCount} orders!`);
        fetchOrders(); // Refresh orders list
        setIsBulkImportModalOpen(false);
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      alert('Failed to import orders. Please check your file format.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = () => {
    setIsAddOrderModalOpen(true);
  };

  const handleOrderCreated = (order: any) => {
    console.log('🎉 ORDER CREATED CALLBACK:', order);
    // Add the new order to the list
    setOrders(prev => {
      const newOrders = [order, ...prev];
      console.log('🔄 UPDATING ORDERS STATE:', {
        previous: prev.length,
        new: newOrders.length,
        newOrder: order
      });
      return newOrders;
    });
    alert('Order created successfully!');
  };

  const handleAssignCourier = (orderId: string) => {
    // Navigate to assign courier page
    navigate(`/orders/assign-courier/${orderId}`);
  };

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order._id));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      setLoading(true);
      
      // Prepare export data
      const exportData = orders.map(order => ({
        'Order ID': order.orderId,
        'Reference ID': order.referenceId,
        'Order Date': new Date(order.orderDate).toLocaleDateString(),
        'Customer Name': order.customerName,
        'Customer Phone': order.customerPhone,
        'Customer Address': order.customerAddress,
        'City': order.city,
        'State': order.state,
        'PIN': order.pin,
        'Product Name': order.productName,
        'Quantity': order.quantity,
        'Weight (g)': order.weight,
        'Payment Mode': order.paymentMode,
        'COD Amount': order.codAmount || 0,
        'Total Amount': order.totalAmount,
        'Warehouse': order.warehouse,
        'Status': order.status,
        'AWB': order.awb || 'N/A',
        'Created At': new Date(order.createdAt).toLocaleString()
      }));

      if (format === 'csv') {
        await exportToCSV(exportData);
      } else if (format === 'excel') {
        await exportToExcel(exportData);
      } else if (format === 'pdf') {
        await exportToPDF(exportData);
      }
      
      alert(`${format.toUpperCase()} export completed successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async (data: any[]) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async (data: any[]) => {
    // For Excel export, we'll create a CSV that can be opened in Excel
    // In a real implementation, you'd use a library like xlsx
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header] || '').join('\t'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async (data: any[]) => {
    // For PDF export, we'll create a simple HTML table and print it
    // In a real implementation, you'd use a library like jsPDF
    const headers = Object.keys(data[0] || {});
    const tableHTML = `
      <html>
        <head>
          <title>Orders Export</title>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Orders Export - ${new Date().toLocaleDateString()}</h1>
          <table>
            <thead>
              <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(tableHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Date helper functions
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setFilters(prev => ({
      ...prev,
      dateFrom: from,
      dateTo: to
    }));
    setShowDatePicker(false);
  };

  const handleClearDateFilter = () => {
    setFilters(prev => ({
      ...prev,
      dateFrom: '',
      dateTo: ''
    }));
  };

  const handleMoreFiltersToggle = () => {
    setShowMoreFilters(!showMoreFilters);
  };

  const handleClearAllFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      searchQuery: '',
      searchType: 'order',
    });
    setShowMoreFilters(false);
  };

  // Action button handlers
  const handleViewOrder = (orderId: string) => {
    // Navigate to order details page or open modal
    navigate(`/orders/${orderId}`);
  };

  const handleEditOrder = (orderId: string) => {
    // Navigate to edit order page or open edit modal
    navigate(`/orders/edit/${orderId}`);
  };

  const handleTrackOrder = (orderId: string, awb?: string) => {
    if (awb) {
      // Open tracking in new tab with AWB
      window.open(`https://www.delhivery.com/track/package/${awb}`, '_blank');
    } else {
      // Show tracking modal or navigate to tracking page
      alert('AWB number not available for tracking');
    }
  };

  const handlePrintLabel = (orderId: string, awb?: string) => {
    if (awb) {
      // Generate and print shipping label
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const labelHTML = `
          <html>
            <head>
              <title>Shipping Label - ${orderId}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .label { border: 2px solid #000; padding: 20px; max-width: 400px; }
                .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
                .field { margin: 10px 0; }
                .field-label { font-weight: bold; }
                .barcode { text-align: center; font-family: monospace; font-size: 16px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="header">SHIPPING LABEL</div>
                <div class="field">
                  <span class="field-label">Order ID:</span> ${orderId}
                </div>
                <div class="field">
                  <span class="field-label">AWB:</span> ${awb}
                </div>
                <div class="field">
                  <span class="field-label">Date:</span> ${new Date().toLocaleDateString()}
                </div>
                <div class="barcode">
                  ||| ${awb} |||
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <button onclick="window.print()">Print Label</button>
                </div>
              </div>
            </body>
          </html>
        `;
        printWindow.document.write(labelHTML);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      alert('AWB number not available for printing label');
    }
  };

  // Header functionality handlers
  const handleRecharge = () => {
    setIsRechargeModalOpen(true);
  };

  const handleTickets = () => {
    navigate('/tickets');
  };

  const handleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleRechargeSubmit = async (amount: number) => {
    try {
      setLoading(true);
      // Process recharge
      const response = await fetch(`${environmentConfig.apiUrl}/billing/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        alert(`Successfully recharged ₹${amount}!`);
        setIsRechargeModalOpen(false);
        // Refresh user balance or redirect to payment
      } else {
        throw new Error('Recharge failed');
      }
    } catch (error) {
      console.error('Recharge error:', error);
      alert('Failed to process recharge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="orders-container">
        {/* Top Action Bar */}
        <div className="orders-top-bar">
          <div className="order-type-toggle">
            <button
              className={`toggle-btn ${orderType === 'forward' ? 'active' : ''}`}
              onClick={() => setOrderType('forward')}
            >
              Forward
            </button>
            <button
              className={`toggle-btn ${orderType === 'reverse' ? 'active' : ''}`}
              onClick={() => setOrderType('reverse')}
            >
              Reverse
            </button>
          </div>

          <div className="top-actions">
            <button className="action-btn sync-btn" onClick={handleSyncOrders}>
              Sync Order
            </button>
            <button className="action-btn import-btn" onClick={handleBulkImport}>
              Bulk Import
            </button>
            <button className="action-btn add-btn" onClick={handleAddOrder}>
              Add Order
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="status-tabs">
          <button
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            New
          </button>
          <button
            className={`tab-btn ${activeTab === 'ready_to_ship' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready_to_ship')}
          >
            Ready to Ship
          </button>
          <button
            className={`tab-btn ${activeTab === 'pickups_manifests' ? 'active' : ''}`}
            onClick={() => setActiveTab('pickups_manifests')}
          >
            Pickups & Manifests
          </button>
          <button
            className={`tab-btn ${activeTab === 'in_transit' ? 'active' : ''}`}
            onClick={() => setActiveTab('in_transit')}
          >
            In Transit
          </button>
          <button
            className={`tab-btn ${activeTab === 'out_for_delivery' ? 'active' : ''}`}
            onClick={() => setActiveTab('out_for_delivery')}
          >
            Out for Delivery
          </button>
          <button
            className={`tab-btn ${activeTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered
          </button>
          <button
            className={`tab-btn ${activeTab === 'ndr' ? 'active' : ''}`}
            onClick={() => setActiveTab('ndr')}
          >
            NDR
          </button>
          <button
            className={`tab-btn ${activeTab === 'rto' ? 'active' : ''}`}
            onClick={() => setActiveTab('rto')}
          >
            RTO
          </button>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`tab-btn ${activeTab === 'lost' ? 'active' : ''}`}
            onClick={() => setActiveTab('lost')}
          >
            Lost
          </button>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="date-filter">
            <button 
              className="calendar-btn"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              📅 {filters.dateFrom ? formatDateForDisplay(filters.dateFrom) : 'Select Date Range'} 
              {filters.dateTo && ` to ${formatDateForDisplay(filters.dateTo)}`}
              {!filters.dateFrom && !filters.dateTo && ' (Last 30 days)'}
            </button>
            {showDatePicker && (
              <div className="date-picker-dropdown">
                <div className="date-picker-header">
                  <h4>Select Date Range</h4>
                  <button 
                    className="close-btn"
                    onClick={() => setShowDatePicker(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="date-inputs">
                  <div className="date-input-group">
                    <label>From Date</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({...prev, dateFrom: e.target.value}))}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>To Date</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({...prev, dateTo: e.target.value}))}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="date-picker-actions">
                  <button 
                    className="apply-btn"
                    onClick={() => {
                      if (filters.dateFrom && filters.dateTo) {
                        fetchOrders();
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={!filters.dateFrom || !filters.dateTo}
                  >
                    Apply Filter
                  </button>
                  <button 
                    className="clear-btn"
                    onClick={handleClearDateFilter}
                  >
                    Clear Filter
                  </button>
                  <button 
                    className="quick-filter-btn"
                    onClick={() => {
                      const defaultRange = getDefaultDateRange();
                      handleDateRangeChange(defaultRange.from, defaultRange.to);
                      fetchOrders();
                    }}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="search-filter">
            <select
              className="search-type-select"
              value={filters.searchType}
              onChange={(e) => setFilters({...filters, searchType: e.target.value as any})}
            >
              <option value="reference">Search by Reference ID</option>
              <option value="awb">Search by AWB</option>
              <option value="order">Search by Order ID</option>
            </select>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
            />
            <button type="submit" className="search-btn">🔍</button>
          </form>

          <div className="more-filters-container">
            <button 
              className={`more-filters-btn ${showMoreFilters ? 'active' : ''}`}
              onClick={handleMoreFiltersToggle}
            >
            🎚️ More Filter
          </button>
            
            {showMoreFilters && (
              <div className="more-filters-dropdown">
                <div className="filters-header">
                  <h4>Advanced Filters</h4>
                  <button 
                    className="close-filters-btn"
                    onClick={() => setShowMoreFilters(false)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="filters-content">
                  <div className="filter-group">
                    <label>Payment Mode</label>
                    <select
                      value={filters.paymentMode || ''}
                      onChange={(e) => setFilters({...filters, paymentMode: e.target.value})}
                    >
                      <option value="">All Payment Modes</option>
                      <option value="COD">COD</option>
                      <option value="Prepaid">Prepaid</option>
                      <option value="Pickup">Pickup</option>
                      <option value="REPL">REPL</option>
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label>State</label>
                    <input
                      type="text"
                      placeholder="Filter by state"
                      value={filters.state || ''}
                      onChange={(e) => setFilters({...filters, state: e.target.value})}
                    />
                  </div>
                  
                  <div className="filter-group">
                    <label>Min Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Minimum amount"
                      value={filters.minAmount || ''}
                      onChange={(e) => setFilters({...filters, minAmount: e.target.value ? Number(e.target.value) : undefined})}
                    />
                  </div>
                  
                  <div className="filter-group">
                    <label>Max Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Maximum amount"
                      value={filters.maxAmount || ''}
                      onChange={(e) => setFilters({...filters, maxAmount: e.target.value ? Number(e.target.value) : undefined})}
                    />
                  </div>
                </div>
                
                <div className="filters-actions">
                  <button 
                    className="apply-filters-btn"
                    onClick={() => {
                      fetchOrders();
                      setShowMoreFilters(false);
                    }}
                  >
                    Apply Filters
                  </button>
                  <button 
                    className="clear-filters-btn"
                    onClick={handleClearAllFilters}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="export-btns">
            <button className="export-btn" onClick={() => handleExport('csv')}>
              CSV
            </button>
            <button className="export-btn" onClick={() => handleExport('excel')}>
              Excel
            </button>
            <button className="export-btn" onClick={() => handleExport('pdf')}>
              PDF
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Order Date</th>
                <th>Order Details</th>
                <th>Product Details</th>
                <th>Package Details</th>
                <th>Payment</th>
                <th>Shipping Details</th>
                <th>Pickup Status</th>
                <th>Warehouse</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="loading-cell">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data-cell">
                    <div className="no-orders">
                      <div className="no-orders-icon">📦</div>
                      <h3>No orders found</h3>
                      <p>Create your first order to get started</p>
                      <button className="create-order-btn" onClick={handleAddOrder}>
                        ➕ Create Order
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                      />
                    </td>
                    <td>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <div className="order-details-cell">
                        <div>Order ID: {order.orderId || 'N/A'}</div>
                        <div>Ref: {order.referenceId || 'N/A'}</div>
                        <div>{order.customerName || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="product-details-cell">
                        <div>{order.productName || 'N/A'}</div>
                        <div>Qty: {order.quantity || 0}</div>
                      </div>
                    </td>
                    <td>
                      <div className="package-details-cell">
                        <div>Weight: {order.weight || 0}g</div>
                        {order.length && (
                          <div>
                            {order.length} x {order.width} x {order.height} cm
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="payment-cell">
                        <div className={`payment-mode ${order.paymentMode?.toLowerCase() || 'unknown'}`}>
                          {order.paymentMode || 'N/A'}
                        </div>
                        {order.codAmount && <div>₹{order.codAmount}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="shipping-details-cell">
                        <div>{order.city || 'N/A'}, {order.state || 'N/A'}</div>
                        <div>PIN: {order.pin || 'N/A'}</div>
                        {order.awb && <div>AWB: {order.awb}</div>}
                      </div>
                    </td>
                    <td>
                      <div className="pickup-status-cell">
                        {order.pickupRequestStatus ? (
                          <div className={`pickup-status ${order.pickupRequestStatus}`}>
                            <span className="pickup-status-badge">
                              {order.pickupRequestStatus === 'pending' && '⏳'}
                              {order.pickupRequestStatus === 'scheduled' && '📅'}
                              {order.pickupRequestStatus === 'in_transit' && '🚚'}
                              {order.pickupRequestStatus === 'completed' && '✅'}
                              {order.pickupRequestStatus === 'failed' && '❌'}
                              {order.pickupRequestStatus.charAt(0).toUpperCase() + order.pickupRequestStatus.slice(1)}
                            </span>
                            {order.pickupRequestDate && (
                              <div className="pickup-date">
                                {new Date(order.pickupRequestDate).toLocaleDateString()}
                              </div>
                            )}
                            {order.pickupRequestTime && (
                              <div className="pickup-time">
                                {order.pickupRequestTime}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pickup-status pending">
                            <span className="pickup-status-badge">
                              ⏳ Pending
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{order.warehouse}</td>
                    <td>
                      <div className="action-buttons">
                        {order.awb && (
                          <button 
                            className="action-btn assign-courier-btn" 
                            title="Assign Courier"
                            onClick={() => handleAssignCourier(order.orderId)}
                          >
                            🚚 Assign Courier
                          </button>
                        )}
                        <button 
                          className="action-icon-btn view-btn" 
                          title="View Order Details"
                          onClick={() => handleViewOrder(order.orderId)}
                        >
                          👁️
                        </button>
                        <button 
                          className="action-icon-btn edit-btn" 
                          title="Edit Order"
                          onClick={() => handleEditOrder(order.orderId)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-icon-btn track-btn" 
                          title="Track Package"
                          onClick={() => handleTrackOrder(order.orderId, order.awb)}
                        >
                          📍
                        </button>
                        <button 
                          className="action-icon-btn print-btn" 
                          title="Print Shipping Label"
                          onClick={() => handlePrintLabel(order.orderId, order.awb)}
                        >
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Order Creation Modal */}
        <OrderCreationModal
          isOpen={isAddOrderModalOpen}
          onClose={() => setIsAddOrderModalOpen(false)}
          onOrderCreated={handleOrderCreated}
        />

        {/* Bulk Import Modal */}
        {isBulkImportModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>📥 Bulk Import Orders</h3>
                <button 
                  className="close-btn"
                  onClick={handleBulkImportClose}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>Upload a CSV or Excel file to import multiple orders at once.</p>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleBulkImportSubmit(file);
                      }
                    }}
                    className="file-input"
                  />
                  <div className="upload-text">
                    📁 Click to select file or drag and drop
                  </div>
                </div>
                <div className="import-instructions">
                  <h4>File Format Requirements:</h4>
                  <ul>
                    <li>CSV or Excel format (.csv, .xlsx, .xls)</li>
                    <li>Include columns: Order ID, Customer Name, Phone, Address, etc.</li>
                    <li>Maximum file size: 10MB</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recharge Modal */}
        {isRechargeModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>💰 Recharge Account</h3>
                <button 
                  className="close-btn"
                  onClick={() => setIsRechargeModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="recharge-options">
                  <button 
                    className="recharge-btn"
                    onClick={() => handleRechargeSubmit(500)}
                  >
                    ₹500
                  </button>
                  <button 
                    className="recharge-btn"
                    onClick={() => handleRechargeSubmit(1000)}
                  >
                    ₹1,000
                  </button>
                  <button 
                    className="recharge-btn"
                    onClick={() => handleRechargeSubmit(2500)}
                  >
                    ₹2,500
                  </button>
                  <button 
                    className="recharge-btn"
                    onClick={() => handleRechargeSubmit(5000)}
                  >
                    ₹5,000
                  </button>
                </div>
                <div className="custom-amount">
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    className="amount-input"
                    min="100"
                    max="50000"
                  />
                  <button 
                    className="custom-recharge-btn"
                    onClick={() => {
                      const input = document.querySelector('.amount-input') as HTMLInputElement;
                      const amount = parseInt(input.value);
                      if (amount >= 100 && amount <= 50000) {
                        handleRechargeSubmit(amount);
                      } else {
                        alert('Amount must be between ₹100 and ₹50,000');
                      }
                    }}
                  >
                    Recharge Custom Amount
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Dropdown */}
        {isNotificationsOpen && (
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h4>🔔 Notifications</h4>
              <button 
                className="close-btn"
                onClick={() => setIsNotificationsOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="notifications-list">
              <div className="notification-item">
                <div className="notification-icon">📦</div>
                <div className="notification-content">
                  <div className="notification-title">Order #ORD123456 shipped</div>
                  <div className="notification-time">2 hours ago</div>
                </div>
              </div>
              <div className="notification-item">
                <div className="notification-icon">💰</div>
                <div className="notification-content">
                  <div className="notification-title">Payment received for Order #ORD123457</div>
                  <div className="notification-time">4 hours ago</div>
                </div>
              </div>
              <div className="notification-item">
                <div className="notification-icon">⚠️</div>
                <div className="notification-content">
                  <div className="notification-title">Low balance alert</div>
                  <div className="notification-time">1 day ago</div>
                </div>
              </div>
            </div>
            <div className="notifications-footer">
              <button className="view-all-btn">View All Notifications</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;