// backend/src/middleware/adminAuth.js
/**
 * Middleware to ensure the requester is an ADMIN or SUPER_ADMIN.
 * Must be used after authMiddleware (which attaches req.user).
 */
module.exports = function adminAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const role = req.user.role;
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: admin access required' });
};
