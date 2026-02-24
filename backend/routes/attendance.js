const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/scan', protect, requireRole('organizer'), ctrl.scanQR);
router.post('/manual', protect, requireRole('organizer'), ctrl.manualCheckIn);
router.get('/:eventId', protect, requireRole('organizer'), ctrl.getAttendance);
router.get('/:eventId/export', protect, requireRole('organizer'), ctrl.exportAttendanceCSV);
router.delete('/:eventId/:attendanceId', protect, requireRole('organizer'), ctrl.revertCheckIn);

module.exports = router;
