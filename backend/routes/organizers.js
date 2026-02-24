const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Organizer = require('../models/Organizer');
const Attendance = require('../models/Attendance');

// Get organizer's own events with analytics
router.get('/my-events', protect, requireRole('organizer'), async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard analytics — aggregate stats for completed events
router.get('/dashboard-analytics', protect, requireRole('organizer'), async (req, res) => {
  try {
    const completedEvents = await Event.find({ organizer: req.user._id, status: 'completed' }).lean();
    const eventIds = completedEvents.map(e => e._id);

    // Attendance counts per event
    const attendanceCounts = await Attendance.aggregate([
      { $match: { event: { $in: eventIds } } },
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]);
    const attendanceMap = Object.fromEntries(attendanceCounts.map(a => [a._id.toString(), a.count]));

    // Merchandise items sold per event
    const salesAgg = await Registration.aggregate([
      { $match: { event: { $in: eventIds }, status: { $ne: 'cancelled' } } },
      { $unwind: { path: '$merchandisePurchases', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$event', itemsSold: { $sum: '$merchandisePurchases.quantity' } } }
    ]);
    const salesMap = Object.fromEntries(salesAgg.map(s => [s._id.toString(), s.itemsSold]));

    const perEvent = completedEvents.map(e => ({
      _id: e._id,
      name: e.name,
      eventType: e.eventType,
      registrations: e.registrationCount || 0,
      revenue: e.revenue || 0,
      attendance: attendanceMap[e._id.toString()] || 0,
      itemsSold: salesMap[e._id.toString()] || 0,
      attendanceRate: e.registrationCount ? Math.round(((attendanceMap[e._id.toString()] || 0) / e.registrationCount) * 100) : 0
    }));

    const totals = perEvent.reduce((acc, e) => {
      acc.totalRegistrations += e.registrations;
      acc.totalRevenue += e.revenue;
      acc.totalAttendance += e.attendance;
      acc.totalItemsSold += e.itemsSold;
      return acc;
    }, { totalRegistrations: 0, totalRevenue: 0, totalAttendance: 0, totalItemsSold: 0 });

    totals.avgAttendanceRate = totals.totalRegistrations
      ? Math.round((totals.totalAttendance / totals.totalRegistrations) * 100) : 0;

    res.json({ perEvent, totals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get organizer's ongoing events
router.get('/my-ongoing', protect, requireRole('organizer'), async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id, status: 'ongoing' }).sort({ startDate: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get organizer analytics
router.get('/analytics/:eventId', protect, requireRole('organizer'), async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const registrationStats = await Registration.aggregate([
      { $match: { event: event._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
    ]);

    res.json({ event, registrationStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public: get organizer profile with events
router.get('/:id', async (req, res) => {
  try {
    const org = await Organizer.findById(req.params.id).select('-password -discordWebhook');
    if (!org) return res.status(404).json({ message: 'Organizer not found' });

    const now = new Date();
    const [upcomingEvents, pastEvents] = await Promise.all([
      Event.find({ organizer: req.params.id, status: { $in: ['published', 'ongoing'] }, startDate: { $gte: now } })
        .select('name description startDate registrationCount registrationLimit status tags imageUrl eventType')
        .sort({ startDate: 1 }).limit(10),
      Event.find({ organizer: req.params.id, status: 'completed' })
        .select('name description startDate registrationCount status imageUrl eventType')
        .sort({ startDate: -1 }).limit(10)
    ]);

    res.json({ organizer: org, upcomingEvents, pastEvents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
