const { body } = require('express-validator');

const createUserValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('roleIds').optional().isArray().withMessage('roleIds must be an array of UUIDs'),
  body('campusId').optional().isUUID(),
];

const updateUserValidator = [
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('campus_id').optional().isUUID(),
];

module.exports = { createUserValidator, updateUserValidator };
