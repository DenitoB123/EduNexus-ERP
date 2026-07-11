const { body } = require('express-validator');

const registerSchoolValidator = [
  body('schoolName').trim().notEmpty().withMessage('School name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
];

const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const logoutValidator = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

const forgotPasswordValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
];

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const inviteUserValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('roleId').isUUID().withMessage('A valid roleId is required'),
  body('campusId').optional().isUUID().withMessage('campusId must be a valid UUID'),
];

const acceptInvitationValidator = [
  body('token').notEmpty().withMessage('Invitation token is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

module.exports = {
  registerSchoolValidator,
  loginValidator,
  logoutValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  inviteUserValidator,
  acceptInvitationValidator,
};
