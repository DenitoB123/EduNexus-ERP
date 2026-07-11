const express = require('express');
const authenticate = require('../middleware/authenticate');
const tenantScope = require('../middleware/tenantScope');
const requirePermission = require('../middleware/requirePermission');
const { listAuditLogs } = require('./audit.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  tenantScope,
  requirePermission('audit.read'),
  listAuditLogs
);

module.exports = router;
