import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const OrderCancellation: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="order-cancellation-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/Final logo Figma 1.svg" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="order-cancellation-container">
        <h1 className="page-title">Order Cancellation Policy</h1>
        <p className="last-updated">Last updated: December 2024</p>

        <div className="content-section">
          <h2>1. Order Cancellation Overview</h2>
          <p>This policy covers the cancellation of orders placed through the Shipsarthi platform. Orders can be cancelled at different stages of the fulfillment process, each with specific terms and conditions.</p>
        </div>

        <div className="content-section">
          <h2>2. Cancellation Timeframes</h2>
          <div className="timeframe-chart">
            <div className="timeframe-item">
              <h3>Immediate Cancellation (0-2 hours)</h3>
              <p>Orders can be cancelled immediately after placement with full refund, no questions asked.</p>
            </div>
            <div className="timeframe-item">
              <h3>Pre-Processing (2-24 hours)</h3>
              <p>Orders can be cancelled before processing begins with minimal charges.</p>
            </div>
            <div className="timeframe-item">
              <h3>Processing Stage (24-48 hours)</h3>
              <p>Orders in processing may be cancelled with processing fees applied.</p>
            </div>
            <div className="timeframe-item">
              <h3>Shipped Orders (48+ hours)</h3>
              <p>Once shipped, orders follow our shipment cancellation policy.</p>
            </div>
          </div>
        </div>

        <div className="content-section">
          <h2>3. How to Cancel an Order</h2>
          <div className="cancellation-steps">
            <h3>Method 1: Dashboard Cancellation</h3>
            <ol>
              <li>Log into your Shipsarthi account</li>
              <li>Navigate to the Orders section</li>
              <li>Find the order you wish to cancel</li>
              <li>Click on "Cancel Order" button</li>
              <li>Select cancellation reason from dropdown</li>
              <li>Confirm cancellation</li>
            </ol>

            <h3>Method 2: Support Request</h3>
            <ol>
              <li>Email us at hello@shipsarthi.com with your order ID</li>
              <li>Call our support line at 9351205202</li>
              <li>Use the support chat feature on our platform</li>
              <li>Provide order details and cancellation reason</li>
            </ol>
          </div>
        </div>

        <div className="content-section">
          <h2>4. Cancellation Charges and Refunds</h2>
          <div className="charges-breakdown">
            <table>
              <thead>
                <tr>
                  <th>Order Stage</th>
                  <th>Cancellation Fee</th>
                  <th>Refund Timeline</th>
                  <th>Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Immediate (0-2 hrs)</td>
                  <td>₹0</td>
                  <td>Instant</td>
                  <td>100%</td>
                </tr>
                <tr>
                  <td>Pre-Processing</td>
                  <td>₹25</td>
                  <td>24-48 hrs</td>
                  <td>Order value - ₹25</td>
                </tr>
                <tr>
                  <td>Processing</td>
                  <td>₹50</td>
                  <td>3-5 days</td>
                  <td>Order value - ₹50</td>
                </tr>
                <tr>
                  <td>Shipped</td>
                  <td>As per shipment policy</td>
                  <td>5-7 days</td>
                  <td>Varies</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="content-section">
          <h2>5. Refund Methods</h2>
          <p>Refunds will be processed using the original payment method:</p>
          <ul>
            <li><strong>Credit/Debit Cards:</strong> 3-5 business days</li>
            <li><strong>Net Banking:</strong> 2-3 business days</li>
            <li><strong>UPI:</strong> 1-2 business days</li>
            <li><strong>Wallet:</strong> Instant credit</li>
            <li><strong>Bank Transfer:</strong> 5-7 business days</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>6. Special Order Types</h2>
          <div className="special-orders">
            <h3>COD Orders</h3>
            <ul>
              <li>Can be cancelled before dispatch</li>
              <li>No refund needed as payment not collected</li>
              <li>Processing fees still apply</li>
            </ul>

            <h3>Express Orders</h3>
            <ul>
              <li>Higher cancellation charges (₹100)</li>
              <li>Limited cancellation window</li>
              <li>Priority processing for refunds</li>
            </ul>

            <h3>Bulk Orders</h3>
            <ul>
              <li>Individual item cancellation possible</li>
              <li>Volume discounts may be affected</li>
              <li>Special terms for large cancellations</li>
            </ul>

            <h3>International Orders</h3>
            <ul>
              <li>Customs clearance fees non-refundable</li>
              <li>Extended processing times</li>
              <li>Currency conversion charges apply</li>
            </ul>
          </div>
        </div>

        <div className="content-section">
          <h2>7. Non-Cancellable Orders</h2>
          <p>The following orders cannot be cancelled:</p>
          <ul>
            <li>Orders already delivered</li>
            <li>Custom or personalized items</li>
            <li>Perishable goods</li>
            <li>Digital products or services</li>
            <li>Orders with special handling requirements</li>
            <li>Orders marked as "Non-Cancellable" at checkout</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>8. Dispute Resolution</h2>
          <p>If you have issues with order cancellation:</p>
          <ol>
            <li>Contact our customer support within 48 hours</li>
            <li>Provide order details and issue description</li>
            <li>Our team will investigate and respond within 24 hours</li>
            <li>If unsatisfied, escalate to our management team</li>
            <li>Final resolution within 7 business days</li>
          </ol>
        </div>

        <div className="content-section">
          <h2>9. Business Hours</h2>
          <p>Order cancellation requests are processed during:</p>
          <ul>
            <li><strong>Monday to Friday:</strong> 9:00 AM - 6:00 PM IST</li>
            <li><strong>Saturday:</strong> 10:00 AM - 4:00 PM IST</li>
            <li><strong>Sunday:</strong> Closed</li>
            <li><strong>Holidays:</strong> Limited support available</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>10. Contact Information</h2>
          <p>For order cancellation assistance:</p>
          <div className="contact-details">
            <p><strong>Email:</strong> hello@shipsarthi.com</p>
            <p><strong>Phone:</strong> 9636369672</p>
            <p><strong>WhatsApp:</strong> 9636369672</p>
            <p><strong>Support Portal:</strong> Available 24/7 for urgent issues</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OrderCancellation;
