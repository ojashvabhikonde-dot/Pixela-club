// backend/src/routes/members.js
const express = require('express');
const router = express.Router();
const dbConnect = require('../utils/dbConnect');
const Member = require('../models/Member');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sendMail } = require('../utils/mailer');

// Apply member application (already in API folder, but we expose via route)
router.post('/apply', async (req, res) => {
  try {
    await authMiddleware(req, res);
    const { userId, bio, department, year, skills, interests, equipment, designation } = req.body;
    await dbConnect();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const existing = await Member.findOne({ userId });
    if (existing) return res.status(409).json({ error: 'Application already exists' });
    const member = await Member.create({
      userId,
      bio,
      department,
      year,
      skills,
      interests,
      equipment,
      designation,
      membershipStatus: 'PENDING',
    });
    res.status(201).json({ member });
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Approve member (admin only)
router.patch('/approve/:id', async (req, res) => {
  try {
    await authMiddleware(req, res);
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')
      return res.status(403).json({ error: 'Forbidden' });
    await dbConnect();
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { membershipStatus: 'APPROVED', approvedAt: new Date(), approvedBy: req.user.id },
      { new: true }
    ).populate('userId', 'email name');
    if (!member) return res.status(404).json({ error: 'Member not found' });
    // send email
    await sendMail(member.userId.email, 'Crew Application Approved', `<p>Congrats ${member.userId.name}, you are now part of the crew!</p>`);
    res.json({ member });
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Reject member (admin only)
router.patch('/reject/:id', async (req, res) => {
  try {
    await authMiddleware(req, res);
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')
      return res.status(403).json({ error: 'Forbidden' });
    await dbConnect();
    const { reason } = req.body;
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { membershipStatus: 'REJECTED', approvedAt: new Date(), approvedBy: req.user.id },
      { new: true }
    ).populate('userId', 'email name');
    if (!member) return res.status(404).json({ error: 'Member not found' });
    await sendMail(member.userId.email, 'Crew Application Rejected', `<p>Sorry ${member.userId.name}, your application was rejected. ${reason || ''}</p>`);
    res.json({ member });
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// List approved crew members (public)
router.get('/crew', async (req, res) => {
  try {
    await dbConnect();
    const crew = await Member.find({ membershipStatus: 'APPROVED' }).populate('userId', 'name profileImage');
    res.json({ crew });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
