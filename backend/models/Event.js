const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  fieldType: { type: String, enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'number', 'email', 'date'], required: true },
  options: [String], // for dropdown/checkbox/radio
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  order: { type: Number, default: 0 }
});

const merchandiseVariantSchema = new mongoose.Schema({
  variantName: { type: String, required: true },  // e.g. "T-Shirt", "Hoodie", "Cap"
  size: String,
  color: String,
  sku: String,
  stock: { type: Number, default: 0 },
  price: { type: Number, required: true }
});

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  eventType: { type: String, enum: ['normal', 'merchandise', 'hackathon'], required: true },
  eligibility: { type: String, enum: ['all', 'iiit-only', 'non-iiit-only'], default: 'all' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: { type: Date, required: true },
  registrationLimit: { type: Number, required: true },
  registrationCount: { type: Number, default: 0 },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
  registrationFee: { type: Number, default: 0 },
  tags: [String],
  venue: { type: String },
  imageUrl: { type: String },
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  // Normal event fields
  customForm: [formFieldSchema],
  formLocked: { type: Boolean, default: false },
  // Merchandise fields
  merchandiseItems: [merchandiseVariantSchema],
  purchaseLimit: { type: Number, default: 1 },
  // Hackathon fields
  teamSize: { type: Number, default: 2 },
  // Merchandise payment approval
  requiresPaymentApproval: { type: Boolean, default: false },
  // Analytics
  viewCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
}, { timestamps: true });

// Text index for search
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
