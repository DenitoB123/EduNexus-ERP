const { ForbiddenError, UnauthorizedError } = require('../shared/errors/AppError');
const { DEFAULT_ROLES } = require('../shared/constants/roles');

/**
 * THE MULTI-TENANT GUARANTEE.
 *
 * Must run after authenticate(). Ensures every request (other than
 * platform super_admin requests) is bound to exactly one school_id,
 * and exposes a `req.scope` helper that services/controllers MUST use
 * when building Sequelize `where` clauses, so no query can accidentally
 * read or write another tenant's data.
 *
 * This does not replace school_id columns or model-level checks —
 * it is the request-level enforcement layer described in the
 * "MULTI-TENANT RULE": every API request automatically filters by
 * req.user.school_id.
 */
function tenantScope(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const isSuperAdmin = req.user.roles.includes(DEFAULT_ROLES.SUPER_ADMIN);

  if (!isSuperAdmin && !req.user.school_id) {
    return next(new ForbiddenError('User is not associated with any school'));
  }

  // Super admins may optionally target a specific school via header/query
  // (e.g. for platform support tooling); regular users are always locked
  // to their own school_id from the JWT, never from client input.
  const targetSchoolId = isSuperAdmin
    ? req.headers['x-school-id'] || req.query.school_id || null
    : req.user.school_id;

  req.scope = {
    schoolId: targetSchoolId,
    isSuperAdmin,
    /** Merge tenant filter into any Sequelize where clause. */
    withTenant(where = {}) {
      if (!targetSchoolId) return where; // super_admin viewing across all schools
      return { ...where, school_id: targetSchoolId };
    },
  };

  return next();
}

module.exports = tenantScope;
