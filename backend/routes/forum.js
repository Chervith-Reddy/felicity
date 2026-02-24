const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/:eventId/messages', protect, forumController.getMessages);
router.post('/:eventId/announce', protect, requireRole('organizer'), forumController.postAnnouncement);
router.patch('/:eventId/messages/:msgId/pin', protect, requireRole('organizer'), forumController.pinMessage);
router.delete('/:eventId/messages/:msgId', protect, requireRole('organizer'), forumController.deleteMessage);
router.post('/:eventId/messages/:msgId/react', protect, forumController.reactToMessage);

module.exports = router;
