const db = require('../database/models');
const { signRefreshToken, verifyRefreshToken } = require('./jwt.service');
const { hashToken } = require('../shared/utils/tokens');
const { UnauthorizedError } = require('../shared/errors/AppError');
const env = require('../config/env');

function refreshExpiryDate() {
  // Mirrors JWT_REFRESH_EXPIRES_IN; kept simple (days) for Phase 1.
  const days = parseInt(env.jwt.refreshExpiresIn, 10) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Creates a DB-backed session row and returns a signed refresh JWT
 * whose payload references session_id. This lets us revoke a single
 * device/session without invalidating the user's other sessions.
 */
async function createSession({ userId, schoolId, userAgent, ipAddress }) {
  const session = await db.Session.create({
    user_id: userId,
    school_id: schoolId,
    refresh_token_hash: 'pending', // replaced below once we know the session id
    user_agent: userAgent,
    ip_address: ipAddress,
    expires_at: refreshExpiryDate(),
  });

  const refreshToken = signRefreshToken({ sessionId: session.id, userId });
  session.refresh_token_hash = hashToken(refreshToken);
  await session.save();

  return { session, refreshToken };
}

/**
 * Validates a refresh token end-to-end: signature, matching session
 * row, not revoked, not expired. Returns the session + user for the
 * caller (auth.service.js) to issue a fresh access token.
 */
async function validateRefreshToken(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);

  const session = await db.Session.findByPk(payload.session_id);
  if (!session) throw new UnauthorizedError('Session not found');
  if (session.revoked_at) throw new UnauthorizedError('Session has been revoked');
  if (session.expires_at < new Date()) throw new UnauthorizedError('Session has expired');
  if (hashToken(refreshToken) !== session.refresh_token_hash) {
    throw new UnauthorizedError('Refresh token does not match session');
  }

  session.last_used_at = new Date();
  await session.save();

  return session;
}

async function revokeSession(sessionId) {
  const session = await db.Session.findByPk(sessionId);
  if (session && !session.revoked_at) {
    session.revoked_at = new Date();
    await session.save();
  }
  return session;
}

async function revokeAllUserSessions(userId) {
  await db.Session.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null } }
  );
}

async function listActiveSessions(userId) {
  return db.Session.findAll({
    where: { user_id: userId, revoked_at: null },
    order: [['last_used_at', 'DESC']],
    attributes: ['id', 'user_agent', 'ip_address', 'created_at', 'last_used_at', 'expires_at'],
  });
}

module.exports = {
  createSession,
  validateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  listActiveSessions,
};
