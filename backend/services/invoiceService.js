// Location: backend/services/invoiceService.js
const Invoice = require('../models/Invoice');
const BillingCycle = require('../models/BillingCycle');
const Order = require('../models/Order');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

class InvoiceService {
  
  /**
   * Generate invoice from a closed billing cycle
   */
  static async generateInvoiceFromCycle(billingCycleId) {
    const cycle = await BillingCycle.findById(billingCycleId)
      .populate('user_id', 'your_name company_name email gstin state address');
    
    if (!cycle) {
      throw new Error('Billing cycle not found');
    }
    
    if (cycle.status === 'invoiced') {
      throw new Error('Invoice already generated for this cycle');
    }
    
    const user = cycle.user_id;
    
    // Determine if IGST or CGST+SGST based on state
    // Delhivery is in Haryana (06), so if user is not in Haryana, it's inter-state (IGST)
    const delhiveryStateCode = '06'; // Haryana
    const userStateCode = this.getStateCode(user.state || user.address?.state);
    const isIGST = userStateCode !== delhiveryStateCode;
    
    // Get all orders in this cycle
    const orders = await Order.find({
      _id: { $in: cycle.order_ids },
      'billing_info.billing_status': 'unbilled'
    });
    
    // Create invoice
    const invoice = new Invoice({
      user_id: cycle.user_id._id,
      billing_period: {
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        cycle_number: cycle.cycle_number,
        month: cycle.month,
        year: cycle.year
      },
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      service_type: 'Domestic B2C',
      gst_info: {
        buyer_gstin: user.gstin,
        place_of_supply: userStateCode,
        place_of_supply_name: user.state || user.address?.state,
        is_igst: isIGST
      },
      billing_address: {
        company_name: user.company_name,
        address: user.address?.full_address,
        city: user.address?.city,
        state: user.state || user.address?.state,
        pincode: user.address?.pincode
      },
      user_category_snapshot: user.user_category,
      billing_cycle_id: cycle._id
    });
    
    // Add each order as shipment charge
    for (const order of orders) {
      const shipmentData = {
        awb_number: order.delhivery_data?.waybill,
        order_id: order._id,
        internal_order_id: order.order_id,
        order_date: order.order_date,
        delivery_date: order.delivered_date,
        shipment_status: this.mapOrderStatusToShipmentStatus(order.status),
        weight: {
          declared_weight: order.billing_info?.declared_weight,
          volumetric_weight: order.billing_info?.volumetric_weight,
          charged_weight: order.billing_info?.charged_weight
        },
        zone: order.billing_info?.zone,
        pickup_pincode: order.pickup_address?.pincode,
        delivery_pincode: order.delivery_address?.pincode,
        charges: {
          forward_charge: order.billing_info?.charges?.forward_charge || 0,
          rto_charge: order.billing_info?.charges?.rto_charge || 0,
          cod_charge: order.billing_info?.charges?.cod_charge || 0
        },
        total_charge: order.billing_info?.charges?.total_charge || 0,
        payment_mode: order.payment_info?.payment_mode,
        cod_amount: order.payment_info?.cod_amount
      };
      
      invoice.addShipment(shipmentData);
      
      // Mark order as billed
      order.billing_info.billing_status = 'billed';
      order.billing_info.invoice_id = invoice._id;
      order.billing_info.billed_at = new Date();
      await order.save();
    }
    
    // Calculate taxes and finalize
    await invoice.finalize();
    
    // Mark cycle as invoiced
    await cycle.markAsInvoiced(invoice._id);
    
    return invoice;
  }
  
  /**
   * Get invoices for user with filters (for Invoice List page)
   */
  static async getInvoices(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      status,
      search,
      sortBy = 'invoice_date',
      sortOrder = -1
    } = options;
    
    const query = { user_id: userId };
    
    // Date range filter
    if (startDate || endDate) {
      query.invoice_date = {};
      if (startDate) query.invoice_date.$gte = new Date(startDate);
      if (endDate) query.invoice_date.$lte = new Date(endDate);
    }
    
