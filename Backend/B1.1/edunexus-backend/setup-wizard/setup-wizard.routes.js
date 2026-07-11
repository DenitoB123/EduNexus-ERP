const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const controller = require('./setup-wizard.controller');
const v = require('./setup-wizard.validators');

const router = express.Router();

router.use(authenticate, tenantScope, requirePermission('setup_wizard.manage'));

router.get('/status', controller.getStatus);
router.post('/school-info', v.schoolInfoStepValidator, validate, controller.schoolInfoStep);
router.post('/structure', v.structureStepValidator, validate, controller.structureStep);
router.post('/modules', v.modulesStepValidator, validate, controller.modulesStep);
router.post('/roles', v.rolesStepValidator, validate, controller.rolesStep);
router.post('/launch', controller.launchStep);

module.exports = router;
