// backend/src/pages/api/v1/auth/register.js
const dbConnect = require('../../../../utils/dbConnect');
const User = require('../../../../models/User');
const bcrypt = require('bcrypt');
const { createTokens } = require('../../../../utils/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  await dbConnect();
  const { name, email, password, department, year, interests } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, department, year, interests, role: 'MEMBER' });
  const { accessToken, refreshToken } = createTokens(user);
  res.status(201).json({ accessToken, refreshToken, user: { id: user._id, name, email, role: user.role } });
};
