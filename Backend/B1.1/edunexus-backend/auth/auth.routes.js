const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const controller = require('./auth.controller');
const v = require('./auth.validators');

const router = express.Router();

// Public routes
router.post('/register-school', authLimiter, v.registerSchoolValidator, validate, controller.registerSchool);
router.post('/login', authLimiter, v.loginValidator, validate, controller.login);
router.post('/logout', v.logoutValidator, validate, controller.logout);
router.post('/refresh-token', v.refreshTokenValidator, validate, controller.refresh);
router.post('/forgot-password', authLimiter, v.forgotPasswordValidator, validate, controller.forgotPassword);
router.post('/reset-password', authLimiter, v.resetPasswordValidator, validate, controller.resetPassword);
router.post('/accept-invitation', v.acceptInvitationValidator, validate, controller.acceptInvitation);

// Protected route: only authenticated users with invitation.create permission may invite
router.post(
  '/invite-user',
  authenticate,
  tenantScope,
  requirePermission('invitation.create'),
  v.inviteUserValidator,
  validate,
  controller.inviteUser
);

module.exports = router;
