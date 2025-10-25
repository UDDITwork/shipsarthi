import React, { useState, useEffect } from 'react';
import { shippingService } from '../services/shippingService';
import './ShippingCalculator.css';

interface ShippingCalculatorProps {
  userCategory: string;
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
  onCalculate 
}) => {
  const [weight, setWeight] = useState<number>(0);
  const [dimensions, setDimensions] = useState({
    length: 0,
    breadth: 0,
    height: 0
  });
  const [zone, setZone] = useState<string>('A');
  const [codAmount, setCodAmount] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const zones = [
    { value: 'A', label: 'Zone A - Local within city' },
    { value: 'B', label: 'Zone B - Within 500 kms Regional' },
    { value: 'C1', label: 'Zone C1 - Metro to Metro (501-1400 kms)' },
    { value: 'C2', label: 'Zone C2 - Metro to Metro (1401-2500 kms)' },
    { value: 'D1', label: 'Zone D1 - Rest of India (501-1400 kms)' },
    { value: 'D2', label: 'Zone D2 - Rest of India (1401-2500 kms)' },
    { value: 'E', label: 'Zone E - Special (NE, J&K, >2500 kms)' },
    { value: 'F', label: 'Zone F - Special (NE, J&K, >2500 kms)' }
  ];

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

      const result = await shippingService.calculateShippingCharges({
        weight,
        dimensions,
        zone,
        cod_amount: codAmount > 0 ? codAmount : undefined
      });

      setCalculationResult(result.calculation_result);
      
      if (onCalculate) {
        onCalculate(result.calculation_result);
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
    setZone('A');
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
            <label htmlFor="zone">Destination Zone</label>
            <select
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            >
              {zones.map(zoneOption => (
                <option key={zoneOption.value} value={zoneOption.value}>
                  {zoneOption.label}
                </option>
              ))}
            </select>
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
            disabled={weight <= 0 || dimensions.length <= 0 || dimensions.breadth <= 0 || dimensions.height <= 0}
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
              <span className="result-value">{calculationResult.volumetricWeight.toFixed(2)} grams</span>
            </div>
            <div className="result-item">
              <span className="result-label">Chargeable Weight:</span>
              <span className="result-value">{calculationResult.chargeableWeight.toFixed(2)} grams</span>
            </div>
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
