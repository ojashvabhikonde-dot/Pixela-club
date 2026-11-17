// backend/src/utils/token.js
import crypto from 'crypto';

/**
 * Generate a cryptographically‑secure random token (hex string).
 * Length defaults to 32 bytes (64 hex characters).
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
