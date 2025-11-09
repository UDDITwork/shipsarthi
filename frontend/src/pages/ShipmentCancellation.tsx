import React from 'react';
import Footer from '../components/Footer';

const ShipmentCancellation: React.FC = () => {
  return (
    <div className="shipment-cancellation-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <img src="/NEW LOGO.png" alt="Shipsarthi" className="logo-img" />
            <span className="logo-text">Shipsarthi</span>
          </div>
        </div>
      </header>

      <div className="shipment-cancellation-container">
        <h1 className="page-title">Refund & Cancellation Policy</h1>
        <p className="last-updated">Shipsarthi Solutions</p>
        <p className="last-updated">Effective Date: Upon registration or acceptance on the Shipsarthi Solutions platform</p>

        <div className="content-section">
          <h2>1. General Policy</h2>
          <p>All requests for refunds must be submitted in writing to Shipsarthi Solutions at hello@shipsarthi.com and must be received on the same day the service was purchased.</p>
          <p>Refunds may take 10–15 working days to process. You will be notified via email once the refund is initiated, and all refunds will be made through bank transfer or cheque.</p>
          <p>Payments made via credit/debit cards or wallets will be credited back to the respective payment source.</p>
          <p>When submitting a refund or cancellation request, you must mention your Shipsarthi reference number. Failure to provide the required information may result in the rejection of your refund or cancellation request.</p>
          <p><strong>Note:</strong> Refunds cannot be processed for any consequential, indirect, or incidental losses.</p>
        </div>

        <div className="content-section">
          <h2>2. Order Cancellations</h2>
          <p>To cancel an order, please contact Shipsarthi Solutions before the shipping label is generated, and on the same day as your scheduled pickup collection date.</p>
          <p>For B2C shipments, refunds will be processed instantly upon successful cancellation.</p>
          <p>For B2B shipments, cancellations and refunds will be processed within 72 hours of request.</p>
          <p>If a shipment is returned due to:</p>
          <ul>
            <li>Improper or insufficient packaging,</li>
            <li>Incorrect information provided by the customer, or</li>
            <li>Wrong shipment weight declared by the user,</li>
          </ul>
          <p>Shipsarthi Solutions shall not be responsible for the return and shall not be liable for any refund in such cases.</p>
        </div>

        <div className="content-section">
          <h2>3. Taxes and Documentation</h2>
          <p>You are solely responsible for:</p>
          <ul>
            <li>Any additional taxes, duties, or cess imposed by the Government, and</li>
            <li>Ensuring all state-specific documentation is correctly provided.</li>
          </ul>
          <p>If a shipment is returned due to non-payment of taxes or incomplete/improper documentation, Shipsarthi Solutions will not be liable for any refund or compensation.</p>
        </div>

        <div className="content-section">
          <h2>4. Failed Pickup</h2>
          <p>If a pickup attempt fails, the order will be cancelled. To avoid this, request a re-pickup within 24 hours of the failed attempt.</p>
          <p>Additionally:</p>
          <p>All AWBs/labels expire 3 days after generation if the pickup is not completed.</p>
        </div>

        <div className="content-section">
          <h2>5. Conditions Where Refunds Are Not Applicable</h2>
          <p>Shipsarthi Solutions shall not be liable for refunds in the following cases:</p>
          <ul>
            <li>Violation of our Terms and Conditions, including items on the Prohibited List.</li>
            <li>Incorrect shipment or booking details entered by the customer.</li>
            <li>Delays or failures caused by the ambiguous or unclear labelling of consignments.</li>
            <li>Shipments returned, damaged, or lost due to incorrect information, packaging issues, or policy violations.</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>6. Damaged, Partial, or Wrong Deliveries</h2>
          <p>If you or your buyer receives a damaged, partial, wrong, or empty shipment, please raise a support ticket within 24–48 hours from the delivery date.</p>
          <p>You must upload:</p>
          <ul>
            <li>Pre- and post-shipping photos/videos of the parcel,</li>
            <li>The visible shipping label, and</li>
            <li>Relevant evidence to support your claim.</li>
          </ul>
          <p>We will not accept claims raised after 48 hours.</p>
        </div>

        <div className="content-section">
          <h2>7. Lost Shipments and Delayed Deliveries</h2>
          <p>If there is no shipment movement for 60 days from pickup, the shipment will be marked as lost.</p>
          <p>In such cases:</p>
          <ul>
            <li>You may be eligible for a Credit Note (CN) if you meet the respective courier partner's Terms and Conditions.</li>
            <li>Total liability is limited to ₹2,000 or shipment value, whichever is lower.</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>8. Weight Discrepancy Disputes</h2>
          <p>If a weight discrepancy arises:</p>
          <ul>
            <li>You must raise a dispute from your dashboard within 2 working days after the discrepancy.</li>
            <li>Upload clear images showing the shipment's size and actual weight. Ensure the shipping label with AWB number is visible.</li>
            <li>Disputes will be resolved within 2-3 working days from the date the dispute was raised.</li>
          </ul>
        </div>

        <div className="content-section">
          <h2>9. Force Majeure and Liability Disclaimer</h2>
          <p>Shipsarthi Solutions shall not liable for delays, losses, or damages from situations we cannot control. These include:</p>
          <ul>
            <li>Acts of God, natural disasters, or unforeseen weather events</li>
            <li>Strikes, riots, or political unrest</li>
            <li>Accidents involving the vehicle or carrier transporting the shipment</li>
            <li>Customs, taxation, or governmental delays or inspections</li>
            <li>Airline or transport carriers failing to adhere to schedules</li>
            <li>Electrical or magnetic damage to data or photographic materials</li>
          </ul>
          <p>While Shipsarthi Solutions strives to provide efficient services, we cannot guarantee delivery timelines in such force majeure situations.</p>
        </div>

        <div className="content-section">
          <h2>10. Contact Information</h2>
          <p>For refund or cancellation queries, please reach out to us at:</p>
          <div className="contact-details">
            <p>📧 Email: hello@shipsarthi.com</p>
            <p>📞 Contact: +91 96363 69672</p>
            <p>🌐 Website: www.shipsarthi.com</p>
          </div>
        </div>

        <div className="content-section">
          <h2>11. Policy Updates</h2>
          <p>Shipsarthi Solutions reserves the right to modify or update this Refund & Cancellation Policy at any time without prior notice. Updates will be posted on our website with a revised "Effective Date." Continued use of the Platform constitutes acceptance of the updated Policy.</p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ShipmentCancellation;
