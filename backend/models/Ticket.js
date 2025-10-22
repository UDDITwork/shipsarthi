// Location: backend/models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // User Reference
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Ticket Basic Info
  ticket_id: {
    type: String,
    unique: true,
    required: true
  },

  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'pickup_delivery',
      'shipment_ndr_rto',
      'edit_shipment_info',
      'shipment_dispute',
      'finance',
      'billing_taxation',
      'claims',
      'kyc_bank_verification',
      'technical_support',
      'others'
    ],
    index: true
  },

  // AWB Numbers (related orders)
  awb_numbers: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 10;
      },
      message: 'Maximum 10 AWB numbers allowed'
    }
  },

  // Ticket Details
  subject: {
    type: String,
    trim: true
  },

  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },

  // File Attachments (Cloudinary URLs)
  attachments: [{
    file_url: {
      type: String,
      required: true
    },
    file_type: {
      type: String,
      enum: ['image', 'audio', 'video', 'document']
    },
    file_name: {
      type: String
    },
    file_size: {
      type: Number // in bytes
    },
    cloudinary_public_id: {
      type: String
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],

  // Ticket Status
  status: {
    type: String,
    enum: ['open', 'resolved', 'closed'],
    default: 'open',
    index: true
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Related Order IDs
  related_orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],

  // Conversation/Comments Thread
  conversation: [{
    comment_by: {
      type: String,
      enum: ['user', 'support'],
      required: true
    },
    comment_text: {
      type: String,
      required: true,
      trim: true
    },
    attachments: [{
      file_url: String,
      file_type: String,
      file_name: String
    }],
    created_at: {
      type: Date,
      default: Date.now
    }
  }],

  // Support Team Info
  assigned_to: {
    type: String,
    trim: true
  },

  resolved_by: {
    type: String,
    trim: true
  },

  resolved_at: {
    type: Date
  },

  closed_at: {
    type: Date
  },

  // Resolution Details
  resolution: {
    resolution_text: {
      type: String,
      trim: true
    },
    resolution_attachments: [{
      file_url: String,
      file_type: String,
      file_name: String
    }],
    resolved_on: {
      type: Date
    }
  },

  // Satisfaction Rating
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      trim: true
    },
    rated_at: {
      type: Date
    }
  },

  // Tags for better filtering
  tags: [{
    type: String,
    trim: true
  }],

  // Metadata
  metadata: {
    browser: String,
    device: String,
    ip_address: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
ticketSchema.index({ user_id: 1, status: 1 });
ticketSchema.index({ user_id: 1, category: 1 });
ticketSchema.index({ awb_numbers: 1 });
ticketSchema.index({ createdAt: -1 });

// Pre-save middleware to generate ticket ID
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticket_id) {
    const count = await this.constructor.countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.ticket_id = `TKT${timestamp}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to add comment to conversation
ticketSchema.methods.addComment = function(commentData) {
  this.conversation.push({
    comment_by: commentData.comment_by,
    comment_text: commentData.comment_text,
    attachments: commentData.attachments || [],
    created_at: new Date()
  });
  return this.save();
};

// Method to resolve ticket
ticketSchema.methods.resolveTicket = function(resolutionData) {
  this.status = 'resolved';
  this.resolved_at = new Date();
  this.resolved_by = resolutionData.resolved_by;
  this.resolution = {
    resolution_text: resolutionData.resolution_text,
    resolution_attachments: resolutionData.attachments || [],
    resolved_on: new Date()
  };
  return this.save();
};

// Method to close ticket
ticketSchema.methods.closeTicket = function() {
  this.status = 'closed';
  this.closed_at = new Date();
  return this.save();
};

// Method to reopen ticket
ticketSchema.methods.reopenTicket = function() {
  this.status = 'open';
  this.resolved_at = null;
  this.closed_at = null;
  return this.save();
};

// Method to add rating
ticketSchema.methods.addRating = function(ratingData) {
  this.rating = {
    score: ratingData.score,
    feedback: ratingData.feedback,
    rated_at: new Date()
  };
  return this.save();
};

// Static method to get tickets by status
ticketSchema.statics.getTicketsByStatus = function(userId, status) {
  const query = { user_id: userId };
  if (status !== 'all') {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get ticket statistics
ticketSchema.statics.getTicketStats = function(userId) {
  return this.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Virtual for time since creation
ticketSchema.virtual('time_elapsed').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffMs = now - created;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;