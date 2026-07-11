const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { UnauthorizedError } = require('../shared/errors/AppError');

/**
 * Pure JWT helper — no DB access here. Access tokens carry the
 * authorization payload (user_id, school_id, role names, permission
 * names) so most requests can be authorized without hitting the DB.
 * Refresh tokens are opaque and only ever looked up via the Sessions table.
 */
function signAccessToken({ userId, schoolId, roles, permissions }) {
  const payload = {
    user_id: userId,
    school_id: schoolId,
    roles, // array of role names
    permissions, // array of permission names, flattened across all roles
  };
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

function signRefreshToken({ sessionId, userId }) {
  return jwt.sign({ session_id: sessionId, user_id: userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
