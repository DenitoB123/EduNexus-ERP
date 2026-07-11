/**
 * Master permission catalog for Phase 1 (platform foundation).
 * Format: "<module>.<action>"
 * Future ERP modules (students, finance, library, etc.) will register
 * their own permissions the same way without touching this file's shape.
 */
const PERMISSION_MODULES = Object.freeze({
  SCHOOL: 'school',
  CAMPUS: 'campus',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  INVITATION: 'invitation',
  AUDIT: 'audit',
  SETUP_WIZARD: 'setup_wizard',
});

const ACTIONS = Object.freeze({
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage', // full control shortcut, used sparingly (e.g. role.manage)
});

function buildPermission(module, action) {
  return `${module}.${action}`;
}

/**
 * Flat list of [name, description, module, action] seeded into the
 * permissions table for every fresh database / new school.
 */
const SYSTEM_PERMISSIONS = [
  // School (tenant) management
  [buildPermission(PERMISSION_MODULES.SCHOOL, ACTIONS.READ), 'View school/tenant settings', PERMISSION_MODULES.SCHOOL, ACTIONS.READ],
  [buildPermission(PERMISSION_MODULES.SCHOOL, ACTIONS.UPDATE), 'Update school/tenant settings', PERMISSION_MODULES.SCHOOL, ACTIONS.UPDATE],

  // Campus management
  [buildPermission(PERMISSION_MODULES.CAMPUS, ACTIONS.CREATE), 'Create a campus', PERMISSION_MODULES.CAMPUS, ACTIONS.CREATE],
  [buildPermission(PERMISSION_MODULES.CAMPUS, ACTIONS.READ), 'View campuses', PERMISSION_MODULES.CAMPUS, ACTIONS.READ],
  [buildPermission(PERMISSION_MODULES.CAMPUS, ACTIONS.UPDATE), 'Update a campus', PERMISSION_MODULES.CAMPUS, ACTIONS.UPDATE],
  [buildPermission(PERMISSION_MODULES.CAMPUS, ACTIONS.DELETE), 'Delete a campus', PERMISSION_MODULES.CAMPUS, ACTIONS.DELETE],

  // User management
  [buildPermission(PERMISSION_MODULES.USER, ACTIONS.CREATE), 'Create a user', PERMISSION_MODULES.USER, ACTIONS.CREATE],
  [buildPermission(PERMISSION_MODULES.USER, ACTIONS.READ), 'View users', PERMISSION_MODULES.USER, ACTIONS.READ],
  [buildPermission(PERMISSION_MODULES.USER, ACTIONS.UPDATE), 'Update a user', PERMISSION_MODULES.USER, ACTIONS.UPDATE],
  [buildPermission(PERMISSION_MODULES.USER, ACTIONS.DELETE), 'Delete/deactivate a user', PERMISSION_MODULES.USER, ACTIONS.DELETE],

  // Role management
  [buildPermission(PERMISSION_MODULES.ROLE, ACTIONS.CREATE), 'Create a role', PERMISSION_MODULES.ROLE, ACTIONS.CREATE],
  [buildPermission(PERMISSION_MODULES.ROLE, ACTIONS.READ), 'View roles', PERMISSION_MODULES.ROLE, ACTIONS.READ],
  [buildPermission(PERMISSION_MODULES.ROLE, ACTIONS.UPDATE), 'Update a role', PERMISSION_MODULES.ROLE, ACTIONS.UPDATE],
  [buildPermission(PERMISSION_MODULES.ROLE, ACTIONS.DELETE), 'Delete a role', PERMISSION_MODULES.ROLE, ACTIONS.DELETE],
  [buildPermission(PERMISSION_MODULES.ROLE, ACTIONS.MANAGE), 'Assign roles to users / manage role-permission mapping', PERMISSION_MODULES.ROLE, ACTIONS.MANAGE],

  // Permission management (usually super_admin/school_admin only)
  [buildPermission(PERMISSION_MODULES.PERMISSION, ACTIONS.READ), 'View permissions', PERMISSION_MODULES.PERMISSION, ACTIONS.READ],
  [buildPermission(PERMISSION_MODULES.PERMISSION, ACTIONS.MANAGE), 'Manage permission catalog', PERMISSION_MODULES.PERMISSION, ACTIONS.MANAGE],

  // Invitations
  [buildPermission(PERMISSION_MODULES.INVITATION, ACTIONS.CREATE), 'Invite a new user', PERMISSION_MODULES.INVITATION, ACTIONS.CREATE],
  [buildPermission(PERMISSION_MODULES.INVITATION, ACTIONS.READ), 'View invitations', PERMISSION_MODULES.INVITATION, ACTIONS.READ],
  [buildPermission(PERMISSION_MODULES.INVITATION, ACTIONS.DELETE), 'Revoke an invitation', PERMISSION_MODULES.INVITATION, ACTIONS.DELETE],

  // Audit logs
  [buildPermission(PERMISSION_MODULES.AUDIT, ACTIONS.READ), 'View audit logs', PERMISSION_MODULES.AUDIT, ACTIONS.READ],

  // Setup wizard
  [buildPermission(PERMISSION_MODULES.SETUP_WIZARD, ACTIONS.MANAGE), 'Run/modify the school setup wizard', PERMISSION_MODULES.SETUP_WIZARD, ACTIONS.MANAGE],
];

module.exports = { PERMISSION_MODULES, ACTIONS, buildPermission, SYSTEM_PERMISSIONS };
