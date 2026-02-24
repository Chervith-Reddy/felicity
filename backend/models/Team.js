const mongoose = require('mongoose');
const crypto = require('crypto');

const teamMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  respondedAt: Date,
});

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [teamMemberSchema],
  maxSize: { type: Number, required: true },
  inviteCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(5).toString('hex').toUpperCase()
  },
  status: {
    type: String,
    enum: ['forming', 'complete', 'incomplete', 'cancelled'],
    default: 'forming'
  },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
}, { timestamps: true });

// Virtual: accepted member count
teamSchema.virtual('acceptedCount').get(function () {
  return this.members.filter(m => m.status === 'accepted').length + 1; // +1 for leader
});

module.exports = mongoose.model('Team', teamSchema);