    // Status filter
    if (status && status !== 'all') {
      query.payment_status = status;
    }
    
    // Search by invoice number
    if (search) {
      query.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { delhivery_invoice_id: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [invoices, totalCount] = await Promise.all([
      Invoice.find(query)
        .select('-shipment_charges') // Exclude heavy array for list
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query)
    ]);
    
    return {
      invoices,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        per_page: limit
      }
    };
  }
  
  /**
   * Get single invoice with full details (for Invoice Detail page)
   */
  static async getInvoiceDetail(invoiceId, userId) {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      user_id: userId
    }).lean();
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    return invoice;
  }
  
  /**
   * Get transaction list for invoice (CSV/Excel download)
   */
  static async getTransactionList(invoiceId, userId) {
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      user_id: userId
    }).select('shipment_charges billing_period invoice_number').lean();
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Transform for CSV export
    const transactions = invoice.shipment_charges.map(sc => ({
      'AWB Number': sc.awb_number,
      'Order ID': sc.internal_order_id,
      'Order Date': sc.order_date,
      'Delivery Date': sc.delivery_date || '',
      'Status': sc.shipment_status,
      'Pickup Pincode': sc.pickup_pincode,
      'Delivery Pincode': sc.delivery_pincode,
      'Zone': sc.zone,
      'Declared Weight (g)': sc.weight?.declared_weight,
      'Charged Weight (g)': sc.weight?.charged_weight,
      'Payment Mode': sc.payment_mode,
      'COD Amount': sc.cod_amount || 0,
      'Forward Charge': sc.charges?.forward_charge || 0,
      'RTO Charge': sc.charges?.rto_charge || 0,
      'COD Charge': sc.charges?.cod_charge || 0,
      'Total Charge': sc.total_charge
    }));
    
    return {
      invoice_number: invoice.invoice_number,
      billing_period: invoice.billing_period,
      transactions
    };
  }
  
  /**
   * Map order status to shipment status for invoice
   */
  static mapOrderStatusToShipmentStatus(orderStatus) {
    const statusMap = {
      'delivered': 'delivered',
      'rto': 'rto',
      'cancelled': 'cancelled',
      'lost': 'lost',
      'in_transit': 'in_transit',
      'out_for_delivery': 'in_transit',
      'pickups_manifests': 'in_transit',
      'ready_to_ship': 'in_transit',
      'new': 'in_transit'
    };
    return statusMap[orderStatus] || 'in_transit';
  }
  
  /**
   * Get state code for GST
   */
  static getStateCode(stateName) {
    const stateCodeMap = {
      'Andhra Pradesh': '37',
      'Arunachal Pradesh': '12',
      'Assam': '18',
      'Bihar': '10',
      'Chhattisgarh': '22',
      'Goa': '30',
      'Gujarat': '24',
      'Haryana': '06',
      'Himachal Pradesh': '02',
      'Jharkhand': '20',
      'Karnataka': '29',
      'Kerala': '32',
      'Madhya Pradesh': '23',
      'Maharashtra': '27',
      'Manipur': '14',
      'Meghalaya': '17',
      'Mizoram': '15',
      'Nagaland': '13',
      'Odisha': '21',
      'Punjab': '03',
      'Rajasthan': '08',
      'Sikkim': '11',
      'Tamil Nadu': '33',
      'Telangana': '36',
      'Tripura': '16',
      'Uttar Pradesh': '09',
      'Uttarakhand': '05',
      'West Bengal': '19',
      'Delhi': '07',
      'Jammu and Kashmir': '01',
      'Ladakh': '38',
      'Chandigarh': '04',
      'Puducherry': '34',
      'Andaman and Nicobar Islands': '35',
      'Dadra and Nagar Haveli': '26',
      'Daman and Diu': '25',
      'Lakshadweep': '31'
    };
    
    // Handle variations
    const normalizedState = stateName?.trim();
    return stateCodeMap[normalizedState] || '99'; // 99 for unknown
  }
}

module.exports = InvoiceService;

