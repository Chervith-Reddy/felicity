const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));

router.post('/organizers', adminController.createOrganizer);
router.get('/organizers', adminController.getOrganizers);
router.patch('/organizers/:id/status', adminController.updateOrganizerStatus);
router.delete('/organizers/:id', adminController.deleteOrganizer);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

router.get('/stats', adminController.getStats);

module.exports = router;
