const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Organizer = require('../models/Organizer');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

const IIIT_ALLOWED_DOMAINS = ['students.iiit.ac.in', 'research.iiit.ac.in'];

exports.registerParticipant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { firstName, lastName, email, password, contactNumber, collegeOrOrg } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const emailDomain = email.split('@')[1];
    const isIIIT = IIIT_ALLOWED_DOMAINS.includes(emailDomain);
    const type = isIIIT ? 'IIIT' : 'Non-IIIT';

    const user = await User.create({
      firstName, lastName, email, password,
      contactNumber, collegeOrOrg, type
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        type: user.type,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });

    const token = generateToken(user._id, user.role);
    res.json({
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        type: user.type,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.loginOrganizer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const organizer = await Organizer.findOne({ contactEmail: email });

    if (!organizer || !(await organizer.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (organizer.status !== 'active') {
      return res.status(403).json({ message: 'Account is disabled or archived' });
    }

    const token = generateToken(organizer._id, 'organizer');
    res.json({
      token,
      user: {
        _id: organizer._id,
        name: organizer.name,
        email: organizer.contactEmail,
        role: 'organizer',
        category: organizer.category
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

exports.logout = async (req, res) => {
  // Client-side token removal; nothing to do server-side unless using token blacklist
  res.json({ message: 'Logged out successfully' });
};
