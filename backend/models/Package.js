// Location: backend/models/Package.js
const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  // User Reference
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Package Basic Info
  name: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true,
    index: true
  },

  description: {
    type: String,
    trim: true
  },

  category: {
    type: String,
    trim: true,
    index: true
  },

  sku: {
    type: String,
    trim: true,
    index: true
  },

  // Package Type
  package_type: {
    type: String,
    required: [true, 'Package type is required'],
    enum: ['Single Package (B2C)', 'Multiple Package (B2C)', 'Multiple Package (B2B)'],
    default: 'Single Package (B2C)',
    index: true
  },

  // Dimensions
  dimensions: {
    length: {
      type: Number,
      required: [true, 'Length is required'],
      min: [1, 'Length must be at least 1 cm']
    },
    width: {
      type: Number,
      required: [true, 'Width is required'],
      min: [1, 'Width must be at least 1 cm']
    },
    height: {
      type: Number,
      required: [true, 'Height is required'],
      min: [1, 'Height must be at least 1 cm']
    }
  },

  // Weight Information
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0.1, 'Weight must be at least 0.1 kg']
  },

  // Volumetric Weight (calculated)
  volumetric_weight: {
    type: Number
  },

  // For Multi Package types
  number_of_boxes: {
    type: Number,
    min: [1, 'Number of boxes must be at least 1'],
    default: 1
  },

  weight_per_box: {
    type: Number,
    min: [0.1, 'Weight per box must be at least 0.1 kg']
  },

  // For B2B packages
  rov_type: {
    type: String,
    trim: true
  },

  rov_owner: {
    type: String,
    trim: true
  },

  // Product Information
  product_name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },

  hsn_code: {
    type: String,
    trim: true
  },

  // Pricing
  unit_price: {
    type: Number,
    min: [0, 'Unit price cannot be negative']
  },

  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    default: 0
  },

  tax: {
    type: Number,
    min: [0, 'Tax cannot be negative'],
    default: 0
  },

  // Photo URLs
  weight_photo_url: {
    type: String,
    trim: true
  },

  dimensions_photo_url: {
    type: String,
    trim: true
  },

  // Package Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },

  is_default: {
    type: Boolean,
    default: false
  },

  // Usage Statistics
  usage_count: {
    type: Number,
    default: 0
  },

  last_used: {
    type: Date
  },

  // Tags for easy searching
  tags: [{
    type: String,
    trim: true
  }],

  // Notes
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
packageSchema.index({ user_id: 1, is_active: 1 });
packageSchema.index({ user_id: 1, package_type: 1 });
packageSchema.index({ user_id: 1, category: 1 });
packageSchema.index({ user_id: 1, name: 1 });
packageSchema.index({ user_id: 1, tags: 1 });

// Pre-save middleware to calculate volumetric weight
packageSchema.pre('save', function(next) {
  if (this.dimensions && this.dimensions.length && this.dimensions.width && this.dimensions.height) {
    // Volumetric weight formula: (L x W x H) / 5000
    this.volumetric_weight = (this.dimensions.length * this.dimensions.width * this.dimensions.height) / 5000;
  }
  next();
});

// Pre-save middleware to ensure only one default package per type
packageSchema.pre('save', async function(next) {
  if (this.is_default && this.isModified('is_default')) {
    // Remove default flag from other packages of same type
    await this.constructor.updateMany(
      { 
        user_id: this.user_id, 
        package_type: this.package_type,
        _id: { $ne: this._id } 
      },
      { is_default: false }
    );
  }
  next();
});

// Method to increment usage count
packageSchema.methods.incrementUsage = function() {
  this.usage_count += 1;
  this.last_used = new Date();
  return this.save();
};

// Method to format package data for order creation
packageSchema.methods.toOrderFormat = function() {
  return {
    package_type: this.package_type,
    dimensions: this.dimensions,
    weight: this.weight,
    volumetric_weight: this.volumetric_weight,
    number_of_boxes: this.number_of_boxes,
    weight_per_box: this.weight_per_box,
    rov_type: this.rov_type,
    rov_owner: this.rov_owner,
    product_name: this.product_name,
    hsn_code: this.hsn_code,
    unit_price: this.unit_price,
    discount: this.discount,
    tax: this.tax,
    weight_photo_url: this.weight_photo_url,
    dimensions_photo_url: this.dimensions_photo_url
  };
};

// Static method to get packages by type
packageSchema.statics.getPackagesByType = function(userId, packageType) {
  const query = { user_id: userId, is_active: true };
  if (packageType && packageType !== 'all') {
    query.package_type = packageType;
  }
  return this.find(query).sort({ is_default: -1, usage_count: -1, createdAt: -1 });
};

// Static method to get popular packages
packageSchema.statics.getPopularPackages = function(userId, limit = 10) {
  return this.find({ user_id: userId, is_active: true })
    .sort({ usage_count: -1, last_used: -1 })
    .limit(limit);
};

// Static method to search packages
packageSchema.statics.searchPackages = function(userId, searchTerm) {
  const searchRegex = new RegExp(searchTerm, 'i');
  return this.find({
    user_id: userId,
    is_active: true,
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { product_name: searchRegex },
      { category: searchRegex },
      { sku: searchRegex },
      { tags: { $in: [searchRegex] } }
    ]
  }).sort({ usage_count: -1, createdAt: -1 });
};

// Static method to get package count by type
packageSchema.statics.getPackageCountByType = function(userId) {
  return this.aggregate([
    { $match: { user_id: userId, is_active: true } },
    { $group: { _id: '$package_type', count: { $sum: 1 } } }
  ]);
};

const Package = mongoose.model('Package', packageSchema);

module.exports = Package;

