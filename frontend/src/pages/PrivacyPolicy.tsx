import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/NEW LOGO.PNG" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="privacy-policy-container">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="last-updated">Last updated: December 2024</p>

        <div className="content-section">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include:</p>
          <ul>
            <li>Personal information (name, email, phone number)</li>
            <li>Business information (company name, address, GST number)</li>
            <li>Shipping and delivery information</li>
            <li>Payment and billing information</li>
            <li>Communication preferences</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our logistics services</li>
            <li>Process shipments and deliveries</li>
            <li>Communicate with you about your orders and our services</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Comply with legal obligations</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>3. Information Sharing</h2>
          <p>We may share your information in the following circumstances:</p>
          <ul>
            <li>With courier partners (Delhivery, Amazon, Xpressbees, DTDC, Trackon) for delivery purposes</li>
            <li>With service providers who assist us in operating our platform</li>
            <li>When required by law or to protect our rights</li>
            <li>In connection with a business transaction or merger</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:</p>
          <ul>
            <li>Encryption of sensitive data</li>
            <li>Regular security assessments</li>
            <li>Access controls and authentication</li>
            <li>Secure data transmission</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your personal information</li>
            <li>Object to processing of your information</li>
            <li>Data portability</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>6. Cookies and Tracking</h2>
          <p>We use cookies and similar technologies to enhance your experience on our platform, analyze usage patterns, and provide personalized content.</p>
        </div>

        <div className="content-section">
          <h2>7. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us:</p>
          <div className="contact-details">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9636369672</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
