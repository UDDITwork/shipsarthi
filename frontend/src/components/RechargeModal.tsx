// Location: frontend/src/components/RechargeModal.tsx
import React, { useState } from 'react';
import './RechargeModal.css';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecharge: (amount: number, promoCode?: string) => void;
}

const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, onRecharge }) => {
  const [amount, setAmount] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [isPromoApplied, setIsPromoApplied] = useState<boolean>(false);

  const predefinedAmounts = [500, 1000, 2000, 5000, 10000];

  const handleAmountClick = (value: number) => {
    setAmount(value.toString());
  };

  const handlePromoApply = () => {
    if (promoCode.trim()) {
      setIsPromoApplied(true);
      // Here you can add promo code validation logic
      alert('Promo code applied successfully!');
    }
  };

  const handleContinue = () => {
    const rechargeAmount = parseFloat(amount);
    
    if (!rechargeAmount || rechargeAmount < 500) {
      alert('Minimum recharge amount is ₹500');
      return;
    }

    onRecharge(rechargeAmount, promoCode);
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setPromoCode('');
    setIsPromoApplied(false);
    onClose();
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
          <div className="recharge-content">
            {/* Amount Section */}
            <div className="amount-section">
              <label className="section-label">Amount</label>
              <div className="amount-input-wrapper">
                <span className="rupee-icon">₹</span>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="Minimum recharge of ₹ 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="500"
                />
              </div>

              {/* Predefined Amount Buttons */}
              <div className="predefined-amounts">
                {predefinedAmounts.map((value) => (
                  <button
                    key={value}
                    className={`amount-button ${amount === value.toString() ? 'active' : ''}`}
                    onClick={() => handleAmountClick(value)}
                  >
                    ₹ {value.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="promo-section">
              <label className="section-label">Promo Code</label>
              <div className="promo-input-wrapper">
                <input
                  type="text"
                  className="promo-input"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={isPromoApplied}
                />
                <button
                  className={`apply-button ${isPromoApplied ? 'applied' : ''}`}
                  onClick={handlePromoApply}
                  disabled={isPromoApplied || !promoCode.trim()}
                >
                  {isPromoApplied ? '✓ Applied' : 'Apply'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Summary (Optional) */}
          <div className="recharge-summary">
            <div className="summary-item">
              <span className="summary-label">Amount:</span>
              <span className="summary-value">₹ {amount || '0'}</span>
            </div>
            {isPromoApplied && (
              <div className="summary-item discount">
                <span className="summary-label">Discount:</span>
                <span className="summary-value">- ₹ 0</span>
              </div>
            )}
            <div className="summary-divider"></div>
            <div className="summary-item total">
              <span className="summary-label">Total:</span>
              <span className="summary-value">₹ {amount || '0'}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="recharge-modal-footer">
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="continue-button"
            onClick={handleContinue}
            disabled={!amount || parseFloat(amount) < 500}
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default RechargeModal;
