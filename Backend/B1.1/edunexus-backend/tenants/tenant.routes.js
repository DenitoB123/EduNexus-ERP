const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const controller = require('./tenant.controller');
const v = require('./tenant.validators');

const router = express.Router();

router.use(authenticate, tenantScope);

// School (tenant) self-service endpoints
router.get('/school', requirePermission('school.read'), controller.getMySchool);
router.put('/school', requirePermission('school.update'), v.updateSchoolValidator, validate, controller.updateMySchool);

// Campus management, scoped to the caller's school
router.get('/campuses', requirePermission('campus.read'), controller.listCampuses);
router.get('/campuses/:id', requirePermission('campus.read'), controller.getCampus);
router.post('/campuses', requirePermission('campus.create'), v.createCampusValidator, validate, controller.createCampus);
router.put('/campuses/:id', requirePermission('campus.update'), v.updateCampusValidator, validate, controller.updateCampus);
router.delete('/campuses/:id', requirePermission('campus.delete'), controller.deleteCampus);

module.exports = router;
