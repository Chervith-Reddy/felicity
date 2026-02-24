const Organizer = require('../models/Organizer');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const crypto = require('crypto');

const generatePassword = () => crypto.randomBytes(8).toString('hex');

exports.createOrganizer = async (req, res) => {
  try {
    const { name, category, contactEmail, contactNumber, description } = req.body;
    
    const existing = await Organizer.findOne({ contactEmail });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const rawPassword = generatePassword();
    
    const organizer = await Organizer.create({
      name, category, contactEmail, contactNumber, description,
      password: rawPassword,
      createdBy: req.user._id
    });

    // Return raw password once for admin to share
    res.status(201).json({
      organizer: {
        _id: organizer._id,
        name: organizer.name,
        category: organizer.category,
        contactEmail: organizer.contactEmail,
        status: organizer.status
      },
      credentials: {
        email: contactEmail,
        password: rawPassword,
        note: 'Share these credentials with the organizer. Password cannot be retrieved again.'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrganizers = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;
    const organizers = await Organizer.find(query).select('-password').sort({ createdAt: -1 });
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrganizerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const organizer = await Organizer.findByIdAndUpdate(
      req.params.id,
      { status, isActive: status === 'active', isArchived: status === 'archived' },
      { new: true }
    ).select('-password');
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
    res.json(organizer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteOrganizer = async (req, res) => {
  try {
    await Organizer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Organizer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = { role: 'participant' };
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const PasswordResetRequest = require('../models/PasswordResetRequest');
    const Registration = require('../models/Registration');
    const Event = require('../models/Event');

    const [
      totalUsers, totalOrganizers, totalEvents, totalRegistrations,
      eventsByStatus, revenueAgg, pendingResetRequests
    ] = await Promise.all([
      User.countDocuments({ role: 'participant' }),
      Organizer.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments({ status: 'active' }),
      Event.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Event.aggregate([{ $group: { _id: null, total: { $sum: '$revenue' } } }]),
      PasswordResetRequest.countDocuments({ status: 'pending' })
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const statusBreakdown = {};
    eventsByStatus.forEach(e => { statusBreakdown[e._id] = e.count; });

    res.json({
      totalUsers, totalOrganizers, totalEvents, totalRegistrations,
      totalRevenue, statusBreakdown, pendingResetRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
