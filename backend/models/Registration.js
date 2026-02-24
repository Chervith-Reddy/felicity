const mongoose = require('mongoose');
const crypto = require('crypto');

const registrationSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    default: () => 'TKT-' + crypto.randomBytes(6).toString('hex').toUpperCase()
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  registrationType: { type: String, enum: ['normal', 'merchandise', 'hackathon'], required: true },
  status: { type: String, enum: ['active', 'cancelled', 'completed'], default: 'active' },
  // Normal event: custom form responses
  formResponses: [{
    fieldLabel: String,
    value: mongoose.Schema.Types.Mixed
  }],
  // Merchandise: selected variants
  merchandisePurchases: [{
    variantId: mongoose.Schema.Types.ObjectId,
    size: String,
    color: String,
    quantity: { type: Number, default: 1 },
    priceAtPurchase: Number
  }],
  totalAmount: { type: Number, default: 0 },
  // Merchandise payment approval
  paymentProofUrl: { type: String },
  paymentStatus: { type: String, enum: ['not_required', 'pending', 'approved', 'rejected'], default: 'not_required' },
  paymentReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
  paymentReviewedAt: Date,
  // Team registration
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  qrCode: { type: String }, // base64 QR code
  emailSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
