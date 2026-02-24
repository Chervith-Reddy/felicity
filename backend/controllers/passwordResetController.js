const PasswordResetRequest = require('../models/PasswordResetRequest');
const Organizer = require('../models/Organizer');
const crypto = require('crypto');

exports.submitRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required' });

    const pending = await PasswordResetRequest.findOne({ organizer: req.user._id, status: 'pending' });
    if (pending) return res.status(400).json({ message: 'You already have a pending request' });

    const request = await PasswordResetRequest.create({ organizer: req.user._id, reason });
    res.status(201).json({ message: 'Password reset request submitted', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ organizer: req.user._id })
      .select('-newPasswordPlain')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const requests = await PasswordResetRequest.find(query)
      .populate('organizer', 'name contactEmail category')
      .sort({ createdAt: -1 });

    // Mask password if already seen
    const sanitized = requests.map(r => {
      const obj = r.toObject();
      if (!obj.newPasswordPlain) delete obj.newPasswordPlain;
      return obj;
    });

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { adminComment } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id).populate('organizer');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already resolved' });

    // Generate new password
    const newPassword = crypto.randomBytes(8).toString('hex');

    // Update organizer password
    const organizer = await Organizer.findById(request.organizer._id);
    organizer.password = newPassword; // will be hashed by pre-save
    await organizer.save();

    request.status = 'approved';
    request.adminComment = adminComment;
    request.resolvedBy = req.user._id;
    request.resolvedAt = new Date();
    request.newPasswordPlain = newPassword; // stored temporarily for admin to view once
    await request.save();

    res.json({
      message: 'Request approved',
      newCredentials: {
        email: organizer.contactEmail,
        password: newPassword,
        note: 'Share with organizer. Cleared after acknowledgment.'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { adminComment } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Already resolved' });

    request.status = 'rejected';
    request.adminComment = adminComment;
    request.resolvedBy = req.user._id;
    request.resolvedAt = new Date();
    await request.save();

    res.json({ message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acknowledgeCredential = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });
    request.newPasswordPlain = undefined;
    await request.save();
    res.json({ message: 'Credential acknowledged and cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
