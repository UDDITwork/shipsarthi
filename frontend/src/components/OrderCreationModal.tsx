import React, { useState, useEffect } from 'react';
import './OrderCreationModal.css';
import { generateOrderId } from '../utils/orderIdGenerator';
import { environmentConfig } from '../config/environment';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { shippingService, ShippingCalculationRequest } from '../services/shippingService';

interface OrderCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: any) => void;
}

interface Warehouse {
  _id: string;
  name: string;
  address: {
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  contact_person: {
    phone: string;
  };
}

interface Package {
  _id: string;
  name: string;
  package_type: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  product_name: string;
  hsn_code?: string;
  unit_price?: number;
  discount?: number;
  tax?: number;
  number_of_boxes?: number;
  weight_per_box?: number;
}

const OrderCreationModal: React.FC<OrderCreationModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const { user } = useAuth(); // Get user for category
  const userCategory = user?.user_category || 'Basic User';
  
  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [orderId, setOrderId] = useState<string>(generateOrderId());
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [warehouseError, setWarehouseError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWarehouses, setFilteredWarehouses] = useState<Warehouse[]>([]);
  
  // Pincode validation states
  const [validatingDeliveryPincode, setValidatingDeliveryPincode] = useState(false);
  const [validatingPickupPincode, setValidatingPickupPincode] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    // Order Details
    order_date: new Date().toISOString().split('T')[0],
    reference_id: '',
    invoice_number: '',
    
    // Customer Information
    customer_info: {
      buyer_name: '',
      phone: '',
      alternate_phone: '',
      email: '',
      gstin: ''
    },
    
    // Delivery Address
    delivery_address: {
      address_line_1: '',
      address_line_2: '',
      pincode: '',
      city: '',
      state: '',
      country: 'India'
    },
    
    // Warehouse/Pickup Address
    pickup_address: {
      warehouse_id: '',
      name: '',
      full_address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      country: 'India'
    },
    
    // Products
    products: [{
      product_name: '',
      quantity: 1,
      unit_price: 0,
      hsn_code: '',
      category: '',
      sku: '',
      discount: 0,
      tax: 0
    }],
    
    // Package Information
    package_info: {
      package_type: 'Single Package (B2C)',
      weight: 0,
      dimensions: {
        length: 0,
        width: 0,
        height: 0
      },
      number_of_boxes: 1,
      weight_per_box: 0,
      rov_type: '',
      rov_owner: '',
      weight_photo_url: '',
      dimensions_photo_url: '',
      save_dimensions: false
    },
    
    // Payment Information
    payment_info: {
      payment_mode: 'Prepaid',
      order_value: 0,
      total_amount: 0,
      shipping_charges: 0,
      grand_total: 0,
      cod_amount: 0
    },
    
    // Seller Information
    seller_info: {
      name: '',
      gst_number: '',
      reseller_name: ''
    },
    
