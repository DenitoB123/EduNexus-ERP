const { AppError } = require('../shared/errors/AppError');
const env = require('../config/env');

/**
 * Centralized Express error handler. Must be registered last in app.js.
 * Operational errors (AppError subclasses) are returned with their
 * intended status code/message. Unexpected errors are logged and
 * returned as a generic 500 to avoid leaking internals.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details || undefined,
    });
  }

  // Sequelize validation/unique-constraint errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors ? err.errors.map((e) => ({ field: e.path, message: e.message })) : undefined,
    });
  }

  console.error('[UNHANDLED ERROR]', err);

  return res.status(500).json({
    success: false,
    message: env.env === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
}

module.exports = { errorHandler, notFoundHandler };
