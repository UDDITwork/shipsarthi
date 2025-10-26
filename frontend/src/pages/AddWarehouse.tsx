import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { warehouseService } from '../services/warehouseService';
import './AddWarehouse.css';

interface CreateWarehouseData {
  name: string;
  title: string;
  contact_person: {
    name: string;
    phone: string;
    alternative_phone?: string;
    email?: string;
  };
  address: {
    full_address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  return_address?: {
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstin?: string;
  support_contact?: {
    email?: string;
    phone?: string;
  };
  is_default: boolean;
  is_active: boolean;
  notes?: string;
}

interface WarehouseFormData {
  name: string;
  title: string;
  contact_person: {
    name: string;
    phone: string;
    alternative_phone: string;
    email: string;
  };
  address: {
    full_address: string;
    landmark: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  return_address: {
    full_address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstin: string;
  support_contact: {
    email: string;
    phone: string;
  };
  is_default: boolean;
  is_active: boolean;
  notes: string;
}

const AddWarehouse: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<WarehouseFormData>({
    name: '',
    title: '',
    contact_person: {
      name: '',
      phone: '',
      alternative_phone: '',
      email: ''
    },
    address: {
      full_address: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    return_address: {
      full_address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    gstin: '',
    support_contact: {
      email: '',
      phone: ''
    },
    is_default: false,
    is_active: true,
    notes: ''
  });

  const [errors, setErrors] = useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    // Required fields validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.contact_person.name.trim()) {
      newErrors['contact_person.name'] = 'Contact person name is required';
    }
    if (!formData.contact_person.phone.match(/^[6-9]\d{9}$/)) {
      newErrors['contact_person.phone'] = 'Valid 10-digit phone number is required';
    }
    if (formData.contact_person.alternative_phone && !formData.contact_person.alternative_phone.match(/^[6-9]\d{9}$/)) {
      newErrors['contact_person.alternative_phone'] = 'Valid 10-digit phone number is required';
    }
    if (formData.contact_person.email && !formData.contact_person.email.match(/^\S+@\S+\.\S+$/)) {
      newErrors['contact_person.email'] = 'Valid email is required';
    }
    if (!formData.address.full_address.trim()) {
      newErrors['address.full_address'] = 'Address is required';
    }
    if (!formData.address.pincode.match(/^\d{6}$/)) {
      newErrors['address.pincode'] = 'Valid 6-digit pincode is required';
    }
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'City is required';
    }
    if (!formData.address.state.trim()) {
      newErrors['address.state'] = 'State is required';
    }
    if (formData.gstin && !formData.gstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
      newErrors.gstin = 'Valid GST number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Convert form data to API format
      const apiData: CreateWarehouseData = {
        name: formData.name,
        title: formData.title,
        contact_person: {
          name: formData.contact_person.name,
          phone: formData.contact_person.phone,
          alternative_phone: formData.contact_person.alternative_phone || undefined,
          email: formData.contact_person.email || undefined,
        },
        address: {
          full_address: formData.address.full_address,
          landmark: formData.address.landmark || undefined,
          city: formData.address.city,
          state: formData.address.state,
          pincode: formData.address.pincode,
          country: formData.address.country,
        },
        return_address: formData.return_address.full_address ? {
          full_address: formData.return_address.full_address,
          city: formData.return_address.city,
          state: formData.return_address.state,
          pincode: formData.return_address.pincode,
          country: formData.return_address.country,
        } : undefined,
        gstin: formData.gstin || undefined,
        support_contact: (formData.support_contact.email || formData.support_contact.phone) ? {
          email: formData.support_contact.email || undefined,
          phone: formData.support_contact.phone || undefined,
        } : undefined,
        is_default: formData.is_default,
        is_active: formData.is_active,
        notes: formData.notes || undefined,
      };

      // API call to create warehouse
      const response = await warehouseService.createWarehouse(apiData);
      
      alert(`Warehouse "${response.title}" created successfully!`);
      navigate('/warehouse');
      
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      alert(`Failed to create warehouse: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    navigate('/warehouse');
  };

  return (
    <Layout>
      <div className="add-warehouse-container">
        {/* Header */}
        <div className="warehouse-header">
          <div className="header-left">
            <button className="back-btn" onClick={handleDismiss}>
              ← Add warehouse
            </button>
          </div>
          <div className="header-right">
            <button className="dismiss-btn" onClick={handleDismiss}>
              Dismiss
            </button>
            <button 
              className="save-btn" 
              onClick={handleSubmit}
              disabled={loading}
            >
              💾 Save
            </button>
          </div>
        </div>

        {/* Form */}
        <form className="warehouse-form" onSubmit={handleSubmit}>
          {/* Row 1: Title, Name, Phone, Alternative Phone, Email */}
          <div className="form-row">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                placeholder="Enter nickname"
                value={formData.title}
                onChange={handleChange}
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="error-msg">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label>Warehouse Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter warehouse name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Contact Person Name</label>
              <input
                type="text"
                name="contact_person.name"
                placeholder="Enter contact person name"
                value={formData.contact_person.name}
                onChange={handleChange}
                className={errors['contact_person.name'] ? 'error' : ''}
              />
              {errors['contact_person.name'] && <span className="error-msg">{errors['contact_person.name']}</span>}
            </div>

            <div className="form-group">
              <label>Phone</label>
              <div className="phone-input">
                <span className="country-code">+91</span>
                <input
                  type="tel"
                  name="contact_person.phone"
                  placeholder="phone"
                  value={formData.contact_person.phone}
                  onChange={handleChange}
                  maxLength={10}
                  className={errors['contact_person.phone'] ? 'error' : ''}
                />
              </div>
              {errors['contact_person.phone'] && <span className="error-msg">{errors['contact_person.phone']}</span>}
            </div>

            <div className="form-group">
              <label>Alternative phone</label>
              <div className="phone-input">
                <span className="country-code">+91</span>
                <input
                  type="tel"
                  name="contact_person.alternative_phone"
                  placeholder="phone"
                  value={formData.contact_person.alternative_phone}
                  onChange={handleChange}
                  maxLength={10}
                  className={errors['contact_person.alternative_phone'] ? 'error' : ''}
                />
              </div>
              {errors['contact_person.alternative_phone'] && <span className="error-msg">{errors['contact_person.alternative_phone']}</span>}
            </div>

            <div className="form-group">
              <label>Email Id</label>
              <input
                type="email"
                name="contact_person.email"
                placeholder="Enter email id"
                value={formData.contact_person.email}
                onChange={handleChange}
                className={errors['contact_person.email'] ? 'error' : ''}
              />
              {errors['contact_person.email'] && <span className="error-msg">{errors['contact_person.email']}</span>}
            </div>
          </div>

          {/* Row 2: Address, Landmark */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Address</label>
              <input
                type="text"
                name="address.full_address"
                placeholder="Enter buyer's full address"
                value={formData.address.full_address}
                onChange={handleChange}
                className={errors['address.full_address'] ? 'error' : ''}
              />
              {errors['address.full_address'] && <span className="error-msg">{errors['address.full_address']}</span>}
            </div>

            <div className="form-group full-width">
              <label>Landmark (Optional)</label>
              <input
                type="text"
                name="address.landmark"
                placeholder="Enter any near by landmark"
                value={formData.address.landmark}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 3: Pincode, City, State */}
          <div className="form-row">
            <div className="form-group">
              <label>Pincode</label>
              <input
                type="text"
                name="address.pincode"
                placeholder="Enter 6 digit pincode"
                value={formData.address.pincode}
                onChange={handleChange}
                maxLength={6}
                className={errors['address.pincode'] ? 'error' : ''}
              />
              {errors['address.pincode'] && <span className="error-msg">{errors['address.pincode']}</span>}
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="address.city"
                placeholder="City name"
                value={formData.address.city}
                onChange={handleChange}
                className={errors['address.city'] ? 'error' : ''}
              />
              {errors['address.city'] && <span className="error-msg">{errors['address.city']}</span>}
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="address.state"
                placeholder="State name"
                value={formData.address.state}
                onChange={handleChange}
                className={errors['address.state'] ? 'error' : ''}
              />
              {errors['address.state'] && <span className="error-msg">{errors['address.state']}</span>}
            </div>

            <div className="form-group status-group">
              <label>Mark As</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleChange}
                />
                Default
              </label>
            </div>
          </div>

          {/* Row 4: GSTIN, Support Email, Support Phone, Status */}
          <div className="form-row">
            <div className="form-group">
              <label>GSTIN</label>
              <input
                type="text"
                name="gstin"
                placeholder="Enter gst number"
                value={formData.gstin}
                onChange={handleChange}
                className={errors.gstin ? 'error' : ''}
              />
              {errors.gstin && <span className="error-msg">{errors.gstin}</span>}
            </div>

            <div className="form-group">
              <label>Support Email (If any, Used on Label)</label>
              <input
                type="email"
                name="support_contact.email"
                placeholder="Enter support email"
                value={formData.support_contact?.email || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Support Phone (If any, Used on Label)</label>
              <input
                type="text"
                name="support_contact.phone"
                placeholder="Enter support phone"
                value={formData.support_contact?.phone || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group status-group">
              <label>Warehouse Status</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === true}
                    onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                  />
                  Active
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === false}
                    onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                  />
                  In-Active
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddWarehouse;