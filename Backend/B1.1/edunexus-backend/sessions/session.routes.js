const express = require('express');
const authenticate = require('../middleware/authenticate');
const controller = require('./session.controller');

const router = express.Router();

router.get('/', authenticate, controller.listMySessions);
router.delete('/:id', authenticate, controller.revokeMySession);
router.delete('/', authenticate, controller.revokeAllMySessions);

module.exports = router;