    shipping_mode: 'Surface'
  });

  // Fetch warehouses and packages on component mount
  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      fetchPackages();
    }
  }, [isOpen]);

  // Filter warehouses based on search query
  useEffect(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) {
      setFilteredWarehouses(warehouses);
      return;
    }

    const filtered = warehouses.filter((warehouse) => {
      const name = (warehouse.name || '').toLowerCase();
      const title = ((warehouse as any).title || '').toLowerCase();
      const city = (warehouse.address?.city || '').toLowerCase();
      const state = (warehouse.address?.state || '').toLowerCase();
      const pincode = (warehouse.address?.pincode || '').toLowerCase();
      const fullAddress = (warehouse.address?.full_address || '').toLowerCase();

      return (
        name.includes(q) ||
        title.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        pincode.includes(q) ||
        fullAddress.includes(q)
      );
    });

    setFilteredWarehouses(filtered);
  }, [warehouses, searchQuery]);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${environmentConfig.apiUrl}/warehouses`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.data.warehouses || []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${environmentConfig.apiUrl}/packages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPackages(data.data.packages || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRefreshOrderId = () => {
    setOrderId(generateOrderId());
  };

  const handleAddAddress = () => {
    setShowManualAddress(true);
    setWarehouseError('');
    // Clear warehouse selection when switching to manual entry
    setFormData(prev => ({
      ...prev,
      pickup_address: {
        ...prev.pickup_address,
        warehouse_id: '',
        name: '',
        full_address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        country: 'India'
      }
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as any),
        [field]: value
      }
    }));
  };

  // Pincode validation function using Delhivery API
  const validatePincode = async (pincode: string) => {
    if (pincode.length !== 6) return null;
    
    try {
      const response = await apiService.get<{ city: string; state: string; serviceable: boolean }>(`/tools/pincode-info/${pincode}`);
      return response;
    } catch (error) {
      console.error('Pincode validation error:', error);
      return null;
    }
  };

  // Handle delivery pincode change
  const handleDeliveryPincodeChange = async (pincode: string) => {
    // Update pincode in form data
    handleNestedInputChange('delivery_address', 'pincode', pincode);
    
    // If pincode is 6 digits, validate it
    if (pincode.length === 6) {
      setValidatingDeliveryPincode(true);
      
      try {
        const locationInfo = await validatePincode(pincode);
        if (locationInfo && locationInfo.city && locationInfo.state && 
            locationInfo.city !== 'Unknown' && locationInfo.state !== 'Unknown' &&
            locationInfo.city !== 'Not Serviceable' && locationInfo.state !== 'Not Serviceable') {
          // Auto-fill city and state
          handleNestedInputChange('delivery_address', 'city', locationInfo.city);
          handleNestedInputChange('delivery_address', 'state', locationInfo.state);
        } else {
          // Invalid pincode - clear fields
          handleNestedInputChange('delivery_address', 'city', '');
          handleNestedInputChange('delivery_address', 'state', '');
        }
      } catch (error) {
        console.error('Pincode validation error:', error);
        // On error, clear fields
        handleNestedInputChange('delivery_address', 'city', '');
        handleNestedInputChange('delivery_address', 'state', '');
      } finally {
        setValidatingDeliveryPincode(false);
      }
    } else {
      // Clear city and state if pincode is incomplete
      handleNestedInputChange('delivery_address', 'city', '');
      handleNestedInputChange('delivery_address', 'state', '');
    }
  };

  // Handle pickup pincode change (for manual warehouse entry)
  const handlePickupPincodeChange = async (pincode: string) => {
    // Update pincode in form data
    handleNestedInputChange('pickup_address', 'pincode', pincode);
    
    // If pincode is 6 digits, validate it
    if (pincode.length === 6) {
      setValidatingPickupPincode(true);
      
      try {
        const locationInfo = await validatePincode(pincode);
        if (locationInfo && locationInfo.city && locationInfo.state && 
            locationInfo.city !== 'Unknown' && locationInfo.state !== 'Unknown' &&
            locationInfo.city !== 'Not Serviceable' && locationInfo.state !== 'Not Serviceable') {
          // Auto-fill city and state
          handleNestedInputChange('pickup_address', 'city', locationInfo.city);
          handleNestedInputChange('pickup_address', 'state', locationInfo.state);
        } else {
          // Invalid pincode - clear fields
          handleNestedInputChange('pickup_address', 'city', '');
          handleNestedInputChange('pickup_address', 'state', '');
        }
      } catch (error) {
        console.error('Pincode validation error:', error);
        // On error, clear fields
        handleNestedInputChange('pickup_address', 'city', '');
        handleNestedInputChange('pickup_address', 'state', '');
      } finally {
        setValidatingPickupPincode(false);
      }
    } else {
      // Clear city and state if pincode is incomplete
      handleNestedInputChange('pickup_address', 'city', '');
      handleNestedInputChange('pickup_address', 'state', '');
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    try {
      setWarehouseError('');
      
      if (!warehouseId) {
        setFormData(prev => ({
          ...prev,
          pickup_address: {
            ...prev.pickup_address,
            warehouse_id: '',
            name: '',
            full_address: '',
            city: '',
            state: '',
            pincode: '',
            phone: '',
            country: 'India'
          }
        }));
        setShowManualAddress(false);
        return;
      }

      const warehouse = warehouses.find(w => w._id === warehouseId);
      if (!warehouse) {
        setWarehouseError('Warehouse not found');
        return;
      }

      // Validate warehouse data completeness
      if (!warehouse.address?.full_address || !warehouse.contact_person?.phone) {
        setWarehouseError('Warehouse data is incomplete');
        return;
      }

      setFormData(prev => ({
        ...prev,
        pickup_address: {
          warehouse_id: warehouseId,
          name: warehouse.name,
          full_address: warehouse.address.full_address,
          city: warehouse.address.city,
          state: warehouse.address.state,
          pincode: warehouse.address.pincode,
          phone: warehouse.contact_person.phone,
          country: warehouse.address.country || 'India'
        }
      }));
      setShowManualAddress(false);
    } catch (error) {
      setWarehouseError('Error selecting warehouse');
      console.error('Warehouse selection error:', error);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    const packageItem = packages.find(p => p._id === packageId);
    if (packageItem) {
      setSelectedPackage(packageItem);
      setFormData(prev => ({
        ...prev,
        package_info: {
          ...prev.package_info,
          package_type: packageItem.package_type,
          weight: packageItem.weight,
          dimensions: packageItem.dimensions,
          number_of_boxes: packageItem.number_of_boxes || 1,
          weight_per_box: packageItem.weight_per_box || packageItem.weight,
          product_name: packageItem.product_name,
          hsn_code: packageItem.hsn_code || '',
          unit_price: packageItem.unit_price || 0,
          discount: packageItem.discount || 0,
          tax: packageItem.tax || 0
        },
        products: [{
          ...prev.products[0],
          product_name: packageItem.product_name,
          hsn_code: packageItem.hsn_code || '',
          unit_price: packageItem.unit_price || 0,
          discount: packageItem.discount || 0,
          tax: packageItem.tax || 0
        }]
      }));
    }
  };

  const handleAddProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        product_name: '',
        quantity: 1,
        unit_price: 0,
        hsn_code: '',
        category: '',
        sku: '',
        discount: 0,
        tax: 0
      }]
    }));
  };

  const handleRemoveProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  // Helper function to determine zone from pincodes
  // NOTE: Zone calculation removed - zone is now fetched from Delhivery API
  // This function is kept for backward compatibility but should not be used
  // Zone will be determined by Delhivery API response
  const determineZone = (pickupPincode: string, deliveryPincode: string): string => {
    // This function is deprecated - zone should come from Delhivery API
    // Returning empty string so that zone calculation happens via API
    return '';
  };

  // Auto-calculate shipping charges when relevant fields change
  useEffect(() => {
    const autoCalculateShipping = async () => {
      // Only calculate if we have minimum required data
      if (
        !formData.delivery_address.pincode || formData.delivery_address.pincode.length !== 6 ||
        !formData.pickup_address.pincode || formData.pickup_address.pincode.length !== 6 ||
        !formData.package_info.weight || formData.package_info.weight <= 0
      ) {
        return;
      }

      try {
        setCalculatingShipping(true);
        
        const zone = determineZone(formData.pickup_address.pincode, formData.delivery_address.pincode);
        
        if (!zone) {
          return; // Invalid zone, skip calculation
        }

        const weightInGrams = formData.package_info.weight * 1000; // Convert kg to grams
        
        const calculationRequest: ShippingCalculationRequest = {
          weight: weightInGrams,
          dimensions: {
            length: formData.package_info.dimensions.length || 0,
            breadth: formData.package_info.dimensions.width || 0,
            height: formData.package_info.dimensions.height || 0
          },
          zone: zone,
          cod_amount: formData.payment_info.payment_mode === 'COD' ? formData.payment_info.cod_amount : 0,
          order_type: 'forward'
        };

        const response = await shippingService.calculateShippingCharges(calculationRequest);
        
        // Update shipping charges in form data
        setFormData(prev => ({
          ...prev,
          payment_info: {
            ...prev.payment_info,
            shipping_charges: response.totalCharges
          }
        }));
        
        console.log('✅ Auto-calculated shipping charges:', {
          userCategory,
          zone,
          weight: formData.package_info.weight,
          charges: response.totalCharges
        });
        
      } catch (error) {
        console.error('Failed to auto-calculate shipping charges:', error);
        // Don't set shipping charges to 0 on error, keep existing value
      } finally {
        setCalculatingShipping(false);
      }
    };

    autoCalculateShipping();
  }, [
    formData.delivery_address.pincode,
    formData.pickup_address.pincode,
    formData.package_info.weight,
    formData.package_info.dimensions.length,
    formData.package_info.dimensions.width,
    formData.package_info.dimensions.height,
    formData.payment_info.payment_mode,
    formData.payment_info.cod_amount,
    userCategory
  ]);

  const calculateTotals = () => {
    const orderValue = formData.products.reduce((sum, product) => 
      sum + (product.unit_price * product.quantity), 0
    );
    const shippingCharges = formData.payment_info.shipping_charges || 0;
    const grandTotal = orderValue + shippingCharges;

    setFormData(prev => ({
      ...prev,
      payment_info: {
        ...prev.payment_info,
        order_value: orderValue,
        total_amount: orderValue,
        grand_total: grandTotal
      }
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.products, formData.payment_info.shipping_charges]);

  // Handle Save button (no AWB generation)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleOrderSubmission(false); // generate_awb = false
  };

  // Handle Save & Assign Order button (with AWB generation)
  const handleSaveAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleOrderSubmission(true); // generate_awb = true
  };

  const handleOrderSubmission = async (generateAWB: boolean) => {
    setLoading(true);

    // Validate required fields before sending
    const validationErrors = [];
    
    // Check required customer fields
    if (!formData.customer_info.buyer_name.trim()) {
      validationErrors.push('Buyer name is required');
    }
    if (!formData.customer_info.phone.trim()) {
      validationErrors.push('Phone number is required');
    } else if (!/^[6-9]\d{9}$/.test(formData.customer_info.phone)) {
      validationErrors.push('Phone number must be 10 digits starting with 6-9');
    }
    
    // Check required delivery address fields
    if (!formData.delivery_address.address_line_1.trim()) {
      validationErrors.push('Address line 1 is required');
    }
    if (!formData.delivery_address.pincode.trim()) {
      validationErrors.push('Pincode is required');
    } else if (!/^[1-9][0-9]{5}$/.test(formData.delivery_address.pincode)) {
      validationErrors.push('Pincode must be 6 digits starting with 1-9');
    }
    if (!formData.delivery_address.city.trim()) {
      validationErrors.push('City is required');
    }
    if (!formData.delivery_address.state.trim()) {
      validationErrors.push('State is required');
    }
    
    // Check required pickup address fields
    if (!formData.pickup_address.name.trim()) {
      validationErrors.push('Warehouse name is required');
    }
    if (!formData.pickup_address.full_address.trim()) {
      validationErrors.push('Warehouse address is required');
    }
    if (!formData.pickup_address.city.trim()) {
      validationErrors.push('Warehouse city is required');
    }
    if (!formData.pickup_address.state.trim()) {
      validationErrors.push('Warehouse state is required');
    }
    if (!formData.pickup_address.pincode.trim()) {
      validationErrors.push('Warehouse pincode is required');
    } else if (!/^[1-9][0-9]{5}$/.test(formData.pickup_address.pincode)) {
      validationErrors.push('Warehouse pincode must be 6 digits starting with 1-9');
    }
    if (!formData.pickup_address.phone.trim()) {
      validationErrors.push('Warehouse phone is required');
    } else if (!/^[6-9]\d{9}$/.test(formData.pickup_address.phone)) {
      validationErrors.push('Warehouse phone must be 10 digits starting with 6-9');
    }
    
    // Check required product fields
    if (formData.products.length === 0) {
      validationErrors.push('At least one product is required');
    }
    for (let i = 0; i < formData.products.length; i++) {
      const product = formData.products[i];
      if (!product.product_name.trim()) {
        validationErrors.push(`Product ${i + 1} name is required`);
      }
      if (product.quantity < 1) {
        validationErrors.push(`Product ${i + 1} quantity must be at least 1`);
      }
      if (product.unit_price < 0) {
        validationErrors.push(`Product ${i + 1} unit price cannot be negative`);
      }
    }
    
    // Check required package fields
    if (formData.package_info.weight <= 0) {
      validationErrors.push('Package weight must be greater than 0');
    }
    if (formData.package_info.dimensions.length <= 0) {
      validationErrors.push('Package length must be greater than 0');
    }
    if (formData.package_info.dimensions.width <= 0) {
      validationErrors.push('Package width must be greater than 0');
    }
    if (formData.package_info.dimensions.height <= 0) {
      validationErrors.push('Package height must be greater than 0');
    }
    
    // Check payment fields
    if (formData.payment_info.payment_mode === 'COD' && formData.payment_info.cod_amount <= 0) {
      validationErrors.push('COD amount is required when payment mode is COD');
    }

    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n' + validationErrors.join('\n'));
      setLoading(false);
      return;
    }

    console.log('🚀 FRONTEND: Order creation started', {
      formData,
      timestamp: new Date().toISOString()
    });

    try {
      console.log('🌐 FRONTEND: Sending request to backend', {
        url: '/api/orders',
        method: 'POST',
        timestamp: new Date().toISOString()
      });

      // Prepare data with proper types
      const orderData = {
        order_date: formData.order_date,
        reference_id: formData.reference_id,
        invoice_number: formData.invoice_number,
        customer_info: formData.customer_info,
        delivery_address: formData.delivery_address,
        pickup_address: formData.pickup_address,
        products: formData.products.map(product => ({
          product_name: product.product_name,
          quantity: parseInt(String(product.quantity)) || 1,
          unit_price: parseFloat(String(product.unit_price)) || 0,
          hsn_code: product.hsn_code,
          category: product.category,
          sku: product.sku,
          discount: parseFloat(String(product.discount)) || 0,
          tax: parseFloat(String(product.tax)) || 0
        })),
        package_info: {
          package_type: formData.package_info.package_type,
          weight: parseFloat(String(formData.package_info.weight)) || 0,
          dimensions: {
            length: parseFloat(String(formData.package_info.dimensions.length)) || 0,
            width: parseFloat(String(formData.package_info.dimensions.width)) || 0,
            height: parseFloat(String(formData.package_info.dimensions.height)) || 0
          },
          number_of_boxes: parseInt(String(formData.package_info.number_of_boxes)) || 1,
          weight_per_box: (parseFloat(String(formData.package_info.weight)) || 0) / (parseInt(String(formData.package_info.number_of_boxes)) || 1),
          rov_type: formData.package_info.rov_type,
          rov_owner: formData.package_info.rov_owner,
          weight_photo_url: formData.package_info.weight_photo_url,
          dimensions_photo_url: formData.package_info.dimensions_photo_url,
          save_dimensions: formData.package_info.save_dimensions
        },
        payment_info: {
          payment_mode: formData.payment_info.payment_mode,
          order_value: parseFloat(String(formData.payment_info.order_value)) || 0,
          total_amount: parseFloat(String(formData.payment_info.total_amount)) || 0,
          shipping_charges: parseFloat(String(formData.payment_info.shipping_charges)) || 0,
          grand_total: parseFloat(String(formData.payment_info.grand_total)) || 0,
          cod_amount: parseFloat(String(formData.payment_info.cod_amount)) || 0
        },
        seller_info: formData.seller_info,
        shipping_mode: formData.shipping_mode,
        order_id: orderId
      };

      // Add generate_awb flag to order data
      const requestData = {
        ...orderData,
        generate_awb: generateAWB
      };

      console.log('🚀 FRONTEND: Sending order with generate_awb flag', {
        generate_awb: generateAWB,
        generate_awb_type: typeof generateAWB,
        will_call_delhivery: generateAWB,
        timestamp: new Date().toISOString()
      });

      // Use the environment configuration for API URL
      const response = await fetch(`${environmentConfig.apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('📡 FRONTEND: Response received', {
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ FRONTEND: Order created successfully', {
          order: data.data.order,
          awb: data.data.awb_number,
          shipment_info: data.data.shipment_info,
          timestamp: new Date().toISOString()
        });
        
        // Show success message with order details
        let successMessage = '';
        if (generateAWB && data.data.awb_number) {
          successMessage = `Order created and AWB assigned successfully!\n\n📦 Order ID: ${data.data.order.order_id}\n✅ AWB Number: ${data.data.awb_number}\n📊 Status: ${data.data.order.status}\n\nOrder appears in "Ready to Ship" tab.`;
        } else if (generateAWB) {
          successMessage = `Order created and AWB generation initiated!\n\n📦 Order ID: ${data.data.order.order_id}\n⚠️ AWB: Processing...\n📊 Status: ${data.data.order.status}\n\nOrder appears in "Ready to Ship" tab.`;
        } else {
          successMessage = `Order saved successfully!\n\n📦 Order ID: ${data.data.order.order_id}\n📊 Status: ${data.data.order.status}\n\nOrder appears in "NEW" tab. You can generate AWB later.`;
        }
        alert(successMessage);
        
        // Transform order data to include AWB for parent component
        const orderWithAWB = {
          ...data.data.order,
          awb: data.data.awb_number,
          delhivery_data: {
            waybill: data.data.awb_number,
            ...data.data.shipment_info
          }
        };
        
        onOrderCreated(orderWithAWB);
        onClose();
        // Reset form
        setFormData({
          order_date: new Date().toISOString().split('T')[0],
          reference_id: '',
          invoice_number: '',
          customer_info: {
            buyer_name: '',
            phone: '',
            alternate_phone: '',
            email: '',
            gstin: ''
          },
          delivery_address: {
            address_line_1: '',
            address_line_2: '',
            pincode: '',
            city: '',
            state: '',
            country: 'India'
          },
          pickup_address: {
            warehouse_id: '',
            name: '',
            full_address: '',
            city: '',
            state: '',
            pincode: '',
            phone: '',
            country: 'India'
          },
          products: [{
            product_name: '',
            quantity: 1,
            unit_price: 0,
            hsn_code: '',
            category: '',
            sku: '',
            discount: 0,
            tax: 0
          }],
          package_info: {
            package_type: 'Single Package (B2C)',
            weight: 0,
            dimensions: {
              length: 0,
              width: 0,
              height: 0
            },
            number_of_boxes: 1,
            weight_per_box: 0,
            rov_type: '',
            rov_owner: '',
            weight_photo_url: '',
            dimensions_photo_url: '',
            save_dimensions: false
          },
          payment_info: {
            payment_mode: 'Prepaid',
            order_value: 0,
            total_amount: 0,
            shipping_charges: 0,
            grand_total: 0,
            cod_amount: 0
          },
          seller_info: {
            name: '',
            gst_number: '',
            reseller_name: ''
          },
          shipping_mode: 'Surface'
        });
        setCurrentStep(1);
      } else {
        let errorMessage = 'Failed to create order';
        try {
          const error = await response.json();
          console.log('❌ FRONTEND: Order creation failed', {
            error: error.message,
            errors: error.errors,
            status: response.status,
            timestamp: new Date().toISOString()
          });
          
          if (error.errors && Array.isArray(error.errors)) {
            // Show detailed validation errors
            const validationErrors = error.errors.map((err: any) => `• ${err.msg || err.message}`).join('\n');
            errorMessage = `Validation failed:\n\n${validationErrors}`;
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.log('💥 FRONTEND: Network error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      console.error('Error creating order:', error);
      alert('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Create New Order</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Progress Steps */}
          <div className="progress-steps">
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Buyer Details</span>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Order Details</span>
            </div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Product Details</span>
            </div>
            <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
              <span className="step-number">4</span>
              <span className="step-label">Payment & Shipping</span>
            </div>
            <div className={`step ${currentStep >= 5 ? 'active' : ''}`}>
              <span className="step-number">5</span>
              <span className="step-label">Weight & Dimensions</span>
            </div>
            <div className={`step ${currentStep >= 6 ? 'active' : ''}`}>
              <span className="step-number">6</span>
              <span className="step-label">Other Details</span>
            </div>
          </div>

          <form>
            {/* Step 1: Buyer/Receiver Details */}
            {currentStep === 1 && (
              <div className="form-section">
                <div className="section-header">
                  <h3>👤 Buyer/Receiver Details</h3>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone *</label>
                    <input
                      type="tel"
                      value={formData.customer_info.phone}
                      onChange={(e) => {
                        // Only allow digits and limit to 10 characters
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        handleNestedInputChange('customer_info', 'phone', value);
                      }}
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      required
                    />
                    <small className="form-note">Enter 10-digit phone number starting with 6-9</small>
                  </div>
                  <div className="form-group">
                    <label>Buyer Name *</label>
                    <input
                      type="text"
                      value={formData.customer_info.buyer_name}
                      onChange={(e) => handleNestedInputChange('customer_info', 'buyer_name', e.target.value)}
                      placeholder="Enter name or search"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Alternative phone <span className="optional-text">(Optional)</span></label>
                    <div className="phone-input-group">
                      <span className="phone-prefix">+91</span>
                      <input
                        type="tel"
                        value={formData.customer_info.alternate_phone}
                        onChange={(e) => handleNestedInputChange('customer_info', 'alternate_phone', e.target.value)}
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email ID <span className="optional-text">(Optional)</span></label>
                    <input
                      type="email"
                      value={formData.customer_info.email}
                      onChange={(e) => handleNestedInputChange('customer_info', 'email', e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      value={formData.customer_info.gstin}
                      onChange={(e) => handleNestedInputChange('customer_info', 'gstin', e.target.value)}
                      placeholder="GSTIN"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Address Line 1 *</label>
                    <input
                      type="text"
                      value={formData.delivery_address.address_line_1}
                      onChange={(e) => handleNestedInputChange('delivery_address', 'address_line_1', e.target.value)}
                      placeholder="Flat, House No. Building, Apartment"
                      required
                    />
                    <small className="form-note">Only these special characters are allowed .,-/#</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Address Line 2</label>
                    <input
                      type="text"
                      value={formData.delivery_address.address_line_2}
                      onChange={(e) => handleNestedInputChange('delivery_address', 'address_line_2', e.target.value)}
                      placeholder="Area, Colony, Street No., Sector"
                    />
                    <small className="form-note">Only these special characters are allowed .,-/#</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Pincode *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={formData.delivery_address.pincode}
                        onChange={(e) => {
                          // Only allow digits and limit to 6 characters
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          handleDeliveryPincodeChange(value);
                        }}
                        placeholder="Enter 6-digit pincode"
                        maxLength={6}
                        required
                        disabled={validatingDeliveryPincode}
                      />
                      {validatingDeliveryPincode && (
                        <span style={{ 
                          position: 'absolute', 
                          right: '10px', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          fontSize: '12px',
                          color: '#F68723'
                        }}>
                          Loading...
                        </span>
                      )}
                    </div>
                    <small className="form-note">Enter 6-digit pincode</small>
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      value={formData.delivery_address.city}
                      onChange={(e) => handleNestedInputChange('delivery_address', 'city', e.target.value)}
                      placeholder="City"
                      required
                      readOnly={formData.delivery_address.pincode.length === 6}
                      style={{ backgroundColor: formData.delivery_address.pincode.length === 6 ? '#f5f5f5' : 'white' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input
                      type="text"
                      value={formData.delivery_address.state}
                      onChange={(e) => handleNestedInputChange('delivery_address', 'state', e.target.value)}
                      placeholder="State"
                      required
                      readOnly={formData.delivery_address.pincode.length === 6}
                      style={{ backgroundColor: formData.delivery_address.pincode.length === 6 ? '#f5f5f5' : 'white' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Order Details */}
            {currentStep === 2 && (
              <div className="form-section">
                <div className="section-header">
                  <h3>📦 Order Details</h3>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Order ID *</label>
                    <div className="order-id-display">
                      <span className="order-id-prefix">ORD</span>
                      <span className="order-id-number">{orderId.replace('ORD', '')}</span>
                      <button type="button" className="refresh-btn" onClick={handleRefreshOrderId}>🔄</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Order Date *</label>
                    <input
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => handleInputChange('order_date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Reference ID</label>
                    <input
                      type="text"
                      value={formData.reference_id}
                      onChange={(e) => handleInputChange('reference_id', e.target.value)}
                      placeholder="Reference ID"
                    />
                  </div>
                  <div className="form-group">
                    <label>Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                      placeholder="Enter Invoice Number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Product Details */}
            {currentStep === 3 && (
              <div className="form-section">
                <div className="section-header">
                  <h3>🛍️ Product Details</h3>
                </div>
                
                {formData.products.map((product, index) => (
                  <div key={index} className="product-item">
                    <div className="product-header">
                      <span className="product-number">Product {index + 1}</span>
                      {formData.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(index)}
                          className="remove-product-btn"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Product Name *</label>
                        <input
                          type="text"
                          value={product.product_name}
                          onChange={(e) => handleProductChange(index, 'product_name', e.target.value)}
                          placeholder="Enter name or search"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>HSN</label>
                        <input
                          type="text"
                          value={product.hsn_code}
                          onChange={(e) => handleProductChange(index, 'hsn_code', e.target.value)}
                          placeholder="HSN"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Quantity *</label>
                        <div className="quantity-input">
                          <button type="button" onClick={() => handleProductChange(index, 'quantity', Math.max(1, product.quantity - 1))}>-</button>
                          <input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                          <button type="button" onClick={() => handleProductChange(index, 'quantity', product.quantity + 1)}>+</button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Unit Price *</label>
                        <div className="price-input">
                          <span className="currency-symbol">₹</span>
                          <input
                            type="number"
                            value={product.unit_price}
                            onChange={(e) => handleProductChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="Unit Price"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="expandable-section">
                      <button type="button" className="expand-btn">
                        + Add Category, SKU, Discount and Tax (optional) ⬆️
                      </button>
                      
                      <div className="expanded-fields">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Product Category</label>
                            <input
                              type="text"
                              value={product.category}
                              onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                              placeholder="Product Category"
                            />
                          </div>
                          <div className="form-group">
                            <label>SKU</label>
                            <input
                              type="text"
                              value={product.sku}
                              onChange={(e) => handleProductChange(index, 'sku', e.target.value)}
                              placeholder="Enter sku"
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Discount</label>
                            <div className="price-input">
                              <span className="currency-symbol">₹</span>
                              <input
                                type="number"
                                value={product.discount}
                                onChange={(e) => handleProductChange(index, 'discount', parseFloat(e.target.value) || 0)}
                                placeholder="Discount"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Tax</label>
                            <div className="price-input">
                              <span className="currency-symbol">₹</span>
                              <input
                                type="number"
                                value={product.tax}
                                onChange={(e) => handleProductChange(index, 'tax', parseFloat(e.target.value) || 0)}
                                placeholder="Tax"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={handleAddProduct} className="add-product-btn">
                  ➕ Add Product
                </button>
              </div>
            )}

            {/* Step 4: Payment & Shipping */}
            {currentStep === 4 && (
              <div className="form-section">
                <div className="section-header">
                  <h3>💳 Payment & Shipping</h3>
                </div>
                
                <div className="payment-summary">
                  <div className="grand-total">
                    <span>Grand Total:</span>
                    <span>₹ {formData.payment_info.grand_total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Type *</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="payment_mode"
                          value="Prepaid"
                          checked={formData.payment_info.payment_mode === 'Prepaid'}
                          onChange={(e) => handleNestedInputChange('payment_info', 'payment_mode', e.target.value)}
                        />
                        Prepaid
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="payment_mode"
                          value="COD"
                          checked={formData.payment_info.payment_mode === 'COD'}
                          onChange={(e) => handleNestedInputChange('payment_info', 'payment_mode', e.target.value)}
                        />
                        COD
                      </label>
                    </div>
                  </div>
                </div>

                {formData.payment_info.payment_mode === 'COD' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>COD Amount *</label>
                      <div className="price-input">
                        <span className="currency-symbol">₹</span>
                        <input
                          type="number"
                          value={formData.payment_info.cod_amount}
                          onChange={(e) => handleNestedInputChange('payment_info', 'cod_amount', parseFloat(e.target.value) || 0)}
                          placeholder="COD Amount"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Shipping Charges
                      {calculatingShipping && <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>(Calculating...)</span>}
                    </label>
                    <div className="price-input">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="number"
                        value={formData.payment_info.shipping_charges || 0}
                        onChange={(e) => handleNestedInputChange('payment_info', 'shipping_charges', parseFloat(e.target.value) || 0)}
                        placeholder="Auto-calculated"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <small className="form-note">Auto-calculated based on your category: <strong>{userCategory}</strong></small>
                  </div>
                </div>

                <div className="warehouse-section">
                  <div className="section-header">
                    <h3>🏢 Warehouse/Pickup Address</h3>
                  </div>
                  
                  {!showManualAddress ? (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Search and select your warehouse *</label>
                          <input
                            type="text"
                            placeholder="Search warehouses by name, city, or state..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="warehouse-search-input"
                          />
                          <select
                            value={formData.pickup_address.warehouse_id}
                            onChange={(e) => handleWarehouseChange(e.target.value)}
                            required
                            className={warehouseError ? 'error' : ''}
                          >
                            <option value="">Select Warehouse</option>
                            {filteredWarehouses.map(warehouse => (
                              <option key={warehouse._id} value={warehouse._id}>
                                {warehouse.name} - {warehouse.address.city}, {warehouse.address.state}
                              </option>
                            ))}
                          </select>
                          {warehouseError && (
                            <div className="error-message">{warehouseError}</div>
                          )}
                          {filteredWarehouses.length === 0 && warehouses.length > 0 && (
                            <div className="no-results">No warehouses found matching your search</div>
                          )}
                          {warehouses.length === 0 && (
                            <div className="no-warehouses">No warehouses available. Please add a warehouse first.</div>
                          )}
                        </div>
                      </div>

                      <div className="or-separator">OR</div>
                      
                      <div className="form-row">
                        <button type="button" className="add-address-btn" onClick={handleAddAddress}>
                          ➕ Add Manual Address
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="manual-address-section">
                        <div className="section-header">
                          <h4>📝 Manual Address Entry</h4>
                          <button 
                            type="button" 
                            className="back-to-warehouse-btn"
                            onClick={() => setShowManualAddress(false)}
                          >
                            ← Back to Warehouse Selection
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Warehouse Name *</label>
                            <input
                              type="text"
                              value={formData.pickup_address.name}
                              onChange={(e) => handleNestedInputChange('pickup_address', 'name', e.target.value)}
                              placeholder="Enter warehouse name"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label>Contact Phone *</label>
                            <input
                              type="tel"
                              value={formData.pickup_address.phone}
                              onChange={(e) => {
                                // Only allow digits and limit to 10 characters
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                handleNestedInputChange('pickup_address', 'phone', value);
                              }}
                              placeholder="Enter 10-digit phone number"
                              maxLength={10}
                              required
                            />
                            <small className="form-note">Enter 10-digit phone number starting with 6-9</small>
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group full-width">
                            <label>Full Address *</label>
                            <textarea
                              value={formData.pickup_address.full_address}
                              onChange={(e) => handleNestedInputChange('pickup_address', 'full_address', e.target.value)}
                              placeholder="Enter complete address"
                              rows={3}
                              required
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Pincode *</label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                value={formData.pickup_address.pincode}
                                onChange={(e) => {
                                  // Only allow digits and limit to 6 characters
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  handlePickupPincodeChange(value);
                                }}
                                placeholder="Enter 6-digit pincode"
                                maxLength={6}
                                required
                                disabled={validatingPickupPincode}
                              />
                              {validatingPickupPincode && (
                                <span style={{ 
                                  position: 'absolute', 
                                  right: '10px', 
                                  top: '50%', 
                                  transform: 'translateY(-50%)',
                                  fontSize: '12px',
                                  color: '#F68723'
                                }}>
                                  Loading...
                                </span>
                              )}
                            </div>
                            <small className="form-note">Enter 6-digit pincode</small>
                          </div>
                          <div className="form-group">
                            <label>City *</label>
                            <input
                              type="text"
                              value={formData.pickup_address.city}
                              onChange={(e) => handleNestedInputChange('pickup_address', 'city', e.target.value)}
                              placeholder="Enter city"
                              required
                              readOnly={formData.pickup_address.pincode.length === 6}
                              style={{ backgroundColor: formData.pickup_address.pincode.length === 6 ? '#f5f5f5' : 'white' }}
                            />
                          </div>
                          <div className="form-group">
                            <label>State *</label>
                            <input
                              type="text"
                              value={formData.pickup_address.state}
                              onChange={(e) => handleNestedInputChange('pickup_address', 'state', e.target.value)}
                              placeholder="Enter state"
                              required
                              readOnly={formData.pickup_address.pincode.length === 6}
                              style={{ backgroundColor: formData.pickup_address.pincode.length === 6 ? '#f5f5f5' : 'white' }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Weight & Dimensions */}
            {currentStep === 5 && (
              <div className="form-section">
                <div className="section-header">
                  <h3>📏 Weight & Dimensions</h3>
                </div>
                
                <div className="tip-box">
                  <span className="tip-icon">💡</span>
                  <span>Tip: Add correct values to avoid weight discrepancy.</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Package Type *</label>
                    <select
                      value={formData.package_info.package_type}
                      onChange={(e) => handleNestedInputChange('package_info', 'package_type', e.target.value)}
                      required
                    >
                      <option value="Single Package (B2C)">Single Package (B2C)</option>
                      <option value="Multiple Package (B2C)">Multiple Package (B2C)</option>
                      <option value="Multiple Package (B2B)">Multiple Package (B2B)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Weight of Order *</label>
                    <div className="weight-input">
                      <input
                        type="number"
                        value={formData.package_info.weight}
                        onChange={(e) => handleNestedInputChange('package_info', 'weight', parseFloat(e.target.value) || 0)}
                        placeholder="Enter your weight"
                        min="0.1"
                        step="0.1"
                        required
                      />
                      <span className="unit">Kg</span>
                    </div>
                    <small className="form-note">Note: The minimum chargeable weight is 0.50 kg</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Length *</label>
                    <div className="dimension-input">
                      <input
                        type="number"
                        value={formData.package_info.dimensions.length}
                        onChange={(e) => handleNestedInputChange('package_info', 'dimensions', {
                          ...formData.package_info.dimensions,
                          length: parseFloat(e.target.value) || 0
                        })}
                        placeholder="Enter length"
                        min="1"
                        step="0.1"
                        required
                      />
                      <span className="unit">CM</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Width *</label>
                    <div className="dimension-input">
                      <input
                        type="number"
                        value={formData.package_info.dimensions.width}
                        onChange={(e) => handleNestedInputChange('package_info', 'dimensions', {
                          ...formData.package_info.dimensions,
                          width: parseFloat(e.target.value) || 0
                        })}
                        placeholder="Enter width"
                        min="1"
                        step="0.1"
                        required
                      />
                      <span className="unit">CM</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Height *</label>
                    <div className="dimension-input">
                      <input
                        type="number"
                        value={formData.package_info.dimensions.height}
                        onChange={(e) => handleNestedInputChange('package_info', 'dimensions', {
                          ...formData.package_info.dimensions,
                          height: parseFloat(e.target.value) || 0
                        })}
                        placeholder="Enter height"
                        min="1"
                        step="0.1"
                        required
                      />
                      <span className="unit">CM</span>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.package_info.save_dimensions}
                        onChange={(e) => handleNestedInputChange('package_info', 'save_dimensions', e.target.checked)}
                      />
                      Save package dimensions for future use?
                    </label>
                  </div>
                </div>

                <div className="autofill-section">
                  <div className="or-separator">OR</div>
                  <div className="form-group">
                    <label>Select package to autofill dimensions</label>
                    <select
                      value={selectedPackage?._id || ''}
                      onChange={(e) => handlePackageSelect(e.target.value)}
                    >
                      <option value="">Select</option>
                      {packages.map(pkg => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name} - {pkg.package_type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Other Details */}
            {currentStep === 6 && (
              <div className="form-section">
                <div className="section-header">
                  <h3>📋 Other Details</h3>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Reseller Name</label>
                    <input
                      type="text"
                      value={formData.seller_info.reseller_name}
                      onChange={(e) => handleNestedInputChange('seller_info', 'reseller_name', e.target.value)}
                      placeholder="Reseller Name"
                    />
                  </div>
                  <div className="form-group">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      value={formData.seller_info.gst_number}
                      onChange={(e) => handleNestedInputChange('seller_info', 'gst_number', e.target.value)}
                      placeholder="GSTIN"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="modal-footer">
              <div className="button-group">
                {currentStep > 1 && (
                  <button type="button" onClick={prevStep} className="btn btn-secondary">
                    ← Previous
                  </button>
                )}
                
                {currentStep < 6 ? (
                  <button type="button" onClick={nextStep} className="btn btn-primary">
                    Next →
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="button" 
                      onClick={handleSave} 
                      className="btn btn-secondary" 
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSaveAndAssign} 
                      className="btn btn-success" 
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      {loading ? 'Creating Order...' : 'Save & Assign Order'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderCreationModal;










