import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const ReturnPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="return-policy-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/NEW LOGO.png" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="return-policy-container">
        <h1 className="page-title">Return Policy</h1>
        <p className="last-updated">Last updated: January 2025</p>

        <div className="content-section">
          <h2>1. Overview</h2>
          <p>Shipsarthi is a logistics service provider that facilitates shipping and delivery through various courier partners. We understand that sometimes shipments need to be returned due to various reasons such as customer refusal, wrong delivery, or damaged goods.</p>
        </div>

        <div className="content-section">
          <h2>2. Return Process</h2>
          <p>Returns are processed through our NDR (Non-Delivery Report) system. When a shipment cannot be delivered, an NDR is generated, and you will be notified through:</p>
          <ul>
            <li>Email notifications</li>
            <li>SMS alerts</li>
            <li>Dashboard updates</li>
            <li>WhatsApp notifications (if enabled)</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>3. Return Scenarios</h2>
          <p>Common reasons for returns include:</p>
          <ul>
            <li><strong>Customer Refusal:</strong> Recipient refuses to accept the package</li>
            <li><strong>Wrong Address:</strong> Incorrect or incomplete delivery address</li>
            <li><strong>Damaged Goods:</strong> Package damaged during transit</li>
            <li><strong>Undeliverable:</strong> Package cannot be delivered due to various reasons</li>
            <li><strong>Unreachable:</strong> Contact information provided is incorrect or unreachable</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>4. Return Charges</h2>
          <p>Return charges depend on various factors:</p>
          <ul>
            <li>Return shipping charges may apply based on the courier partner's policy</li>
            <li>RTO (Return to Origin) charges are applicable as per the courier partner's rate card</li>
            <li>Processing fees may be charged for managing the return</li>
            <li>All charges will be clearly communicated before processing the return</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>5. Return Timeline</h2>
          <p>Typical return process timeline:</p>
          <ul>
            <li>NDR generated: Within 24-48 hours of delivery attempt</li>
            <li>Notification sent: Immediately upon NDR generation</li>
            <li>Return initiation: Within 24 hours of your approval</li>
            <li>Return in transit: 3-7 business days depending on location</li>
            <li>Return received: You will be notified upon arrival at origin warehouse</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>6. Return Request</h2>
          <p>To initiate a return:</p>
          <ul>
            <li>Log in to your Shipsarthi dashboard</li>
            <li>Navigate to the NDR section</li>
            <li>Review the undelivered shipment details</li>
            <li>Choose your action: Re-attempt delivery or Return to Origin</li>
            <li>Confirm your decision</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>7. Refund Policy</h2>
          <p>Regarding refunds:</p>
          <ul>
            <li>Shipping charges refund is subject to courier partner's policy</li>
            <li>RTO charges are non-refundable</li>
            <li>Refunds will be processed to your Shipsarthi wallet (if applicable)</li>
            <li>Refund processing time: 7-14 business days</li>
            <li>Contact support for any refund-related queries</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>8. Damaged Items</h2>
          <p>If your shipment arrives damaged:</p>
          <ul>
            <li>File a complaint immediately through our support system</li>
            <li>Provide photographic evidence of the damage</li>
            <li>Fill out the damage report form</li>
            <li>Our team will investigate and coordinate with the courier partner</li>
            <li>Resolution timeline: 7-10 business days</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>9. Tracking Returns</h2>
          <p>You can track your return shipment:</p>
          <ul>
            <li>Through your Shipsarthi dashboard</li>
            <li>By entering the tracking number on our tracking page</li>
            <li>Receive real-time updates via email and SMS</li>
            <li>View detailed status history</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>10. Contact Us</h2>
          <p>For any questions or concerns about returns, please contact us:</p>
          <div className="contact-details">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9636369672</p>
            <p><strong>Support Hours:</strong> Monday - Saturday, 9:00 AM - 6:00 PM IST</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReturnPolicy;

