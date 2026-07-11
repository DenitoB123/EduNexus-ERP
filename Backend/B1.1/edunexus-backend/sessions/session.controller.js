const asyncHandler = require('../shared/utils/asyncHandler');
const { success } = require('../shared/utils/apiResponse');
const sessionService = require('../auth/session.service');
const { ForbiddenError } = require('../shared/errors/AppError');
const db = require('../database/models');

/**
 * GET /sessions — list the current user's own active sessions/devices.
 */
const listMySessions = asyncHandler(async (req, res) => {
  const sessions = await sessionService.listActiveSessions(req.user.id);
  return success(res, { message: 'Active sessions retrieved', data: sessions });
});

/**
 * DELETE /sessions/:id — revoke one of the current user's own sessions
 * (e.g. "log out this device"). Users may only revoke their own sessions.
 */
const revokeMySession = asyncHandler(async (req, res) => {
  const session = await db.Session.findByPk(req.params.id);
  if (!session || session.user_id !== req.user.id) {
    throw new ForbiddenError('You can only revoke your own sessions');
  }
  await sessionService.revokeSession(session.id);
  return success(res, { message: 'Session revoked' });
});

/**
 * DELETE /sessions — revoke all of the current user's sessions
 * (e.g. "log out everywhere").
 */
const revokeAllMySessions = asyncHandler(async (req, res) => {
  await sessionService.revokeAllUserSessions(req.user.id);
  return success(res, { message: 'All sessions revoked' });
});

module.exports = { listMySessions, revokeMySession, revokeAllMySessions };
