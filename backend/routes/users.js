const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const bcrypt = require('bcryptjs');

// Complete onboarding
router.post('/onboarding', protect, requireRole('participant'), async (req, res) => {
  try {
    const { areasOfInterest, followedClubs } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { areasOfInterest, followedClubs, onboardingCompleted: true },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    let entity;
    if (req.user.role === 'organizer') {
      entity = await Organizer.findById(req.user._id);
    } else {
      entity = await User.findById(req.user._id);
    }

    const isMatch = await entity.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    entity.password = newPassword; // will be hashed by pre-save
    await entity.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, contactNumber, collegeOrOrg, areasOfInterest, followedClubs } = req.body;

    if (req.user.role === 'organizer') {
      const { name, category, description, contactEmail, contactNumber: cn, discordWebhook } = req.body;
      const org = await Organizer.findByIdAndUpdate(
        req.user._id,
        { name, category, description, contactEmail, contactNumber: cn, discordWebhook },
        { new: true }
      ).select('-password');
      return res.json(org);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, contactNumber, collegeOrOrg, areasOfInterest, followedClubs },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all organizers (for follow feature)
router.get('/organizers', protect, async (req, res) => {
  try {
    const organizers = await Organizer.find({ status: 'active' }).select('-password -discordWebhook');
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
