import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import './NDR.css';

type NDRStatus = 'action_required' | 'action_taken' | 'delivered' | 'rto' | 'all';

interface NDROrder {
  _id: string;
  orderId: string;
  awb: string;
  orderDate: Date;
  customerName: string;
  customerPhone: string;
  productName: string;
  paymentMode: string;
  ndrReason: string;
  ndrDate: Date;
  attempts: number;
  nextAttemptDate?: Date;
  nslCode: string;
  status: NDRStatus;
  action?: string;
}

interface NDRAction {
  waybill: string;
  action: 'RE-ATTEMPT' | 'PICKUP_RESCHEDULE';
  reason?: string;
}

const NDR: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NDRStatus>('action_required');
  const [ndrOrders, setNdrOrders] = useState<NDROrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    from: '28-05-2025',
    to: '28-06-2025'
  });

  // Tab counts
  const [tabCounts, setTabCounts] = useState({
    action_required: 719,
    action_taken: 120,
    delivered: 890,
    rto: 110,
    all: 710
  });

  useEffect(() => {
    fetchNDROrders();
  }, [activeTab]);

  const fetchNDROrders = async () => {
    setLoading(true);
    try {
      // API call to fetch NDR orders
      // const response = await ndrService.getNDROrders({ status: activeTab });
      // setNdrOrders(response.data);
      
      // Dummy data for now
      setNdrOrders([]);
    } catch (error) {
      console.error('Error fetching NDR orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === ndrOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(ndrOrders.map(order => order._id));
    }
  };

  const handleReAttempt = async (awb: string) => {
    try {
      setLoading(true);
      // API call to re-attempt delivery
      // const result = await ndrService.takeNDRAction({
      //   waybill: awb,
      //   action: 'RE-ATTEMPT'
      // });
      
      alert(`Re-attempt scheduled for AWB: ${awb}`);
      fetchNDROrders();
    } catch (error) {
      console.error('Error scheduling re-attempt:', error);
      alert('Failed to schedule re-attempt');
    } finally {
      setLoading(false);
    }
  };

  const handlePickupReschedule = async (awb: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to reschedule pickup? This will initiate RTO.'
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      // API call to reschedule pickup (RTO)
      // const result = await ndrService.takeNDRAction({
      //   waybill: awb,
      //   action: 'PICKUP_RESCHEDULE'
      // });
      
      alert(`Pickup rescheduled for AWB: ${awb}`);
      fetchNDROrders();
    } catch (error) {
      console.error('Error rescheduling pickup:', error);
      alert('Failed to reschedule pickup');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReAttempt = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order');
      return;
    }

    const confirmed = window.confirm(
      `Schedule re-attempt for ${selectedOrders.length} orders?`
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      // Bulk API call
      // const awbs = ndrOrders
      //   .filter(order => selectedOrders.includes(order._id))
      //   .map(order => order.awb);
      
      // await ndrService.bulkNDRAction({
      //   waybills: awbs,
      //   action: 'RE-ATTEMPT'
      // });
      
      alert(`Re-attempt scheduled for ${selectedOrders.length} orders`);
      setSelectedOrders([]);
      fetchNDROrders();
    } catch (error) {
      console.error('Error in bulk re-attempt:', error);
      alert('Failed to schedule bulk re-attempt');
    } finally {
      setLoading(false);
    }
  };

  const canReAttempt = (order: NDROrder): boolean => {
    const allowedNSLCodes = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];
    return allowedNSLCodes.includes(order.nslCode) && order.attempts <= 2;
  };

  const canReschedulePickup = (order: NDROrder): boolean => {
    const allowedNSLCodes = ['EOD-777', 'EOD-21'];
    return allowedNSLCodes.includes(order.nslCode) && order.attempts <= 2;
  };

  return (
    <Layout>
      <div className="ndr-container">
        {/* Status Tabs */}
        <div className="ndr-tabs">
          <button
            className={`ndr-tab ${activeTab === 'action_required' ? 'active' : ''}`}
            onClick={() => setActiveTab('action_required')}
          >
            Action Required ({tabCounts.action_required})
          </button>
          <button
            className={`ndr-tab ${activeTab === 'action_taken' ? 'active' : ''}`}
            onClick={() => setActiveTab('action_taken')}
          >
            Action Taken ({tabCounts.action_taken})
          </button>
          <button
            className={`ndr-tab ${activeTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered ({tabCounts.delivered})
          </button>
          <button
            className={`ndr-tab ${activeTab === 'rto' ? 'active' : ''}`}
            onClick={() => setActiveTab('rto')}
          >
            RTO ({tabCounts.rto})
          </button>
          <button
            className={`ndr-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({tabCounts.all})
          </button>
        </div>

        {/* Filters Section */}
        <div className="ndr-filters">
          <div className="date-filter">
            <button className="calendar-btn">
              📅 {dateRange.from} to {dateRange.to}
            </button>
          </div>

          <button className="more-filters-btn">
            🎚️ More Filter
          </button>

          {selectedOrders.length > 0 && (
            <button className="bulk-action-btn" onClick={handleBulkReAttempt}>
              🔄 Bulk Re-Attempt ({selectedOrders.length})
            </button>
          )}

          <div className="export-btns">
            <button className="export-btn">Download</button>
            <button className="export-btn">Help</button>
          </div>
        </div>

        {/* NDR Table */}
        <div className="ndr-table-container">
          <table className="ndr-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === ndrOrders.length && ndrOrders.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Order Date</th>
                <th>Order Details</th>
                <th>Product Details</th>
                <th>Payment</th>
                <th>Tracking</th>
                <th>Shipping Details</th>
                <th>NDR Details</th>
                <th>Attempts</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="loading-cell">
                    Loading NDR orders...
                  </td>
                </tr>
              ) : ndrOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data-cell">
                    <div className="no-ndr">
                      <div className="no-ndr-icon">📦</div>
                      <h3>No NDR orders found</h3>
                      <p>
                        {activeTab === 'action_required'
                          ? 'No orders require action at the moment'
                          : `No ${activeTab.replace('_', ' ')} orders`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                ndrOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                      />
                    </td>
                    <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td>
                      <div className="order-details-cell">
                        <div className="order-id">{order.orderId}</div>
                        <div className="customer-name">{order.customerName}</div>
                        <div className="customer-phone">{order.customerPhone}</div>
                      </div>
                    </td>
                    <td>
                      <div className="product-details-cell">
                        {order.productName}
                      </div>
                    </td>
                    <td>
                      <span className={`payment-mode ${order.paymentMode.toLowerCase()}`}>
                        {order.paymentMode}
                      </span>
                    </td>
                    <td>
                      <div className="tracking-cell">
                        <div className="awb">AWB: {order.awb}</div>
                        <div className="nsl-code">NSL: {order.nslCode}</div>
                      </div>
                    </td>
                    <td>
                      <div className="shipping-details-cell">
                        {/* Shipping address */}
                      </div>
                    </td>
                    <td>
                      <div className="ndr-details-cell">
                        <div className="ndr-reason">{order.ndrReason}</div>
                        <div className="ndr-date">
                          {new Date(order.ndrDate).toLocaleDateString()}
                        </div>
                        {order.nextAttemptDate && (
                          <div className="next-attempt">
                            Next: {new Date(order.nextAttemptDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="attempts-cell">
                        <span className="attempt-count">{order.attempts}/3</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {activeTab === 'action_required' && (
                          <>
                            {canReAttempt(order) && (
                              <button
                                className="action-btn reattempt-btn"
                                onClick={() => handleReAttempt(order.awb)}
                                title="Re-Attempt Delivery"
                              >
                                🔄 Re-Attempt
                              </button>
                            )}
                            {canReschedulePickup(order) && (
                              <button
                                className="action-btn rto-btn"
                                onClick={() => handlePickupReschedule(order.awb)}
                                title="Reschedule Pickup (RTO)"
                              >
                                📦 RTO
                              </button>
                            )}
                          </>
                        )}
                        <button className="action-btn view-btn" title="View Details">
                          👁️ View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* NDR Guidelines */}
        <div className="ndr-guidelines">
          <h3>⚠️ NDR Action Guidelines:</h3>
          <ul>
            <li>
              <strong>Re-Attempt:</strong> Should be applied after 9 PM to ensure all NDR AWBs are back in facility
            </li>
            <li>
              <strong>Allowed NSL Codes for Re-Attempt:</strong> EOD-74, EOD-15, EOD-104, EOD-43, EOD-86, EOD-11, EOD-69, EOD-6
            </li>
            <li>
              <strong>Pickup Reschedule (RTO):</strong> Allowed for NSL codes EOD-777, EOD-21
            </li>
            <li>
              <strong>Attempt Limit:</strong> Maximum 3 attempts allowed per shipment
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default NDR;