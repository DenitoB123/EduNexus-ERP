/**
 * Standard success response envelope used by every controller,
 * so all API responses across the platform share the same shape.
 */
function success(res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function created(res, opts = {}) {
  return success(res, { statusCode: 201, message: 'Created', ...opts });
}

module.exports = { success, created };
