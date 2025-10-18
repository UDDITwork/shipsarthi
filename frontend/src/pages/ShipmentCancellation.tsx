import React from 'react';
import Footer from '../components/Footer';

const ShipmentCancellation: React.FC = () => {
  return (
    <div className="shipment-cancellation-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <img src="/Final logo Figma 1.svg" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="shipment-cancellation-container">
        <h1 className="page-title">Shipment Cancellation Policy</h1>
        <p className="last-updated">Last updated: December 2024</p>

        <div className="content-section">
          <h2>1. Cancellation Eligibility</h2>
          <p>Shipments can be cancelled under the following conditions:</p>
          <ul>
            <li><strong>Before Pickup:</strong> Full cancellation possible with 100% refund</li>
            <li><strong>After Pickup but Before Transit:</strong> Partial cancellation with refund minus pickup charges</li>
            <li><strong>In Transit:</strong> Limited cancellation options, subject to courier partner policies</li>
            <li><strong>Out for Delivery:</strong> Generally not cancellable</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>2. How to Cancel a Shipment</h2>
          <p>To cancel a shipment, you can:</p>
          <ul>
            <li>Log into your Shipsarthi dashboard</li>
            <li>Go to the Orders section</li>
            <li>Find the shipment you want to cancel</li>
            <li>Click on "Cancel Shipment" if available</li>
            <li>Provide a reason for cancellation</li>
            <li>Submit the cancellation request</li>
          </ul>
          <p><strong>Alternative:</strong> Contact our support team at hello@shipsarthi.com or call 9351205202</p>
        </div>

        <div className="content-section">
          <h2>3. Cancellation Charges</h2>
          <div className="charges-table">
            <table>
              <thead>
                <tr>
                  <th>Shipment Status</th>
                  <th>Cancellation Fee</th>
                  <th>Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Before Pickup</td>
                  <td>No charges</td>
                  <td>100% of shipping cost</td>
                </tr>
                <tr>
                  <td>After Pickup</td>
                  <td>₹50 pickup fee</td>
                  <td>Shipping cost - ₹50</td>
                </tr>
                <tr>
                  <td>In Transit</td>
                  <td>As per courier partner</td>
                  <td>Varies by partner</td>
                </tr>
                <tr>
                  <td>Out for Delivery</td>
                  <td>Not applicable</td>
                  <td>Cannot be cancelled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-section">
          <h2>4. Refund Process</h2>
          <p>Refunds will be processed as follows:</p>
          <ul>
            <li><strong>Processing Time:</strong> 3-7 business days</li>
            <li><strong>Refund Method:</strong> Original payment method</li>
            <li><strong>Wallet Refund:</strong> Immediate credit to your Shipsarthi wallet</li>
            <li><strong>Bank Transfer:</strong> 5-10 business days</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>5. Courier Partner Specific Policies</h2>
          <div className="courier-policies">
            <h3>Delhivery</h3>
            <ul>
              <li>Free cancellation before pickup</li>
              <li>₹25 charge after pickup</li>
              <li>No cancellation after dispatch</li>
            </ul>

            <h3>Amazon Shipping</h3>
            <ul>
              <li>Full refund before pickup</li>
              <li>₹30 charge after pickup</li>
              <li>Limited cancellation in transit</li>
            </ul>

            <h3>Xpressbees</h3>
            <ul>
              <li>Free cancellation before pickup</li>
              <li>₹40 charge after pickup</li>
              <li>Subject to availability</li>
            </ul>

            <h3>DTDC</h3>
            <ul>
              <li>Free cancellation before pickup</li>
              <li>₹35 charge after pickup</li>
              <li>No cancellation after dispatch</li>
            </ul>

            <h3>Trackon</h3>
            <ul>
              <li>Free cancellation before pickup</li>
              <li>₹30 charge after pickup</li>
              <li>Limited transit cancellation</li>
            </ul>
          </div>
        </div>

        <div className="content-section">
          <h2>6. Special Circumstances</h2>
          <p>In certain situations, cancellation policies may be more flexible:</p>
          <ul>
            <li><strong>Technical Issues:</strong> If cancellation fails due to system errors</li>
            <li><strong>Force Majeure:</strong> Natural disasters or government restrictions</li>
            <li><strong>Courier Partner Issues:</strong> Delays or service disruptions</li>
            <li><strong>Customer Service Errors:</strong> Mistakes made by our support team</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>7. Important Notes</h2>
          <ul>
            <li>Cancellation requests are processed during business hours (9 AM - 6 PM IST)</li>
            <li>Weekend and holiday requests are processed on the next business day</li>
            <li>COD shipments cannot be cancelled once out for delivery</li>
            <li>International shipments have different cancellation policies</li>
            <li>Bulk shipments may have special cancellation terms</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>8. Contact Support</h2>
          <p>For assistance with shipment cancellation, please contact us:</p>
          <div className="contact-details">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9351205202</p>
            <p><strong>Business Hours:</strong> Monday to Friday, 9:00 AM - 6:00 PM IST</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ShipmentCancellation;
