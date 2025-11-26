const mongoose = require('mongoose');

const remittanceSchema = new mongoose.Schema({
  // Remittance Identification
  remittance_number: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Remittance Details
  date: {
    type: Date,
    required: true,
    index: true
  },
  bank_transaction_id: {
    type: String,
    trim: true,
    default: null
  },
  state: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
    index: true
  },
  total_remittance: {
    type: Number,
    required: true,
    min: 0
  },
  processed_on: {
    type: Date,
    default: null
  },

  // Account Details
  account_details: {
    bank: {
      type: String,
      trim: true
    },
    beneficiary_name: {
      type: String,
      trim: true
    },
    account_number: {
      type: String,
      trim: true
    },
    ifsc_code: {
      type: String,
      trim: true
    }
  },

  // Remittance Orders (AWB breakdown)
  remittance_orders: [{
    awb_number: {
      type: String,
      required: true,
      trim: true
    },
    amount_collected: {
      type: Number,
      required: true,
      min: 0
    },
    order_id: {
      type: String,
      trim: true
    },
    order_reference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],

  // Metadata
  total_orders: {
    type: Number,
    default: 0
  },
  uploaded_by: {
    type: String,
    default: 'admin'
  },
  upload_batch_id: {
    type: String,
    trim: true
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
remittanceSchema.index({ remittance_number: 1, user_id: 1 }); // Compound index for unique remittance per user
remittanceSchema.index({ user_id: 1, date: -1 }); // For user queries sorted by date
remittanceSchema.index({ user_id: 1, state: 1 }); // For filtering by state
remittanceSchema.index({ 'remittance_orders.awb_number': 1 }); // For AWB lookup

// Pre-save middleware
remittanceSchema.pre('save', function(next) {
  // Update total_orders count
  if (this.remittance_orders && Array.isArray(this.remittance_orders)) {
    this.total_orders = this.remittance_orders.length;
  }
  
  // Update processed_on if state changes to completed
  if (this.isModified('state') && this.state === 'completed' && !this.processed_on) {
    this.processed_on = new Date();
  }
  
  this.updated_at = new Date();
  next();
});

// Static methods
remittanceSchema.statics.getByRemittanceNumber = function(remittanceNumber, userId = null) {
  const query = { remittance_number: remittanceNumber };
  if (userId) {
    query.user_id = userId;
  }
  return this.findOne(query).populate('user_id', 'email company_name');
};

remittanceSchema.statics.findByUser = function(userId, filters = {}) {
  const query = { user_id: userId };
  
  if (filters.state) {
    query.state = filters.state;
  }
  
  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) {
      query.date.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.date.$lte = new Date(filters.dateTo);
    }
  }
  
  if (filters.search) {
    query.remittance_number = { $regex: filters.search, $options: 'i' };
  }
  
  return this.find(query).sort({ date: -1 });
};

// Instance methods
remittanceSchema.methods.markAsCompleted = function() {
  this.state = 'completed';
  if (!this.processed_on) {
    this.processed_on = new Date();
  }
  return this.save();
};

remittanceSchema.methods.addOrder = function(awbNumber, amountCollected, orderId = null, orderRef = null) {
  if (!this.remittance_orders) {
    this.remittance_orders = [];
  }
  
  // Check if order already exists
  const existingOrder = this.remittance_orders.find(
    order => order.awb_number === awbNumber
  );
  
  if (!existingOrder) {
    this.remittance_orders.push({
      awb_number: awbNumber,
      amount_collected: amountCollected,
      order_id: orderId,
      order_reference: orderRef
    });
    this.total_orders = this.remittance_orders.length;
  }
  
  return this.save();
};

module.exports = mongoose.model('Remittance', remittanceSchema);

