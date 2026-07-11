const crypto = require('crypto');

/**
 * Generates a cryptographically secure random URL-safe token.
 * Used for: invitation tokens, password-reset tokens, refresh-session ids.
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hashes a token (e.g. before persisting a password-reset/invitation token)
 * so the raw token never sits in the database in plaintext.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Converts a school/campus name into a unique-ish URL & subdomain
 * friendly slug. Uniqueness is still enforced at the DB layer.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

module.exports = { generateSecureToken, hashToken, slugify };
