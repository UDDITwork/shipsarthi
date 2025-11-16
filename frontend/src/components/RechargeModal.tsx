// Location: frontend/src/components/RechargeModal.tsx
import React, { useState } from 'react';
import './RechargeModal.css';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORT_EMAIL = 'support@shipsarthi.com';

const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');

  const handleClose = () => {
    setAmount('');
    setPromoCode('');
    onClose();
  };

  const handleContactSupport = () => {
    window.open(`mailto:${SUPPORT_EMAIL}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="recharge-modal-overlay" onClick={handleClose}>
      <div className="recharge-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="recharge-modal-header">
          <h2>Recharge Your Wallet</h2>
          <button className="close-button" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="recharge-modal-body">
          <div className="recharge-downtime-banner">
            <h3>🚧 Payment Gateway Unavailable</h3>
            <p>
              Our payment gateway is currently unavailable. Please contact the administrator for a manual
              recharge. We apologize for the inconvenience.
            </p>
          </div>

          <div className="recharge-content">
            {/* Amount Section (disabled) */}
            <div className="amount-section disabled">
              <label className="section-label">Amount</label>
              <div className="amount-input-wrapper">
                <span className="rupee-icon">₹</span>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled
                />
              </div>
            </div>

            {/* Promo Code Section (disabled) */}
            <div className="promo-section disabled">
              <label className="section-label">Promo Code</label>
              <div className="promo-input-wrapper">
                <input
                  type="text"
                  className="promo-input"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled
                />
                <button className="apply-button" disabled>
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Summary */}
          <div className="recharge-summary disabled">
            <div className="summary-item">
              <span className="summary-label">Amount:</span>
              <span className="summary-value">₹ 0</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-item total">
              <span className="summary-label">Total:</span>
              <span className="summary-value">₹ 0</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="recharge-modal-footer">
          <button className="contact-button" onClick={handleContactSupport}>
            Contact Admin
          </button>
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RechargeModal;
