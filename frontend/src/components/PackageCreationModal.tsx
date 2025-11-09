import React, { useState } from 'react';
import { environmentConfig } from '../config/environment';
import './PackageCreationModal.css';

interface PackageCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPackageCreated: (packageData: any) => void;
  editingPackage?: any;
}

const PackageCreationModal: React.FC<PackageCreationModalProps> = ({
  isOpen,
  onClose,
  onPackageCreated,
  editingPackage
}) => {
  const [formData, setFormData] = useState({
    name: editingPackage?.name || '',
    description: editingPackage?.description || '',
    package_type: editingPackage?.package_type || 'Single Package (B2C)',
    category: editingPackage?.category || '',
    sku: editingPackage?.sku || '',
    product_name: editingPackage?.product_name || '',
    hsn_code: editingPackage?.hsn_code || '',
    dimensions: {
      length: editingPackage?.dimensions?.length?.toString() || '',
      width: editingPackage?.dimensions?.width?.toString() || '',
      height: editingPackage?.dimensions?.height?.toString() || ''
    },
    weight: editingPackage?.weight?.toString() || '',
    volumetric_weight: editingPackage?.volumetric_weight?.toString() || '',
    number_of_boxes: editingPackage?.number_of_boxes?.toString() || '',
    weight_per_box: editingPackage?.weight_per_box?.toString() || '',
    unit_price: editingPackage?.unit_price?.toString() || '',
    discount: editingPackage?.discount?.toString() || '',
    tax: editingPackage?.tax?.toString() || '',
    tags: editingPackage?.tags?.join(', ') || '',
    notes: editingPackage?.notes || ''
  });

  const [loading, setLoading] = useState(false);

  const testPackageCreation = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found');
      return;
    }

    // First check if backend is running
    try {
      const healthResponse = await fetch(`${environmentConfig.apiUrl}/health`);
      if (!healthResponse.ok) {
        alert('Backend server is not running. Please start the backend server on port 5000.');
        return;
      }
      console.log('Backend health check passed');
    } catch (error) {
      alert('Backend server is not running. Please start the backend server on port 5000.');
      return;
    }

    const testData = {
      name: "Test Package",
      package_type: "Single Package (B2C)",
      product_name: "Test Product",
      dimensions: {
        length: 10,
        width: 10,
        height: 10
      },
      weight: 1.0
    };

    console.log('Testing package creation with:', testData);

    try {
      const response = await fetch(`${environmentConfig.apiUrl}/packages/test-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      });

      const responseText = await response.text();
      console.log('Test response:', responseText);
      
      if (response.ok) {
        try {
          JSON.parse(responseText);
          alert('Test package created successfully!');
        } catch (error) {
          alert('Test succeeded but got invalid JSON response');
        }
      } else {
        try {
          const result = JSON.parse(responseText);
          alert('Test failed: ' + result.message);
        } catch (error) {
          alert('Test failed with response: ' + responseText);
        }
      }
    } catch (error) {
      console.error('Test error:', error);
      alert('Test error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        alert('Package name is required');
        return;
      }
      if (!formData.product_name.trim()) {
        alert('Product name is required');
        return;
      }
      if (!formData.dimensions.length || !formData.dimensions.width || !formData.dimensions.height) {
        alert('All dimensions are required');
        return;
      }
      if (!formData.weight) {
        alert('Weight is required');
        return;
      }

      // Parse numeric values
      const length = parseFloat(formData.dimensions.length);
      const width = parseFloat(formData.dimensions.width);
      const height = parseFloat(formData.dimensions.height);
      const weight = parseFloat(formData.weight);

      // Validate numeric values
      if (isNaN(length) || length <= 0) {
        alert('Length must be a valid positive number');
        return;
      }
      if (isNaN(width) || width <= 0) {
        alert('Width must be a valid positive number');
        return;
      }
      if (isNaN(height) || height <= 0) {
        alert('Height must be a valid positive number');
        return;
      }
      if (isNaN(weight) || weight <= 0) {
        alert('Weight must be a valid positive number');
        return;
      }

      // Prepare package data
      const packageData: any = {
        name: formData.name.trim(),
        package_type: formData.package_type,
        product_name: formData.product_name.trim(),
        dimensions: {
          length: length,
          width: width,
          height: height
        },
        weight: weight
      };

      // Add optional fields only if they have values
      if (formData.description.trim()) {
        packageData.description = formData.description.trim();
      }
      if (formData.category.trim()) {
        packageData.category = formData.category.trim();
      }
      if (formData.sku.trim()) {
        packageData.sku = formData.sku.trim();
      }
      if (formData.hsn_code.trim()) {
        packageData.hsn_code = formData.hsn_code.trim();
      }
      if (formData.volumetric_weight && formData.volumetric_weight.trim() !== '') {
        const volWeight = parseFloat(formData.volumetric_weight);
        if (!isNaN(volWeight) && volWeight > 0) {
          packageData.volumetric_weight = volWeight;
        }
      }
      if (formData.number_of_boxes && formData.number_of_boxes.trim() !== '') {
        const numBoxes = parseInt(formData.number_of_boxes);
        if (!isNaN(numBoxes) && numBoxes > 0) {
          packageData.number_of_boxes = numBoxes;
        }
      }
      if (formData.weight_per_box && formData.weight_per_box.trim() !== '') {
        const weightPerBox = parseFloat(formData.weight_per_box);
        if (!isNaN(weightPerBox) && weightPerBox > 0) {
          packageData.weight_per_box = weightPerBox;
        }
      }
      if (formData.unit_price && formData.unit_price.trim() !== '') {
        const unitPrice = parseFloat(formData.unit_price);
        if (!isNaN(unitPrice) && unitPrice >= 0) {
          packageData.unit_price = unitPrice;
        }
      }
      if (formData.discount && formData.discount.trim() !== '') {
        const discount = parseFloat(formData.discount);
        if (!isNaN(discount) && discount >= 0) {
          packageData.discount = discount;
        }
      }
      if (formData.tax && formData.tax.trim() !== '') {
        const tax = parseFloat(formData.tax);
        if (!isNaN(tax) && tax >= 0) {
          packageData.tax = tax;
        }
      }
      if (formData.notes.trim()) {
        packageData.notes = formData.notes.trim();
      }
      
      // Process tags
      if (formData.tags.trim()) {
        packageData.tags = formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag);
      }

      const url = editingPackage ? `${environmentConfig.apiUrl}/packages/${editingPackage._id}` : `${environmentConfig.apiUrl}/packages`;
      const method = editingPackage ? 'PUT' : 'POST';

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      console.log('Sending package data:', packageData);
      console.log('Token present:', !!token);
      console.log('URL:', url);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packageData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        try {
          const responseText = await response.text();
          const data = JSON.parse(responseText);
          onPackageCreated(data.data);
          onClose();
        } catch (parseError) {
          console.error('Failed to parse success response:', parseError);
          alert('Package created but got invalid response format');
        }
        // Reset form
        setFormData({
          name: '',
          description: '',
          package_type: 'Single Package (B2C)',
          category: '',
          sku: '',
          product_name: '',
          hsn_code: '',
          dimensions: { length: '', width: '', height: '' },
          weight: '',
          volumetric_weight: '',
          number_of_boxes: '',
          weight_per_box: '',
          unit_price: '',
          discount: '',
          tax: '',
          tags: '',
          notes: ''
        });
      } else {
        let errorMessage = 'Failed to save package';
        
        // Get response text first
        const responseText = await response.text();
        console.error('Raw response:', responseText);
        
        try {
          // Try to parse as JSON
          const error = JSON.parse(responseText);
          console.error('Package creation error:', error);
          
          if (error.errors && Array.isArray(error.errors)) {
            errorMessage = error.errors.map((err: any) => err.msg).join(', ');
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          
          if (responseText.includes('<!DOCTYPE')) {
            errorMessage = 'Backend server is not running or returned HTML instead of JSON. Please check if the backend server is running on port 5000.';
          } else {
            errorMessage = `Server error (${response.status}): ${responseText}`;
          }
        }
        
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('dimensions.')) {
      const dimensionField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimensionField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="package-modal">
        <div className="modal-header">
          <h2>{editingPackage ? 'Edit Package' : 'Create New Package'}</h2>
          <div className="header-actions">
            <button type="button" className="test-btn" onClick={testPackageCreation}>
              Test
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="package-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Package Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Standard Electronics Box"
                />
              </div>

              <div className="form-group">
                <label htmlFor="package_type">Package Type *</label>
                <select
                  id="package_type"
                  name="package_type"
                  value={formData.package_type}
                  onChange={handleInputChange}
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
                <label htmlFor="product_name">Product Name *</label>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Smartphone"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Books">Books</option>
                  <option value="Home">Home</option>
                  <option value="Sports">Sports</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sku">SKU</label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g., SKU-001"
                />
              </div>

              <div className="form-group">
                <label htmlFor="hsn_code">HSN Code</label>
                <input
                  type="text"
                  id="hsn_code"
                  name="hsn_code"
                  value={formData.hsn_code}
                  onChange={handleInputChange}
                  placeholder="e.g., 8517"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Package description..."
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Dimensions & Weight</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dimensions.length">Length (cm) *</label>
                <input
                  type="number"
                  id="dimensions.length"
                  name="dimensions.length"
                  value={formData.dimensions.length}
                  onChange={handleInputChange}
                  required
                  min="1"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dimensions.width">Width (cm) *</label>
                <input
                  type="number"
                  id="dimensions.width"
                  name="dimensions.width"
                  value={formData.dimensions.width}
                  onChange={handleInputChange}
                  required
                  min="1"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dimensions.height">Height (cm) *</label>
                <input
                  type="number"
                  id="dimensions.height"
                  name="dimensions.height"
                  value={formData.dimensions.height}
                  onChange={handleInputChange}
                  required
                  min="1"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="weight">Weight (kg) *</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  required
                  min="0.1"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="volumetric_weight">Volumetric Weight (kg)</label>
                <input
                  type="number"
                  id="volumetric_weight"
                  name="volumetric_weight"
                  value={formData.volumetric_weight}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>
            </div>

            {(formData.package_type.includes('Multiple')) && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="number_of_boxes">Number of Boxes</label>
                  <input
                    type="number"
                    id="number_of_boxes"
                    name="number_of_boxes"
                    value={formData.number_of_boxes}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="weight_per_box">Weight per Box (kg)</label>
                  <input
                    type="number"
                    id="weight_per_box"
                    name="weight_per_box"
                    value={formData.weight_per_box}
                    onChange={handleInputChange}
                    min="0.1"
                    step="0.1"
                    placeholder="0.0"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Pricing (Optional)</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="unit_price">Unit Price (₹)</label>
                <input
                  type="number"
                  id="unit_price"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="discount">Discount (%)</label>
                <input
                  type="number"
                  id="discount"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tax">Tax (%)</label>
                <input
                  type="number"
                  id="tax"
                  name="tax"
                  value={formData.tax}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Additional Information</h3>
            
            <div className="form-group">
              <label htmlFor="tags">Tags (comma separated)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., fragile, electronics, premium"
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (editingPackage ? 'Update Package' : 'Create Package')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageCreationModal;
