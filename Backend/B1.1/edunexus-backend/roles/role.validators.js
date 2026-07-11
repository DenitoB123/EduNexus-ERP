const { body } = require('express-validator');

const createRoleValidator = [
  body('name').trim().notEmpty().withMessage('Role name is required'),
  body('description').optional().trim(),
];

const updateRoleValidator = [
  body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
  body('description').optional().trim(),
];

const setPermissionsValidator = [
  body('permissionNames').isArray().withMessage('permissionNames must be an array of permission name strings'),
];

const assignRoleValidator = [
  body('userId').isUUID().withMessage('A valid userId is required'),
  body('roleId').isUUID().withMessage('A valid roleId is required'),
];

module.exports = {
  createRoleValidator,
  updateRoleValidator,
  setPermissionsValidator,
  assignRoleValidator,
};
