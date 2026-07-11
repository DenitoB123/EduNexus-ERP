const asyncHandler = require('../shared/utils/asyncHandler');
const { success, created } = require('../shared/utils/apiResponse');
const roleService = require('./role.service');
const { AUDIT_ACTIONS, record: recordAudit } = require('../audit/audit.service');

const listRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.listRoles({ schoolId: req.scope.schoolId });
  return success(res, { message: 'Roles retrieved', data: roles });
});

const createRole = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const role = await roleService.createRole({ schoolId: req.scope.schoolId, name, description });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Role',
    entityId: role.id,
    description: `Created role "${role.name}"`,
    req,
  });

  return created(res, { message: 'Role created', data: role });
});

const updateRole = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const role = await roleService.updateRole({
    schoolId: req.scope.schoolId,
    roleId: req.params.id,
    name,
    description,
  });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'Role',
    entityId: role.id,
    description: `Updated role "${role.name}"`,
    req,
  });

  return success(res, { message: 'Role updated', data: role });
});

const deleteRole = asyncHandler(async (req, res) => {
  const role = await roleService.deleteRole({ schoolId: req.scope.schoolId, roleId: req.params.id });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'Role',
    entityId: role.id,
    description: `Deleted role "${role.name}"`,
    req,
  });

  return success(res, { message: 'Role deleted' });
});

const setRolePermissions = asyncHandler(async (req, res) => {
  const { permissionNames } = req.body;
  const role = await roleService.setRolePermissions({
    schoolId: req.scope.schoolId,
    roleId: req.params.id,
    permissionNames,
    grantedBy: req.user.id,
  });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.PERMISSION_CHANGE,
    entityType: 'Role',
    entityId: role.id,
    description: `Updated permissions for role "${role.name}"`,
    metadata: { permissionNames },
    req,
  });

  return success(res, { message: 'Role permissions updated', data: role });
});

const assignRoleToUser = asyncHandler(async (req, res) => {
  const { userId, roleId } = req.body;
  await roleService.assignRoleToUser({ userId, roleId, assignedBy: req.user.id });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.ROLE_CHANGE,
    entityType: 'User',
    entityId: userId,
    description: `Assigned role ${roleId} to user ${userId}`,
    req,
  });

  return created(res, { message: 'Role assigned to user' });
});

const removeRoleFromUser = asyncHandler(async (req, res) => {
  const { userId, roleId } = req.params;
  await roleService.removeRoleFromUser({ userId, roleId });

  await recordAudit({
    schoolId: req.scope.schoolId,
    userId: req.user.id,
    action: AUDIT_ACTIONS.ROLE_CHANGE,
    entityType: 'User',
    entityId: userId,
    description: `Removed role ${roleId} from user ${userId}`,
    req,
  });

  return success(res, { message: 'Role removed from user' });
});

module.exports = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
  assignRoleToUser,
  removeRoleFromUser,
};
