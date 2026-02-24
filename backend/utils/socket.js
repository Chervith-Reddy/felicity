const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const ForumMessage = require('../models/ForumMessage');

module.exports = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user;
      if (decoded.role === 'organizer') {
        user = await Organizer.findById(decoded.id).select('-password');
        if (user) user.role = 'organizer';
      } else {
        user = await User.findById(decoded.id).select('-password');
      }
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    // Join event forum room
    socket.on('join_forum', (eventId) => {
      socket.join(`forum_${eventId}`);
    });

    socket.on('leave_forum', (eventId) => {
      socket.leave(`forum_${eventId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { eventId, content, parentId } = data;
        const msg = await ForumMessage.create({
          event: eventId,
          sender: socket.user._id,
          senderModel: socket.user.role === 'organizer' ? 'Organizer' : 'User',
          senderName: socket.user.role === 'organizer' ? socket.user.name : `${socket.user.firstName} ${socket.user.lastName}`,
          senderRole: socket.user.role,
          content,
          parent: parentId || null,
          isAnnouncement: false,
        });
        io.to(`forum_${eventId}`).emit('new_message', msg);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ eventId }) => {
      const name = socket.user.role === 'organizer' ? socket.user.name : `${socket.user.firstName} ${socket.user.lastName}`;
      socket.to(`forum_${eventId}`).emit('user_typing', { name });
    });

    socket.on('stop_typing', ({ eventId }) => {
      socket.to(`forum_${eventId}`).emit('user_stop_typing');
    });

    socket.on('disconnect', () => {});
  });
};
