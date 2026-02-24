const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkedInAt: { type: Date, default: Date.now },
  method: { type: String, enum: ['qr_scan', 'manual'], default: 'qr_scan' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
  // Manual override fields
  isManualOverride: { type: Boolean, default: false },
  overrideReason: { type: String },
  overrideAudit: [{
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer' },
    at: { type: Date, default: Date.now },
    reason: String,
    action: { type: String, enum: ['check_in', 'revert'] }
  }]
}, { timestamps: true });

attendanceSchema.index({ event: 1, registration: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
