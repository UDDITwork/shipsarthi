import React from 'react';
import Footer from '../components/Footer';

const TermsConditions: React.FC = () => {
  return (
    <div className="terms-conditions-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <img src="/Final logo Figma 1.svg" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="terms-conditions-container">
        <h1 className="page-title">Terms and Conditions</h1>
        <p className="last-updated">Last updated: December 2024</p>

        <div className="content-section">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using the Shipsarthi platform, you accept and agree to be bound by the terms and provision of this agreement. These Terms and Conditions govern your use of our logistics aggregation services.</p>
        </div>

        <div className="content-section">
          <h2>2. Service Description</h2>
          <p>Shipsarthi is a middleware platform that connects e-commerce sellers with logistics providers including Delhivery, Amazon, Xpressbees, DTDC, and Trackon. We provide:</p>
          <ul>
            <li>Order management and tracking</li>
            <li>Multiple courier partner integration</li>
            <li>Real-time shipment tracking</li>
            <li>NDR (Non-Delivery Report) management</li>
            <li>API integration services</li>
            <li>Billing and payment processing</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>3. User Responsibilities</h2>
          <p>As a user of our platform, you agree to:</p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not use our services for illegal or unauthorized purposes</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Pay all fees and charges in a timely manner</li>
            <li>Ensure proper packaging of shipments</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>4. Shipping and Delivery</h2>
          <p>Our shipping services are provided through third-party courier partners. We are not responsible for:</p>
          <ul>
            <li>Physical handling of packages</li>
            <li>Delivery delays caused by courier partners</li>
            <li>Lost or damaged packages during transit</li>
            <li>Weather-related delays</li>
            <li>Force majeure events</li>
          </ul>
          <p>Delivery times are estimates and may vary based on destination, package size, and courier partner performance.</p>
        </div>

        <div className="content-section">
          <h2>5. Payment Terms</h2>
          <p>Payment terms include:</p>
          <ul>
            <li>Prepaid shipping charges must be paid before shipment creation</li>
            <li>COD (Cash on Delivery) charges are collected by courier partners</li>
            <li>Wallet recharge is required for prepaid shipments</li>
            <li>Refunds are processed within 7-10 business days</li>
            <li>Late payment may result in service suspension</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>6. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Shipsarthi shall not be liable for:</p>
          <ul>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits or business opportunities</li>
            <li>Delays in delivery beyond our control</li>
            <li>Third-party courier partner actions or omissions</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>7. Intellectual Property</h2>
          <p>All content, trademarks, and intellectual property on the Shipsarthi platform are owned by us or our licensors. You may not:</p>
          <ul>
            <li>Copy, modify, or distribute our content without permission</li>
            <li>Use our trademarks without written consent</li>
            <li>Reverse engineer our software or systems</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>8. Account Suspension and Termination</h2>
          <p>We reserve the right to suspend or terminate your account if:</p>
          <ul>
            <li>You violate these terms and conditions</li>
            <li>You provide false or misleading information</li>
            <li>You fail to pay outstanding fees</li>
            <li>You engage in fraudulent activities</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>9. Privacy and Data Protection</h2>
          <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
        </div>

        <div className="content-section">
          <h2>10. Changes to Terms</h2>
          <p>We may modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.</p>
        </div>

        <div className="content-section">
          <h2>11. Governing Law</h2>
          <p>These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of Indian courts.</p>
        </div>

        <div className="content-section">
          <h2>12. Contact Information</h2>
          <p>For questions about these Terms and Conditions, please contact us:</p>
          <div className="contact-details">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9351205202</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsConditions;
