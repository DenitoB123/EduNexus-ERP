const { DEFAULT_ROLES } = require('./roles');
const { PERMISSION_MODULES, ACTIONS, buildPermission } = require('./permissions');

const P = buildPermission;
const M = PERMISSION_MODULES;
const A = ACTIONS;

/**
 * Maps each default system role to the list of permission names it
 * receives automatically during the Setup Wizard "Roles" step.
 * school_admin implicitly gets everything (handled in setup-wizard service).
 */
const ROLE_PERMISSION_MAP = {
  [DEFAULT_ROLES.PRINCIPAL]: [
    P(M.SCHOOL, A.READ),
    P(M.CAMPUS, A.READ),
    P(M.USER, A.READ), P(M.USER, A.CREATE), P(M.USER, A.UPDATE),
    P(M.ROLE, A.READ),
    P(M.INVITATION, A.CREATE), P(M.INVITATION, A.READ),
    P(M.AUDIT, A.READ),
  ],
  [DEFAULT_ROLES.TEACHER]: [
    P(M.SCHOOL, A.READ),
    P(M.CAMPUS, A.READ),
    P(M.USER, A.READ),
  ],
  [DEFAULT_ROLES.ACCOUNTANT]: [
    P(M.SCHOOL, A.READ),
    P(M.CAMPUS, A.READ),
    P(M.USER, A.READ),
  ],
  [DEFAULT_ROLES.LIBRARIAN]: [
    P(M.SCHOOL, A.READ),
    P(M.CAMPUS, A.READ),
  ],
  [DEFAULT_ROLES.RECEPTIONIST]: [
    P(M.SCHOOL, A.READ),
    P(M.CAMPUS, A.READ),
    P(M.USER, A.READ),
    P(M.INVITATION, A.CREATE), P(M.INVITATION, A.READ),
  ],
  [DEFAULT_ROLES.STUDENT]: [
    P(M.SCHOOL, A.READ),
  ],
  [DEFAULT_ROLES.PARENT]: [
    P(M.SCHOOL, A.READ),
  ],
};

module.exports = { ROLE_PERMISSION_MAP };
