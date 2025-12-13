// Location: frontend/src/components/LabelFormatModal.tsx
import React, { useState } from 'react';
import './LabelFormatModal.css';

interface LabelFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: string) => void;
  selectedCount: number;
}

const LabelFormatModal: React.FC<LabelFormatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('thermal');

  if (!isOpen) return null;

  const labelFormats = [
    {
      id: 'thermal',
      name: 'Thermal',
      description: '4" x 6" - Best for thermal printers',
      icon: '🖨️'
    },
    {
      id: 'standard',
      name: 'Standard',
      description: '4" x 6" - Regular printer format',
      icon: '📄'
    },
    {
      id: '2in1',
      name: '2-in-1',
      description: 'A4 Paper - 2 labels per page',
      icon: '📑'
    },
    {
      id: '4in1',
      name: '4-in-1',
      description: 'A4 Paper - 4 labels per page',
      icon: '📋'
    }
  ];

  const handleConfirm = () => {
    onConfirm(selectedFormat);
  };

  return (
    <div className="label-format-modal-overlay" onClick={onClose}>
      <div className="label-format-modal" onClick={(e) => e.stopPropagation()}>
        <div className="label-format-modal-header">
          <h2>Select Label Format</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="label-format-modal-body">
          <p className="format-description">
            Choose a format for printing {selectedCount} label{selectedCount > 1 ? 's' : ''}
          </p>

          <div className="format-options">
            {labelFormats.map(format => (
              <label
                key={format.id}
                className={`format-option ${selectedFormat === format.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="labelFormat"
                  value={format.id}
                  checked={selectedFormat === format.id}
                  onChange={() => setSelectedFormat(format.id)}
                />
                <div className="format-icon">{format.icon}</div>
                <div className="format-details">
                  <span className="format-name">{format.name}</span>
                  <span className="format-desc">{format.description}</span>
                </div>
                <div className="format-check">
                  {selectedFormat === format.id && '✓'}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="label-format-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="confirm-btn" onClick={handleConfirm}>
            Print {selectedCount} Label{selectedCount > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelFormatModal;
