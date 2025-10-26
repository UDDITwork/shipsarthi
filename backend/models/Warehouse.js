// Location: backend/models/Warehouse.js
const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  // User Reference
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Warehouse Basic Info
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    index: true
  },

  title: {
    type: String,
    trim: true
  },

  registered_name: {
    type: String,
    trim: true
  },

  // Contact Information
  contact_person: {
    name: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
    },
    alternative_phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid alternative phone number']
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    }
  },

  // Warehouse Address
  address: {
    full_address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },

  // Return Address
  return_address: {
    full_address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },

  // GST Information
  gstin: {
    type: String,
    trim: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number']
  },

  // Support Contact (for label)
  support_contact: {
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number']
    }
  },

  // Warehouse Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },

  is_default: {
    type: Boolean,
    default: false
  },

  // Delhivery Integration
  delhivery_registered: {
    type: Boolean,
    default: false
  },

  delhivery_response: {
    type: mongoose.Schema.Types.Mixed
  },

  delhivery_warehouse_id: {
    type: String,
    trim: true
  },

  business_hours: {
    type: mongoose.Schema.Types.Mixed
  },

  business_days: {
    type: [String],
    default: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  },

  // Metadata
  warehouse_type: {
    type: String,
    enum: ['main', 'branch', 'virtual'],
    default: 'main'
  },

  warehouse_code: {
    type: String,
    unique: true,
    sparse: true
  },

  notes: {
    type: String,
    trim: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
warehouseSchema.index({ user_id: 1, is_active: 1 });
warehouseSchema.index({ user_id: 1, name: 1 });
warehouseSchema.index({ 'address.pincode': 1 });

// Ensure no unique index on warehouse_id (remove if exists)
warehouseSchema.post('save', async function() {
  try {
    const db = this.constructor.db;
    const collection = db.collection('warehouses');
    const indexes = await collection.indexes();
    const warehouseIdIndex = indexes.find(idx => 
      idx.key && idx.key.warehouse_id !== undefined && idx.unique
    );
    if (warehouseIdIndex) {
      console.warn('⚠️ Found problematic unique index on warehouse_id, attempting to remove...');
      try {
        await collection.dropIndex(warehouseIdIndex.name);
        console.log('✅ Removed problematic warehouse_id unique index');
      } catch (err) {
        console.warn('⚠️ Could not remove index (may require manual removal):', err.message);
      }
    }
  } catch (err) {
    // Ignore errors in post-save hook
  }
});

// Pre-save middleware to generate warehouse code
warehouseSchema.pre('save', async function(next) {
  if (this.isNew && !this.warehouse_code) {
    const count = await this.constructor.countDocuments({ user_id: this.user_id });
    this.warehouse_code = `WH${Date.now()}${count + 1}`;
  }
  next();
});

// Pre-save middleware to ensure only one default warehouse
warehouseSchema.pre('save', async function(next) {
  if (this.is_default && this.isModified('is_default')) {
    // Remove default flag from other warehouses
    await this.constructor.updateMany(
      { user_id: this.user_id, _id: { $ne: this._id } },
      { is_default: false }
    );
  }
  next();
});

// Method to check if warehouse is registered with Delhivery
warehouseSchema.methods.isRegisteredWithDelhivery = function() {
  return this.delhivery_registered === true;
};

// Method to format warehouse data for Delhivery API
warehouseSchema.methods.toDelhiveryFormat = function() {
  const data = {
    name: this.name,
    registered_name: this.registered_name || this.name,
    phone: this.contact_person.phone,
    email: this.contact_person.email || '',
    address: this.address.full_address,
    city: this.address.city,
    pin: this.address.pincode,
    country: this.address.country
  };

  // Add return address only if it exists
  if (this.return_address && this.return_address.full_address) {
    data.return_address = this.return_address.full_address;
    data.return_city = this.return_address.city;
    data.return_pin = this.return_address.pincode;
    data.return_state = this.return_address.state;
    data.return_country = this.return_address.country;
  }

  return data;
};

// Static method to get active warehouses
warehouseSchema.statics.getActiveWarehouses = function(userId) {
  return this.find({ user_id: userId, is_active: true }).sort({ is_default: -1, createdAt: -1 });
};

// Static method to get default warehouse
warehouseSchema.statics.getDefaultWarehouse = function(userId) {
  return this.findOne({ user_id: userId, is_default: true, is_active: true });
};

// Static method to count warehouses
warehouseSchema.statics.getWarehouseCount = function(userId) {
  return this.countDocuments({ user_id: userId });
};

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

module.exports = Warehouse;