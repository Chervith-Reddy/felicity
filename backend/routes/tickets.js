const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Registration = require('../models/Registration');

router.get('/:ticketId', protect, async (req, res) => {
  try {
    const registration = await Registration.findOne({ ticketId: req.params.ticketId })
      .populate('user', 'firstName lastName email')
      .populate({ path: 'event', populate: { path: 'organizer', select: 'name' } });

    if (!registration) return res.status(404).json({ message: 'Ticket not found' });

    // Only allow owner or organizer/admin
    if (
      registration.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'organizer'
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
