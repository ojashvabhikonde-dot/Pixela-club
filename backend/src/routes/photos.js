// backend/src/routes/photos.js
const express = require('express');
const router = express.Router();
const dbConnect = require('../utils/dbConnect');
const Photo = require('../models/Photo');
const { authMiddleware } = require('../middleware/authMiddleware');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const { sendMail } = require('../utils/mailer');
const Joi = require('joi');

// Validation schema for upload
const uploadSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  category: Joi.string().allow('').optional(),
  tags: Joi.array().items(Joi.string()).default([]),
  file: Joi.string().required(), // base64 data URL or temp path
});

// Upload photo (pending moderation)
router.post('/upload', async (req, res) => {
  try {
    await authMiddleware(req, res);
    await dbConnect();
    const { error, value } = uploadSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { title, description, category, tags, file } = value;
    const result = await uploadImage(file);
    const photo = await Photo.create({
      title,
      description,
      imageUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      photographerId: req.user.id,
      category,
      tags,
      status: 'PENDING',
    });
    res.status(201).json({ photo });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// List public photos with filters & pagination
router.get('/', async (req, res) => {
  try {
    await dbConnect();
    const { page = 1, limit = 20, category, tag, sort = 'createdAt' } = req.query;
    const filter = { status: 'APPROVED' };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    const photos = await Photo.find(filter)
      .sort({ [sort]: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('photographerId', 'name profileImage');
    const total = await Photo.countDocuments(filter);
    res.json({ photos, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Approve photo (admin only)
router.patch('/:id/approve', async (req, res) => {
  try {
    await authMiddleware(req, res);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    await dbConnect();
    const photo = await Photo.findByIdAndUpdate(req.params.id, { status: 'APPROVED' }, { new: true });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    const User = require('../models/User');
    const photographer = await User.findById(photo.photographerId);
    await sendMail(photographer.email, 'Your photo was approved', `<p>Congrats ${photographer.name}, your photo "${photo.title}" is now visible in the gallery.</p>`);
    res.json({ photo });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Reject photo (admin only)
router.patch('/:id/reject', async (req, res) => {
  try {
    await authMiddleware(req, res);
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    await dbConnect();
    const { reason } = req.body;
    const photo = await Photo.findByIdAndUpdate(req.params.id, { status: 'REJECTED' }, { new: true });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    const User = require('../models/User');
    const photographer = await User.findById(photo.photographerId);
    await sendMail(photographer.email, 'Your photo was rejected', `<p>Sorry ${photographer.name}, your photo "${photo.title}" was rejected. ${reason || ''}</p>`);
    await deleteImage(photo.cloudinaryPublicId);
    res.json({ photo });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Like a photo (authenticated users)
router.post('/:id/like', async (req, res) => {
  try {
    await authMiddleware(req, res);
    await dbConnect();
    const photo = await Photo.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } }, { new: true });
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    res.json({ likes: photo.likes });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Add comment (authenticated)
router.post('/:id/comments', async (req, res) => {
  try {
    await authMiddleware(req, res);
    await dbConnect();
    const { content } = req.body;
    const Comment = require('../models/Comment');
    const comment = await Comment.create({ photoId: req.params.id, userId: req.user.id, content });
    res.status(201).json({ comment });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

module.exports = router;
