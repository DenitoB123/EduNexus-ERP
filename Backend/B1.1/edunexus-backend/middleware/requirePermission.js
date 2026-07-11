const { ForbiddenError } = require('../shared/errors/AppError');
const { DEFAULT_ROLES } = require('../shared/constants/roles');

/**
 * Authorization middleware factory. Must run after authenticate().
 * Grants access if the authenticated user holds ANY of the listed
 * permission names, OR if they hold the platform super_admin role
 * (which implicitly bypasses all permission checks).
 *
 * Usage: router.post('/users', authenticate, requirePermission('user.create'), controller)
 */
function requirePermission(...requiredPermissions) {
  return function permissionGuard(req, res, next) {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required before authorization'));
    }

    if (req.user.roles.includes(DEFAULT_ROLES.SUPER_ADMIN)) {
      return next();
    }

    const hasPermission = requiredPermissions.some((perm) => req.user.permissions.includes(perm));

    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Missing required permission: ${requiredPermissions.join(' or ')}`
        )
      );
    }

    return next();
  };
}

module.exports = requirePermission;
