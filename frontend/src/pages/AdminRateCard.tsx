import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminRateCard.css';

const AdminRateCard: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 'new-user', label: 'New User', route: 'new-user' },
    { id: 'basic-user', label: 'Basic User', route: 'basic-user' },
    { id: 'lite-user', label: 'Lite User', route: 'lite-user' },
    { id: 'advanced', label: 'Advanced', route: 'advanced' }
  ];

  const handleCategoryClick = (route: string) => {
    navigate(`/admin/ratecard/${route}`);
  };

  return (
    <div className="admin-ratecard">
      <div className="admin-header">
        <div className="header-content">
          <div>
            <h1>Rate Card Management</h1>
            <p>Select a user category to view and edit rate card pricing</p>
          </div>
        </div>
      </div>

      <div className="ratecard-categories">
        <div className="categories-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              className="category-button"
              onClick={() => handleCategoryClick(category.route)}
            >
              <div className="category-icon">💰</div>
              <div className="category-label">{category.label}</div>
              <div className="category-arrow">→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminRateCard;

