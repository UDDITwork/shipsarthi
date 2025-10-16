const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  tax_rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  hsn_code: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{4,8}$/.test(v);
      },
      message: 'Please enter a valid HSN code'
    }
  }
});

const orderSchema = new mongoose.Schema({
  // Basic Order Information
  order_id: {
    type: String,
    required: true,
    unique: true
  },
  reference_id: {
    type: String,
    unique: true,
    sparse: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Customer Information
  customer_info: {
    buyer_name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid phone number'
      }
    },
    alternate_phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid alternate phone number'
      }
    },
    email: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    gstin: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Please enter a valid GSTIN'
      }
    }
  },

  // Delivery Address
  delivery_address: {
    full_address: {
      type: String,
      required: true,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[1-9][0-9]{5}$/.test(v);
        },
        message: 'Please enter a valid pincode'
      }
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    }
  },

  // Pickup Information
  pickup_info: {
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
    },
    pickup_date: Date,
    pickup_time_slot: String,
    special_instructions: String,
    pickup_status: {
      type: String,
      enum: ['pending', 'scheduled', 'picked_up', 'failed'],
      default: 'pending'
    }
  },

  // Product Details
  products: [productSchema],

  // Package Information
  package_info: {
    package_type: {
      type: String,
      enum: ['single_b2c', 'multi_b2c', 'multi_b2b'],
      default: 'single_b2c'
    },
    weight: {
      type: Number,
      required: true,
      min: 0.1
    },
    dimensions: {
      length: {
        type: Number,
        required: true,
        min: 1
      },
      width: {
        type: Number,
        required: true,
        min: 1
      },
      height: {
        type: Number,
        required: true,
        min: 1
      }
    },
    volumetric_weight: Number,
    weight_photos: [String],
    package_photos: [String]
  },

  // Payment Information
  payment_info: {
    payment_mode: {
      type: String,
      enum: ['prepaid', 'cod'],
      required: true
    },
    cod_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    order_value: {
      type: Number,
      required: true,
      min: 0
    },
    shipping_charges: {
      type: Number,
      default: 0,
      min: 0
    },
    total_amount: Number
  },

  // Shipping Details
  shipping_info: {
    courier_partner: String,
    awb_number: {
      type: String,
      unique: true,
      sparse: true
    },
    service_type: {
      type: String,
      enum: ['surface', 'express', 'air'],
      default: 'surface'
    },
    expected_delivery: Date,
    tracking_url: String
  },

  // Order Status
  order_status: {
    current_status: {
      type: String,
      enum: [
        'new',
        'ready_to_ship',
        'pickup_pending',
        'manifested',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'ndr',
        'rto',
        'cancelled',
        'lost'
      ],
      default: 'new'
    },
    status_history: [{
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      location: String,
      remarks: String,
      updated_by: {
        type: String,
        enum: ['system', 'courier', 'admin', 'user'],
        default: 'system'
      }
    }],
    last_updated: {
      type: Date,
      default: Date.now
    }
  },

  // NDR Information
  ndr_info: {
    is_ndr: {
      type: Boolean,
      default: false
    },
    ndr_reason: String,
    ndr_date: Date,
    reattempt_count: {
      type: Number,
      default: 0
    },
    customer_response: String,
    resolution_action: String
  },

  // Billing Information
  billing_info: {
    invoice_number: String,
    invoice_date: Date,
    shipping_cost: Number,
    fuel_surcharge: Number,
    service_tax: Number,
    total_billing_amount: Number,
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    }
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
});

// Indexes
orderSchema.index({ order_id: 1 });
orderSchema.index({ user_id: 1 });
orderSchema.index({ 'shipping_info.awb_number': 1 });
orderSchema.index({ 'customer_info.phone': 1 });
orderSchema.index({ 'order_status.current_status': 1 });
orderSchema.index({ created_at: -1 });

// Pre-save middleware to generate order_id and calculate values
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.order_id) {
    let orderId;
    let isUnique = false;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 1000000);
      orderId = `ORD${Date.now()}${randomNum.toString().padStart(6, '0')}`;
      const existingOrder = await this.constructor.findOne({ order_id: orderId });
      if (!existingOrder) {
        isUnique = true;
      }
    }

    this.order_id = orderId;
  }

  // Calculate volumetric weight
  if (this.package_info && this.package_info.dimensions) {
    const { length, width, height } = this.package_info.dimensions;
    this.package_info.volumetric_weight = (length * width * height) / 5000; // Standard volumetric factor
  }

  // Calculate total amount
  if (this.payment_info) {
    const orderValue = this.payment_info.order_value || 0;
    const shippingCharges = this.payment_info.shipping_charges || 0;
    this.payment_info.total_amount = orderValue + shippingCharges;
  }

  // Update timestamp
  this.updated_at = Date.now();
  next();
});

// Virtual for actual weight vs volumetric weight
orderSchema.virtual('chargeable_weight').get(function() {
  if (!this.package_info) return 0;
  const actualWeight = this.package_info.weight || 0;
  const volumetricWeight = this.package_info.volumetric_weight || 0;
  return Math.max(actualWeight, volumetricWeight);
});

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(userId, status) {
  return this.find({
    user_id: userId,
    'order_status.current_status': status
  }).sort({ created_at: -1 });
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function(userId, dateFrom, dateTo) {
  const matchQuery = { user_id: userId };

  if (dateFrom && dateTo) {
    matchQuery.created_at = {
      $gte: new Date(dateFrom),
      $lte: new Date(dateTo)
    };
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$order_status.current_status',
        count: { $sum: 1 },
        total_value: { $sum: '$payment_info.order_value' }
      }
    }
  ]);
};

// Instance method to update status
orderSchema.methods.updateStatus = function(newStatus, remarks = '', location = '', updatedBy = 'system') {
  this.order_status.status_history.push({
    status: newStatus,
    timestamp: new Date(),
    location,
    remarks,
    updated_by: updatedBy
  });

  this.order_status.current_status = newStatus;
  this.order_status.last_updated = new Date();

  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);