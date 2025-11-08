import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { shippingService } from '../services/shippingService';
import styles from './PublicRateCalculator.module.css';

interface CalculationResult {
  forwardCharges: number;
  rtoCharges: number;
  codCharges: number;
  totalCharges: number;
  volumetricWeight: number;
  chargeableWeight: number;
  zone?: string;
}

const defaultDimensions = {
  length: '20',
  breadth: '15',
  height: '10'
};

const PublicRateCalculator: React.FC = () => {
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    pickupPincode: '',
    deliveryPincode: '',
    weightKg: '',
    length: defaultDimensions.length,
    breadth: defaultDimensions.breadth,
    height: defaultDimensions.height,
    codAmount: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (field === 'pickupPincode' || field === 'deliveryPincode') {
      const sanitized = value.replace(/\D/g, '').slice(0, 6);
      setFormState(prev => ({ ...prev, [field]: sanitized }));
      return;
    }

    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState({
      pickupPincode: '',
      deliveryPincode: '',
      weightKg: '',
      length: defaultDimensions.length,
      breadth: defaultDimensions.breadth,
      height: defaultDimensions.height,
      codAmount: ''
    });
    setResult(null);
    setError(null);
  };

  const isValidPincode = (pin: string) => /^[1-9][0-9]{5}$/.test(pin);

  const handleCalculate = async (event: React.FormEvent) => {
    event.preventDefault();

    setError(null);
    setResult(null);

    const weightKg = parseFloat(formState.weightKg);
    if (!weightKg || weightKg <= 0) {
      setError('Enter a valid shipment weight in kilograms.');
      return;
    }

    if (!isValidPincode(formState.pickupPincode) || !isValidPincode(formState.deliveryPincode)) {
      setError('Enter valid 6-digit pickup and delivery pincodes.');
      return;
    }

    const length = parseFloat(formState.length) || parseFloat(defaultDimensions.length);
    const breadth = parseFloat(formState.breadth) || parseFloat(defaultDimensions.breadth);
    const height = parseFloat(formState.height) || parseFloat(defaultDimensions.height);

    if (length <= 0 || breadth <= 0 || height <= 0) {
      setError('Dimensions should be greater than zero.');
      return;
    }

    const codAmount = parseFloat(formState.codAmount);
    const weightInGrams = weightKg * 1000;

    setIsCalculating(true);

    try {
      const response = await shippingService.calculatePublicShippingCharges({
        weight: weightInGrams,
        dimensions: { length, breadth, height },
        pickup_pincode: formState.pickupPincode,
        delivery_pincode: formState.deliveryPincode,
        cod_amount: !isNaN(codAmount) && codAmount > 0 ? codAmount : undefined,
        payment_mode: !isNaN(codAmount) && codAmount > 0 ? 'COD' : 'Prepaid',
        order_type: 'forward'
      });

      setResult(response);
    } catch (calculationError: any) {
      const message =
        calculationError?.response?.data?.message ||
        calculationError?.message ||
        'Unable to calculate shipping charges. Please try again.';
      setError(message);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className={`${styles.page} public-rate-calculator-page`}>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.logo} onClick={() => navigate('/')}>
            <img src="/NEW LOGO.png" alt="Shipsarthi" />
          </div>

          <nav className={styles.navLinks}>
            <span className={styles.navLink} onClick={() => navigate('/')}>Home</span>
            <span className={styles.navLink} onClick={() => navigate('/about')}>About</span>
            <span className={styles.navLink} onClick={() => navigate('/contact')}>Contact</span>
            <span className={styles.navLink} onClick={() => navigate('/tracking')}>Track Shipment</span>
          </nav>

          <div className={styles.headerButtons}>
            <button
              className={styles.ctaSecondary}
              type="button"
              onClick={() => navigate('/tracking')}
            >
              Track
            </button>
            <button
              className={styles.ctaPrimary}
              type="button"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <div className={styles.calculatorCard}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>Delhivery Rate Calculator</h1>
              <p className={styles.cardSubtitle}>
                Get instant rate estimates using live Delhivery zones. No login required.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleCalculate}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Shipment Weight (kg)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1.50"
                  value={formState.weightKg}
                  onChange={handleInputChange('weightKg')}
                  required
                />
                <span className={styles.helperText}>Actual scale weight in kilograms.</span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Pincodes</label>
                <div className={styles.inputRow}>
                  <input
                    className={styles.input}
                    type="tel"
                    placeholder="Pickup pincode"
                    value={formState.pickupPincode}
                    onChange={handleInputChange('pickupPincode')}
                    maxLength={6}
                    required
                  />
                  <input
                    className={styles.input}
                    type="tel"
                    placeholder="Delivery pincode"
                    value={formState.deliveryPincode}
                    onChange={handleInputChange('deliveryPincode')}
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>COD Amount (optional)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Enter COD value if applicable"
                  value={formState.codAmount}
                  onChange={handleInputChange('codAmount')}
                />
                <span className={styles.helperText}>
                  COD charges are applied only when a value is provided.
                </span>
              </div>

              <button
                type="button"
                className={styles.advancedToggle}
                onClick={() => setShowAdvanced(prev => !prev)}
              >
                {showAdvanced ? 'Hide package dimensions' : 'Adjust package dimensions'}
              </button>

              {showAdvanced && (
                <div className={styles.advancedFields}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Dimensions (cm)</label>
                    <div className={styles.inputRow}>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Length"
                        value={formState.length}
                        onChange={handleInputChange('length')}
                      />
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Breadth"
                        value={formState.breadth}
                        onChange={handleInputChange('breadth')}
                      />
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        placeholder="Height"
                        value={formState.height}
                        onChange={handleInputChange('height')}
                      />
                    </div>
                  </div>
                  <span className={styles.helperText}>
                    Dimensions impact volumetric weight. Defaults are applied if left unchanged.
                  </span>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.actions}>
                <button
                  className={styles.calculateButton}
                  type="submit"
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Calculating…' : 'Calculate'}
                </button>
                <button
                  className={styles.resetButton}
                  type="button"
                  onClick={resetForm}
                >
                  Reset
                </button>
              </div>
            </form>

            {result && (
              <div className={styles.resultsCard}>
                <div className={styles.resultsHeader}>
                  <h2 className={styles.resultsTitle}>Shipping Estimate</h2>
                  {result.zone && (
                    <span className={styles.zoneBadge}>Zone {result.zone}</span>
                  )}
                </div>

                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>Forward Charges</span>
                    <span className={styles.resultValue}>₹{result.forwardCharges.toFixed(2)}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>RTO Charges</span>
                    <span className={styles.resultValue}>₹{result.rtoCharges.toFixed(2)}</span>
                  </div>
                  {result.codCharges > 0 && (
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>COD Charges</span>
                      <span className={styles.resultValue}>₹{result.codCharges.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`${styles.resultItem} ${styles.resultItemAccent}`}>
                    <span className={styles.resultLabel}>Total Charges</span>
                    <span className={styles.resultValue}>₹{result.totalCharges.toFixed(2)}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>Chargeable Weight</span>
                    <span className={styles.resultValue}>
                      {result.chargeableWeight.toFixed(2)} kg
                    </span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>Volumetric Weight</span>
                    <span className={styles.resultValue}>
                      {result.volumetricWeight.toFixed(2)} kg
                    </span>
                  </div>
                </div>

                <p className={styles.infoNote}>
                  Estimates are based on Shipsarthi&apos;s standard Delhivery rate card. Final charges may vary for special services.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicRateCalculator;

