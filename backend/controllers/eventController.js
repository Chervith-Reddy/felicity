const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { stringify } = require('csv-stringify/sync');
const Fuse = require('fuse.js');

// Compute the effective status from timestamps (overrides stale DB status)
function computeEffectiveStatus(event) {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const status = event.status || event._doc?.status;
  // Don't override terminal states
  if (status === 'cancelled' || status === 'draft') return status;
  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'completed';
  return 'published';
}

exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user._id,
      status: 'draft'
    });

    // Post to Discord webhook if configured
    if (req.user.discordWebhook && event.status === 'published') {
      postToDiscord(req.user.discordWebhook, event);
    }

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const {
      search, eventType, eligibility, startDate, endDate,
      followedClubs, page = 1, limit = 12, status
    } = req.query;

    let query = {};

    // Only show published+ for participants
    if (req.user.role === 'participant') {
      query.status = { $in: ['published', 'ongoing', 'completed'] };
    } else if (status) {
      query.status = status;
    }

    if (eventType) query.eventType = eventType;
    if (eligibility) query.eligibility = { $in: [eligibility, 'all'] };

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (followedClubs === 'true' && req.user.followedClubs?.length > 0) {
      query.organizer = { $in: req.user.followedClubs };
    }

    // Partial & fuzzy matching via case-insensitive regex on name, description, tags
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { tags: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    let events = await Event.find(query)
      .populate('organizer', 'name category logoUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Apply fuzzy search on top of regex results if search term provided
    if (search && search.trim().length > 0) {
      const fuse = new Fuse(events.map(e => e.toObject ? e.toObject() : e), {
        keys: ['name', 'description', 'tags'],
        threshold: 0.4,       // 0 = exact, 1 = match anything
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2
      });
      const fuseResults = fuse.search(search);
      events = fuseResults.map(r => r.item);
    }

    // Compute effective status from timestamps
    events = events.map(e => {
      const obj = e.toObject ? e.toObject() : e;
      obj.status = computeEffectiveStatus(obj);
      return obj;
    });

    // Preference-based ordering: boost followed clubs + matching interest tags
    if (req.user.role === 'participant') {
      const followedIds = (req.user.followedClubs || []).map(id => id.toString());
      const interests = (req.user.areasOfInterest || []).map(i => i.toLowerCase());

      events = events.map(e => {
        const eo = e.toObject();
        let score = 0;
        if (followedIds.includes(eo.organizer?._id?.toString())) score += 10;
        const eventTags = (eo.tags || []).map(t => t.toLowerCase());
        const matchingTags = eventTags.filter(t => interests.some(i => t.includes(i) || i.includes(t)));
        score += matchingTags.length * 3;
        eo._relevanceScore = score;
        return eo;
      });
      events.sort((a, b) => b._relevanceScore - a._relevanceScore || new Date(b.createdAt) - new Date(a.createdAt));
    }

    const total = await Event.countDocuments(query);

    res.json({ events, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTrendingEvents = async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trending = await Registration.aggregate([
      { $match: { createdAt: { $gte: last24h }, status: 'active' } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
      { $unwind: '$event' },
      { $project: { event: 1, count: 1 } }
    ]);
    res.json(trending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name category logoUrl description contactEmail');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const obj = event.toObject();
    obj.status = computeEffectiveStatus(obj);
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // State machine restrictions
    if (event.status === 'ongoing' || event.status === 'completed') {
      return res.status(400).json({ message: 'Cannot edit ongoing or completed events' });
    }

    if (event.status === 'published') {
      // Limited edits: description, venue, image, tags + extend deadline, increase limit, close registrations
      const allowedFields = ['description', 'venue', 'imageUrl', 'tags'];
      const updates = {};
      allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      // Allow extending registration deadline (only forward)
      if (req.body.registrationDeadline) {
        const newDeadline = new Date(req.body.registrationDeadline);
        if (newDeadline > event.registrationDeadline) {
          updates.registrationDeadline = newDeadline;
        }
      }

      // Allow increasing registration limit (only upward)
      if (req.body.registrationLimit !== undefined) {
        const newLimit = parseInt(req.body.registrationLimit);
        if (newLimit > event.registrationLimit) {
          updates.registrationLimit = newLimit;
        }
      }

      // Allow closing registrations by setting deadline to now
      if (req.body.closeRegistrations === true) {
        updates.registrationDeadline = new Date();
      }

      Object.assign(event, updates);
    } else {
      // Draft: full edit
      Object.assign(event, req.body);
    }

    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEventStatus = async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const { status } = req.body;
    const validTransitions = {
      draft: ['published', 'cancelled'],
      published: ['ongoing', 'cancelled'],
      ongoing: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[event.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from ${event.status} to ${status}`
      });
    }

    event.status = status;
    await event.save();

    // Post to Discord on publish
    if (status === 'published' && req.user.discordWebhook) {
      postToDiscord(req.user.discordWebhook, event);
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEventForm = async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizer: req.user._id });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.formLocked) return res.status(400).json({ message: 'Form is locked after first registration' });
    if (event.eventType !== 'normal') return res.status(400).json({ message: 'Only normal events have custom forms' });

    event.customForm = req.body.fields;
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.incrementView = async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
    res.json({ message: 'View counted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEventParticipants = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    let query = { event: req.params.id };
    if (status) query.status = status;

    const registrations = await Registration.find(query)
      .populate('user', 'firstName lastName email contactNumber collegeOrOrg type')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Fetch attendance data
    const Attendance = require('../models/Attendance');
    const attendanceMap = {};
    const attendances = await Attendance.find({ event: req.params.id });
    attendances.forEach(a => { attendanceMap[a.registration.toString()] = a.checkedInAt; });

    const enriched = registrations.map(r => ({
      ...r.toObject(),
      checkedIn: !!attendanceMap[r._id.toString()],
      checkedInAt: attendanceMap[r._id.toString()] || null
    }));

    const total = await Registration.countDocuments(query);
    res.json({ registrations: enriched, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportParticipantsCSV = async (req, res) => {
  try {
    const registrations = await Registration.find({ event: req.params.id })
      .populate('user', 'firstName lastName email contactNumber collegeOrOrg type')
      .lean();

    const rows = registrations.map(r => ({
      'Ticket ID': r.ticketId,
      'First Name': r.user?.firstName,
      'Last Name': r.user?.lastName,
      'Email': r.user?.email,
      'Contact': r.user?.contactNumber,
      'College/Org': r.user?.collegeOrOrg,
      'Type': r.user?.type,
      'Status': r.status,
      'Registered At': r.createdAt?.toISOString()
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function postToDiscord(webhookUrl, event) {
  try {
    const axios = require('axios');
    await axios.post(webhookUrl, {
      embeds: [{
        title: `🎉 New Event: ${event.name}`,
        description: event.description?.substring(0, 200) + '...',
        color: 0x5865F2,
        fields: [
          { name: 'Type', value: event.eventType, inline: true },
          { name: 'Start Date', value: new Date(event.startDate).toLocaleDateString(), inline: true },
          { name: 'Deadline', value: new Date(event.registrationDeadline).toLocaleDateString(), inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    });
  } catch (err) {
    console.error('Discord webhook error:', err.message);
  }
}
