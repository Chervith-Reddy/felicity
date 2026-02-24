const mongoose = require('mongoose');
const crypto = require('crypto');

const feedbackSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  // Store only a hash of user ID for anonymity verification (prevent double submissions)
  userHash: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 1000 },
  // No direct user reference — full anonymity in organizer view
}, { timestamps: true });

feedbackSchema.index({ event: 1, userHash: 1 }, { unique: true });

feedbackSchema.statics.hashUser = (userId) => {
  return crypto.createHash('sha256').update(userId.toString() + process.env.JWT_SECRET).digest('hex');
};

module.exports = mongoose.model('Feedback', feedbackSchema);
