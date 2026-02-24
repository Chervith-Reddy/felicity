const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teamsController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('participant'), teamsController.createTeam);
router.get('/my', protect, requireRole('participant'), teamsController.getMyTeams);
router.get('/join/:inviteCode', protect, requireRole('participant'), teamsController.getTeamByCode);
router.post('/join', protect, requireRole('participant'), teamsController.joinTeam);
router.post('/:id/respond', protect, requireRole('participant'), teamsController.respondInvite);
router.post('/:id/invite', protect, requireRole('participant'), teamsController.inviteMember);
router.delete('/:id/leave', protect, requireRole('participant'), teamsController.leaveTeam);
router.get('/:id', protect, teamsController.getTeam);

module.exports = router;
