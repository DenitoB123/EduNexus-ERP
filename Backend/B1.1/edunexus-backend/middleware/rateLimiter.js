const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * General-purpose API rate limiter applied globally in app.js.
 */
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.', code: 'TOO_MANY_REQUESTS' },
});

/**
 * Stricter limiter for sensitive auth endpoints (login, register,
 * forgot-password) to slow down brute-force / credential-stuffing attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.', code: 'TOO_MANY_REQUESTS' },
});

module.exports = { apiLimiter, authLimiter };
