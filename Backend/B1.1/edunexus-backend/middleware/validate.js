const { validationResult } = require('express-validator');
const { ValidationError } = require('../shared/errors/AppError');

/**
 * Runs after an array of express-validator rules on a route.
 * Collects validation failures into a single ValidationError so
 * controllers never have to deal with raw validationResult().
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ValidationError('Validation failed', details));
  }
  return next();
}

module.exports = validate;
