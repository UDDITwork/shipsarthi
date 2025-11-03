import React, { useState, useEffect } from 'react';
import { shippingService, RateCard } from '../services/shippingService';
import './PriceList.css';

interface PriceListProps {
  userCategory: string;
}

const PriceList: React.FC<PriceListProps> = ({ userCategory }) => {
  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRateCard();
  }, [userCategory]);

  const loadRateCard = async () => {
    try {
      setLoading(true);
      const card = await shippingService.getRateCard(userCategory);
      setRateCard(card);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load rate card');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="price-list-container">
        <div className="loading">Loading rate card...</div>
      </div>
    );
  }

  if (error || !rateCard) {
    return (
      <div className="price-list-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="price-list-container">
      <div className="rate-card-header">
        <div className="logo-section">
          <div className="shipsarthi-logo">
            <div className="logo-icon">
              <div className="truck-icon">🚛</div>
              <div className="plane-icon">✈️</div>
            </div>
            <h2 className="logo-text">Shipsarthi</h2>
          </div>
        </div>
        <div className="rate-card-title">
          <h1>Shipping Rate Card</h1>
          <p>For {userCategory} :-</p>
        </div>
        <div className="website-info">
          <p>www.shipsarthi.com</p>
        </div>
      </div>

      <div className="rate-card-content">
        {/* Forward Charges Table */}
        <div className="charges-section">
          <h3>Slab Condition (Forward Shipping Rates)</h3>
          <div className="table-container">
            <table className="rate-table">
              <thead>
                <tr>
                  <th>Slab Condition</th>
                  <th>Zone A</th>
                  <th>Zone B</th>
                  <th>Zone C</th>
                  <th>Zone D</th>
                  <th>Zone E</th>
                  <th>Zone F</th>
                </tr>
              </thead>
              <tbody>
                {rateCard.forwardCharges.map((slab, index) => (
                  <tr key={index}>
                    <td>{slab.condition}</td>
                    <td>₹{slab.zones.A}</td>
                    <td>₹{slab.zones.B}</td>
                    <td>₹{slab.zones.C}</td>
                    <td>₹{slab.zones.D}</td>
                    <td>₹{slab.zones.E}</td>
                    <td>₹{slab.zones.F}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RTO Charges Table */}
        <div className="charges-section">
          <h3>RTO (Return to Origin) Rates</h3>
          <div className="table-container">
            <table className="rate-table">
              <thead>
                <tr>
                  <th>DTO Slab Condition</th>
                  <th>Zone A</th>
                  <th>Zone B</th>
                  <th>Zone C</th>
                  <th>Zone D</th>
                  <th>Zone E</th>
                  <th>Zone F</th>
                </tr>
              </thead>
              <tbody>
                {rateCard.rtoCharges.map((slab, index) => (
                  <tr key={index}>
                    <td>{slab.condition}</td>
                    <td>₹{slab.zones.A}</td>
                    <td>₹{slab.zones.B}</td>
                    <td>₹{slab.zones.C}</td>
                    <td>₹{slab.zones.D}</td>
                    <td>₹{slab.zones.E}</td>
                    <td>₹{slab.zones.F}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COD Charges */}
        <div className="cod-section">
          <h3>COD Charges</h3>
          <div className="cod-info">
            <p>
              {rateCard.codCharges.percentage}% or ₹{rateCard.codCharges.minimumAmount}/- 
              Whichever is Higher {rateCard.codCharges.gstAdditional ? '(GST Additional)' : ''}
            </p>
          </div>
        </div>

        {/* Zone Definitions */}
        <div className="zone-definitions">
          <h3>Zone Definitions</h3>
          <div className="table-container">
            <table className="zone-table">
              <thead>
                <tr>
                  <th>Zones</th>
                  <th>Definition</th>
                </tr>
              </thead>
              <tbody>
                {rateCard.zoneDefinitions.map((zone, index) => (
                  <tr key={index}>
                    <td>{zone.zone}</td>
                    <td>{zone.definition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="terms-section">
          <h3>Terms & Conditions</h3>
          <ol className="terms-list">
            {rateCard.termsAndConditions.map((term, index) => (
              <li key={index}>{term}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PriceList;
