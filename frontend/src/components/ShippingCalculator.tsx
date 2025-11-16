import React, { useState, useEffect } from 'react';
import { shippingService, ShippingCalculationRequest } from '../services/shippingService';
import './ShippingCalculator.css';

interface ShippingCalculatorProps {
  userCategory: string;
  isPublic?: boolean;
  onCalculate?: (result: {
    forwardCharges: number;
    rtoCharges: number;
    codCharges: number;
    totalCharges: number;
    volumetricWeight: number;
    chargeableWeight: number;
  }) => void;
}

const ShippingCalculator: React.FC<ShippingCalculatorProps> = ({ 
  userCategory, 
  isPublic = false,
  onCalculate 
}) => {
  const [weight, setWeight] = useState<number>(0);
  const [dimensions, setDimensions] = useState({
    length: 0,
    breadth: 0,
    height: 0
  });
  const [pickupPincode, setPickupPincode] = useState<string>('');
  const [deliveryPincode, setDeliveryPincode] = useState<string>('');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    try {
      setError(null);
      
      if (weight <= 0) {
        setError('Please enter a valid weight');
        return;
      }

      if (dimensions.length <= 0 || dimensions.breadth <= 0 || dimensions.height <= 0) {
        setError('Please enter valid dimensions');
        return;
      }

      if (!/^[1-9][0-9]{5}$/.test(pickupPincode) || !/^[1-9][0-9]{5}$/.test(deliveryPincode)) {
        setError('Enter valid 6-digit pickup and delivery pincodes');
        return;
      }

      const requestPayload: ShippingCalculationRequest = {
        weight,
        dimensions,
        pickup_pincode: pickupPincode,
        delivery_pincode: deliveryPincode,
        payment_mode: codAmount > 0 ? 'COD' : 'Prepaid',
        cod_amount: codAmount > 0 ? codAmount : undefined,
        order_type: 'forward'
      };

      const result = await (isPublic
        ? shippingService.calculatePublicShippingCharges(requestPayload)
        : shippingService.calculateShippingCharges(requestPayload)
      );

      setCalculationResult(result);
      
      if (onCalculate) {
        onCalculate(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate shipping charges');
    }
  };

  const handleDimensionChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setDimensions(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const resetCalculator = () => {
    setWeight(0);
    setDimensions({ length: 0, breadth: 0, height: 0 });
    setPickupPincode('');
    setDeliveryPincode('');
    setCodAmount(0);
    setCalculationResult(null);
    setError(null);
  };

  return (
    <div className="shipping-calculator">
      <div className="calculator-header">
        <h3>Shipping Cost Calculator</h3>
        <p>Calculate shipping charges based on your user category: <strong>{userCategory}</strong></p>
      </div>

      <div className="calculator-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="weight">Weight (grams)</label>
            <input
              type="number"
              id="weight"
              value={weight || ''}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              placeholder="Enter weight in grams"
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="pickupPincode">Pickup Pincode</label>
            <input
              type="tel"
              id="pickupPincode"
              value={pickupPincode}
              onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Pickup pincode"
              maxLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="deliveryPincode">Delivery Pincode</label>
            <input
              type="tel"
              id="deliveryPincode"
              value={deliveryPincode}
              onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Delivery pincode"
              maxLength={6}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="length">Length (cm)</label>
            <input
              type="number"
              id="length"
              value={dimensions.length || ''}
              onChange={(e) => handleDimensionChange('length', e.target.value)}
              placeholder="Length in cm"
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="breadth">Breadth (cm)</label>
            <input
              type="number"
              id="breadth"
              value={dimensions.breadth || ''}
              onChange={(e) => handleDimensionChange('breadth', e.target.value)}
              placeholder="Breadth in cm"
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="height">Height (cm)</label>
            <input
              type="number"
              id="height"
              value={dimensions.height || ''}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              placeholder="Height in cm"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="codAmount">COD Amount (₹) - Optional</label>
            <input
              type="number"
              id="codAmount"
              value={codAmount || ''}
              onChange={(e) => setCodAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter COD amount"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCalculate}
            className="calculate-btn"
            disabled={
              weight <= 0 ||
              dimensions.length <= 0 ||
              dimensions.breadth <= 0 ||
              dimensions.height <= 0 ||
              !/^[1-9][0-9]{5}$/.test(pickupPincode) ||
              !/^[1-9][0-9]{5}$/.test(deliveryPincode)
            }
          >
            Calculate Shipping Cost
          </button>
          <button
            type="button"
            onClick={resetCalculator}
            className="reset-btn"
          >
            Reset
          </button>
        </div>
      </div>

      {calculationResult && (
        <div className="calculation-result">
          <h4>Calculation Results</h4>
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">Actual Weight:</span>
              <span className="result-value">{weight} grams</span>
            </div>
            <div className="result-item">
              <span className="result-label">Volumetric Weight:</span>
              <span className="result-value">{calculationResult.volumetricWeight.toFixed(2)} kg</span>
            </div>
            <div className="result-item">
              <span className="result-label">Chargeable Weight:</span>
              <span className="result-value">{calculationResult.chargeableWeight.toFixed(2)} kg</span>
            </div>
            {calculationResult.zone && (
              <div className="result-item">
                <span className="result-label">Zone:</span>
                <span className="result-value">{calculationResult.zone}</span>
              </div>
            )}
            <div className="result-item">
              <span className="result-label">Forward Charges:</span>
              <span className="result-value">₹{calculationResult.forwardCharges.toFixed(2)}</span>
            </div>
            <div className="result-item">
              <span className="result-label">RTO Charges:</span>
              <span className="result-value">₹{calculationResult.rtoCharges.toFixed(2)}</span>
            </div>
            {codAmount > 0 && (
              <div className="result-item">
                <span className="result-label">COD Charges:</span>
                <span className="result-value">₹{calculationResult.codCharges.toFixed(2)}</span>
              </div>
            )}
            <div className="result-item total">
              <span className="result-label">Total Charges:</span>
              <span className="result-value">₹{calculationResult.totalCharges.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;
