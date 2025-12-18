import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { userService } from '../services/userService';
import './ManageLabel.css';

interface LabelSettings {
  label_types: string[];
  use_order_channel_logo: boolean;
  component_visibility: {
    logo: boolean;
    customer_phone: boolean;
    dimensions: boolean;
    weight: boolean;
    payment_type: boolean;
    invoice_number: boolean;
    invoice_date: boolean;
    company_name: boolean;
    company_gstin: boolean;
    pickup_address: boolean;
    company_phone: boolean;
    sku: boolean;
    product_name: boolean;
    shipping_charges: boolean;
    amount_prepaid: boolean;
    amount_cod: boolean;
    message: boolean;
  };
  logo_url: string | null;
}

const ManageLabel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LabelSettings>({
    label_types: ['Standard'],
    use_order_channel_logo: false,
    component_visibility: {
      logo: true,
      customer_phone: false,
      dimensions: false,
      weight: false,
      payment_type: true,
      invoice_number: true,
      invoice_date: true,
      company_name: false,
      company_gstin: false,
      pickup_address: true,
      company_phone: false,
      sku: false,
      product_name: true,
      shipping_charges: false,
      amount_prepaid: true,
      amount_cod: true,
      message: true
    },
    logo_url: null
  });

  const [selectedLabelTypes, setSelectedLabelTypes] = useState<string[]>(['Standard']);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const availableLabelTypes = ['Standard', '2 In One', '4 In One', 'Thermal'];

  const fetchLabelSettings = async () => {
    try {
      setLoading(true);
      const data = await userService.getLabelSettings();
      setSettings(data as LabelSettings);
      setSelectedLabelTypes(data.label_types || ['Standard']);
    } catch (error: any) {
      console.error('Error fetching label settings:', error);
      alert('Failed to load label settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabelSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLabelTypeToggle = (type: string) => {
    setSelectedLabelTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleRemoveLabelType = (type: string) => {
    setSelectedLabelTypes(prev => prev.filter(t => t !== type));
  };

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, JPG, and SVG images are allowed');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      e.target.value = '';
      return;
    }

    setUploadingLogo(true);
    try {
      const result = await userService.uploadLabelLogo(file);
      setSettings(prev => ({ ...prev, logo_url: result.company_logo_url }));
      alert('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleToggleComponent = (component: keyof LabelSettings['component_visibility']) => {
    setSettings(prev => ({
      ...prev,
      component_visibility: {
        ...prev.component_visibility,
        [component]: !prev.component_visibility[component]
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await userService.updateLabelSettings({
        ...settings,
        label_types: selectedLabelTypes
      });
      alert('Label settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving label settings:', error);
      alert(error.message || 'Failed to save label settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    fetchLabelSettings();
  };

  if (loading) {
    return (
      <Layout>
        <div className="manage-label-container">
          <div className="loading">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="manage-label-container">
        <div className="manage-label-header">
          <h1>Manage Label</h1>
          <div className="header-actions">
            <button className="dismiss-btn" onClick={handleDismiss}>Dismiss</button>
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="manage-label-content">
          {/* Left Column - Settings */}
          <div className="settings-column">
            {/* Label Types Selection */}
            <div className="settings-section">
              <label className="section-label">Select Label Types *</label>
              <div className="label-types-tags">
                {selectedLabelTypes.map(type => (
                  <span key={type} className="label-type-tag">
                    {type}
                    <button
                      className="remove-tag-btn"
                      onClick={() => handleRemoveLabelType(type)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <select
                className="label-type-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleLabelTypeToggle(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Select</option>
                {availableLabelTypes
                  .filter(type => !selectedLabelTypes.includes(type))
                  .map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
              </select>
            </div>

            {/* Logo Upload */}
            <div className="settings-section">
              <label className="section-label">Upload Logo</label>
              <div className="logo-upload-area">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/svg+xml"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
                <button
                  className="logo-upload-btn"
                  onClick={handleLogoClick}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Uploading...' : 'Select image'}
                  <span className="upload-icon">☁️</span>
                </button>
                <p className="file-size-hint">Max file size: 2MB</p>
                {settings.logo_url && (
                  <div className="logo-preview">
                    <img src={settings.logo_url} alt="Logo preview" />
                  </div>
                )}
              </div>
            </div>

            {/* Use Order Channel Logo */}
            <div className="settings-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.use_order_channel_logo}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      use_order_channel_logo: e.target.checked
                    }))
                  }
                />
                Use order channel logo for label
              </label>
            </div>

            {/* Component Visibility Toggles */}
            <div className="settings-section">
              <label className="section-label">Show Hide components on the label</label>
              <div className="toggle-list">
                {Object.entries(settings.component_visibility).map(([key, value]) => (
                  <div key={key} className="toggle-item">
                    <label className="toggle-label">
                      <span className="toggle-text">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <div className={`toggle-switch ${value ? 'on' : 'off'}`}>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => handleToggleComponent(key as keyof LabelSettings['component_visibility'])}
                        />
                        <span className="toggle-slider"></span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="preview-column">
            <div className="preview-header">
              <h2>Preview</h2>
            </div>
            <div className="label-preview">
              <LabelPreview settings={settings} selectedLabelTypes={selectedLabelTypes} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Label Preview Component
interface LabelPreviewProps {
  settings: LabelSettings;
  selectedLabelTypes: string[];
}

const LabelPreview: React.FC<LabelPreviewProps> = ({ settings }) => {
  // Mock order data for preview
  const mockOrder = {
    waybill: '123456789012',
    customerName: 'Kunal Verma',
    deliveryAddress: 'House No. 45, Palm Enclave, Rajouri Garden',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110027',
    country: 'India',
    customerPhone: '1234567890',
    orderId: '20241127-8346',
    referenceId: 'REF-9283746521',
    invoiceNumber: '202411274572',
    invoiceDate: '12 May, 2024',
    paymentType: 'Prepaid',
    codAmount: 0,
    orderValue: 210,
    shippingCharges: 10,
    weight: '0.5Kg',
    dimensions: '10x10x10 CM',
    products: [
      { name: 'Product 1', sku: '1111', quantity: 1, amount: 100 },
      { name: 'Product 2', sku: '2222', quantity: 1, amount: 100 }
    ],
    totalAmount: 210,
    // Company/Seller info
    companyName: 'Techno Sphere',
    companyGstin: '27XYZ1234L1Z9',
    sellerName: 'Vishal Kumar',
    sellerAddress: 'Plot No. 21, Tech Park, Wakad, Pune',
    sellerCity: 'Pune',
    sellerState: 'Maharashtra',
    sellerPincode: '411057',
    sellerCountry: 'India',
    companyPhone: '1234567890',
    // Company branding
    brandName: 'JAISHREE FRANCHISE',
    tagline: 'Door 2 Door International & Domestic courier Service Available',
    brandMobile: '9351205202',
    // Courier
    courierName: 'Delhivery',
    message: 'Handle with care'
  };

  const visibility = settings.component_visibility;
  const showComponent = (component: keyof LabelSettings['component_visibility']) => visibility[component];

  return (
    <div className="preview-label-container">
      {/* Section 1: Header - Ship To (left) + Company Branding (right) */}
      <div className="label-section-header">
        {/* Left: Ship To */}
        <div className="ship-to-section">
          <div className="ship-to-label">Ship To:</div>
          <div className="ship-to-name">{mockOrder.customerName}</div>
          <div className="ship-to-address">{mockOrder.deliveryAddress}</div>
          <div className="ship-to-city">{mockOrder.city}, {mockOrder.pincode}, {mockOrder.country}</div>
          {showComponent('customer_phone') && (
            <div className="ship-to-phone"><strong>Mobile Number:</strong> {mockOrder.customerPhone}</div>
          )}
        </div>

        {/* Right: Company Branding */}
        <div className="company-branding-section">
          {showComponent('logo') && settings.logo_url && (
            <img src={settings.logo_url} className="company-logo-preview" alt="Company Logo" />
          )}
          <div className="company-brand-name">{mockOrder.brandName}</div>
          <div className="company-tagline">{mockOrder.tagline}</div>
          <div className="company-mob">Mob. : {mockOrder.brandMobile}</div>
        </div>
      </div>

      {/* Section 2: Courier & Payment Info Row */}
      <div className="label-section-courier">
        {/* Left: Courier/AWB */}
        <div className="courier-section">
          <div className="courier-name">Courier: <span>{mockOrder.courierName}</span></div>
          <div className="awb-barcode"></div>
          <div className="awb-number">AWB: <span>{mockOrder.waybill}</span></div>
        </div>

        {/* Right: Payment & Invoice Info */}
        <div className="payment-info-section">
          {showComponent('dimensions') && (
            <div className="payment-info-row">
              <span className="payment-info-label">Dimensions:</span>
              <span className="payment-info-value">{mockOrder.dimensions}</span>
            </div>
          )}
          {showComponent('weight') && (
            <div className="payment-info-row">
              <span className="payment-info-label">Weight:</span>
              <span className="payment-info-value">{mockOrder.weight}</span>
            </div>
          )}
          {showComponent('payment_type') && (
            <div className="payment-info-row">
              <span className="payment-info-label">Payment:</span>
              <span className="payment-info-value">{mockOrder.paymentType}</span>
            </div>
          )}
          {showComponent('invoice_number') && (
            <div className="payment-info-row">
              <span className="payment-info-label">Invoice No:</span>
              <span className="payment-info-value">{mockOrder.invoiceNumber}</span>
            </div>
          )}
          {showComponent('invoice_date') && (
            <div className="payment-info-row">
              <span className="payment-info-label">Invoice Date:</span>
              <span className="payment-info-value">{mockOrder.invoiceDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Shipped By & Order Info Row */}
      <div className="label-section-shipped">
        {/* Left: Shipped By */}
        <div className="shipped-by-section">
          <div className="shipped-by-label">Shipped By: <span>(if undelivered, return to)</span></div>
          {showComponent('company_name') && (
            <div className="shipped-by-company">{mockOrder.companyName}</div>
          )}
          {showComponent('company_gstin') && (
            <div className="shipped-by-gstin"><span>GSTIN:</span> {mockOrder.companyGstin}</div>
          )}
          <div className="shipped-by-name">{mockOrder.sellerName}</div>
          {showComponent('pickup_address') && (
            <>
              <div className="shipped-by-address">{mockOrder.sellerAddress}</div>
              <div className="shipped-by-city">{mockOrder.sellerState}, {mockOrder.sellerPincode}, {mockOrder.sellerCountry}</div>
            </>
          )}
          {showComponent('company_phone') && (
            <div className="shipped-by-phone"><strong>Mobile Number:</strong><br/>{mockOrder.companyPhone}</div>
          )}
        </div>

        {/* Right: Order ID & Barcode */}
        <div className="order-info-section">
          <div className="order-id-row">
            <span className="order-id-label">Order ID:</span> {mockOrder.orderId}
          </div>
          <div className="order-barcode"></div>
          <div className="reference-id"><span>Reference ID:</span> {mockOrder.referenceId}</div>
          <div className={`payment-badge ${mockOrder.paymentType.toLowerCase()}`}>
            {mockOrder.paymentType.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Section 4: Product Table */}
      <div className="label-section-products">
        <table className="products-table">
          <thead>
            <tr>
              {showComponent('sku') && <th>SKU</th>}
              <th>{showComponent('product_name') ? 'Item' : 'Item'}</th>
              <th className="qty-col">Qty</th>
              <th className="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {mockOrder.products.map((product, index) => (
              <tr key={index}>
                {showComponent('sku') && <td>{product.sku}</td>}
                <td>{showComponent('product_name') ? product.name : `Item ${index + 1}`}</td>
                <td className="qty-col">{product.quantity}</td>
                {(showComponent('amount_prepaid') || showComponent('amount_cod')) && (
                  <td className="amount-col">{product.amount}</td>
                )}
                {!showComponent('amount_prepaid') && !showComponent('amount_cod') && (
                  <td className="amount-col">-</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {showComponent('shipping_charges') && (
          <div className="shipping-charge-row">Shipping Charge: ₹{mockOrder.shippingCharges}</div>
        )}
        {(showComponent('amount_prepaid') || showComponent('amount_cod')) && (
          <div className="total-row">Total: ₹{mockOrder.totalAmount}</div>
        )}
      </div>

      {/* Section 5: Footer */}
      <div className="label-section-footer">
        <div className="footer-disclaimer">
          <p>1. Visit official website of Courier Company to view the Conditions of Carriage.</p>
          <p>2. All disputes will be resolved under Haryana jurisdiction. Sold goods are eligible for return or exchange according to the store's policy.</p>
        </div>
        <div className="footer-branding">
          <div className="footer-branding-label">Powered by:</div>
          <img src="/shipsarthi-logo.png" className="footer-branding-logo" alt="Shipsarthi" />
        </div>
      </div>

      {/* Message section - shown only if enabled and message exists */}
      {showComponent('message') && mockOrder.message && (
        <div style={{
          padding: '4px 8px',
          fontSize: '7px',
          borderTop: '1px solid #000',
          background: '#fff9e6'
        }}>
          <strong>Special Instructions:</strong> {mockOrder.message}
        </div>
      )}
    </div>
  );
};

export default ManageLabel;

