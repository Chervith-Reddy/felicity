const Attendance = require('../models/Attendance');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { stringify } = require('csv-stringify/sync');

exports.scanQR = async (req, res) => {
  try {
    const { qrData, eventId } = req.body;

    // Verify organizer owns event
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    let parsed;
    try { parsed = JSON.parse(qrData); } catch {
      return res.status(400).json({ message: 'Invalid QR code' });
    }

    const { ticketId, userId } = parsed;

    const registration = await Registration.findOne({
      $or: [{ ticketId }, { user: userId, event: eventId }],
      event: eventId,
      status: 'active'
    }).populate('user', 'firstName lastName email');

    if (!registration) return res.status(404).json({ message: 'Invalid ticket or not registered for this event' });

    // Check for duplicate scan
    const alreadyChecked = await Attendance.findOne({ event: eventId, registration: registration._id });
    if (alreadyChecked) {
      return res.status(409).json({
        message: 'Already checked in',
        checkedInAt: alreadyChecked.checkedInAt,
        attendee: registration.user
      });
    }

    const attendance = await Attendance.create({
      event: eventId,
      registration: registration._id,
      user: registration.user._id,
      method: 'qr_scan',
      markedBy: req.user._id
    });

    // Emit live update via socket
    const io = req.app.get('io');
    io.to(`attendance_${eventId}`).emit('new_checkin', {
      attendee: registration.user,
      checkedInAt: attendance.checkedInAt,
      ticketId: registration.ticketId
    });

    res.json({ message: 'Check-in successful', attendee: registration.user, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.manualCheckIn = async (req, res) => {
  try {
    const { eventId, registrationId, reason } = req.body;

    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    const registration = await Registration.findOne({ _id: registrationId, event: eventId })
      .populate('user', 'firstName lastName email');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    const existing = await Attendance.findOne({ event: eventId, registration: registrationId });
    if (existing) return res.status(409).json({ message: 'Already checked in' });

    const attendance = await Attendance.create({
      event: eventId,
      registration: registrationId,
      user: registration.user._id,
      method: 'manual',
      markedBy: req.user._id,
      isManualOverride: true,
      overrideReason: reason,
      overrideAudit: [{ by: req.user._id, reason, action: 'check_in' }]
    });

    const io = req.app.get('io');
    io.to(`attendance_${eventId}`).emit('new_checkin', {
      attendee: registration.user,
      checkedInAt: attendance.checkedInAt,
      method: 'manual'
    });

    res.json({ message: 'Manual check-in recorded', attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    const [checked, total, attendances] = await Promise.all([
      Attendance.countDocuments({ event: eventId }),
      Registration.countDocuments({ event: eventId, status: 'active' }),
      Attendance.find({ event: eventId })
        .populate('user', 'firstName lastName email')
        .populate('registration', 'ticketId')
        .sort({ checkedInAt: -1 })
    ]);

    res.json({ checked, total, notChecked: total - checked, attendances });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    const attendances = await Attendance.find({ event: eventId })
      .populate('user', 'firstName lastName email')
      .populate('registration', 'ticketId')
      .lean();

    const rows = attendances.map(a => ({
      'Ticket ID': a.registration?.ticketId,
      'Name': `${a.user?.firstName} ${a.user?.lastName}`,
      'Email': a.user?.email,
      'Checked In At': a.checkedInAt?.toISOString(),
      'Method': a.method,
      'Manual Override': a.isManualOverride ? 'Yes' : 'No',
      'Override Reason': a.overrideReason || ''
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${eventId}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.revertCheckIn = async (req, res) => {
  try {
    const { eventId, attendanceId } = req.params;
    const { reason } = req.body;

    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    await Attendance.findByIdAndDelete(attendanceId);

    const io = req.app.get('io');
    io.to(`attendance_${eventId}`).emit('checkin_reverted', { attendanceId });

    res.json({ message: 'Check-in reverted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
