const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  A: { type: Number, required: true },
  B: { type: Number, required: true },
  C: { type: Number, required: true },
  D: { type: Number, required: true },
  E: { type: Number, required: true },
  F: { type: Number, required: true }
}, { _id: false });

const weightSlabSchema = new mongoose.Schema({
  condition: {
    type: String,
    required: true,
    trim: true
  },
  zones: {
    type: zoneSchema,
    required: true
  }
}, { _id: false });

const zoneDefinitionSchema = new mongoose.Schema({
  zone: {
    type: String,
    required: true,
    trim: true
  },
  definition: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const rateCardSchema = new mongoose.Schema({
  userCategory: {
    type: String,
    enum: ['New User', 'Basic User', 'Lite User', 'Advanced', 'Advanced User'],
    required: true,
    trim: true
  },
  carrier: {
    type: String,
    default: 'DELHIVERY',
    trim: true
  },
  forwardCharges: {
    type: [weightSlabSchema],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Forward charges must be a non-empty array'
    }
  },
  rtoCharges: {
    type: [weightSlabSchema],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'RTO charges must be a non-empty array'
    }
  },
  codCharges: {
    percentage: {
      type: Number,
      required: true,
      min: 0
    },
    minimumAmount: {
      type: Number,
      required: true,
      min: 0
    },
    gstAdditional: {
      type: Boolean,
      default: true
    }
  },
  zoneDefinitions: {
    type: [zoneDefinitionSchema],
    required: true
  },
  termsAndConditions: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Terms and conditions must be a non-empty array'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
rateCardSchema.index({ userCategory: 1 }, { unique: true });

// Static method to find by user category (with normalization)
rateCardSchema.statics.findByCategory = async function(userCategory) {
  // Normalize category name
  let normalizedCategory = userCategory;
  if (userCategory === 'Advanced User') {
    normalizedCategory = 'Advanced';
  }
  
  // Try exact match first
  let rateCard = await this.findOne({ userCategory: normalizedCategory });
  
  // If not found, try case-insensitive search
  if (!rateCard) {
    rateCard = await this.findOne({ 
      userCategory: { $regex: new RegExp(`^${normalizedCategory}$`, 'i') } 
    });
  }
  
  return rateCard;
};

const RateCard = mongoose.model('RateCard', rateCardSchema);

module.exports = RateCard;

