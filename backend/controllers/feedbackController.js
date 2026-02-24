const Feedback = require('../models/Feedback');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

exports.submitFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;

    // Verify user attended the event
    const reg = await Registration.findOne({ user: req.user._id, event: eventId, status: 'active' });
    if (!reg) return res.status(403).json({ message: 'You must be registered to submit feedback' });

    const event = await Event.findById(eventId);
    if (!event || event.status !== 'completed') {
      return res.status(400).json({ message: 'Feedback can only be submitted for completed events' });
    }

    const userHash = Feedback.hashUser(req.user._id);

    const feedback = await Feedback.create({ event: eventId, userHash, rating, comment });
    res.status(201).json({ message: 'Feedback submitted anonymously', id: feedback._id });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Already submitted feedback for this event' });
    res.status(500).json({ message: error.message });
  }
};

exports.getEventFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ratingFilter } = req.query;

    // Verify organizer owns this event
    const Event = require('../models/Event');
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    let query = { event: eventId };
    if (ratingFilter) query.rating = parseInt(ratingFilter);

    // Return feedback without any user-identifying info
    const feedbacks = await Feedback.find(query).select('rating comment createdAt').sort({ createdAt: -1 });

    const total = feedbacks.length;
    const avgRating = total > 0 ? (feedbacks.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : 0;
    const distribution = [1, 2, 3, 4, 5].map(r => ({
      rating: r,
      count: feedbacks.filter(f => f.rating === r).length
    }));

    res.json({ feedbacks, total, avgRating, distribution });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkSubmitted = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userHash = Feedback.hashUser(req.user._id);
    const existing = await Feedback.findOne({ event: eventId, userHash });
    res.json({ submitted: !!existing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
