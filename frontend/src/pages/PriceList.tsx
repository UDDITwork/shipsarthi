import React, { useState, useEffect } from 'react';
import PriceList from '../components/PriceList';
import ShippingCalculator from '../components/ShippingCalculator';
import { authService } from '../services/authService';
import './PriceListPage.css';

interface UserProfile {
  _id: string;
  company_name: string;
  email: string;
  user_category: string;
  account_status: string;
}

const PriceListPage: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rates' | 'calculator'>('rates');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const profile = await authService.getProfile();
      setUserProfile(profile);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="price-list-page">
        <div className="loading-container">
          <div className="loading">Loading your rate card...</div>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="price-list-page">
        <div className="error-container">
          <div className="error">Error: {error}</div>
          <button onClick={loadUserProfile} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="price-list-page">
      <div className="page-header">
        <h1>Price List</h1>
        <p>Your shipping rates and cost calculator</p>
        <div className="user-category-badge">
          <span className="category-label">User Category:</span>
          <span className="category-value">{userProfile.user_category || 'Basic User'}</span>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'rates' ? 'active' : ''}`}
          onClick={() => setActiveTab('rates')}
        >
          📋 Rate Card
        </button>
        <button
          className={`tab-button ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          🧮 Cost Calculator
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'rates' && (
          <div className="rates-tab">
            <PriceList userCategory={userProfile.user_category || 'Basic User'} />
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="calculator-tab">
            <ShippingCalculator 
              userCategory={userProfile.user_category || 'Basic User'}
              onCalculate={(result) => {
                console.log('Shipping calculation result:', result);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceListPage;
