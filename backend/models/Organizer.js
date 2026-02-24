const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const organizerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, unique: true, lowercase: true },
  contactNumber: { type: String },
  description: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: 'organizer', immutable: true },
  discordWebhook: { type: String },
  logoUrl: { type: String },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'disabled', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who created
}, { timestamps: true });

organizerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

organizerSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Organizer', organizerSchema);
