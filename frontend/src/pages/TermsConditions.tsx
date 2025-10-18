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
        <div className="terms-header">
          <div className="terms-images">
            <img src="https://privacyterms.io/wp-content/uploads/Terms-Agreement-1-500x500.png" alt="Terms Agreement" className="terms-image" />
            <img src="https://investelite.in/webassets/images-new/termsconditions/terms-and-conditions.png" alt="Terms and Conditions" className="terms-image" />
          </div>
          <h1 className="page-title">Terms and Conditions</h1>
          <p className="last-updated">Last updated: December 2024</p>
        </div>

        <div className="content-section">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using the ShipSarthi platform, you accept and agree to be bound by the terms and provision of this agreement. These Terms and Conditions govern your use of our logistics aggregation services.</p>
          <p>If you do not agree to these terms, please do not use our services. Your continued use of the platform constitutes acceptance of these terms.</p>
        </div>

        <div className="content-section">
          <h2>2. Service Description</h2>
          <p>ShipSarthi is a comprehensive logistics middleware platform that connects e-commerce sellers with leading logistics providers including Delhivery, Amazon, Xpressbees, DTDC, Trackon, and other trusted courier partners. We provide:</p>
          <ul>
            <li>Advanced order management and real-time tracking</li>
            <li>Multi-courier partner integration and optimization</li>
            <li>Intelligent shipment routing and cost optimization</li>
            <li>Comprehensive NDR (Non-Delivery Report) management</li>
            <li>RESTful API integration services</li>
            <li>Automated billing and payment processing</li>
            <li>Analytics and reporting dashboard</li>
            <li>Customer support and dispute resolution</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>3. User Registration and Account</h2>
          <p>To use our services, you must:</p>
          <ul>
            <li>Provide accurate, complete, and current information</li>
            <li>Maintain and update your account information</li>
            <li>Keep your login credentials secure and confidential</li>
            <li>Notify us immediately of any unauthorized use</li>
            <li>Be at least 18 years old or have parental consent</li>
          </ul>
          <p>You are responsible for all activities that occur under your account.</p>
        </div>

        <div className="content-section">
          <h2>4. User Responsibilities and Prohibited Activities</h2>
          <p>As a user of our platform, you agree to:</p>
          <ul>
            <li>Comply with all applicable laws and regulations</li>
            <li>Provide accurate shipment information and documentation</li>
            <li>Ensure proper packaging and labeling of shipments</li>
            <li>Not ship prohibited or restricted items</li>
            <li>Pay all fees and charges in a timely manner</li>
            <li>Maintain the confidentiality of your account</li>
          </ul>
          <p><strong>Prohibited Activities:</strong></p>
          <ul>
            <li>Using our services for illegal or unauthorized purposes</li>
            <li>Attempting to gain unauthorized access to our systems</li>
            <li>Interfering with or disrupting our services</li>
            <li>Providing false or misleading information</li>
            <li>Violating any intellectual property rights</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>5. Shipping and Delivery Terms</h2>
          <p>Our shipping services are provided through third-party courier partners. Important terms include:</p>
          <ul>
            <li>Delivery times are estimates and may vary</li>
            <li>We are not responsible for physical handling of packages</li>
            <li>Courier partners handle actual delivery and collection</li>
            <li>Weather conditions and force majeure events may cause delays</li>
            <li>International shipments are subject to customs regulations</li>
          </ul>
          <p><strong>Limitations:</strong> ShipSarthi is not responsible for delays, lost packages, or damages caused by courier partners, weather conditions, or circumstances beyond our control.</p>
        </div>

        <div className="content-section">
          <h2>6. Payment Terms and Billing</h2>
          <p>Payment terms and conditions:</p>
          <ul>
            <li>Prepaid shipping charges must be paid before shipment creation</li>
            <li>COD (Cash on Delivery) charges are collected by courier partners</li>
            <li>Wallet recharge is required for prepaid shipments</li>
            <li>Payment methods include credit cards, net banking, UPI, and wallets</li>
            <li>Refunds are processed within 7-10 business days</li>
            <li>Late payment may result in service suspension</li>
            <li>All prices are exclusive of applicable taxes</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>7. Limitation of Liability and Disclaimers</h2>
          <p>To the maximum extent permitted by law, ShipSarthi shall not be liable for:</p>
          <ul>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, revenue, or business opportunities</li>
            <li>Delays in delivery beyond our control</li>
            <li>Third-party courier partner actions or omissions</li>
            <li>Data loss or system downtime</li>
            <li>Force majeure events</li>
          </ul>
          <p>Our total liability shall not exceed the amount paid by you for the specific service in question.</p>
        </div>

        <div className="content-section">
          <h2>8. Intellectual Property Rights</h2>
          <p>All content, trademarks, logos, and intellectual property on the ShipSarthi platform are owned by us or our licensors. You may not:</p>
          <ul>
            <li>Copy, modify, or distribute our content without permission</li>
            <li>Use our trademarks or logos without written consent</li>
            <li>Reverse engineer our software or systems</li>
            <li>Create derivative works based on our platform</li>
            <li>Remove or alter any proprietary notices</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>9. Account Suspension and Termination</h2>
          <p>We reserve the right to suspend or terminate your account if:</p>
          <ul>
            <li>You violate these terms and conditions</li>
            <li>You provide false or misleading information</li>
            <li>You fail to pay outstanding fees</li>
            <li>You engage in fraudulent activities</li>
            <li>You misuse our services or platform</li>
            <li>You breach any applicable laws or regulations</li>
          </ul>
          <p>Upon termination, your right to use our services ceases immediately.</p>
        </div>

        <div className="content-section">
          <h2>10. Privacy and Data Protection</h2>
          <p>Your privacy is important to us. We collect, use, and protect your information in accordance with our Privacy Policy. Key points include:</p>
          <ul>
            <li>We collect necessary information to provide our services</li>
            <li>Your data is protected using industry-standard security measures</li>
            <li>We do not sell your personal information to third parties</li>
            <li>You have the right to access, update, or delete your information</li>
            <li>We comply with applicable data protection laws</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>11. Force Majeure</h2>
          <p>ShipSarthi shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to:</p>
          <ul>
            <li>Natural disasters, pandemics, or epidemics</li>
            <li>Government actions or regulations</li>
            <li>War, terrorism, or civil unrest</li>
            <li>Internet or telecommunications failures</li>
            <li>Courier partner service disruptions</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>12. Changes to Terms and Conditions</h2>
          <p>We may modify these terms at any time. We will notify users of significant changes through:</p>
          <ul>
            <li>Email notifications</li>
            <li>Platform announcements</li>
            <li>Updated terms posted on our website</li>
          </ul>
          <p>Continued use of our services after changes constitutes acceptance of the new terms.</p>
        </div>

        <div className="content-section">
          <h2>13. Governing Law and Dispute Resolution</h2>
          <p>These terms are governed by the laws of India. Any disputes shall be resolved through:</p>
          <ul>
            <li>Good faith negotiations between parties</li>
            <li>Mediation if negotiations fail</li>
            <li>Arbitration under Indian Arbitration and Conciliation Act</li>
            <li>Courts of competent jurisdiction in India</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>14. Severability and Waiver</h2>
          <p>If any provision of these terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. Our failure to enforce any right or provision shall not constitute a waiver of such right or provision.</p>
        </div>

        <div className="content-section">
          <h2>15. Contact Information</h2>
          <p>For questions about these Terms and Conditions, please contact us:</p>
          <div className="contact-details">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9351205202</p>
            <p><strong>Address:</strong> ShipSarthi Logistics Solutions, India</p>
            <p><strong>Business Hours:</strong> Monday to Friday, 9:00 AM to 6:00 PM IST</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsConditions;
