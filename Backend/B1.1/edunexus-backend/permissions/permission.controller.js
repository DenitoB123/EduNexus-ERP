const db = require('../database/models');
const asyncHandler = require('../shared/utils/asyncHandler');
const { success } = require('../shared/utils/apiResponse');

/**
 * GET /permissions — returns the full global permission catalog.
 * Permissions are platform-wide (no school_id), so no tenant scoping
 * is applied here; every school sees the same catalog and chooses
 * which permissions to attach to its own roles.
 */
const listPermissions = asyncHandler(async (req, res) => {
  const permissions = await db.Permission.findAll({ order: [['module', 'ASC'], ['action', 'ASC']] });
  return success(res, { message: 'Permissions retrieved', data: permissions });
});

module.exports = { listPermissions };
