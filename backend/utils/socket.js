const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const ForumMessage = require('../models/ForumMessage');
const Registration = require('../models/Registration');
const nodemailer = require('nodemailer');

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
        const isOrganizer = socket.user.role === 'organizer';
        const isAnnouncement = isOrganizer && content.trim().startsWith('@all');
        const displayContent = isAnnouncement ? content.trim().replace(/^@all\s*/i, '') : content;

        const msg = await ForumMessage.create({
          event: eventId,
          sender: socket.user._id,
          senderModel: isOrganizer ? 'Organizer' : 'User',
          senderName: isOrganizer ? socket.user.name : `${socket.user.firstName} ${socket.user.lastName}`,
          senderRole: socket.user.role,
          content: displayContent,
          parent: parentId || null,
          isAnnouncement,
        });
        io.to(`forum_${eventId}`).emit('new_message', msg);

        // Send email notification for @all announcements
        if (isAnnouncement) {
          try {
            const regs = await Registration.find({ event: eventId, status: { $ne: 'cancelled' } }).populate('user', 'email firstName');
            const Event = require('../models/Event');
            const event = await Event.findById(eventId);
            const transporter = nodemailer.createTransport({
              host: process.env.EMAIL_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.EMAIL_PORT) || 587,
              secure: false,
              auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            });
            for (const reg of regs) {
              if (!reg.user?.email) continue;
              try {
                await transporter.sendMail({
                  from: `"Felicity Events" <${process.env.EMAIL_USER}>`,
                  to: reg.user.email,
                  subject: `📢 Announcement: ${event?.name || 'Event'}`,
                  html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                    <h2 style="color:#667eea;">📢 Announcement from ${socket.user.name}</h2>
                    <p style="font-size:16px;color:#333;">${displayContent}</p>
                    <p style="color:#999;font-size:12px;margin-top:20px;">Event: ${event?.name || 'Unknown'}</p>
                  </div>`
                });
              } catch (e) { /* skip individual email failures */ }
            }
          } catch (e) { console.error('Announcement email error:', e.message); }
        }
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

    socket.on('disconnect', () => { });
  });
};
