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
  order_type?: 'forward' | 'rto';
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

interface RateCardData {
  userCategory: string;
  carrier: string;
  forwardCharges: Array<{
    condition: string;
    zones: { [key: string]: number };
  }>;
  rtoCharges: Array<{
    condition: string;
    zones: { [key: string]: number };
  }>;
  codCharges: {
    percentage: number;
    minimumAmount: number;
    gstAdditional: boolean;
  };
  zoneDefinitions: { [key: string]: string[] };
  termsAndConditions: string[];
}

// Price List Tab Component
const PriceListTab: React.FC<{ userCategory: string; onRefreshUserData: () => void }> = ({ userCategory, onRefreshUserData }) => {
  const [rateCardData, setRateCardData] = useState<RateCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRateCard();
  }, [userCategory]);

  const fetchRateCard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.get<{ success: boolean; data: RateCardData }>(`/shipping/rate-card/${userCategory}`);
      
      if (response.success && response.data) {
        console.log('Rate card data received:', response.data);
        setRateCardData(response.data);
      } else {
        console.error('Invalid rate card response:', response);
        setError('Invalid rate card data received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rate card');
      console.error('Rate card fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const zones = ['A', 'B', 'C', 'D', 'E', 'F'];

  if (loading) {
    return (
      <div className="price-list-section">
        <div className="price-list-header">
          <h2>Price List - {userCategory}</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading rate card...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-list-section">
        <div className="price-list-header">
          <h2>Price List - {userCategory}</h2>
        </div>
        <div className="error-container">
          <div className="error-icon">❌</div>
          <p>{error}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={fetchRateCard} className="retry-btn">
              Retry
            </button>
            <button onClick={onRefreshUserData} className="retry-btn" style={{ backgroundColor: '#007bff' }}>
              Refresh User Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!rateCardData) {
    return (
      <div className="price-list-section">
        <div className="price-list-header">
          <h2>Price List - {userCategory}</h2>
        </div>
        <div className="no-data-container">
          <div className="no-data-icon">📋</div>
          <p>No rate card data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="price-list-section">
      <div className="price-list-header">
        <h2>Price List - {userCategory}</h2>
        <div className="rate-card-info">
          <span className="carrier-badge">{rateCardData.carrier}</span>
          <span className="category-badge">{rateCardData.userCategory}</span>
        </div>
      </div>

      <div className="price-tables">
        {/* Forward Charges Table */}
        <div className="price-table-container">
          <h3>Forward Charges (₹)</h3>
          <div className="table-wrapper">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Weight Slab</th>
                  {zones.map(zone => (
                    <th key={zone}>Zone {zone}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rateCardData.forwardCharges && rateCardData.forwardCharges.length > 0 ? (
                  rateCardData.forwardCharges.map((charge, index) => (
                    <tr key={index}>
                      <td className="weight-slab">{charge.condition}</td>
                      {zones.map(zone => (
                        <td key={zone} className="price-cell">
                          ₹{charge.zones && charge.zones[zone] ? charge.zones[zone] : '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={zones.length + 1} className="text-center text-gray-500">
                      No forward charges data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RTO Charges Table */}
        <div className="price-table-container">
          <h3>RTO Charges (₹)</h3>
          <div className="table-wrapper">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Weight Slab</th>
                  {zones.map(zone => (
                    <th key={zone}>Zone {zone}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rateCardData.rtoCharges && rateCardData.rtoCharges.length > 0 ? (
                  rateCardData.rtoCharges.map((charge, index) => (
                    <tr key={index}>
                      <td className="weight-slab">{charge.condition}</td>
                      {zones.map(zone => (
                        <td key={zone} className="price-cell">
                          ₹{charge.zones && charge.zones[zone] ? charge.zones[zone] : '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={zones.length + 1} className="text-center text-gray-500">
                      No RTO charges data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COD Charges */}
        <div className="cod-charges-container">
          <h3>COD Charges</h3>
          <div className="cod-details">
            <div className="cod-item">
              <span className="cod-label">Percentage:</span>
              <span className="cod-value">{rateCardData.codCharges?.percentage || 'N/A'}%</span>
            </div>
            <div className="cod-item">
              <span className="cod-label">Minimum Amount:</span>
              <span className="cod-value">₹{rateCardData.codCharges?.minimumAmount || 'N/A'}</span>
            </div>
            <div className="cod-item">
              <span className="cod-label">GST Additional:</span>
              <span className="cod-value">{rateCardData.codCharges?.gstAdditional ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Zone Definitions */}
        <div className="zone-definitions-container">
          <h3>Zone Definitions</h3>
          <div className="zone-grid">
            {rateCardData.zoneDefinitions && Object.keys(rateCardData.zoneDefinitions).length > 0 ? (
              Object.entries(rateCardData.zoneDefinitions).map(([zone, states]) => (
                <div key={zone} className="zone-item">
                  <div className="zone-name">Zone {zone}</div>
                  <div className="zone-states">
                    {Array.isArray(states) ? states.join(', ') : 'No states defined'}
                  </div>
                </div>
              ))
            ) : (
              <div className="zone-item">
                <div className="zone-name">No Zone Data</div>
                <div className="zone-states">Zone definitions not available</div>
              </div>
            )}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="terms-container">
          <h3>Terms & Conditions</h3>
          <ul className="terms-list">
            {rateCardData.termsAndConditions && rateCardData.termsAndConditions.length > 0 ? (
              rateCardData.termsAndConditions.map((term, index) => (
                <li key={index} className="term-item">
                  {term}
                </li>
              ))
            ) : (
              <li className="term-item">No terms and conditions available</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

const Tools: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'calculator' | 'price-list'>('calculator');
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
  // This value comes directly from MongoDB via AuthContext
  // When admin assigns a label, MongoDB is updated and WebSocket notification triggers refresh
  const userCategory = user?.user_category || 'Basic User';

  // Force refresh user data if there's a mismatch
  const handleRefreshUserData = async () => {
    try {
      await refreshUser();
      console.log('User data refreshed, current category:', user?.user_category);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

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
    if (['1', '2', '3', '4'].includes(pickupFirstDigit) && ['1', '2', '3', '4'].includes(deliveryFirstDigit)) return 'C';
    if (['5', '6', '7', '8', '9'].includes(pickupFirstDigit) && ['5', '6', '7', '8', '9'].includes(deliveryFirstDigit)) return 'C';
    
    return 'D'; // Default zone
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
      const weight = parseFloat(formData.actualWeight) * 1000; // Convert kg to grams
      const dimensions = {
        length: parseFloat(formData.dimensions.length) || 0,
        breadth: parseFloat(formData.dimensions.breadth) || 0,
        height: parseFloat(formData.dimensions.height) || 0
      };

      const zone = determineZone(formData.pickupPincode, formData.deliveryPincode);
      const codAmount = formData.paymentType === 'cod' ? parseFloat(formData.codValue) || 0 : 0;

      const calculationRequest: ShippingCalculationRequest = {
        weight, // Now in grams
        dimensions,
        zone,
        cod_amount: codAmount,
        order_type: formData.shipmentType as 'forward' | 'rto'
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
          <div className="header-content">
            <div className="header-text">
              <h1>Shipping Tools</h1>
              <p>Calculate shipping rates based on your user category: <strong>{userCategory}</strong></p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px', fontStyle: 'italic' }}>
                Your category updates automatically when assigned by admin
              </p>
            </div>
          </div>
        </div>

        <div className="tools-content">
          {/* Main Tabs */}
          <div className="main-tabs">
            <button 
              className={`main-tab ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              📊 Rate Calculator
            </button>
            <button 
              className={`main-tab ${activeTab === 'price-list' ? 'active' : ''}`}
              onClick={() => setActiveTab('price-list')}
            >
              💰 Price List
            </button>
          </div>

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className="calculator-section">
              <div className="calculator-header">
                <h2>Shipping Rate Calculator</h2>
                <div className="tabs">
                  <button 
                    className={`tab active`}
                  >
                    Domestic
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
                      <span className="result-value">{(result.weight / 1000).toFixed(2)} kg</span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Chargeable Weight:</span>
                      <span className="result-value">{result.calculation_result.chargeableWeight.toFixed(2)} kg</span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Volumetric Weight:</span>
                      <span className="result-value">{result.calculation_result.volumetricWeight.toFixed(2)} kg</span>
                    </div>
                    {formData.shipmentType === 'forward' && (
                      <div className="result-row">
                        <span className="result-label">Forward Charges:</span>
                        <span className="result-value">₹{result.calculation_result.forwardCharges.toFixed(2)}</span>
                      </div>
                    )}
                    {formData.shipmentType === 'rto' && (
                      <div className="result-row">
                        <span className="result-label">RTO Charges:</span>
                        <span className="result-value">₹{result.calculation_result.rtoCharges.toFixed(2)}</span>
                      </div>
                    )}
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
          )}

          {/* Price List Tab */}
          {activeTab === 'price-list' && (
            <PriceListTab userCategory={userCategory} onRefreshUserData={handleRefreshUserData} />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Tools;