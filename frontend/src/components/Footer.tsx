import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Company Info */}
          <div className="footer-section">
            <div className="footer-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
              <img src="/Final logo Figma 1.svg" alt="Shipsarthi" className="footer-logo-img" />
            </div>
            <p className="footer-description">
              Your trusted logistics partner connecting e-commerce sellers with leading courier services across India.
            </p>
            <div className="contact-info">
              <p><strong>Email:</strong> hello@shipsarthi.com</p>
              <p><strong>Phone:</strong> 9636369672</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/tools">Rate Calculator</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="footer-section">
            <h3 className="footer-title">Legal</h3>
            <ul className="footer-links">
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions">Terms & Conditions</Link></li>
              <li><Link to="/shipment-cancellation">Shipment Cancellation</Link></li>
              <li><Link to="/order-cancellation">Order Cancellation</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer-section">
            <h3 className="footer-title">Services</h3>
            <ul className="footer-links">
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/orders">Order Management</Link></li>
              <li><Link to="/ndr">NDR Management</Link></li>
              <li><Link to="/support">Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 Shipsarthi. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
