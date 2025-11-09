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
  
  // Quick date selection helpers
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  const getDayAfterDate = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  };
  
  // Quick time selection helpers
  const setTimeSlot = (slot: 'morning' | 'afternoon') => {
    if (slot === 'morning') {
      setPickupTime('11:00:00'); // 10 AM-2 PM (default to 11 AM)
    } else {
      setPickupTime('14:00:00'); // 2 PM-6 PM (default to 2 PM)
    }
    if (errors.time) {
      setErrors(prev => ({ ...prev, time: undefined }));
    }
  };

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

    // Validate date - must be Today, Tomorrow, or Day After only
    if (!pickupDate) {
      newErrors.date = 'Pickup date is required';
    } else {
      const today = getTodayDate();
      const tomorrow = getTomorrowDate();
      const dayAfter = getDayAfterDate();
      
      if (pickupDate !== today && pickupDate !== tomorrow && pickupDate !== dayAfter) {
        newErrors.date = 'Pickup date must be Today, Tomorrow, or Day After only';
      }
      
      const selectedDate = new Date(pickupDate);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (selectedDate < todayDate) {
        newErrors.date = 'Pickup date cannot be in the past';
      }
    }

    // Validate time - must be within 10 AM-2 PM or 2 PM-6 PM
    if (!pickupTime) {
      newErrors.time = 'Pickup time is required';
    } else {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timeRegex.test(pickupTime)) {
        newErrors.time = 'Invalid time format. Use HH:mm or HH:mm:ss (e.g., 11:00:00)';
      } else {
        // Parse time to check if it's within allowed ranges
        const timeParts = pickupTime.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1] || '0');
        const totalMinutes = hours * 60 + minutes;
        
        // 10 AM = 600 minutes, 2 PM = 840 minutes, 6 PM = 1080 minutes
        const isMorningSlot = totalMinutes >= 600 && totalMinutes < 840; // 10:00 to 13:59
        const isAfternoonSlot = totalMinutes >= 840 && totalMinutes < 1080; // 14:00 to 17:59
        
        if (!isMorningSlot && !isAfternoonSlot) {
          newErrors.time = 'Pickup time must be between 10 AM-2 PM or 2 PM-6 PM';
        }
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
              
              {/* Quick date selection buttons - Only Today, Tomorrow, or Day After allowed */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPickupDate(getTodayDate());
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: undefined }));
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    border: pickupDate === getTodayDate() ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    background: pickupDate === getTodayDate() ? '#e7f3ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: pickupDate === getTodayDate() ? 'bold' : 'normal'
                  }}
                  disabled={loading}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickupDate(getTomorrowDate());
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: undefined }));
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    border: pickupDate === getTomorrowDate() ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    background: pickupDate === getTomorrowDate() ? '#e7f3ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: pickupDate === getTomorrowDate() ? 'bold' : 'normal'
                  }}
                  disabled={loading}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickupDate(getDayAfterDate());
                    if (errors.date) {
                      setErrors(prev => ({ ...prev, date: undefined }));
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    border: pickupDate === getDayAfterDate() ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    background: pickupDate === getDayAfterDate() ? '#e7f3ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: pickupDate === getDayAfterDate() ? 'bold' : 'normal'
                  }}
                  disabled={loading}
                >
                  Day After
                </button>
              </div>
              <small className="form-note" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                Only Today, Tomorrow, or Day After can be selected
              </small>
              {errors.date && <span className="error-message">{errors.date}</span>}
            </div>

            <div className="pickup-form-group">
              <label htmlFor="pickup-time">
                Pickup Time <span className="required">*</span>
                <small className="time-hint">(Format: HH:mm or HH:mm:ss)</small>
              </label>
              
              {/* Quick time slot selection buttons - Only 10 AM-2 PM or 2 PM-6 PM allowed */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTimeSlot('morning')}
                  style={{
                    padding: '8px 16px',
                    border: (pickupTime === '11:00:00' || pickupTime.startsWith('10:') || pickupTime.startsWith('11:') || pickupTime.startsWith('12:') || pickupTime.startsWith('13:')) ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    background: (pickupTime === '11:00:00' || pickupTime.startsWith('10:') || pickupTime.startsWith('11:') || pickupTime.startsWith('12:') || pickupTime.startsWith('13:')) ? '#e7f3ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: (pickupTime === '11:00:00' || pickupTime.startsWith('10:') || pickupTime.startsWith('11:') || pickupTime.startsWith('12:') || pickupTime.startsWith('13:')) ? 'bold' : 'normal'
                  }}
                  disabled={loading}
                >
                  10 AM - 2 PM
                </button>
                <button
                  type="button"
                  onClick={() => setTimeSlot('afternoon')}
                  style={{
                    padding: '8px 16px',
                    border: (pickupTime === '14:00:00' || pickupTime.startsWith('14:') || pickupTime.startsWith('15:') || pickupTime.startsWith('16:') || pickupTime.startsWith('17:')) ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    background: (pickupTime === '14:00:00' || pickupTime.startsWith('14:') || pickupTime.startsWith('15:') || pickupTime.startsWith('16:') || pickupTime.startsWith('17:')) ? '#e7f3ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: (pickupTime === '14:00:00' || pickupTime.startsWith('14:') || pickupTime.startsWith('15:') || pickupTime.startsWith('16:') || pickupTime.startsWith('17:')) ? 'bold' : 'normal'
                  }}
                  disabled={loading}
                >
                  2 PM - 6 PM
                </button>
              </div>
              <small className="form-note" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                Only time slots between 10 AM-2 PM or 2 PM-6 PM are allowed
              </small>
              
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
                style={{ marginTop: '8px', width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              {errors.time && <span className="error-message">{errors.time}</span>}
              <small className="time-examples" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                Examples: 11:00:00 (10 AM-2 PM), 14:30:00 (2 PM-6 PM)
              </small>
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

