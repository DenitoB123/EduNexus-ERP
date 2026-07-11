const { verifyAccessToken } = require('../auth/jwt.service');
const { UnauthorizedError } = require('../shared/errors/AppError');
const db = require('../database/models');

/**
 * Verifies the Bearer access token and attaches a normalized
 * `req.user` object to the request. This is the single source of
 * truth for "who is making this request" used by every downstream
 * middleware (tenant scoping, RBAC) and controller.
 *
 * req.user = { id, school_id, campus_id, roles: [...], permissions: [...] }
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const payload = verifyAccessToken(token);

    // Defense in depth: confirm the user still exists and is active.
    // Permissions/roles embedded in the token are trusted for the
    // token's short lifetime (default 15m) to avoid a DB hit per request.
    const user = await db.User.findByPk(payload.user_id);
    if (!user || user.status === 'suspended' || user.status === 'inactive') {
      throw new UnauthorizedError('Account is no longer active');
    }

    req.user = {
      id: payload.user_id,
      school_id: payload.school_id,
      campus_id: user.campus_id,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authenticate;
