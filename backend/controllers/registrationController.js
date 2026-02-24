const Registration = require('../models/Registration');
const Event = require('../models/Event');
const QRCode = require('qrcode');
const { sendTicketEmail } = require('../utils/email');
const path = require('path');

exports.register = async (req, res) => {
  try {
    const { eventId, formResponses, merchandisePurchases } = req.body;
    const parsedMerchandise = merchandisePurchases ? JSON.parse(merchandisePurchases) : [];

    const event = await Event.findById(eventId).populate('organizer');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!['published', 'ongoing'].includes(event.status)) {
      return res.status(400).json({ message: 'Event is not open for registration' });
    }
    if (new Date() > event.registrationDeadline) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }
    if (event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({ message: 'Event is fully booked' });
    }
    if (event.eligibility === 'iiit-only' && req.user.type !== 'IIIT') {
      return res.status(403).json({ message: 'This event is for IIIT participants only' });
    }
    if (event.eligibility === 'non-iiit-only' && req.user.type !== 'Non-IIIT') {
      return res.status(403).json({ message: 'This event is for Non-IIIT participants only' });
    }

    const existing = await Registration.findOne({ user: req.user._id, event: eventId, status: { $ne: 'cancelled' } });
    if (existing) return res.status(400).json({ message: 'Already registered for this event' });

    let totalAmount = 0;
    let paymentStatus = 'not_required';
    let paymentProofUrl = null;

    if (event.eventType === 'merchandise') {
      if (!parsedMerchandise || parsedMerchandise.length === 0) {
        return res.status(400).json({ message: 'Select at least one item to purchase' });
      }

      for (const purchase of parsedMerchandise) {
        const variant = event.merchandiseItems.id(purchase.variantId);
        if (!variant) return res.status(400).json({ message: 'Invalid item variant' });

        if (!event.requiresPaymentApproval) {
          // Immediate: decrement stock now
          if (variant.stock < purchase.quantity) {
            return res.status(400).json({ message: `Insufficient stock for ${variant.size} ${variant.color}` });
          }
          variant.stock -= purchase.quantity;
        }
        purchase.priceAtPurchase = variant.price;
        totalAmount += variant.price * purchase.quantity;
      }

      if (event.requiresPaymentApproval) {
        if (!req.file) return res.status(400).json({ message: 'Payment proof is required' });
        paymentProofUrl = `/uploads/${req.file.filename}`;
        paymentStatus = 'pending';
      } else {
        await event.save();
      }
    }

    // Normal events with a registration fee also require payment proof
    if (event.eventType === 'normal' && event.registrationFee > 0) {
      totalAmount = event.registrationFee;
      if (!req.file) return res.status(400).json({ message: 'Payment proof is required for paid events' });
      paymentProofUrl = `/uploads/${req.file.filename}`;
      paymentStatus = 'pending';
    }

    if (event.eventType === 'normal' && !event.formLocked) {
      event.formLocked = true;
      await event.save();
    }

    const registration = new Registration({
      user: req.user._id,
      event: eventId,
      registrationType: event.eventType,
      formResponses: formResponses ? JSON.parse(formResponses) : [],
      merchandisePurchases: parsedMerchandise,
      totalAmount,
      paymentProofUrl,
      paymentStatus
    });

    // Only generate QR if payment not pending approval
    if (paymentStatus !== 'pending') {
      const qrData = JSON.stringify({ ticketId: registration.ticketId, eventId, userId: req.user._id });
      registration.qrCode = await QRCode.toDataURL(qrData);
    }

    await registration.save();

    if (paymentStatus !== 'pending') {
      await Event.findByIdAndUpdate(eventId, { $inc: { registrationCount: 1, revenue: totalAmount } });
      try {
        await sendTicketEmail(req.user, event, registration);
        registration.emailSent = true;
        await registration.save();
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
      }
    }

    res.status(201).json(registration);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRegistrations = async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = { user: req.user._id };
    if (type) query.registrationType = type;
    if (status) query.status = status;

    const registrations = await Registration.find(query)
      .populate({ path: 'event', populate: { path: 'organizer', select: 'name category' } })
      .populate('team', 'name status inviteCode')
      .sort({ createdAt: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOne({ _id: req.params.id, user: req.user._id });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (registration.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    registration.status = 'cancelled';
    await registration.save();
    await Event.findByIdAndUpdate(registration.event, { $inc: { registrationCount: -1 } });
    res.json({ message: 'Registration cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingPayments = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ _id: eventId, organizer: req.user._id });
    if (!event) return res.status(403).json({ message: 'Not your event' });

    const registrations = await Registration.find({ event: eventId, paymentStatus: { $in: ['pending', 'approved', 'rejected'] } })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reviewPayment = async (req, res) => {
  try {
    const { action, comment } = req.body; // 'approve' or 'reject'
    const registration = await Registration.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('event');

    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    const event = await Event.findOne({ _id: registration.event._id, organizer: req.user._id }).populate('organizer');
    if (!event) return res.status(403).json({ message: 'Not your event' });

    if (registration.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Payment already reviewed' });
    }

    if (action === 'approve') {
      // Decrement stock
      for (const purchase of registration.merchandisePurchases) {
        const variant = event.merchandiseItems.id(purchase.variantId);
        if (variant) {
          if (variant.stock < purchase.quantity) {
            return res.status(400).json({ message: `Insufficient stock for ${variant.size} ${variant.color}` });
          }
          variant.stock -= purchase.quantity;
        }
      }
      await event.save();

      // Generate QR
      const qrData = JSON.stringify({ ticketId: registration.ticketId, eventId: event._id, userId: registration.user._id });
      registration.qrCode = await QRCode.toDataURL(qrData);
      registration.paymentStatus = 'approved';
      registration.paymentReviewedBy = req.user._id;
      registration.paymentReviewedAt = new Date();
      await registration.save();

      await Event.findByIdAndUpdate(event._id, { $inc: { registrationCount: 1, revenue: registration.totalAmount } });

      try { await sendTicketEmail(registration.user, event, registration); } catch (e) { console.error('Merch email error:', e.message); }
    } else {
      registration.paymentStatus = 'rejected';
      registration.paymentReviewedBy = req.user._id;
      registration.paymentReviewedAt = new Date();
      await registration.save();
    }

    res.json({ message: `Payment ${action}d`, registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

