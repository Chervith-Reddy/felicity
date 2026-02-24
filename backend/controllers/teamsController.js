const Team = require('../models/Team');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const QRCode = require('qrcode');
const { sendTicketEmail } = require('../utils/email');

exports.createTeam = async (req, res) => {
  try {
    const { eventId, teamName } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.eventType !== 'hackathon') return res.status(400).json({ message: 'Not a hackathon event' });
    if (!['published', 'ongoing'].includes(event.status)) return res.status(400).json({ message: 'Event not open' });

    // Check if user already has a team for this event
    const existing = await Team.findOne({ event: eventId, $or: [{ leader: req.user._id }, { 'members.user': req.user._id }] });
    if (existing) return res.status(400).json({ message: 'Already in a team for this event' });

    const team = await Team.create({
      name: teamName,
      event: eventId,
      leader: req.user._id,
      maxSize: event.teamSize || 4,
      members: []
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [{ leader: req.user._id }, { 'members.user': req.user._id }]
    }).populate('event', 'name startDate status teamSize')
      .populate('leader', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('event', 'name startDate status teamSize')
      .populate('leader', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamByCode = async (req, res) => {
  try {
    const team = await Team.findOne({ inviteCode: req.params.inviteCode.toUpperCase() })
      .populate('event', 'name startDate teamSize status')
      .populate('leader', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() })
      .populate('event');

    if (!team) return res.status(404).json({ message: 'Invalid invite code' });
    if (team.status !== 'forming') return res.status(400).json({ message: 'Team is not accepting members' });

    const accepted = team.members.filter(m => m.status === 'accepted').length + 1;
    if (accepted >= team.maxSize) return res.status(400).json({ message: 'Team is full' });

    // Check not already in team
    const alreadyIn = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyIn) return res.status(400).json({ message: 'Already in this team' });
    if (team.leader.toString() === req.user._id.toString()) return res.status(400).json({ message: 'You are the team leader' });

    // Add as pending invite
    team.members.push({ user: req.user._id, status: 'pending' });
    await team.save();

    res.json({ message: 'Join request sent. Waiting for team leader confirmation.', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const { email } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.leader.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only team leader can invite' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found with that email' });

    const alreadyIn = team.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyIn) return res.status(400).json({ message: 'User already in team or invited' });

    team.members.push({ user: user._id, status: 'pending' });
    await team.save();

    res.json({ message: 'Invitation sent', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.respondInvite = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const team = await Team.findById(req.params.id).populate('event');
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const memberEntry = team.members.find(m => m.user.toString() === req.user._id.toString());
    if (!memberEntry) return res.status(404).json({ message: 'No invite found' });

    memberEntry.status = action === 'accept' ? 'accepted' : 'declined';
    memberEntry.respondedAt = new Date();

    // Check if team is now complete
    const acceptedCount = team.members.filter(m => m.status === 'accepted').length + 1; // +1 leader
    if (acceptedCount >= team.maxSize && action === 'accept') {
      team.status = 'complete';
      await team.save();
      // Auto-complete registration for all members
      await completeTeamRegistration(team);
    } else {
      await team.save();
    }

    res.json({ message: `Invitation ${action}ed`, team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.leaveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (team.leader.toString() === req.user._id.toString()) {
      team.status = 'cancelled';
      await team.save();
      return res.json({ message: 'Team disbanded (you were the leader)' });
    }

    team.members = team.members.filter(m => m.user.toString() !== req.user._id.toString());
    if (team.status === 'complete') team.status = 'forming';
    await team.save();
    res.json({ message: 'Left team' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function completeTeamRegistration(team) {
  try {
    const event = await Event.findById(team.event._id || team.event);
    const allMemberIds = [team.leader, ...team.members.filter(m => m.status === 'accepted').map(m => m.user)];

    for (const userId of allMemberIds) {
      const user = await User.findById(userId);
      if (!user) continue;

      const existing = await Registration.findOne({ user: userId, event: team.event._id || team.event });
      if (existing) continue;

      const qrData = JSON.stringify({ userId, eventId: team.event._id || team.event, teamId: team._id });
      const qrCode = await QRCode.toDataURL(qrData);

      const reg = await Registration.create({
        user: userId,
        event: team.event._id || team.event,
        registrationType: 'hackathon',
        team: team._id,
        qrCode
      });

      await Event.findByIdAndUpdate(team.event._id || team.event, { $inc: { registrationCount: 1 } });

      try { await sendTicketEmail(user, event, reg); } catch (e) {}
    }

    team.status = 'complete';
    await team.save();
  } catch (err) {
    console.error('Team registration error:', err);
  }
}
