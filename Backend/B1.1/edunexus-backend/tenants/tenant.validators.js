const { body } = require('express-validator');

const updateSchoolValidator = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('country').optional().trim(),
  body('timezone').optional().trim(),
];

const createCampusValidator = [
  body('name').trim().notEmpty().withMessage('Campus name is required'),
  body('code').trim().notEmpty().withMessage('Campus code is required'),
  body('isMain').optional().isBoolean(),
];

const updateCampusValidator = [
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'inactive']),
];

module.exports = { updateSchoolValidator, createCampusValidator, updateCampusValidator };
