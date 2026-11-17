// backend/src/middleware/activityLogger.js
const ActivityLog = require('../models/ActivityLog');

/**
 * Simple activity logger middleware.
 * Logs each request after it finishes (unless the path is /auth/* to avoid noise).
 */
module.exports = async function activityLogger(req, res, next) {
  const start = Date.now();
  // Preserve original end to log after response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    // Log only after response is sent
    if (!req.path.startsWith('/auth')) {
      const log = {
        userId: req.user ? req.user.id : null,
        action: req.method,
        entityType: null, // could be inferred from path if needed
        entityId: null,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
        timestamp: new Date(),
      };
      ActivityLog.create(log).catch(err => console.error('ActivityLog error', err));
    }
    // Call original end
    originalEnd.apply(res, args);
  };
  next();
};
