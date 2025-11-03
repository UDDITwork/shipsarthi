import React, { useState, useEffect } from 'react';
import './PickupRequestModal.css';

interface PickupRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pickupDate: string, pickupTime: string, packageCount: number) => void;
  orderId: string;
  orderNumber: string;
  warehouseName?: string;
  loading?: boolean;
}

const PickupRequestModal: React.FC<PickupRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  orderNumber,
  warehouseName,
  loading = false
}) => {
  // Calculate minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Calculate default date (tomorrow)
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [pickupDate, setPickupDate] = useState(getDefaultDate());
  const [pickupTime, setPickupTime] = useState('11:00:00');
  const [packageCount, setPackageCount] = useState(1);
  const [errors, setErrors] = useState<{ date?: string; time?: string; count?: string }>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPickupDate(getDefaultDate());
      setPickupTime('11:00:00');
      setPackageCount(1);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { date?: string; time?: string; count?: string } = {};

    // Validate date
    if (!pickupDate) {
      newErrors.date = 'Pickup date is required';
    } else {
      const selectedDate = new Date(pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Pickup date cannot be in the past';
      }
    }

    // Validate time
    if (!pickupTime) {
      newErrors.time = 'Pickup time is required';
    } else {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(pickupTime)) {
        newErrors.time = 'Invalid time format. Use HH:mm:ss (e.g., 11:00:00)';
      }
    }

    // Validate package count
    if (!packageCount || packageCount < 1) {
      newErrors.count = 'Package count must be at least 1';
    } else if (packageCount > 100) {
      newErrors.count = 'Package count cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Convert time input (HH:mm) to required format (HH:mm:ss)
      const timeParts = pickupTime.split(':');
      const formattedTime = timeParts.length === 2 
        ? `${pickupTime}:00` 
        : pickupTime;
      
      onConfirm(pickupDate, formattedTime, packageCount);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If user enters HH:mm format, store as is (we'll convert on submit)
    setPickupTime(value);
    if (errors.time) {
      setErrors(prev => ({ ...prev, time: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pickup-modal-overlay" onClick={onClose}>
      <div className="pickup-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pickup-modal-header">
          <h3>🚚 Request Pickup</h3>
          <button className="pickup-modal-close" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <div className="pickup-modal-body">
          <div className="pickup-order-info">
            <p><strong>Order ID:</strong> {orderNumber}</p>
            {warehouseName && (
              <p><strong>Warehouse:</strong> {warehouseName}</p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="pickup-form-group">
              <label htmlFor="pickup-date">
                Pickup Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="pickup-date"
                value={pickupDate}
                onChange={(e) => {
                  setPickupDate(e.target.value);
                  if (errors.date) {
                    setErrors(prev => ({ ...prev, date: undefined }));
                  }
                }}
                min={getMinDate()}
                className={errors.date ? 'error' : ''}
                disabled={loading}
                required
              />
              {errors.date && <span className="error-message">{errors.date}</span>}
            </div>

            <div className="pickup-form-group">
              <label htmlFor="pickup-time">
                Pickup Time <span className="required">*</span>
                <small className="time-hint">(Format: HH:mm or HH:mm:ss)</small>
              </label>
              <input
                type="text"
                id="pickup-time"
                value={pickupTime}
                onChange={handleTimeChange}
                placeholder="11:00:00"
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$"
                className={errors.time ? 'error' : ''}
                disabled={loading}
                required
              />
              {errors.time && <span className="error-message">{errors.time}</span>}
              <small className="time-examples">Examples: 11:00:00, 14:30:00, 09:15:00</small>
            </div>

            <div className="pickup-form-group">
              <label htmlFor="package-count">
                Expected Package Count <span className="required">*</span>
              </label>
              <input
                type="number"
                id="package-count"
                value={packageCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setPackageCount(value);
                  if (errors.count) {
                    setErrors(prev => ({ ...prev, count: undefined }));
                  }
                }}
                min="1"
                max="100"
                className={errors.count ? 'error' : ''}
                disabled={loading}
                required
              />
              {errors.count && <span className="error-message">{errors.count}</span>}
            </div>

            <div className="pickup-modal-footer">
              <button
                type="button"
                className="pickup-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pickup-btn-submit"
                disabled={loading}
              >
                {loading ? 'Requesting...' : 'Request Pickup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PickupRequestModal;

