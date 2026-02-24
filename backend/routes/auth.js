const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Participant registration
router.post('/register', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('contactNumber').optional(),
  body('collegeOrOrg').optional(),
], authController.registerParticipant);

// Organizer login (no self-registration)
router.post('/organizer/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], authController.loginOrganizer);

// General login (participant/admin)
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], authController.login);

// Get current user
router.get('/me', protect, authController.getMe);

// Logout
router.post('/logout', protect, authController.logout);

module.exports = router;
