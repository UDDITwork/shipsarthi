// Location: backend/models/BillingCycle.js
const mongoose = require('mongoose');

const billingCycleSchema = new mongoose.Schema({
  // User Reference
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Cycle Identification
  cycle_id: {
    type: String,
    unique: true,
    required: true
  },
  // Period Definition
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  cycle_number: {
    type: Number,
    enum: [1, 2], // 1 = 1st-15th, 2 = 16th-end
    required: true
  },
  // Exact Dates
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  // Cycle Status
  status: {
    type: String,
    enum: ['open', 'closed', 'invoiced'],
    default: 'open',
    index: true
  },
  // Linked Invoice (after invoicing)
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  // Running Summary (updated with each order)
  summary: {
    // Order Counts
    total_orders: { type: Number, default: 0 },
    delivered_orders: { type: Number, default: 0 },
    rto_orders: { type: Number, default: 0 },
    cancelled_orders: { type: Number, default: 0 },
    in_transit_orders: { type: Number, default: 0 },
    
    // Payment Mode Split
    prepaid_orders: { type: Number, default: 0 },
    cod_orders: { type: Number, default: 0 },
    
    // Weight (in grams)
    total_declared_weight: { type: Number, default: 0 },
    total_charged_weight: { type: Number, default: 0 },
    
    // Charges (running total)
    total_forward_charges: { type: Number, default: 0 },
    total_rto_charges: { type: Number, default: 0 },
    total_cod_charges: { type: Number, default: 0 },
    estimated_total: { type: Number, default: 0 },
    
    // COD Collection
    total_cod_amount: { type: Number, default: 0 }
  },
  // Zone Distribution (for analytics)
  zone_distribution: {
    A: { type: Number, default: 0 },
    B: { type: Number, default: 0 },
    C: { type: Number, default: 0 },
    D: { type: Number, default: 0 },
    E: { type: Number, default: 0 },
    F: { type: Number, default: 0 }
  },
  // Order References
  order_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  // Timestamps for status changes
  closed_at: Date,
  invoiced_at: Date
}, {
  timestamps: true
});

// Indexes
billingCycleSchema.index({ user_id: 1, year: 1, month: 1, cycle_number: 1 }, { unique: true });
billingCycleSchema.index({ user_id: 1, status: 1 });
billingCycleSchema.index({ start_date: 1, end_date: 1 });

// Pre-save: Generate cycle_id
billingCycleSchema.pre('save', function(next) {
  if (this.isNew && !this.cycle_id) {
    // Format: BC-USERID-202511-C1
    const userIdShort = this.user_id.toString().slice(-6);
    this.cycle_id = `BC-${userIdShort}-${this.year}${this.month.toString().padStart(2, '0')}-C${this.cycle_number}`;
  }
  next();
});

// Static: Get or create current billing cycle for user
billingCycleSchema.statics.getCurrentCycle = async function(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const cycleNumber = day <= 15 ? 1 : 2;
  
  // Try to find existing cycle
  let cycle = await this.findOne({
    user_id: userId,
    year,
    month,
    cycle_number: cycleNumber
  });
  
  if (!cycle) {
    // Calculate exact dates
    let startDate, endDate;
    
    if (cycleNumber === 1) {
      // 1st to 15th
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, 15, 23, 59, 59, 999);
    } else {
      // 16th to end of month
      startDate = new Date(year, month - 1, 16, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    }
    
    cycle = new this({
      user_id: userId,
      year,
      month,
      cycle_number: cycleNumber,
      start_date: startDate,
      end_date: endDate,
      status: 'open'
    });
    
    await cycle.save();
  }
  
  return cycle;
};

// Static: Get cycle by date
billingCycleSchema.statics.getCycleByDate = async function(userId, date) {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const cycleNumber = day <= 15 ? 1 : 2;
  
  return this.findOne({
    user_id: userId,
    year,
    month,
    cycle_number: cycleNumber
  });
};

// Static: Get cycles for date range
billingCycleSchema.statics.getCyclesByDateRange = function(userId, startDate, endDate) {
  return this.find({
    user_id: userId,
    start_date: { $gte: new Date(startDate) },
    end_date: { $lte: new Date(endDate) }
  }).sort({ start_date: -1 });
};

// Static: Get open cycles that need to be closed
billingCycleSchema.statics.getExpiredOpenCycles = function() {
  const now = new Date();
  return this.find({
    status: 'open',
    end_date: { $lt: now }
  }).populate('user_id', 'your_name email user_category gstin');
};

// Method: Add order to cycle
billingCycleSchema.methods.addOrder = function(order, charges) {
  // Prevent duplicates
  if (this.order_ids.some(id => id.equals(order._id))) {
    return this;
  }
  
  this.order_ids.push(order._id);
  
  // Update counts
  this.summary.total_orders += 1;
  
  // Payment mode
  if (order.payment_info?.payment_mode === 'COD') {
    this.summary.cod_orders += 1;
    this.summary.total_cod_amount += order.payment_info?.cod_amount || 0;
  } else {
    this.summary.prepaid_orders += 1;
  }
  
  // Weight (convert kg to grams if needed)
  const declaredWeight = (order.package_info?.weight || 0) * 1000;
  this.summary.total_declared_weight += declaredWeight;
  this.summary.total_charged_weight += charges?.weight_used || declaredWeight;
  
  // Charges
  this.summary.total_forward_charges += charges?.forwardCharges || 0;
  this.summary.total_cod_charges += charges?.codCharges || 0;
  this.summary.estimated_total += charges?.totalCharges || 0;
  
  // Zone distribution
  const zone = charges?.zone || order.billing_info?.zone;
  if (zone && this.zone_distribution[zone] !== undefined) {
    this.zone_distribution[zone] += 1;
  }
  
  return this;
};

// Method: Update order status in cycle
billingCycleSchema.methods.updateOrderStatus = function(newStatus) {
  switch (newStatus) {
    case 'delivered':
      this.summary.delivered_orders += 1;
      if (this.summary.in_transit_orders > 0) this.summary.in_transit_orders -= 1;
      break;
    case 'rto':
      this.summary.rto_orders += 1;
      if (this.summary.in_transit_orders > 0) this.summary.in_transit_orders -= 1;
      break;
    case 'cancelled':
      this.summary.cancelled_orders += 1;
      break;
    case 'in_transit':
    case 'pickups_manifests':
      this.summary.in_transit_orders += 1;
      break;
  }
  return this;
};

// Method: Add RTO charges when shipment returns
billingCycleSchema.methods.addRTOCharges = function(rtoCharge) {
  this.summary.total_rto_charges += rtoCharge;
  this.summary.estimated_total += rtoCharge;
  return this;
};

// Method: Close cycle
billingCycleSchema.methods.closeCycle = function() {
  this.status = 'closed';
  this.closed_at = new Date();
  return this.save();
};

// Method: Mark as invoiced
billingCycleSchema.methods.markAsInvoiced = function(invoiceId) {
  this.status = 'invoiced';
  this.invoice_id = invoiceId;
  this.invoiced_at = new Date();
  return this.save();
};

// Virtual: Period display string
billingCycleSchema.virtual('period_display').get(function() {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[this.month - 1];
  
  if (this.cycle_number === 1) {
    return `01 ${monthName} - 15 ${monthName}, ${this.year}`;
  } else {
    const lastDay = new Date(this.year, this.month, 0).getDate();
    return `16 ${monthName} - ${lastDay} ${monthName}, ${this.year}`;
  }
});

const BillingCycle = mongoose.model('BillingCycle', billingCycleSchema);

module.exports = BillingCycle;

