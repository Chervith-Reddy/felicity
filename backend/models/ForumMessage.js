const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: String,
  users: [{ type: mongoose.Schema.Types.ObjectId }],
}, { _id: false });

const forumMessageSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'senderModel' },
  senderModel: { type: String, enum: ['User', 'Organizer'], required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['participant', 'organizer', 'admin'], default: 'participant' },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumMessage', default: null },
  isAnnouncement: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  reactions: [reactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('ForumMessage', forumMessageSchema);
