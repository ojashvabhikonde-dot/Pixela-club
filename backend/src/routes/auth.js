// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const dbConnect = require('../utils/dbConnect');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const bcrypt = require('bcrypt');
const { createTokens, verifyAccessToken } = require('../utils/auth');
const { sendMail } = require('../utils/mailer');
const { generateToken } = require('../utils/token');
const Joi = require('joi');

// -----------------------------------
// Validation schemas
// -----------------------------------
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  department: Joi.string().allow('').optional(),
  year: Joi.string().allow('').optional(),
  interests: Joi.array().items(Joi.string()).default([]),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const emailTokenSchema = Joi.object({ token: Joi.string().required() });

const refreshSchema = Joi.object({ refreshToken: Joi.string().required() });

const passwordResetRequestSchema = Joi.object({ email: Joi.string().email().required() });

const passwordResetSchema = Joi.object({ token: Joi.string().required(), newPassword: Joi.string().min(8).required() });

// -----------------------------------
// Helper: store refresh token
// -----------------------------------
async function storeRefreshToken(userId, ip, ua) {
  const token = generateToken(48);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({ token, userId, expiresAt, ip, userAgent: ua });
  return token;
}

// -----------------------------------
// Register (creates user, sends verification email)
// -----------------------------------
router.post('/register', async (req, res) => {
  try {
    await dbConnect();
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { name, email, password, department, year, interests } = value;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const user = await User.create({
      name,
      email,
      passwordHash,
      department,
      year,
      interests,
      role: 'MEMBER',
      verificationToken,
      verificationTokenExpires,
    });
    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
    await sendMail(email, 'Verify your Pixela account', `<p>Hello ${name},<br>Please verify your email by clicking <a href="${verificationLink}">here</a>. This link expires in 24 hours.</p>`);
    // Create refresh token for immediate login (optional – we'll still require verification for full access)
    const refreshToken = await storeRefreshToken(user._id, req.ip, req.headers['user-agent'] || '');
    const { accessToken } = createTokens(user);
    res.status(201).json({ accessToken, refreshToken, user: { id: user._id, name, email, role: user.role, isEmailVerified: user.isEmailVerified } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Email verification
// -----------------------------------
router.post('/verify-email', async (req, res) => {
  try {
    await dbConnect();
    const { error, value } = emailTokenSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { token } = value;
    const user = await User.findOne({ verificationToken: token, verificationTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Email verified successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Resend verification email (if needed)
// -----------------------------------
router.post('/resend-verification', async (req, res) => {
  try {
    await dbConnect();
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isEmailVerified) return res.status(400).json({ error: 'Email already verified' });
    const verificationToken = generateToken();
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
    await sendMail(email, 'Verify your Pixela account (new link)', `<p>Please verify your email by clicking <a href="${verificationLink}">here</a>. This link expires in 24 hours.</p>`);
    res.json({ message: 'Verification email sent' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Login (issues access & refresh tokens)
// -----------------------------------
router.post('/login', async (req, res) => {
  try {
    await dbConnect();
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { email, password } = value;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const { accessToken } = createTokens(user);
    const refreshToken = await storeRefreshToken(user._id, req.ip, req.headers['user-agent'] || '');
    res.json({ accessToken, refreshToken, user: { id: user._id, name: user.name, email, role: user.role, isEmailVerified: user.isEmailVerified } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Refresh token (rotate)
// -----------------------------------
router.post('/refresh', async (req, res) => {
  try {
    await dbConnect();
    const { error, value } = refreshSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { refreshToken } = value;
    const stored = await RefreshToken.findOne({ token: refreshToken, revoked: false, expiresAt: { $gt: new Date() } });
    if (!stored) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    const user = await User.findById(stored.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    // Rotate: revoke old, issue new
    stored.revoked = true;
    await stored.save();
    const newRefresh = await storeRefreshToken(user._id, req.ip, req.headers['user-agent'] || '');
    const { accessToken } = createTokens(user);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Logout (revoke supplied refresh token)
// -----------------------------------
router.post('/logout', async (req, res) => {
  try {
    await dbConnect();
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    await RefreshToken.updateOne({ token: refreshToken }, { $set: { revoked: true } });
    res.json({ message: 'Logged out' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Forgot password – send reset email
// -----------------------------------
router.post('/forgot-password', async (req, res) => {
  try {
    await dbConnect();
    const { error, value } = passwordResetRequestSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { email } = value;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const resetToken = generateToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    await sendMail(email, 'Pixela password reset', `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`);
    res.json({ message: 'Password reset email sent' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Reset password – verify token and set new password
// -----------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    await dbConnect();
    const { error, value } = passwordResetSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    const { token, newPassword } = value;
    const user = await User.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------
// Get current user (protected)
// -----------------------------------
router.get('/me', async (req, res) => {
  try {
    // auth middleware will have attached req.user if token valid
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findById(req.user.id).select('-passwordHash -verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
