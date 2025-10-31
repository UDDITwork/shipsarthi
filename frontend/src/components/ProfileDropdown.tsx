// Location: frontend/src/components/ProfileDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../services/userService';
import './ProfileDropdown.css';

interface ProfileDropdownProps {
  user: UserProfile;
  onClose: () => void;
  onLogout?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, onClose, onLogout }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleMyProfile = () => {
    navigate('/profile');
    onClose();
  };

  const handleSupport = () => {
    navigate('/support');
    onClose();
  };

  const handleTermsConditions = () => {
    navigate('/terms-conditions');
    onClose();
  };

  const handleAPIIntegration = () => {
    navigate('/settings');
    onClose();
  };

  const handleLogout = () => {
    console.log('🚪 LOGOUT CLICKED');
    // Use provided logout handler if available (from Layout), otherwise use default
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('✅ LOGOUT COMPLETED - Redirecting to login');
      navigate('/login');
    }
    onClose();
  };

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      {/* User Info Section */}
      <div className="profile-header">
        <div className="user-avatar-large">
          <span className="avatar-text">{user.initials}</span>
        </div>
        <div className="user-info">
          <div className="company-name">{user.company_name}</div>
          <div className="contact-person">{user.your_name}</div>
          <div className="user-role">{user.user_type}</div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="profile-menu">
        <div className="menu-item active" onClick={handleMyProfile}>
          <div className="menu-item-content">
            <div className="menu-icon">👤</div>
            <div className="menu-text">
              <div className="menu-title">My Profile</div>
              <div className="menu-subtitle">Account Setting</div>
            </div>
          </div>
        </div>

        <div className="menu-item" onClick={handleSupport}>
          <div className="menu-item-content">
            <div className="menu-icon">🎧</div>
            <div className="menu-text">
              <div className="menu-title">Support</div>
              <div className="menu-subtitle">Contact Support</div>
            </div>
          </div>
        </div>

        <div className="menu-item" onClick={handleTermsConditions}>
          <div className="menu-item-content">
            <div className="menu-icon">📄</div>
            <div className="menu-text">
              <div className="menu-title">Terms & Conditions</div>
              <div className="menu-subtitle">Read Our Terms & Conditions</div>
            </div>
          </div>
        </div>

        <div className="menu-item" onClick={handleAPIIntegration}>
          <div className="menu-item-content">
            <div className="menu-icon">🔗</div>
            <div className="menu-text">
              <div className="menu-title">API Integration</div>
              <div className="menu-subtitle">Connect your online store</div>
            </div>
          </div>
        </div>
      </div>


      {/* Logout Button */}
      <div className="profile-footer">
        <button 
          className="logout-button" 
          onClick={handleLogout}
        >
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;
