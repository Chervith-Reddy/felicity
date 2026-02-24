const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../utils/upload');

router.post('/', protect, requireRole('participant'), upload.single('paymentProof'), registrationController.register);
router.get('/my', protect, requireRole('participant'), registrationController.getMyRegistrations);
router.delete('/:id', protect, requireRole('participant'), registrationController.cancelRegistration);

// Organizer: Payment approvals
router.get('/event/:eventId/pending-payments', protect, requireRole('organizer'), registrationController.getPendingPayments);
router.patch('/:id/payment-review', protect, requireRole('organizer'), registrationController.reviewPayment);

module.exports = router;
