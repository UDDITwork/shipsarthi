import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { shippingService } from '../services/shippingService';
import { apiService } from '../services/api';
import './Tools.css';

interface ShippingCalculationRequest {
  weight: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  zone: string;
  cod_amount?: number;
}

interface ShippingCalculationResult {
  user_category: string;
  weight: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  zone: string;
  cod_amount: number;
  calculation_result: {
    forwardCharges: number;
    rtoCharges: number;
    codCharges: number;
    totalCharges: number;
    volumetricWeight: number;
    chargeableWeight: number;
  };
  rate_card_info: {
    userCategory: string;
    carrier: string;
    applied_rates: any;
  };
}

interface ShippingCalculationResponse {
  forwardCharges: number;
  rtoCharges: number;
  codCharges: number;
  totalCharges: number;
  volumetricWeight: number;
  chargeableWeight: number;
}

const Tools: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'domestic' | 'international'>('domestic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShippingCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    shipmentType: 'forward',
    pickupPincode: '',
    deliveryPincode: '',
    actualWeight: '',
    packageType: 'single',
    dimensions: {
      length: '',
      breadth: '',
      height: ''
    },
    shipmentValue: '',
    codValue: '',
    paymentType: 'prepaid'
  });

  const [pickupLocation, setPickupLocation] = useState<{city: string, state: string} | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<{city: string, state: string} | null>(null);
  const [validatingPincode, setValidatingPincode] = useState<{pickup: boolean, delivery: boolean}>({pickup: false, delivery: false});

  // Get user category for rate card selection
  const userCategory = user?.user_category || 'Basic User';

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
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
        [field]: value
      }));
    }
  };

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

  const handlePincodeChange = async (type: 'pickup' | 'delivery', pincode: string) => {
    handleInputChange(type === 'pickup' ? 'pickupPincode' : 'deliveryPincode', pincode);
    
    if (pincode.length === 6) {
      setValidatingPincode(prev => ({ ...prev, [type]: true }));
      
      try {
        const locationInfo = await validatePincode(pincode);
        if (locationInfo && locationInfo.city && locationInfo.state) {
          if (type === 'pickup') {
            setPickupLocation({ 
              city: locationInfo.city, 
              state: locationInfo.state 
            });
          } else {
            setDeliveryLocation({ 
              city: locationInfo.city, 
              state: locationInfo.state 
            });
          }
        } else {
          // Handle invalid pincode
          if (type === 'pickup') {
            setPickupLocation({ city: 'Invalid Pincode', state: 'Please check' });
          } else {
            setDeliveryLocation({ city: 'Invalid Pincode', state: 'Please check' });
          }
        }
      } catch (error) {
        console.error('Pincode validation error:', error);
        if (type === 'pickup') {
          setPickupLocation({ city: 'Error', state: 'Try again' });
        } else {
          setDeliveryLocation({ city: 'Error', state: 'Try again' });
        }
      } finally {
        setValidatingPincode(prev => ({ ...prev, [type]: false }));
      }
    } else {
      if (type === 'pickup') {
        setPickupLocation(null);
      } else {
        setDeliveryLocation(null);
      }
    }
  };

  const determineZone = (pickupPincode: string, deliveryPincode: string): string => {
    // This is a simplified zone determination
    // In a real implementation, you'd use distance calculation or zone mapping
    if (pickupPincode === deliveryPincode) return 'A';
    
    // For demo purposes, we'll use a simple logic
    // In production, integrate with actual zone mapping service
    const pickupFirstDigit = pickupPincode[0];
    const deliveryFirstDigit = deliveryPincode[0];
    
    if (pickupFirstDigit === deliveryFirstDigit) return 'B';
    if (['1', '2', '3', '4'].includes(pickupFirstDigit) && ['1', '2', '3', '4'].includes(deliveryFirstDigit)) return 'C1';
    if (['5', '6', '7', '8', '9'].includes(pickupFirstDigit) && ['5', '6', '7', '8', '9'].includes(deliveryFirstDigit)) return 'C2';
    
    return 'D1'; // Default zone
  };

  const calculateShipping = async () => {
    if (!formData.pickupPincode || !formData.deliveryPincode || !formData.actualWeight) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const weight = parseFloat(formData.actualWeight);
      const dimensions = {
        length: parseFloat(formData.dimensions.length) || 0,
        breadth: parseFloat(formData.dimensions.breadth) || 0,
        height: parseFloat(formData.dimensions.height) || 0
      };

      const zone = determineZone(formData.pickupPincode, formData.deliveryPincode);
      const codAmount = formData.paymentType === 'cod' ? parseFloat(formData.codValue) || 0 : 0;

      const calculationRequest: ShippingCalculationRequest = {
        weight,
        dimensions,
        zone,
        cod_amount: codAmount
      };

      // Use the intelligent rate card calculation
      const response: ShippingCalculationResponse = await shippingService.calculateShippingCharges(calculationRequest);
      
      setResult({
        user_category: userCategory,
        weight,
        dimensions,
        zone,
        cod_amount: codAmount,
        calculation_result: response,
        rate_card_info: {
          userCategory,
          carrier: 'DELHIVERY',
          applied_rates: 'Applied based on your user category'
        }
      });

    } catch (err: any) {
      setError(err.message || 'Failed to calculate shipping charges');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      shipmentType: 'forward',
      pickupPincode: '',
      deliveryPincode: '',
      actualWeight: '',
      packageType: 'single',
      dimensions: {
        length: '',
        breadth: '',
        height: ''
      },
      shipmentValue: '',
      codValue: '',
      paymentType: 'prepaid'
    });
    setPickupLocation(null);
    setDeliveryLocation(null);
    setValidatingPincode({pickup: false, delivery: false});
    setResult(null);
    setError(null);
  };

  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-header">
          <h1>Shipping Tools</h1>
          <p>Calculate shipping rates based on your user category: <strong>{userCategory}</strong></p>
        </div>

        <div className="tools-content">
          {/* Shipping Calculator */}
          <div className="calculator-section">
            <div className="calculator-header">
              <h2>Shipping Rate Calculator</h2>
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'domestic' ? 'active' : ''}`}
                  onClick={() => setActiveTab('domestic')}
                >
                  Domestic
                </button>
                <button 
                  className={`tab ${activeTab === 'international' ? 'active' : ''}`}
                  onClick={() => setActiveTab('international')}
                >
                  International
                </button>
              </div>
            </div>

            <div className="calculator-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Shipment Type</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="shipmentType" 
                        value="forward"
                        checked={formData.shipmentType === 'forward'}
                        onChange={(e) => handleInputChange('shipmentType', e.target.value)}
                      />
                      Forward
                    </label>
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="shipmentType" 
                        value="return"
                        checked={formData.shipmentType === 'return'}
                        onChange={(e) => handleInputChange('shipmentType', e.target.value)}
                      />
                      Return
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Pickup Pincode</label>
                  <input
                    type="text"
                    placeholder="Enter 6 digit pickup pincode"
                    value={formData.pickupPincode}
                    onChange={(e) => handlePincodeChange('pickup', e.target.value)}
                    maxLength={6}
                    className="pincode-input"
                  />
                </div>

                <div className="form-group">
                  <label>Actual Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.actualWeight}
                    onChange={(e) => handleInputChange('actualWeight', e.target.value)}
                    step="0.01"
                    min="0"
                    className="weight-input"
                  />
                </div>

                <div className="form-group">
                  <label>Payment Type</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="paymentType" 
                        value="prepaid"
                        checked={formData.paymentType === 'prepaid'}
                        onChange={(e) => handleInputChange('paymentType', e.target.value)}
                      />
                      Prepaid
                    </label>
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="paymentType" 
                        value="cod"
                        checked={formData.paymentType === 'cod'}
                        onChange={(e) => handleInputChange('paymentType', e.target.value)}
                      />
                      Cash on Delivery
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Package Type</label>
                  <select 
                    value={formData.packageType}
                    onChange={(e) => handleInputChange('packageType', e.target.value)}
                    className="package-select"
                  >
                    <option value="single">Single Package (B2C)</option>
                    <option value="bulk">Bulk Package (B2B)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Delivery Pincode</label>
                  <input
                    type="text"
                    placeholder="Enter 6 digit delivery pincode"
                    value={formData.deliveryPincode}
                    onChange={(e) => handlePincodeChange('delivery', e.target.value)}
                    maxLength={6}
                    className="pincode-input"
                  />
                </div>

                <div className="form-group">
                  <label>Dimensions (cm)</label>
                  <div className="dimensions-input">
                    <input
                      type="number"
                      placeholder="Length"
                      value={formData.dimensions.length}
                      onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
                      step="0.1"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="Width"
                      value={formData.dimensions.breadth}
                      onChange={(e) => handleInputChange('dimensions.breadth', e.target.value)}
                      step="0.1"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="Height"
                      value={formData.dimensions.height}
                      onChange={(e) => handleInputChange('dimensions.height', e.target.value)}
                      step="0.1"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Shipment Value (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter Shipment Value"
                    value={formData.shipmentValue}
                    onChange={(e) => handleInputChange('shipmentValue', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {formData.paymentType === 'cod' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Cash on Delivery Value (₹)</label>
                    <input
                      type="number"
                      placeholder="Enter Cash on Delivery Value"
                      value={formData.codValue}
                      onChange={(e) => handleInputChange('codValue', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={clearForm}
                  className="clear-btn"
                >
                  Clear
                </button>
                <button 
                  type="button" 
                  onClick={calculateShipping}
                  disabled={loading}
                  className="calculate-btn"
                >
                  {loading ? 'Calculating...' : 'Calculate'}
                </button>
              </div>
            </div>
          </div>

          {/* Location Display */}
          <div className="location-section">
            <div className="location-card">
              <div className="location-header">
                <span className="location-icon">📍</span>
                <span className="location-label">Pickup Location</span>
              </div>
              <div className="location-details">
                {validatingPincode.pickup ? (
                  <div className="location-loading">Validating...</div>
                ) : pickupLocation ? (
                  <>
                    <div className={`location-city ${pickupLocation.city.includes('Invalid') || pickupLocation.city.includes('Error') ? 'error' : ''}`}>
                      {pickupLocation.city}
                    </div>
                    <div className={`location-state ${pickupLocation.state.includes('Please check') || pickupLocation.state.includes('Try again') ? 'error' : ''}`}>
                      {pickupLocation.state}
                    </div>
                  </>
                ) : (
                  <div className="location-placeholder">City, State</div>
                )}
              </div>
            </div>

            <div className="location-connector">
              <div className="connector-line"></div>
              <div className="connector-arrow">→</div>
            </div>

            <div className="location-card">
              <div className="location-header">
                <span className="location-icon">📍</span>
                <span className="location-label">Delivery Location</span>
              </div>
              <div className="location-details">
                {validatingPincode.delivery ? (
                  <div className="location-loading">Validating...</div>
                ) : deliveryLocation ? (
                  <>
                    <div className={`location-city ${deliveryLocation.city.includes('Invalid') || deliveryLocation.city.includes('Error') ? 'error' : ''}`}>
                      {deliveryLocation.city}
                    </div>
                    <div className={`location-state ${deliveryLocation.state.includes('Please check') || deliveryLocation.state.includes('Try again') ? 'error' : ''}`}>
                      {deliveryLocation.state}
                    </div>
                  </>
                ) : (
                  <div className="location-placeholder">City, State</div>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          {error && (
            <div className="error-message">
              <span>❌ {error}</span>
            </div>
          )}

          {result && (
            <div className="results-section">
              <h3>Shipping Calculation Results</h3>
              <div className="results-card">
                <div className="result-header">
                  <div className="user-category-badge">
                    Rate Card: {result.user_category}
                  </div>
                  <div className="zone-badge">
                    Zone: {result.zone}
                  </div>
                </div>
                
                <div className="result-details">
                  <div className="result-row">
                    <span className="result-label">Weight:</span>
                    <span className="result-value">{result.weight} kg</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Chargeable Weight:</span>
                    <span className="result-value">{result.calculation_result.chargeableWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Volumetric Weight:</span>
                    <span className="result-value">{result.calculation_result.volumetricWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">Forward Charges:</span>
                    <span className="result-value">₹{result.calculation_result.forwardCharges.toFixed(2)}</span>
                  </div>
                  <div className="result-row">
                    <span className="result-label">RTO Charges:</span>
                    <span className="result-value">₹{result.calculation_result.rtoCharges.toFixed(2)}</span>
                  </div>
                  {result.cod_amount > 0 && (
                    <div className="result-row">
                      <span className="result-label">COD Charges:</span>
                      <span className="result-value">₹{result.calculation_result.codCharges.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="result-row total-row">
                    <span className="result-label">Total Charges:</span>
                    <span className="result-value total-value">₹{result.calculation_result.totalCharges.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
    </Layout>
  );
};

export default Tools;