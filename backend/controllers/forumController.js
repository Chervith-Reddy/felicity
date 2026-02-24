const ForumMessage = require('../models/ForumMessage');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// Check if user is registered or is the organizer
const canAccess = async (userId, userRole, eventId) => {
  if (userRole === 'organizer') {
    const event = await Event.findOne({ _id: eventId, organizer: userId });
    return !!event;
  }
  const reg = await Registration.findOne({ user: userId, event: eventId, status: { $ne: 'cancelled' } });
  return !!reg;
};

exports.getMessages = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const hasAccess = await canAccess(req.user._id, req.user.role, eventId);
    if (!hasAccess) return res.status(403).json({ message: 'Must be registered to view forum' });

    const messages = await ForumMessage.find({ event: eventId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.postAnnouncement = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content } = req.body;

    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    const msg = await ForumMessage.create({
      event: eventId,
      sender: req.user._id,
      senderModel: 'Organizer',
      senderName: req.user.name,
      senderRole: 'organizer',
      content,
      isAnnouncement: true,
    });

    // Broadcast via socket
    const io = req.app.get('io');
    io.to(`forum_${eventId}`).emit('new_message', msg);

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.pinMessage = async (req, res) => {
  try {
    const { eventId, msgId } = req.params;
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    const msg = await ForumMessage.findByIdAndUpdate(msgId, [{ $set: { isPinned: { $not: '$isPinned' } } }], { new: true });
    const io = req.app.get('io');
    io.to(`forum_${eventId}`).emit('message_pinned', msg);
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { eventId, msgId } = req.params;
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    await ForumMessage.findByIdAndUpdate(msgId, { isDeleted: true, content: '[Message deleted]' });
    const io = req.app.get('io');
    io.to(`forum_${eventId}`).emit('message_deleted', { msgId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { emoji } = req.body;

    const msg = await ForumMessage.findById(msgId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    let reaction = msg.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      msg.reactions.push({ emoji, users: [req.user._id] });
    } else {
      const idx = reaction.users.findIndex(u => u.toString() === req.user._id.toString());
      if (idx > -1) reaction.users.splice(idx, 1);
      else reaction.users.push(req.user._id);
    }

    await msg.save();
    const io = req.app.get('io');
    io.to(`forum_${msg.event}`).emit('reaction_updated', { msgId, reactions: msg.reactions });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
