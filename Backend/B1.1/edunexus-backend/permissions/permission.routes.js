const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const { listPermissions } = require('./permission.controller');

const router = express.Router();

router.get('/', authenticate, tenantScope, requirePermission('permission.read'), listPermissions);

module.exports = router;
