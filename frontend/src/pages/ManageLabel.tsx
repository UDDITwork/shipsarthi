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

const LabelPreview: React.FC<LabelPreviewProps> = ({ settings, selectedLabelTypes }) => {
  // Mock order data for preview
  const mockOrder = {
    waybill: '123456789012',
    customerName: 'Kunal Verma',
    deliveryAddress: 'House No. 45, Palm Enclave, Rajouri Garden',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110027',
    customerPhone: '9876543210',
    orderId: '20241127-8346',
    invoiceNumber: '202411274572',
    invoiceDate: '12 May, 2024',
    paymentType: 'Prepaid',
    codAmount: 0,
    orderValue: 210,
    shippingCharges: 50,
    weight: '0.5',
    dimensions: '10 x 15 x 5 cm',
    productName: 'Product 1',
    sku: 'SKU-001',
    quantity: 1,
    sellerName: 'Vishal Kumar',
    sellerAddress: 'Plot No. 21, Tech Park, Wakad, Pune',
    sellerCity: 'Pune',
    sellerState: 'Maharashtra',
    sellerPincode: '411057',
    sellerPhone: '9351205202',
    sellerGst: 'GST123456789',
    message: 'Handle with care'
  };

  const visibility = settings.component_visibility;
  const showComponent = (component: keyof LabelSettings['component_visibility']) => visibility[component];

  // Determine label dimensions based on selected type
  const primaryType = selectedLabelTypes[0] || 'Standard';
  const getLabelDimensions = () => {
    switch (primaryType) {
      case '2 In One':
        return { width: '4in', height: '3in' };
      case '4 In One':
        return { width: '2in', height: '3in' };
      case 'Thermal':
        return { width: '4in', height: '6in' };
      default: // Standard
        return { width: '4in', height: '6in' };
    }
  };

  const dimensions = getLabelDimensions();

  return (
    <div
      className="preview-label-container"
      style={{
        width: dimensions.width,
        minHeight: dimensions.height
      }}
    >
      <div className="preview-label-header">
        <div className="preview-logos">
          {showComponent('logo') && settings.logo_url && (
            <img src={settings.logo_url} className="preview-company-logo" alt="Company Logo" />
          )}
          <div className="preview-carrier-logo">DELHIVERY</div>
        </div>
        <div className="preview-label-title">SHIPPING LABEL</div>
      </div>

      <div className="preview-awb-section">
        <div className="preview-awb-label">AWB NUMBER</div>
        <div className="preview-awb-number">{mockOrder.waybill}</div>
      </div>

      <div className="preview-barcode-section">
        <div className="preview-barcode">[BARCODE IMAGE]</div>
      </div>

      <div className="preview-info-section">
        <div className="preview-info-title">SELLER / CONTACT</div>
        {showComponent('company_name') && (
          <div className="preview-info-row"><strong>{mockOrder.sellerName}</strong></div>
        )}
        {showComponent('pickup_address') && (
          <div className="preview-info-row">{mockOrder.sellerAddress}</div>
        )}
        {showComponent('company_gstin') && mockOrder.sellerGst && (
          <div className="preview-info-row">GST: {mockOrder.sellerGst}</div>
        )}
        {showComponent('company_phone') && mockOrder.sellerPhone && (
          <div className="preview-info-row">Phone: {mockOrder.sellerPhone}</div>
        )}
      </div>

      <div className="preview-info-section">
        <div className="preview-info-title">TO (DESTINATION)</div>
        <div className="preview-info-row preview-destination">{mockOrder.customerName}</div>
        <div className="preview-info-row">{mockOrder.deliveryAddress}</div>
        <div className="preview-info-row">
          <strong>{mockOrder.city}, {mockOrder.state} - {mockOrder.pincode}</strong>
        </div>
        {showComponent('customer_phone') && (
          <div className="preview-info-row">Phone: {mockOrder.customerPhone}</div>
        )}
      </div>

      <div className="preview-info-section">
        <div className="preview-info-title">PACKAGE DETAILS</div>
        <div className="preview-info-row"><strong>Order ID:</strong> {mockOrder.orderId}</div>
        {showComponent('invoice_number') && (
          <div className="preview-info-row"><strong>Invoice:</strong> {mockOrder.invoiceNumber}</div>
        )}
        {showComponent('invoice_date') && (
          <div className="preview-info-row"><strong>Invoice Date:</strong> {mockOrder.invoiceDate}</div>
        )}
        {showComponent('product_name') && (
          <div className="preview-info-row"><strong>Product:</strong> {mockOrder.productName}</div>
        )}
        {showComponent('weight') && (
          <div className="preview-info-row"><strong>Weight:</strong> {mockOrder.weight} kg | <strong>Qty:</strong> {mockOrder.quantity}</div>
        )}
        {showComponent('dimensions') && (
          <div className="preview-info-row"><strong>Dimensions:</strong> {mockOrder.dimensions}</div>
        )}
        {showComponent('payment_type') && (
          <div className="preview-info-row"><strong>Payment:</strong> {mockOrder.paymentType}</div>
        )}
        {showComponent('amount_prepaid') && mockOrder.paymentType === 'Prepaid' && (
          <div className="preview-info-row"><strong>Order Value:</strong> ₹{mockOrder.orderValue}</div>
        )}
        {showComponent('amount_cod') && mockOrder.codAmount > 0 && (
          <div className="preview-info-row"><strong>COD Amount:</strong> ₹{mockOrder.codAmount}</div>
        )}
        {showComponent('shipping_charges') && (
          <div className="preview-info-row"><strong>Shipping Charges:</strong> ₹{mockOrder.shippingCharges}</div>
        )}
      </div>

      {/* Product Summary with optional SKU column */}
      <div className="preview-info-section">
        <div className="preview-info-title">PRODUCT SUMMARY</div>
        <table className="preview-products-table">
          <thead>
            <tr>
              <th style={{ width: showComponent('sku') ? '50%' : '70%' }}>Product</th>
              {showComponent('sku') && <th style={{ width: '20%' }}>SKU</th>}
              <th style={{ width: '15%' }}>Qty</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{mockOrder.productName}</td>
              {showComponent('sku') && <td>{mockOrder.sku}</td>}
              <td>{mockOrder.quantity}</td>
              <td style={{ textAlign: 'right' }}>₹{mockOrder.orderValue}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {showComponent('message') && mockOrder.message && (
        <div className="preview-info-section">
          <div className="preview-info-title">SPECIAL INSTRUCTIONS</div>
          <div className="preview-info-row">{mockOrder.message}</div>
        </div>
      )}
    </div>
  );
};

export default ManageLabel;

