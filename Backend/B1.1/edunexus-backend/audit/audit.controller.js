const db = require('../database/models');
const { success } = require('../shared/utils/apiResponse');
const asyncHandler = require('../shared/utils/asyncHandler');

/**
 * GET /audit-logs
 * Read-only, paginated, tenant-scoped audit trail. There is
 * intentionally no create/update/delete route exposed here —
 * audit logs are written exclusively by audit.service.js internally.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const offset = (page - 1) * limit;

  const where = req.scope.withTenant({});
  if (req.query.action) where.action = req.query.action;
  if (req.query.user_id) where.user_id = req.query.user_id;
  if (req.query.entity_type) where.entity_type = req.query.entity_type;

  const { rows, count } = await db.AuditLog.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
    offset,
    include: [{ model: db.User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
  });

  return success(res, {
    message: 'Audit logs retrieved',
    data: rows,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  });
});

module.exports = { listAuditLogs };
