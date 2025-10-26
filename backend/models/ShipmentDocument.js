// Location: backend/models/ShipmentDocument.js
const mongoose = require('mongoose');

const shipmentDocumentSchema = new mongoose.Schema({
  // Waybill/AWB Number (Primary identifier)
  waybill: {
    type: String,
    required: [true, 'Waybill/AWB is required'],
    index: true,
    trim: true
  },

  // Order Reference
  order_id: {
    type: String,
    index: true,
    trim: true
  },

  return_id: {
    type: String,
    index: true,
    trim: true
  },

  // Document Type
  document_type: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['epod', 'sorter_image', 'qc_image', 'other'],
    index: true
  },

  // Image Storage
  image_url: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true
  },

  image_path: {
    type: String,
    trim: true
  },

  // Cloudinary public ID (for easy deletion)
  cloudinary_public_id: {
    type: String,
    trim: true
  },

  // Base64 data (optional, can be stored for reprocessing)
  base64_data: {
    type: String
  },

  // Metadata
  file_size: {
    type: Number // in bytes
  },

  mime_type: {
    type: String,
    default: 'image/jpeg'
  },

  // Processing metadata
  processed: {
    type: Boolean,
    default: false
  },

  processing_error: {
    type: String,
    trim: true
  },

  // Order reference (if linked)
  order_ref: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
shipmentDocumentSchema.index({ waybill: 1, document_type: 1, createdAt: -1 });
shipmentDocumentSchema.index({ order_id: 1, document_type: 1 });
shipmentDocumentSchema.index({ document_type: 1, createdAt: -1 });
shipmentDocumentSchema.index({ processed: 1, createdAt: -1 });

// Static method to get documents for a waybill
shipmentDocumentSchema.statics.getDocumentsByWaybill = function(waybill, documentType = null) {
  const query = { waybill };
  if (documentType) {
    query.document_type = documentType;
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to get EPOD for a waybill
shipmentDocumentSchema.statics.getEPOD = function(waybill) {
  return this.findOne({ waybill, document_type: 'epod' })
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to check if document already exists
shipmentDocumentSchema.statics.documentExists = function(waybill, documentType, imageUrl) {
  return this.findOne({
    waybill,
    document_type: documentType,
    image_url: imageUrl
  });
};

const ShipmentDocument = mongoose.model('ShipmentDocument', shipmentDocumentSchema);

module.exports = ShipmentDocument;

