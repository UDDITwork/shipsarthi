// Location: backend/models/Customer.js
const mongoose = require('mongoose');

// Address Schema (reused from Order model)
const addressSchema = new mongoose.Schema({
  address_line_1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true
  },
  address_line_2: {
    type: String,
    trim: true
  },
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
  },
  address_type: {
    type: String,
    enum: ['home', 'office'],
    default: 'home'
  }
}, { _id: false });

// Main Customer Schema
const customerSchema = new mongoose.Schema({
  // User Reference (who created/manages this customer)
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Customer Information
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid phone number'],
    index: true
  },
  alternate_phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid alternate phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    sparse: true // Allows multiple null values
  },
  gstin: {
    type: String,
    trim: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number']
  },

  // Address Information
  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  },

  // Customer Channel (how they were added)
  channel: {
    type: String,
    enum: ['custom', 'order_creation', 'import', 'api'],
    default: 'custom',
    index: true
  },

  // Customer Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active',
    index: true
  },

  // Additional Information
  notes: {
    type: String,
    trim: true
  },

  // Statistics
  total_orders: {
    type: Number,
    default: 0
  },
  total_order_value: {
    type: Number,
    default: 0
  },
  last_order_date: {
    type: Date
  },

  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],

  // Social Media Links
  social_links: {
    whatsapp: String,
    facebook: String,
    instagram: String,
    website: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
customerSchema.index({ user_id: 1, phone: 1 });
customerSchema.index({ user_id: 1, email: 1 });
customerSchema.index({ user_id: 1, status: 1 });
customerSchema.index({ user_id: 1, channel: 1 });
customerSchema.index({ user_id: 1, name: 'text', phone: 'text' }); // Text search index

// Virtual for formatted phone number
customerSchema.virtual('formatted_phone').get(function() {
  if (this.phone) {
    return `+91 ${this.phone}`;
  }
  return this.phone;
});

// Virtual for display name (first name + last name)
customerSchema.virtual('display_name').get(function() {
  return this.name;
});

// Pre-save middleware to update statistics
customerSchema.pre('save', function(next) {
  // This will be called when customer is saved
  next();
});

// Static method to find or create customer
customerSchema.statics.findOrCreate = async function(userId, customerData) {
  try {
    // Try to find existing customer by phone and user_id
    let customer = await this.findOne({
      user_id: userId,
      phone: customerData.phone
    });

    if (customer) {
      // Update existing customer with new data
      Object.keys(customerData).forEach(key => {
        if (customerData[key] !== undefined && customerData[key] !== null) {
          customer[key] = customerData[key];
        }
      });
      await customer.save();
      return customer;
    } else {
      // Create new customer
      customer = new this({
        user_id: userId,
        ...customerData
      });
      await customer.save();
      return customer;
    }
  } catch (error) {
    throw error;
  }
};

// Static method to get customers by user with pagination
customerSchema.statics.getCustomersByUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = 'active',
    channel = '',
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const query = { user_id: userId };

  // Add search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Add status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  // Add channel filter
  if (channel && channel !== 'all') {
    query.channel = channel;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder };

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('-__v');
};

// Static method to get customer statistics
customerSchema.statics.getCustomerStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total_customers: { $sum: 1 },
        active_customers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        total_orders: { $sum: '$total_orders' },
        total_order_value: { $sum: '$total_order_value' }
      }
    }
  ]);

  return stats[0] || {
    total_customers: 0,
    active_customers: 0,
    total_orders: 0,
    total_order_value: 0
  };
};

// Method to update order statistics
customerSchema.methods.updateOrderStats = async function(orderValue) {
  this.total_orders += 1;
  this.total_order_value += orderValue;
  this.last_order_date = new Date();
  await this.save();
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
