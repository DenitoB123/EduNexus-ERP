/**
 * Wraps an async route/controller function so any rejected promise
 * is forwarded to Express's error-handling middleware via next(err),
 * instead of crashing the process or requiring try/catch everywhere.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
