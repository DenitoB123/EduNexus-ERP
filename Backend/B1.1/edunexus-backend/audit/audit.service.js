const db = require('../database/models');

/**
 * AUDIT ACTIONS — the fixed vocabulary used across the platform so
 * audit_logs.action stays queryable/consistent (see shared/constants
 * if this list grows large enough to warrant extraction).
 */
const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ROLE_CHANGE: 'role_change',
  PERMISSION_CHANGE: 'permission_change',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  INVITATION_SENT: 'invitation_sent',
  INVITATION_ACCEPTED: 'invitation_accepted',
  SETUP_WIZARD_STEP: 'setup_wizard_step',
});

/**
 * Writes a single audit log row. Never throws upward into the caller's
 * business flow — a failed audit write should be logged to the console
 * but must not break the user's actual request.
 */
async function record({
  schoolId = null,
  userId = null,
  action,
  entityType = null,
  entityId = null,
  description = null,
  metadata = {},
  req = null,
}) {
  try {
    await db.AuditLog.create({
      school_id: schoolId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata,
      ip_address: req ? req.ip : null,
      user_agent: req ? req.headers['user-agent'] : null,
    });
  } catch (err) {
    console.error('[AUDIT LOG WRITE FAILED]', err.message);
  }
}

/**
 * Convenience helper for building a req-bound audit recorder so
 * controllers/services don't have to repeat schoolId/userId/req each time.
 */
function forRequest(req) {
  return (action, opts = {}) =>
    record({
      schoolId: req.user ? req.user.school_id : opts.schoolId || null,
      userId: req.user ? req.user.id : opts.userId || null,
      action,
      req,
      ...opts,
    });
}

module.exports = { AUDIT_ACTIONS, record, forRequest };
