const { body } = require('express-validator');

const schoolInfoStepValidator = [
  body('address').optional().trim(),
  body('phone').optional().trim(),
  body('country').optional().trim(),
  body('timezone').optional().trim(),
  body('logoUrl').optional().trim(),
];

const structureStepValidator = [
  body('departments').optional().isArray(),
  body('classes').optional().isArray(),
  body('streams').optional().isArray(),
];

const modulesStepValidator = [
  body('modules').isArray().withMessage('modules must be an array of module keys'),
];

const rolesStepValidator = [
  body('customRoles').optional().isArray(),
];

module.exports = {
  schoolInfoStepValidator,
  structureStepValidator,
  modulesStepValidator,
  rolesStepValidator,
};
