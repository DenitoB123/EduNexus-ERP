const { ForbiddenError } = require('../shared/errors/AppError');
const { DEFAULT_ROLES } = require('../shared/constants/roles');

/**
 * Authorization middleware factory based on role name rather than
 * granular permission. Use sparingly — prefer requirePermission()
 * for most endpoints since it's more flexible and survives role
 * renaming/restructuring. requireRole() is useful for coarse checks
 * like "only school_admin can do this" regardless of permission grants.
 */
function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required before authorization'));
    }

    if (req.user.roles.includes(DEFAULT_ROLES.SUPER_ADMIN)) {
      return next();
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return next(new ForbiddenError(`Requires one of these roles: ${allowedRoles.join(', ')}`));
    }

    return next();
  };
}

module.exports = requireRole;
