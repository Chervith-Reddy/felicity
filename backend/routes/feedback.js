const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/:eventId', protect, requireRole('participant'), feedbackController.submitFeedback);
router.get('/:eventId', protect, requireRole('organizer'), feedbackController.getEventFeedback);
router.get('/:eventId/check', protect, requireRole('participant'), feedbackController.checkSubmitted);

module.exports = router;
