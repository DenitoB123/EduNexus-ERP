const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const controller = require('./user.controller');
const v = require('./user.validators');

const router = express.Router();

// /users/me does not need tenant scoping since it must also work for
// platform super_admins (school_id = null).
router.get('/me', authenticate, controller.getMyProfile);

router.use(authenticate, tenantScope);

router.get('/', requirePermission('user.read'), controller.listUsers);
router.get('/:id', requirePermission('user.read'), controller.getUser);
router.post('/', requirePermission('user.create'), v.createUserValidator, validate, controller.createUser);
router.put('/:id', requirePermission('user.update'), v.updateUserValidator, validate, controller.updateUser);
router.delete('/:id', requirePermission('user.delete'), controller.deactivateUser);

module.exports = router;
