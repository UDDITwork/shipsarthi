import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const scrollToTopSmooth = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(path);
    setTimeout(scrollToTopSmooth, 100);
  };

  const handleSectionNavigate = (sectionId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const scrollToSection = () => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        scrollToTopSmooth();
      }
    };

    if (window.location.pathname === '/') {
      scrollToSection();
    } else {
      navigate('/');
      setTimeout(scrollToSection, 150);
    }
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
              <li><Link to="/" onClick={handleNavigate('/')}>Home</Link></li>
              <li><Link to="/about" onClick={handleNavigate('/about')}>About Us</Link></li>
              <li><Link to="/contact" onClick={handleNavigate('/contact')}>Contact</Link></li>
              <li><Link to="/rate-calculator" onClick={handleNavigate('/rate-calculator')}>Rate Calculator</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="footer-section">
            <h3 className="footer-title">Legal</h3>
            <ul className="footer-links">
              <li><Link to="/privacy-policy" onClick={handleNavigate('/privacy-policy')}>Privacy Policy</Link></li>
              <li><Link to="/terms-conditions" onClick={handleNavigate('/terms-conditions')}>Terms & Conditions</Link></li>
              <li><Link to="/shipment-cancellation" onClick={handleNavigate('/shipment-cancellation')}>Shipment Cancellation</Link></li>
              <li><Link to="/order-cancellation" onClick={handleNavigate('/order-cancellation')}>Order Cancellation</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer-section">
            <h3 className="footer-title">Services</h3>
            <ul className="footer-links">
              <li><Link to="/" onClick={handleSectionNavigate('services')}>Services</Link></li>
              <li><Link to="/login" onClick={handleNavigate('/login')}>Dashboard</Link></li>
              <li><Link to="/login" onClick={handleNavigate('/login')}>Order Management</Link></li>
              <li><Link to="/contact" onClick={handleNavigate('/contact')}>Support</Link></li>
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
