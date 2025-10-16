const mongoose = require('mongoose');

const operatingHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  is_open: {
    type: Boolean,
    default: true
  },
  opening_time: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Please enter a valid time in HH:MM format'
    }
  },
  closing_time: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Please enter a valid time in HH:MM format'
    }
  }
});

const warehouseSchema = new mongoose.Schema({
  // Basic Warehouse Information
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  warehouse_id: {
    type: String,
    unique: true,
    required: true
  },

  // Warehouse Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  // Contact Information
  contact_info: {
    phone: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid 10-digit phone number'
      }
    },
    alternative_phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid 10-digit alternative phone number'
      }
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    support_email: {
      type: String,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v);
        },
        message: 'Please enter a valid support email address'
      }
    },
    support_phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please enter a valid support phone number'
      }
    }
  },

  // Address Information
  address: {
    full_address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 200
    },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^[1-9][0-9]{5}$/.test(v);
        },
        message: 'Please enter a valid 6-digit pincode'
      }
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },

  // Business Information
  business_info: {
    gstin: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: 'Please enter a valid GSTIN'
      }
    },
    business_type: {
      type: String,
      enum: ['warehouse', 'store', 'office', 'godown', 'factory', 'other'],
      default: 'warehouse'
    },
    warehouse_size: {
      type: String,
      enum: ['small', 'medium', 'large', 'very_large'],
      default: 'medium'
    },
    storage_capacity: Number, // in cubic feet
    staff_count: {
      type: Number,
      min: 0,
      default: 1
    }
  },

  // Operating Information
  operating_hours: [operatingHoursSchema],

  pickup_instructions: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  special_instructions: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Warehouse Status
  status: {
    warehouse_status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'under_maintenance'],
      default: 'active'
    },
    is_default: {
      type: Boolean,
      default: false
    },
    is_verified: {
      type: Boolean,
      default: false
    },
    verification_date: Date,
    verification_notes: String
  },

  // Pickup Configuration
  pickup_config: {
    pickup_available: {
      type: Boolean,
      default: true
    },
    pickup_time_slots: [{
      slot_name: String,
      start_time: String,
      end_time: String,
      is_available: {
        type: Boolean,
        default: true
      }
    }],
    advance_booking_required: {
      type: Boolean,
      default: false
    },
    advance_booking_hours: {
      type: Number,
      default: 24
    },
    weekend_pickup: {
      type: Boolean,
      default: false
    },
    holiday_pickup: {
      type: Boolean,
      default: false
    }
  },

  // Performance Metrics
  metrics: {
    total_orders_shipped: {
      type: Number,
      default: 0
    },
    total_pickups_completed: {
      type: Number,
      default: 0
    },
    total_pickups_failed: {
      type: Number,
      default: 0
    },
    avg_pickup_time: Number, // in minutes
    last_pickup_date: Date,
    performance_rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5
    }
  },

  // Media and Documentation
  media: {
    warehouse_photos: [String],
    warehouse_videos: [String],
    layout_diagrams: [String],
    documents: [{
      document_type: {
        type: String,
        enum: ['gst_certificate', 'warehouse_license', 'fire_safety', 'insurance', 'other']
      },
      document_url: String,
      document_name: String,
      upload_date: {
        type: Date,
        default: Date.now
      },
      expiry_date: Date,
      verification_status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
      }
    }]
  },

  // Integration Settings
  integration_settings: {
    auto_manifest: {
      type: Boolean,
      default: true
    },
    sms_notifications: {
      type: Boolean,
      default: true
    },
    email_notifications: {
      type: Boolean,
      default: true
    },
    whatsapp_notifications: {
      type: Boolean,
      default: false
    }
  },

  // Billing and Preferences
  billing_preferences: {
    preferred_courier_partners: [String],
    payment_terms: {
      type: String,
      enum: ['prepaid', 'postpaid', 'credit'],
      default: 'prepaid'
    },
    credit_limit: {
      type: Number,
      default: 0
    },
    billing_frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly'
    }
  },

  // Audit Information
  audit_info: {
    created_by: {
      type: String,
      required: true
    },
    last_modified_by: String,
    last_verified_by: String,
    compliance_status: {
      type: String,
      enum: ['compliant', 'non_compliant', 'under_review'],
      default: 'under_review'
    },
    last_audit_date: Date,
    next_audit_due: Date
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
warehouseSchema.index({ warehouse_id: 1 });
warehouseSchema.index({ user_id: 1 });
warehouseSchema.index({ 'address.pincode': 1 });
warehouseSchema.index({ 'status.warehouse_status': 1 });
warehouseSchema.index({ 'status.is_default': 1 });
warehouseSchema.index({ created_at: -1 });

// Compound indexes
warehouseSchema.index({ user_id: 1, 'status.warehouse_status': 1 });
warehouseSchema.index({ user_id: 1, 'status.is_default': 1 });

// Pre-save middleware
warehouseSchema.pre('save', async function(next) {
  // Generate warehouse ID if new
  if (this.isNew && !this.warehouse_id) {
    let warehouseId;
    let isUnique = false;

    while (!isUnique) {
      const randomNum = Math.floor(Math.random() * 100000);
      warehouseId = `WH${Date.now()}${randomNum.toString().padStart(5, '0')}`;
      const existingWarehouse = await this.constructor.findOne({ warehouse_id: warehouseId });
      if (!existingWarehouse) {
        isUnique = true;
      }
    }

    this.warehouse_id = warehouseId;
  }

  // Set default operating hours if not provided
  if (this.isNew && this.operating_hours.length === 0) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    this.operating_hours = days.map(day => ({
      day: day,
      is_open: day !== 'sunday',
      opening_time: '09:00',
      closing_time: '18:00'
    }));
  }

  // Ensure only one default warehouse per user
  if (this.status.is_default) {
    await this.constructor.updateMany(
      {
        user_id: this.user_id,
        _id: { $ne: this._id }
      },
      {
        'status.is_default': false
      }
    );
  }

  // Set default pickup time slots if not provided
  if (this.isNew && this.pickup_config.pickup_time_slots.length === 0) {
    this.pickup_config.pickup_time_slots = [
      { slot_name: 'Morning', start_time: '09:00', end_time: '12:00', is_available: true },
      { slot_name: 'Afternoon', start_time: '12:00', end_time: '15:00', is_available: true },
      { slot_name: 'Evening', start_time: '15:00', end_time: '18:00', is_available: true }
    ];
  }

  this.updated_at = Date.now();
  next();
});

