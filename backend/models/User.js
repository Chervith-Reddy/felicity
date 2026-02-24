const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  contactNumber: { type: String, trim: true },
  collegeOrOrg: { type: String, trim: true },
  type: { type: String, enum: ['IIIT', 'Non-IIIT'], default: 'Non-IIIT' },
  role: { type: String, enum: ['participant', 'admin'], default: 'participant' },
  areasOfInterest: [{ type: String }],
  followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' }],
  onboardingCompleted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
