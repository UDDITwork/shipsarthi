// Location: frontend/src/components/ProfileDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../services/userService';
import './ProfileDropdown.css';

// Import SVG vector icons
import userIcon from '../profilevectors/User-Outline.svg';
import apiIcon from '../profilevectors/API icon.svg';
import group15Icon from '../profilevectors/Group 15.svg';
import groupIcon from '../profilevectors/Group.svg';
import vectorIcon from '../profilevectors/Vector.svg';

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
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt="Profile Avatar" 
              className="avatar-image"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'avatar-text';
                  span.textContent = user.initials || 'U';
                  parent.appendChild(span);
                }
              }}
            />
          ) : (
            <span className="avatar-text">{user.initials}</span>
          )}
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
            <div className="menu-icon">
              <img src={userIcon} alt="My Profile" style={{ width: '16px', height: '16px' }} />
            </div>
            <div className="menu-text">
              <div className="menu-title">My Profile</div>
              <div className="menu-subtitle">Account Setting</div>
            </div>
          </div>
        </div>

        <div className="menu-item" onClick={handleSupport}>
          <div className="menu-item-content">
            <div className="menu-icon">
              <img src={vectorIcon} alt="Support" style={{ width: '16px', height: '16px' }} />
            </div>
            <div className="menu-text">
              <div className="menu-title">Support</div>
              <div className="menu-subtitle">Contact Support</div>
            </div>
          </div>
        </div>

        <div className="menu-item" onClick={handleTermsConditions}>
          <div className="menu-item-content">
            <div className="menu-icon">
              <img src={group15Icon} alt="Terms & Conditions" style={{ width: '16px', height: '16px' }} />
            </div>
            <div className="menu-text">
              <div className="menu-title">Terms & Conditions</div>
              <div className="menu-subtitle">Read Our Terms & Conditions</div>
            </div>
          </div>
        </div>

        <div className="menu-item" onClick={handleAPIIntegration}>
          <div className="menu-item-content">
            <div className="menu-icon">
              <img src={apiIcon} alt="API Integration" style={{ width: '16px', height: '16px' }} />
            </div>
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
          <span className="logout-icon">
            <img src={groupIcon} alt="Logout" style={{ width: '12px', height: '12px' }} />
          </span>
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileDropdown;
