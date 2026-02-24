const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/passwordResetController');
const { protect, requireRole } = require('../middleware/auth');

// Organizer submits request
router.post('/', protect, requireRole('organizer'), ctrl.submitRequest);
router.get('/my', protect, requireRole('organizer'), ctrl.getMyRequests);

// Admin manages requests
router.get('/', protect, requireRole('admin'), ctrl.getAllRequests);
router.patch('/:id/approve', protect, requireRole('admin'), ctrl.approveRequest);
router.patch('/:id/reject', protect, requireRole('admin'), ctrl.rejectRequest);
router.post('/:id/acknowledge', protect, requireRole('admin'), ctrl.acknowledgeCredential);

module.exports = router;