// Virtual for pickup success rate
warehouseSchema.virtual('pickup_success_rate').get(function() {
  const total = this.metrics.total_pickups_completed + this.metrics.total_pickups_failed;
  if (total === 0) return 100;
  return ((this.metrics.total_pickups_completed / total) * 100).toFixed(2);
});

// Static methods
warehouseSchema.statics.getWarehousesByUser = function(userId) {
  return this.find({
    user_id: userId,
    'status.warehouse_status': { $in: ['active', 'inactive'] }
  }).sort({ 'status.is_default': -1, created_at: -1 });
};

warehouseSchema.statics.getDefaultWarehouse = function(userId) {
  return this.findOne({
    user_id: userId,
    'status.is_default': true,
    'status.warehouse_status': 'active'
  });
};

warehouseSchema.statics.getWarehousesByPincode = function(pincode) {
  return this.find({
    'address.pincode': pincode,
    'status.warehouse_status': 'active',
    'pickup_config.pickup_available': true
  });
};

warehouseSchema.statics.getWarehouseStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: userId } },
    {
      $group: {
        _id: '$status.warehouse_status',
        count: { $sum: 1 },
        total_orders: { $sum: '$metrics.total_orders_shipped' },
        avg_performance: { $avg: '$metrics.performance_rating' }
      }
    }
  ]);
};

// Instance methods
warehouseSchema.methods.setAsDefault = function() {
  return this.constructor.updateMany(
    { user_id: this.user_id },
    { 'status.is_default': false }
  ).then(() => {
    this.status.is_default = true;
    return this.save();
  });
};

warehouseSchema.methods.updatePickupMetrics = function(success = true, pickupTime = null) {
  if (success) {
    this.metrics.total_pickups_completed += 1;
    this.metrics.last_pickup_date = new Date();
  } else {
    this.metrics.total_pickups_failed += 1;
  }

  if (pickupTime) {
    const currentAvg = this.metrics.avg_pickup_time || 0;
    const totalPickups = this.metrics.total_pickups_completed;
    this.metrics.avg_pickup_time = ((currentAvg * (totalPickups - 1)) + pickupTime) / totalPickups;
  }

  return this.save();
};

warehouseSchema.methods.updatePerformanceRating = function(rating) {
  this.metrics.performance_rating = rating;
  return this.save();
};

warehouseSchema.methods.addPickupTimeSlot = function(slotName, startTime, endTime) {
  this.pickup_config.pickup_time_slots.push({
    slot_name: slotName,
    start_time: startTime,
    end_time: endTime,
    is_available: true
  });

  return this.save();
};

warehouseSchema.methods.updateOperatingHours = function(day, isOpen, openingTime = null, closingTime = null) {
  const daySchedule = this.operating_hours.find(schedule => schedule.day === day);

  if (daySchedule) {
    daySchedule.is_open = isOpen;
    if (openingTime) daySchedule.opening_time = openingTime;
    if (closingTime) daySchedule.closing_time = closingTime;
  } else {
    this.operating_hours.push({
      day: day,
      is_open: isOpen,
      opening_time: openingTime || '09:00',
      closing_time: closingTime || '18:00'
    });
  }

  return this.save();
};

warehouseSchema.methods.deactivate = function(reason = '') {
  this.status.warehouse_status = 'inactive';
  if (this.status.is_default) {
    this.status.is_default = false;
  }

  this.audit_info.last_modified_by = reason;
  return this.save();
};

warehouseSchema.methods.activate = function() {
  this.status.warehouse_status = 'active';
  return this.save();
};

module.exports = mongoose.model('Warehouse', warehouseSchema);