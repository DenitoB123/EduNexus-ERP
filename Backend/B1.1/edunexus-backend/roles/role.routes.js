const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const controller = require('./role.controller');
const v = require('./role.validators');

const router = express.Router();

router.use(authenticate, tenantScope);

router.get('/', requirePermission('role.read'), controller.listRoles);
router.post('/', requirePermission('role.create'), v.createRoleValidator, validate, controller.createRole);
router.put('/:id', requirePermission('role.update'), v.updateRoleValidator, validate, controller.updateRole);
router.delete('/:id', requirePermission('role.delete'), controller.deleteRole);

router.put(
  '/:id/permissions',
  requirePermission('role.manage'),
  v.setPermissionsValidator,
  validate,
  controller.setRolePermissions
);

router.post('/assign', requirePermission('role.manage'), v.assignRoleValidator, validate, controller.assignRoleToUser);
router.delete('/:roleId/users/:userId', requirePermission('role.manage'), controller.removeRoleFromUser);

module.exports = router;
