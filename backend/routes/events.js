const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, requireRole } = require('../middleware/auth');

// Public / participant routes
router.get('/', protect, eventController.getEvents);
router.get('/trending', protect, eventController.getTrendingEvents);
router.get('/:id', protect, eventController.getEvent);
router.post('/:id/view', eventController.incrementView);

// Organizer routes
router.post('/', protect, requireRole('organizer'), eventController.createEvent);
router.put('/:id', protect, requireRole('organizer'), eventController.updateEvent);
router.delete('/:id', protect, requireRole('organizer', 'admin'), eventController.deleteEvent);
router.patch('/:id/status', protect, requireRole('organizer'), eventController.updateEventStatus);
router.get('/:id/participants', protect, requireRole('organizer', 'admin'), eventController.getEventParticipants);
router.get('/:id/export', protect, requireRole('organizer', 'admin'), eventController.exportParticipantsCSV);

// Form builder
router.put('/:id/form', protect, requireRole('organizer'), eventController.updateEventForm);

module.exports = router;
