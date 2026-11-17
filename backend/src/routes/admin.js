// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const dbConnect = require('../utils/dbConnect');
const User = require('../models/User');
const Member = require('../models/Member');
const Photo = require('../models/Photo');
const Event = require('../models/Event');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// Apply auth + admin check to all admin routes
router.use(authMiddleware);
router.use(adminAuth);

// Dashboard overview – basic counts
router.get('/dashboard', async (req, res) => {
  try {
    await dbConnect();
    const [totalUsers, approvedMembers, pendingMembers, totalPhotos, pendingPhotos, totalEvents, upcomingEvents] = await Promise.all([
      User.countDocuments(),
      Member.countDocuments({ membershipStatus: 'APPROVED' }),
      Member.countDocuments({ membershipStatus: 'PENDING' }),
      Photo.countDocuments(),
      Photo.countDocuments({ status: 'PENDING' }),
      Event.countDocuments(),
      Event.countDocuments({ status: 'UPCOMING' })
    ]);
    res.json({ totalUsers, approvedMembers, pendingMembers, totalPhotos, pendingPhotos, totalEvents, upcomingEvents });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Simple analytics – example: top photographers by photo count
router.get('/analytics', async (req, res) => {
  try {
    await dbConnect();
    const topPhotographers = await Photo.aggregate([
      { $match: { status: 'APPROVED' } },
      { $group: { _id: '$photographerId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 0, photographerId: '$_id', name: '$user.name', count: 1 } }
    ]);
    res.json({ topPhotographers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Activity logs – paginated
router.get('/activity-logs', async (req, res) => {
  try {
    await dbConnect();
    const { page = 1, limit = 20, userId, action } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'name email');
    const total = await ActivityLog.countDocuments(filter);
    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Report: crew roster (PDF generation placeholder)
router.get('/reports/crew', async (req, res) => {
  try {
    await dbConnect();
    const crew = await Member.find({ membershipStatus: 'APPROVED' })
      .populate('userId', 'name email profileImage');
    // For now we just return JSON – PDF generation can be added later with jsPDF.
    res.json({ crew });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Report: event participants (JSON placeholder)
router.get('/reports/events/:id/participants', async (req, res) => {
  try {
    await dbConnect();
    const EventRegistration = require('../models/EventRegistration');
    const registrations = await EventRegistration.find({ eventId: req.params.id })
      .populate('userId', 'name email');
    res.json({ registrations });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
