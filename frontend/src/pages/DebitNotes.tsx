import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import './InvoiceList.css';

const DebitNotes: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="invoice-list-container">
        <div className="invoice-list-header">
          <h1>Invoices</h1>
          <button className="learn-more-btn">
            <span>?</span> Learn More
          </button>
        </div>

        <div className="invoice-tabs">
          <button
            className="invoice-tab"
            onClick={() => navigate('/invoices')}
          >
            Invoice List
          </button>
          <button
            className="invoice-tab"
            onClick={() => navigate('/invoices/credit-notes')}
          >
            Credit Notes
          </button>
          <button
            className="invoice-tab active"
            onClick={() => navigate('/invoices/debit-notes')}
          >
            Debit Notes
          </button>
        </div>

        <div className="empty-state">
          Debit Notes functionality coming soon
        </div>
      </div>
    </Layout>
  );
};

export default DebitNotes;

